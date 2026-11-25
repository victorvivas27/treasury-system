package com.tesoreria.shared.infrastructure.web;

import java.sql.Connection;
import java.sql.SQLException;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class ServiceAvailabilityControllerTest {
    @Test
    void reportsAvailableOnlyWhenDatabaseConnectionIsValid() throws SQLException {
        DataSource source = mock(DataSource.class);
        Connection connection = mock(Connection.class);
        when(source.getConnection()).thenReturn(connection);
        when(connection.isValid(2)).thenReturn(true, false);
        ServiceAvailabilityController controller = new ServiceAvailabilityController(source);
        assertEquals(HttpStatus.NO_CONTENT, controller.availability().getStatusCode());
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, controller.availability().getStatusCode());
        verify(connection, times(2)).close();
    }

    @Test
    void reportsUnavailableWithoutExposingDatabaseFailure() throws SQLException {
        DataSource source = mock(DataSource.class);
        when(source.getConnection()).thenThrow(new SQLException("private details"));
        var response = new ServiceAvailabilityController(source).availability();
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertEquals(null, response.getBody());
    }
}
