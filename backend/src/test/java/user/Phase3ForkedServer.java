package user;

import com.tesoreria.TesoreriaAppApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;

/** A separate JVM for the cross-process rate-limit test; no production configuration is loaded. */
public final class Phase3ForkedServer {
    private Phase3ForkedServer() { }
    public static void main(String[] args) throws Exception {
        var application = new SpringApplicationBuilder(TesoreriaAppApplication.class).profiles("test")
                .run(Arrays.copyOfRange(args, 1, args.length));
        int port = ((WebServerApplicationContext) application).getWebServer().getPort();
        Files.writeString(Path.of(args[0]), Integer.toString(port));
    }
}
