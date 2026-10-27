package com.tesoreria.user.application.usecase;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.UUID;

/** Persistent requests contain no recovery bearer tokens. Delivery is at least once. */
@Component
@EnableScheduling
public class SecurityMailQueue {
    private static final int MAX_ATTEMPTS = 8;
    private static final Logger LOGGER = LoggerFactory.getLogger(SecurityMailQueue.class);
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final ObjectProvider<AccountRecoveryService> recovery;
    private final boolean enabled;
    public SecurityMailQueue(JdbcTemplate jdbc, PlatformTransactionManager manager, ObjectProvider<AccountRecoveryService> recovery,
                             @Value("${app.security.mail-worker-enabled:true}") boolean enabled) {
        this.jdbc = jdbc; this.transactions = new TransactionTemplate(manager); this.recovery = recovery; this.enabled = enabled;
        transactions.setTimeout(60);
    }
    public void enqueue(String action, String address) {
        jdbc.update("INSERT INTO security_mail_requests(id,action,address,attempts,status,available_at,created_at) "
                + "VALUES (?,?,?,0,'PENDING',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)", UUID.randomUUID(), action, address);
    }
    @Scheduled(initialDelayString = "${app.security.mail-worker-delay-ms:10000}", fixedDelayString = "${app.security.mail-worker-delay-ms:10000}")
    public void scheduledDelivery() {
        if (!enabled) return;
        try { for (int index = 0; index < 10 && deliverOne(); index++) { /* Small bounded batches. */ } }
        catch (RuntimeException failure) { LOGGER.error("Security mail worker unavailable; pending requests remain persisted"); }
    }
    public boolean deliverOne() {
        UUID[] selected = new UUID[1];
        try {
            return Boolean.TRUE.equals(transactions.execute(status -> {
                var jobs = jdbc.query("SELECT id,action,address,attempts,created_at FROM security_mail_requests "
                        + "WHERE status='PENDING' AND available_at<=CURRENT_TIMESTAMP ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED",
                        (row, index) -> new MailJob(row.getObject("id", UUID.class), row.getString("action"),
                                row.getString("address"), row.getTimestamp("created_at").toLocalDateTime()));
                if (jobs.isEmpty()) return false;
                MailJob job = jobs.get(0); selected[0] = job.id();
                if (job.createdAt().plusHours(24).isBefore(LocalDateTime.now())) {
                    jdbc.update("UPDATE security_mail_requests SET status='FAILED' WHERE id=?", job.id());
                    if (LOGGER.isErrorEnabled()) LOGGER.error("Security mail request {} expired; operator review required", job.id());
                    return true;
                }
                recovery.getObject().deliverPublicMail(job.action(), job.address());
                jdbc.update("DELETE FROM security_mail_requests WHERE id=?", job.id());
                return true;
            }));
        } catch (RuntimeException failure) {
            if (selected[0] == null) throw failure;
            // Delivery rollback preserves the request. Never persist SMTP exception bodies or bearer links.
            transactions.executeWithoutResult(status -> {
                var rows = jdbc.query("SELECT attempts FROM security_mail_requests WHERE id=? FOR UPDATE",
                        (row, index) -> row.getInt("attempts"), selected[0]);
                if (rows.isEmpty()) return;
                int attempts = rows.get(0);
                int next = attempts + 1;
                jdbc.update("UPDATE security_mail_requests SET attempts=?,status=?,available_at=? WHERE id=?", next,
                        next >= MAX_ATTEMPTS ? "FAILED" : "PENDING", Timestamp.valueOf(LocalDateTime.now().plusSeconds(Math.min(3600, 30L << next))), selected[0]);
                if (next >= MAX_ATTEMPTS) {
                    if (LOGGER.isErrorEnabled()) LOGGER.error("Security mail request {} exhausted retries; operator review required", selected[0]);
                } else if (LOGGER.isWarnEnabled()) LOGGER.warn("Security mail request {} retained for retry", selected[0]);
            });
            return false;
        }
    }
    @Scheduled(initialDelay = 3600000, fixedDelay = 3600000)
    public void purgeExpiredRequests() {
        // Preserve terminal failures for operator inspection; bound PII retention to seven days.
        jdbc.update("DELETE FROM security_mail_requests WHERE status='FAILED' AND created_at<?", Timestamp.valueOf(LocalDateTime.now().minusDays(7)));
    }
    private record MailJob(UUID id, String action, String address, LocalDateTime createdAt) {
        @Override public String toString() { return "MailJob[redacted]"; }
    }
}
