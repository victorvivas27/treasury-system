package com.tesoreria.shared.infrastructure.web;

import java.sql.Connection;
import java.sql.SQLException;
import javax.sql.DataSource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ServiceAvailabilityController {
    private final DataSource dataSource;

    public ServiceAvailabilityController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping("/api/v1/service-availability")
    public ResponseEntity<Void> availability() {
        try (Connection connection = dataSource.getConnection()) {
            return ResponseEntity.status(connection.isValid(2) ? HttpStatus.NO_CONTENT : HttpStatus.SERVICE_UNAVAILABLE)
                    .cacheControl(CacheControl.noStore()).build();
        } catch (SQLException exception) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).cacheControl(CacheControl.noStore()).build();
        }
    }
}
