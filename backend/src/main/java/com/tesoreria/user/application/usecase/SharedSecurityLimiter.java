package com.tesoreria.user.application.usecase;

import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.user.core.exception.SecurityLimitException;
import org.springframework.core.env.Environment;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HexFormat;

@Component
public class SharedSecurityLimiter {
    private static final int MAX_CONFIGURED_LIMIT = 1_000_000;
    private static final String LOGIN_FAILURES = "login-failures";
    private final JdbcTemplate jdbc;
    private final TransactionTemplate isolated;
    private final Environment environment;
    private final boolean postgres;

    public SharedSecurityLimiter(JdbcTemplate jdbc, PlatformTransactionManager transactions, Environment environment) {
        this.jdbc = jdbc; this.environment = environment;
        isolated = new TransactionTemplate(transactions);
        isolated.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        isolated.setTimeout(5);
        postgres = Boolean.TRUE.equals(jdbc.execute((org.springframework.jdbc.core.ConnectionCallback<Boolean>)
                connection -> "PostgreSQL".equals(connection.getMetaData().getDatabaseProductName())));
    }

    public void check(String policy, int defaultLimit, long defaultSeconds, String identity) {
        int limit = environment.getProperty("app.security.limits." + policy + ".max", Integer.class, defaultLimit);
        long seconds = environment.getProperty("app.security.limits." + policy + ".seconds", Long.class, defaultSeconds);
        if (limit < 1 || limit > MAX_CONFIGURED_LIMIT || seconds < 1 || seconds > 86400) throw unavailable();
        if (LOGIN_FAILURES.equals(policy)) seconds = Math.min(60, seconds);
        final long windowSeconds = seconds;
        String key = key(policy, identity);
        Decision decision;
        try {
            decision = isolated.execute(status -> consume(key, limit, windowSeconds));
        } catch (DataAccessException | org.springframework.transaction.TransactionException failure) { throw unavailable(); }
        if (decision == null) throw unavailable();
        if (!decision.allowed()) throw new SecurityLimitException(decision.retryAfter());
    }

    private Decision consume(String key, int limit, long seconds) {
        if (postgres) {
            return jdbc.queryForObject("INSERT INTO security_rate_buckets(bucket_key,hits,expires_at) "
                    + "VALUES (?,1,statement_timestamp() + (? * interval '1 second')) "
                    + "ON CONFLICT (bucket_key) DO UPDATE SET "
                    + "hits=CASE WHEN security_rate_buckets.expires_at<=statement_timestamp() THEN 1 "
                    + "ELSE LEAST(security_rate_buckets.hits+1,?) END, "
                    + "expires_at=CASE WHEN security_rate_buckets.expires_at<=statement_timestamp() "
                    + "THEN statement_timestamp() + (? * interval '1 second') ELSE security_rate_buckets.expires_at END "
                    + "RETURNING hits, GREATEST(1,CEIL(EXTRACT(EPOCH FROM expires_at-clock_timestamp()))) AS retry",
                    (row, index) -> new Decision(row.getInt("hits") <= limit, row.getLong("retry")),
                    key, seconds, limit + 1, seconds);
        }
        // H2 only: the same row is locked for the complete read/update in regression tests.
        jdbc.update("MERGE INTO security_rate_buckets b USING (VALUES (?)) v(k) ON b.bucket_key=v.k "
                + "WHEN NOT MATCHED THEN INSERT(bucket_key,hits,expires_at) VALUES(v.k,0,CURRENT_TIMESTAMP)", key);
        return jdbc.queryForObject("SELECT hits,expires_at,CURRENT_TIMESTAMP AS db_now FROM security_rate_buckets "
                + "WHERE bucket_key=? FOR UPDATE", (row, index) -> {
                    LocalDateTime now = row.getTimestamp("db_now").toLocalDateTime();
                    LocalDateTime expiry = row.getTimestamp("expires_at").toLocalDateTime();
                    boolean expired = !expiry.isAfter(now);
                    int hits = expired ? 1 : Math.min(row.getInt("hits") + 1, limit + 1);
                    LocalDateTime nextExpiry = expired ? now.plusSeconds(seconds) : expiry;
                    jdbc.update("UPDATE security_rate_buckets SET hits=?,expires_at=? WHERE bucket_key=?",
                            hits, Timestamp.valueOf(nextExpiry), key);
                    return new Decision(hits <= limit, Math.max(1, (Duration.between(now, nextExpiry).toMillis() + 999) / 1000));
                }, key);
    }

    public void checkFailures(String identity) {
        try {
            Long retry = jdbc.query("SELECT hits,expires_at,CURRENT_TIMESTAMP AS db_now FROM security_rate_buckets WHERE bucket_key=?",
                    rows -> {
                        int maximum = environment.getProperty("app.security.limits.login-failures.max", Integer.class, 3);
                        if (!rows.next() || rows.getInt("hits") < maximum) return 0L;
                        LocalDateTime now = rows.getTimestamp("db_now").toLocalDateTime();
                        LocalDateTime expiry = rows.getTimestamp("expires_at").toLocalDateTime();
                        return expiry.isAfter(now) ? Math.max(1, (Duration.between(now, expiry).toMillis() + 999) / 1000) : 0L;
                    }, key("login-failures", identity));
            if (retry != null && retry > 0) throw new SecurityLimitException(retry);
        } catch (DataAccessException failure) { throw unavailable(); }
    }

    public void clearFailures(String identity) {
        try { isolated.executeWithoutResult(status -> jdbc.update("DELETE FROM security_rate_buckets WHERE bucket_key=?",
                key("login-failures", identity))); }
        catch (DataAccessException failure) { throw unavailable(); }
    }

    @Scheduled(initialDelay = 3600000, fixedDelay = 3600000)
    public void purge() {
        jdbc.update("DELETE FROM security_rate_buckets WHERE expires_at<CURRENT_TIMESTAMP");
    }

    private String key(String policy, String identity) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest((policy + "\n" + identity).getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException failure) { throw new IllegalStateException("SHA-256 no disponible", failure); }
    }
    private DomainException unavailable() {
        return new DomainException("security", HttpStatus.SERVICE_UNAVAILABLE,
                "No es posible completar esta operación de forma segura. Inténtalo nuevamente.");
    }
    private record Decision(boolean allowed, long retryAfter) { }
}
