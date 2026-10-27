package com.tesoreria.user.config.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.web.util.matcher.IpAddressMatcher;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.Arrays;
import java.util.List;

@Component
public class ClientIpResolver {
    private static final int MAX_PROXY_HOPS = 20;
    private final List<IpAddressMatcher> trusted;
    public ClientIpResolver(@Value("${app.security.trusted-proxies:}") String proxies) {
        trusted = Arrays.stream(proxies.split(",")).map(String::trim).filter(value -> !value.isEmpty())
                .map(IpAddressMatcher::new).toList();
    }
    public String current() {
        return RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes
                ? resolve(attributes.getRequest()) : "internal";
    }
    public String resolve(HttpServletRequest request) {
        String peer = literal(request.getRemoteAddr());
        if (peer == null) return "unknown";
        String forwarded = request.getHeader("X-Forwarded-For");
        if (!isTrusted(peer) || forwarded == null || forwarded.length() > 1024) return peer;
        String[] chain = forwarded.split(",", -1);
        if (chain.length > MAX_PROXY_HOPS) return peer;
        String candidate = peer;
        for (int index = chain.length - 1; index >= 0 && isTrusted(candidate); index--) {
            String next = literal(chain[index].trim());
            if (next == null) return peer;
            candidate = next;
        }
        return candidate;
    }
    public boolean isTrustedConnection(HttpServletRequest request) {
        String peer = literal(request.getRemoteAddr());
        return peer != null && isTrusted(peer);
    }
    private boolean isTrusted(String address) { return trusted.stream().anyMatch(proxy -> proxy.matches(address)); }
    private String literal(String value) {
        if (value == null || value.length() > 45 || !value.matches("[0-9a-fA-F:.]+")
                || (!value.contains(":") && !value.matches("[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+"))) return null;
        try { return InetAddress.getByName(value).getHostAddress(); }
        catch (UnknownHostException failure) { return null; }
    }
}
