package com.tesoreria.user.infrastructure.adapter.in.web.dto.twofactor;

import java.util.List;

public record TwoFactorSetupResponse(
        String secret,
        String qrCodeUri,
        List<String> backupCodes
) { }