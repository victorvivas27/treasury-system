package academic;
import com.tesoreria.academic.core.Schedule;
import com.tesoreria.academic.core.Schedule.Block;
import com.tesoreria.academic.core.Schedule.BlockType;
import com.tesoreria.academic.core.Schedule.Day;
import com.tesoreria.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class ScheduleValidationTest {
    private LocalTime time(String value) { return LocalTime.parse(value); }
    private Block block(String start, String end, BlockType type, String name) {
        return new Block(1, time(start), time(end), type, name, 0, null);
    }
    private Schedule schedule(Block... blocks) {
        return new Schedule(List.of(new Day(1, time("12:00"), time("16:00"), Arrays.asList(blocks))));
    }
    @Test void acceptsGapsVariableDurationsAndNonSubjectBlocks() {
        assertDoesNotThrow(() -> schedule(block("12:00", "12:45", BlockType.SUBJECT, "Lenguaje"),
                block("13:00", "13:15", BlockType.BREAK, null),
                block("13:15", "13:40", BlockType.LUNCH, null),
                block("13:40", "13:55", BlockType.SNACK, null),
                block("14:00", "15:00", BlockType.ACTIVITY, "Taller")).validate());
    }
    @Test void rejectsOverlapIncludingBreaks() {
        assertThrows(DomainException.class, () -> schedule(block("12:00", "13:00", BlockType.SUBJECT, "Lenguaje"),
                block("12:50", "13:15", BlockType.BREAK, null)).validate());
    }
    @Test void rejectsOutsideDayAndReversedTimes() {
        assertThrows(DomainException.class, () -> schedule(block("11:00", "13:00", BlockType.BREAK, null)).validate());
        assertThrows(DomainException.class, () -> schedule(block("15:00", "16:01", BlockType.BREAK, null)).validate());
        assertThrows(DomainException.class, () -> schedule(block("14:00", "13:00", BlockType.BREAK, null)).validate());
        assertThrows(DomainException.class, () -> new Schedule(List.of(
                new Day(1, time("16:00"), time("12:00"), List.of()))).validate());
    }
    @Test void rejectsMissingSubjectAndActivityAndInvalidColor() {
        assertThrows(DomainException.class, () -> schedule(block("12:00", "13:00", BlockType.SUBJECT, "")).validate());
        assertThrows(DomainException.class, () -> schedule(block("12:00", "13:00", BlockType.ACTIVITY, null)).validate());
        assertThrows(DomainException.class, () -> schedule(new Block(1, time("12:00"), time("13:00"),
                BlockType.BREAK, null, 0, "red")).validate());
    }
    @Test void rejectsWeekendDuplicateDayAndMismatchedBlockDay() {
        Day day = new Day(1, time("12:00"), time("16:00"), List.of());
        assertThrows(DomainException.class, () -> new Schedule(List.of(day, day)).validate());
        assertThrows(DomainException.class, () -> new Schedule(List.of(
                new Day(6, time("12:00"), time("16:00"), List.of()))).validate());
        assertThrows(DomainException.class, () -> schedule(new Block(2, time("12:00"), time("13:00"),
                BlockType.BREAK, null, 0, null)).validate());
    }
    @Test void rejectsNullCollectionsAndNullItems() {
        assertThrows(DomainException.class, () -> new Schedule(null).validate());
        assertThrows(DomainException.class, () -> new Schedule(Arrays.asList((Day) null)).validate());
        assertThrows(DomainException.class, () -> new Schedule(List.of(new Day(1, time("12:00"), time("16:00"), null))).validate());
        assertThrows(DomainException.class, () -> schedule((Block) null).validate());
    }
}
