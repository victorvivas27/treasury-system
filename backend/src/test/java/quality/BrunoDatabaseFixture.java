package quality;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.sql.DriverManager;
import java.time.Year;
import java.util.UUID;

/** Seed only an empty, explicitly named disposable database; never changes application authorization. */
public final class BrunoDatabaseFixture {
    private BrunoDatabaseFixture() { }

    public static void main(String[] args) throws Exception {
        String url = System.getenv("BRUNO_TEST_JDBC_URL");
        String password = System.getenv("BRUNO_SEED_PASSWORD");
        if (url == null || !url.matches("jdbc:postgresql://(?:localhost|127\\.0\\.0\\.1):[0-9]+/(?:bruno_[a-zA-Z0-9_]+|treasury_ci)")
                || password == null || password.length() < 16) {
            throw new IllegalArgumentException("Explicit disposable Bruno database and fixture password required");
        }
        try (var connection = DriverManager.getConnection(url, System.getenv("BRUNO_TEST_DB_USER"), System.getenv("BRUNO_TEST_DB_PASSWORD"))) {
            connection.setAutoCommit(false);
            try (var lock = connection.createStatement()) {
                lock.execute("LOCK TABLE users IN EXCLUSIVE MODE");
                try (var users = lock.executeQuery("SELECT COUNT(*) FROM users")) {
                    users.next();
                    if (users.getLong(1) != 0) throw new IllegalStateException("Bruno seeding requires an empty users table");
                }
            }
            long organizationId;
            try (var organization = connection.prepareStatement("INSERT INTO organizations (name, slug, type, active, school_year, created_at, updated_at) VALUES (?, ?, 'COURSE', true, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id")) {
                organization.setString(1, "Bruno Coverage");
                organization.setString(2, "bruno-" + UUID.randomUUID());
                organization.setInt(3, Year.now().getValue());
                try (var created = organization.executeQuery()) { created.next(); organizationId = created.getLong(1); }
            }
            try (var user = connection.prepareStatement("INSERT INTO users (code, nombre, correo, password, rol, organization_id, enabled, account_non_locked, email_verified_at, profile_image_type, totp_enabled, created_at, updated_at) VALUES (?, 'Bruno Admin', 'admin@bruno.invalid', ?, 'ADMIN', ?, true, true, CURRENT_TIMESTAMP, 'INITIALS', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)")) {
                user.setString(1, "USR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(java.util.Locale.ROOT));
                user.setString(2, new BCryptPasswordEncoder().encode(password));
                user.setLong(3, organizationId);
                user.executeUpdate();
            }
            connection.commit();
        }
        System.out.println("Disposable Bruno administrator prepared");
    }
}
