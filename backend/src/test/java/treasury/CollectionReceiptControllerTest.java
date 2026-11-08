package treasury;

import com.tesoreria.familia.core.port.in.GetFamiliaUseCase;
import com.tesoreria.treasury.application.usecase.CollectionReceiptService;
import com.tesoreria.treasury.application.usecase.CollectionService;
import com.tesoreria.treasury.infrastructure.adapter.in.web.controller.CollectionController;
import com.tesoreria.treasury.infrastructure.adapter.in.web.controller.CollectionReceiptController;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class CollectionReceiptControllerTest {
    @Test void acceptsBothJsonAndMultipartWithoutAmbiguousRoutes() throws Exception {
        var service = mock(CollectionService.class);
        var receipts = mock(CollectionReceiptService.class);
        var mvc = MockMvcBuilders.standaloneSetup(new CollectionController(service, mock(GetFamiliaUseCase.class)),
            new CollectionReceiptController(receipts)).build();
        var requestId = UUID.randomUUID();
        String json = "{\"amount\":1000,\"date\":\"2026-01-01\",\"reference\":\"A\",\"requestId\":\"" + requestId + "\"}";
        String url = "/api/v1/tesoreria/recaudaciones/1/familias/2/pagos";
        mvc.perform(post(url).contentType("application/json").content(json).principal(() -> "admin"))
            .andExpect(status().isOk());
        verify(service).collect(1L, 2L, BigDecimal.valueOf(1000), LocalDate.of(2026, 1, 1), "A", requestId, "admin");
        var payment = new MockMultipartFile("payment", "", "application/json", json.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        var file = new MockMultipartFile("file", "pago.pdf", "application/pdf", "%PDF-1.7 prueba".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        mvc.perform(multipart(url).file(payment).file(file).principal(() -> "admin"))
            .andExpect(status().isOk());
        verify(receipts).collect(1L, 2L, BigDecimal.valueOf(1000), LocalDate.of(2026, 1, 1), "A", requestId, file, "admin");
        mvc.perform(multipart(url).file(file).principal(() -> "admin"))
            .andExpect(status().isBadRequest());
    }
}
