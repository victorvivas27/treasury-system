package user;

import com.tesoreria.user.config.security.ClientIpResolver;
import com.tesoreria.user.config.security.TrustedProxyRequestFilter;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import static org.junit.jupiter.api.Assertions.*;

class TrustedProxyRequestFilterTest {
    @Test void authorizedTlsTerminatorPreservesSecureHeadersWithoutRewritingThePeer() throws Exception {
        var request = new MockHttpServletRequest(); request.setRemoteAddr("10.0.0.2");
        request.addHeader("X-Forwarded-Proto", "https"); request.addHeader("X-Forwarded-For", "198.51.100.9");
        new TrustedProxyRequestFilter(new ClientIpResolver("10.0.0.0/24")).doFilter(request, new MockHttpServletResponse(), (incoming, response) -> {
            var secured = (HttpServletRequest) incoming;
            assertTrue(secured.isSecure()); assertEquals("https", secured.getScheme()); assertEquals(443, secured.getServerPort());
            assertEquals("10.0.0.2", secured.getRemoteAddr());
        });
    }
    @Test void untrustedOrAmbiguousProtocolHeadersAreIgnored() throws Exception {
        for (String protocol : new String[]{"https", "http, https"}) {
            var request = new MockHttpServletRequest(); request.setRemoteAddr("198.51.100.5"); request.addHeader("X-Forwarded-Proto", protocol);
            new TrustedProxyRequestFilter(new ClientIpResolver("10.0.0.0/24")).doFilter(request, new MockHttpServletResponse(),
                    (incoming, response) -> assertFalse(((HttpServletRequest) incoming).isSecure()));
        }
        var request = new MockHttpServletRequest(); request.setRemoteAddr("10.0.0.2"); request.addHeader("X-Forwarded-Proto", "http, https");
        new TrustedProxyRequestFilter(new ClientIpResolver("10.0.0.0/24")).doFilter(request, new MockHttpServletResponse(),
                (incoming, response) -> assertFalse(((HttpServletRequest) incoming).isSecure()));
    }
}
