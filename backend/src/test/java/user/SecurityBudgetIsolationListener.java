package user;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestContext;
import org.springframework.test.context.support.AbstractTestExecutionListener;

/** Tests must not inherit the previous test's IP budget or queued mail. Runs before test transactions. */
public class SecurityBudgetIsolationListener extends AbstractTestExecutionListener {
    @Override public int getOrder() { return 2500; }
    @Override public void beforeTestMethod(TestContext context) {
        var application = context.getApplicationContext();
        if (!application.containsBean("sharedSecurityLimiter")) return;
        var jdbc = application.getBean(JdbcTemplate.class);
        jdbc.update("DELETE FROM security_rate_buckets");
        jdbc.update("DELETE FROM security_mail_requests");
    }
}
