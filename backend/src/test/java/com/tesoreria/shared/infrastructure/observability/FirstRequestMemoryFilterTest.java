package com.tesoreria.shared.infrastructure.observability;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

class FirstRequestMemoryFilterTest {
    @Test
    void recordsOnlyOneCompletedRequestWithoutInspectingRequestData() throws ServletException, IOException {
        MemoryObservability observability = mock(MemoryObservability.class);
        ExposedFilter filter = new ExposedFilter(observability);
        FilterChain chain = (request, response) -> { };

        filter.apply(new MockHttpServletRequest("POST", "/api/v1/auth/refresh?token=private"),
                new MockHttpServletResponse(), chain);
        filter.apply(new MockHttpServletRequest("GET", "/api/v1/users?email=private@example.test"),
                new MockHttpServletResponse(), chain);

        verify(observability, times(1)).observe("first_http_request_completed");
    }

    private static final class ExposedFilter extends FirstRequestMemoryFilter {
        private ExposedFilter(MemoryObservability observability) {
            super(observability);
        }

        private void apply(MockHttpServletRequest request, MockHttpServletResponse response,
                           FilterChain chain) throws ServletException, IOException {
            doFilterInternal(request, response, chain);
        }
    }
}
