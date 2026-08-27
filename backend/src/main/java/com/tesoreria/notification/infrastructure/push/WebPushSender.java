package com.tesoreria.notification.infrastructure.push;

import com.tesoreria.notification.config.WebPushProperties;
import com.tesoreria.notification.infrastructure.persistence.WebPushSubscriptionEntity;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.apache.http.HttpResponse;
import org.apache.http.util.EntityUtils;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.stereotype.Component;
import java.security.GeneralSecurityException;
import java.security.Security;

@Component
public class WebPushSender {
    private final PushService pushService;

    public WebPushSender(WebPushProperties properties) {
        if (!properties.configured()) {
            pushService = null;
            return;
        }
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
        try {
            pushService = new PushService(properties.publicKey(), properties.privateKey(),
                    properties.subject());
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Las claves VAPID configuradas no son válidas", exception);
        }
    }

    public SendResult send(WebPushSubscriptionEntity subscription, String payload) throws Exception {
        if (pushService == null) return SendResult.DISABLED;
        Notification notification = new Notification(subscription.getEndpoint(),
                subscription.getP256dh(), subscription.getAuth(), payload);
        HttpResponse response = pushService.send(notification);
        int status = response.getStatusLine().getStatusCode();
        EntityUtils.consumeQuietly(response.getEntity());
        if (status == 404 || status == 410) return SendResult.EXPIRED;
        if (status >= 200 && status < 300) return SendResult.SENT;
        throw new IllegalStateException("El servicio push respondió con estado " + status);
    }

    public enum SendResult { SENT, EXPIRED, DISABLED }
}
