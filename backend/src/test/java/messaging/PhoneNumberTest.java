package messaging;
import com.tesoreria.messaging.core.PhoneNumber;
import com.tesoreria.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class PhoneNumberTest {
 @Test void normalizesChileanMobileAndInternationalNumbers() {
  assertEquals("+56912345678", PhoneNumber.normalize("9 1234 5678"));
  assertEquals("+56912345678", PhoneNumber.normalize("56 9 1234-5678"));
  assertEquals("+56912345678", PhoneNumber.normalize("+56 (9) 12345678"));
  assertEquals("+14155552671", PhoneNumber.normalize("+14155552671"));
 }
 @Test void rejectsInvalidPhones() {
  for (String value : new String[]{"", "123", "+56212345678", "+56012345678", "5691234567", "+569123456789", "+56912345678x", "+00000000"})
   assertThrows(DomainException.class, () -> PhoneNumber.normalize(value));
  assertThrows(DomainException.class, () -> PhoneNumber.normalize(null));
 }
}
