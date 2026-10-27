package user;

import com.tesoreria.user.config.security.ClientIpResolver;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import static org.junit.jupiter.api.Assertions.*;

class ClientIpResolverTest {
    MockHttpServletRequest request(String peer, String chain) {
        var request = new MockHttpServletRequest(); request.setRemoteAddr(peer);
        request.addHeader("X-Forwarded-For", chain); request.addHeader("Forwarded", "for=192.0.2.250");
        return request;
    }
    @Test void ignoresClientSuppliedHeadersWithoutExplicitProxyTrust() {
        assertEquals("198.51.100.5", new ClientIpResolver("").resolve(request("198.51.100.5", "192.0.2.9")));
    }
    @Test void walksFromTheTrustedPeerAndStopsAtTheFirstUntrustedHop() {
        var resolver = new ClientIpResolver("10.0.0.0/24,2001:db8::/64");
        assertEquals("198.51.100.5", resolver.resolve(request("10.0.0.2", "192.0.2.9,198.51.100.5,10.0.0.3")));
        assertEquals("198.51.100.5", resolver.resolve(request("2001:db8::2", "198.51.100.5")));
    }
    @Test void malformedChainsAndHostnamesFallBackToTheSocketPeerWithoutDnsTrust() {
        var resolver = new ClientIpResolver("10.0.0.0/24");
        for (String chain : new String[]{"example.com", "", "192.0.2.1,", "1.2.3.4,".repeat(30), "x".repeat(2000)}) {
            assertEquals("10.0.0.2", resolver.resolve(request("10.0.0.2", chain)));
        }
    }
    @Test void untrustedProxyCannotInjectAnAddressEvenWithAPlausibleTrustedHop() {
        assertEquals("203.0.113.5", new ClientIpResolver("10.0.0.0/24")
                .resolve(request("203.0.113.5", "192.0.2.1,10.0.0.2")));
    }
}
