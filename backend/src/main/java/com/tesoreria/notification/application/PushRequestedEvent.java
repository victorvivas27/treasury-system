package com.tesoreria.notification.application;

import java.util.List;

public record PushRequestedEvent(String tag, String title, String message, String path,
                                 List<String> recipientEmails) { }
