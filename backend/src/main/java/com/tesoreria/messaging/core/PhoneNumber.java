package com.tesoreria.messaging.core;

import com.tesoreria.shared.domain.exception.DomainException;
import org.springframework.http.HttpStatus;

public final class PhoneNumber {
    private PhoneNumber() { }

    public static String normalize(String value) {
        String phone = value == null ? "" : value.trim().replaceAll("[ ()-]", "");
        if (phone.matches("9[0-9]{8}")) phone = new StringBuilder("+56").append(phone).toString();
        else if (phone.matches("569[0-9]{8}")) phone = new StringBuilder("+").append(phone).toString();
        if (!phone.matches("\\+[1-9][0-9]{7,14}")
                || (phone.startsWith("+56") && !phone.matches("\\+569[0-9]{8}"))) {
            throw new DomainException("telefono", HttpStatus.BAD_REQUEST,
                    "Ingrese un movil chileno +569XXXXXXXX o un numero internacional E.164 valido.");
        }
        return phone;
    }
}
