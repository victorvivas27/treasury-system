package performance;

import com.tesoreria.TesoreriaAppApplication;
import com.tesoreria.alumno.core.model.GeneroAlumno;
import com.tesoreria.alumno.infrastructure.adapter.out.persistence.repository.AlumnoJpaRepository;
import com.tesoreria.familia.infrastructure.adapter.out.persistence.repository.FamiliaJpaRepository;
import com.tesoreria.stand.core.model.StandPaymentMethod;
import com.tesoreria.stand.infrastructure.adapter.out.persistence.entity.StandSaleEntity;
import com.tesoreria.stand.infrastructure.adapter.out.persistence.repository.StandSaleJpaRepository;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@Tag("postgres")
@Testcontainers
@SpringBootTest(classes = TesoreriaAppApplication.class)
@TestPropertySource(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.jpa.database=postgresql",
        "spring.jpa.properties.hibernate.generate_statistics=true"
})
class PostgresPerformanceQueryIntegrationTest {
    @Container
    @ServiceConnection
    static final PostgreSQLContainer POSTGRES =
            new PostgreSQLContainer("postgres:16-alpine");

    @Autowired
    private JdbcTemplate jdbc;
    @Autowired
    private StandSaleJpaRepository sales;
    @Autowired
    private FamiliaJpaRepository families;
    @Autowired
    private AlumnoJpaRepository students;
    @Autowired
    private jakarta.persistence.EntityManagerFactory entityManagerFactory;

    @BeforeEach
    void clean() {
        jdbc.execute("TRUNCATE event_stand_sale_items, event_stand_sales, "
                + "event_stand_payment_methods, event_stand_products, event_stands, "
                + "school_event_expenses, school_event_participants, school_events, "
                + "familia_apoderados, familias, apoderados, alumnos RESTART IDENTITY CASCADE");
    }

    @Test
    void calculateEventNetRevenue_deberiaCoincidirExactamenteConAlgoritmoHistorico() {
        long eventId = insertEvent("Evento financiero");
        long standA = insertStand(eventId, "Stand A", "CLOSED", "1.9000", "0", "0");
        long standB = insertStand(eventId, "Stand B", "CLOSED", "0", "2.3500", "0.7500");
        long ignoredOpenStand = insertStand(eventId, "Stand abierto", "OPEN", "10", "10", "10");

        long debit = insertSale(standA, "DEBIT", "12000.00", null);
        insertItem(debit, 1, "Producto A", null, null, null, null,
                2, "6000.00", "2995.00", "12000.00", "5990.00");
        long cancelled = insertSale(standA, "CASH", "99999.99", "CANCELLED");
        insertItem(cancelled, 9, "Cancelado", null, null, null, null,
                1, "99999.99", "50000.00", "99999.99", "50000.00");

        long credit = insertSale(standB, "CREDIT", "3333.33", "ACTIVE");
        insertItem(credit, 2, "Producto B", "Comida", "Grande", "Porción", "0.5000",
                3, "1111.11", "100.10", "3333.33", "300.30");
        long transfer = insertSale(standB, "TRANSFER", "2222.22", null);
        insertItem(transfer, 3, "Producto C", "Bebida", null, null, null,
                1, "2222.22", "0.00", "2222.22", "0.00");
        insertSale(ignoredOpenStand, "CASH", "50000.00", "ACTIVE");

        BigDecimal expectedA = new BigDecimal("12000.00")
                .subtract(commission("12000.00", "1.9000"))
                .subtract(new BigDecimal("5990.00"));
        BigDecimal expectedB = new BigDecimal("5555.55")
                .subtract(commission("3333.33", "2.3500"))
                .subtract(commission("2222.22", "0.7500"))
                .subtract(new BigDecimal("300.30"));
        BigDecimal expected = expectedA.add(expectedB);

        BigDecimal result = sales.calculateEventNetRevenue(eventId);

        assertEquals(new BigDecimal("10942.25"), expected);
        assertEquals(expected, result);
        assertEquals(2, result.scale());
    }

    @Test
    void aggregateSales_deberiaAgruparMetodosExcluirCanceladasEIncluirStatusNull() {
        long eventId = insertEvent("Evento métodos");
        long standId = insertStand(eventId, "Stand", "CLOSED", "0", "0", "0");
        insertSale(standId, "CASH", "10.10", null);
        insertSale(standId, "CASH", "20.20", "ACTIVE");
        insertSale(standId, "DEBIT", "30.30", "ACTIVE");
        insertSale(standId, "CREDIT", "999.99", "CANCELLED");

        List<StandSaleJpaRepository.SaleAggregate> result = sales.aggregateSales(standId);

        assertEquals(2, result.size());
        assertAggregate(result, StandPaymentMethod.CASH, new BigDecimal("30.30"), 2);
        assertAggregate(result, StandPaymentMethod.DEBIT, new BigDecimal("30.30"), 1);
    }

    @Test
    void aggregateItems_deberiaPreservarBigDecimalNullsCostosYPresentaciones() {
        long eventId = insertEvent("Evento productos");
        long standId = insertStand(eventId, "Stand", "CLOSED", "0", "0", "0");
        long sale = insertSale(standId, "CASH", "48.60", null);
        insertItem(sale, 1, "Empanada", "Comida", "Queso", "Unidad", "0.5000",
                3, "10.10", "1.01", "30.30", "3.03");
        insertItem(sale, 2, "Jugo", null, null, null, null,
                2, "9.15", "0.00", "18.30", "0.00");
        long cancelled = insertSale(standId, "CASH", "100.00", "CANCELLED");
        insertItem(cancelled, 3, "Ignorado", "Otra", null, "Unidad", "1.0000",
                10, "10.00", "2.00", "100.00", "20.00");

        List<StandSaleJpaRepository.ItemAggregate> result = sales.aggregateItems(standId);

        assertEquals(2, result.size());
        var empanada = item(result, "Empanada");
        assertAll(() -> assertEquals(3, empanada.getUnits()),
                () -> assertEquals(new BigDecimal("30.30"), empanada.getTotal()),
                () -> assertEquals(new BigDecimal("3.03"), empanada.getCost()),
                () -> assertEquals(new BigDecimal("1.5000"), empanada.getEquivalentUnits()),
                () -> assertEquals("Unidad", empanada.getPresentation()));
        var juice = item(result, "Jugo");
        assertAll(() -> assertNull(juice.getCategory()),
                () -> assertNull(juice.getVariant()),
                () -> assertNull(juice.getPresentation()),
                () -> assertEquals(new BigDecimal("0.0000"), juice.getEquivalentUnits()),
                () -> assertEquals(new BigDecimal("0.00"), juice.getCost()));
    }

    @Test
    void aggregateQueries_deberianRetornarListasVaciasYCero() {
        long eventId = insertEvent("Evento vacío");
        long standId = insertStand(eventId, "Stand vacío", "CLOSED", "1.9", "2.3", "0.7");

        assertAll(() -> assertTrue(sales.aggregateSales(standId).isEmpty()),
                () -> assertTrue(sales.aggregateItems(standId).isEmpty()),
                () -> assertEquals(new BigDecimal("0"), sales.calculateEventNetRevenue(eventId)));
    }

    @Test
    void listSales_deberiaCargarVentasEItemsEnUnaSolaConsulta() {
        long eventId = insertEvent("Evento historial");
        long standId = insertStand(eventId, "Stand", "OPEN", "0", "0", "0");
        long firstSale = insertSale(standId, "CASH", "20.00", "ACTIVE");
        insertItem(firstSale, 1, "Producto A", "Comida", null, "Unidad", "1.0000",
                2, "10.00", "3.00", "20.00", "6.00");
        long secondSale = insertSale(standId, "DEBIT", "15.00", "ACTIVE");
        insertItem(secondSale, 2, "Producto B", "Bebida", null, "Unidad", "1.0000",
                1, "15.00", "5.00", "15.00", "5.00");

        var statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        statistics.clear();
        List<StandSaleEntity> result = sales.findByStandIdOrderBySoldAtDesc(standId);
        int loadedItems = result.stream().mapToInt(sale -> sale.getItems().size()).sum();

        assertAll(() -> assertEquals(2, result.size()),
                () -> assertEquals(2, loadedItems),
                () -> assertEquals(1, statistics.getPrepareStatementCount()));
    }

    @Test
    void familyTreasuryProjection_deberiaResolverLeftJoinYMultiplesFamilias() {
        long studentA = insertStudent("AL-00000001", "ALUMNO UNO", "1A");
        long studentB = insertStudent("AL-00000002", "ALUMNO DOS", "1A");
        long familyA = insertFamily(studentA, "FAM-001");
        insertFamily(studentB, "FAM-002");
        long principal = insertGuardian("AP-00000001", "APODERADO PRINCIPAL", "principal@test.cl");
        long secondary = insertGuardian("AP-00000002", "APODERADO SECUNDARIO", "secundario@test.cl");
        insertRelationship(familyA, principal, true);
        insertRelationship(familyA, secondary, false);

        List<FamiliaJpaRepository.FamilyTreasuryView> result = families.findTreasuryData(organizationId());

        assertEquals(2, result.size());
        assertAll(() -> assertEquals("FAM-001", result.get(0).getFamilyCode()),
                () -> assertEquals("ALUMNO UNO", result.get(0).getStudentName()),
                () -> assertEquals("APODERADO PRINCIPAL", result.get(0).getPrimaryGuardian()),
                () -> assertEquals("FAM-002", result.get(1).getFamilyCode()),
                () -> assertEquals("ALUMNO DOS", result.get(1).getStudentName()),
                () -> assertNull(result.get(1).getPrimaryGuardian()));
    }

    @Test
    void activeStudentComposition_deberiaAgruparSinExponerAlumnosInactivos() {
        long boy = insertStudent("AL-00000011", "ALUMNO UNO", "1A");
        long girl = insertStudent("AL-00000012", "ALUMNA DOS", "1A");
        long other = insertStudent("AL-00000013", "ALUMNO TRES", "1A");
        long inactive = insertStudent("AL-00000014", "ALUMNA INACTIVA", "1A");
        jdbc.update("UPDATE alumnos SET genero = 'MASCULINO' WHERE alumno_id = ?", boy);
        jdbc.update("UPDATE alumnos SET genero = 'FEMENINO' WHERE alumno_id = ?", girl);
        jdbc.update("UPDATE alumnos SET genero = 'OTROS' WHERE alumno_id = ?", other);
        jdbc.update("UPDATE alumnos SET genero = 'FEMENINO', activo = FALSE WHERE alumno_id = ?", inactive);

        List<AlumnoJpaRepository.ActiveGenderCount> result = students.countActiveByGender();

        assertAll(() -> assertEquals(1L, genderCount(result, GeneroAlumno.MASCULINO)),
                () -> assertEquals(1L, genderCount(result, GeneroAlumno.FEMENINO)),
                () -> assertEquals(1L, genderCount(result, GeneroAlumno.OTROS)));
    }

    private BigDecimal commission(String amount, String percentage) {
        return new BigDecimal(amount).multiply(new BigDecimal(percentage))
                .divide(new BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP);
    }

    private void assertAggregate(List<StandSaleJpaRepository.SaleAggregate> values,
                                 StandPaymentMethod method, BigDecimal total, long count) {
        var value = values.stream().filter(item -> item.getPaymentMethod() == method).findFirst().orElseThrow();
        assertAll(() -> assertEquals(total, value.getTotal()),
                () -> assertEquals(2, value.getTotal().scale()),
                () -> assertEquals(count, value.getSaleCount()));
    }

    private StandSaleJpaRepository.ItemAggregate item(
            List<StandSaleJpaRepository.ItemAggregate> values, String name) {
        return values.stream().filter(item -> name.equals(item.getProductName())).findFirst().orElseThrow();
    }

    private long genderCount(List<AlumnoJpaRepository.ActiveGenderCount> values,
                             GeneroAlumno gender) {
        return values.stream().filter(value -> value.getGender() == gender)
                .mapToLong(AlumnoJpaRepository.ActiveGenderCount::getTotal).findFirst().orElse(0);
    }

    private long insertEvent(String name) {
        return jdbc.queryForObject("""
                INSERT INTO school_events(name, school_year, event_date, status, organization_id,
                    settlement_confirmed, created_at, updated_at)
                VALUES (?, 2026, DATE '2026-08-01', 'OPEN', ?, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING id
                """, Long.class, name, organizationId());
    }

    private long insertStand(long eventId, String name, String status,
                             String debit, String credit, String transfer) {
        return jdbc.queryForObject("""
                        INSERT INTO event_stands(event_id, name, stand_date, start_time, end_time,
                            responsible, initial_fund, status, debit_commission, credit_commission,
                            transfer_commission, created_at, updated_at, version, organization_id)
                        VALUES (?, ?, DATE '2026-08-01', TIME '09:00', TIME '18:00', 'Responsable',
                            0, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, ?)
                        RETURNING id
                        """, Long.class, eventId, name, status, new BigDecimal(debit),
                new BigDecimal(credit), new BigDecimal(transfer), organizationId());
    }

    private long insertSale(long standId, String method, String total, String status) {
        return jdbc.queryForObject("""
                INSERT INTO event_stand_sales(stand_id, payment_method, total, registered_by,
                    sold_at, status, organization_id) VALUES (?, ?, ?, 'tester', CURRENT_TIMESTAMP, ?, ?)
                RETURNING id
                """, Long.class, standId, method, new BigDecimal(total), status, organizationId());
    }

    private void insertItem(long saleId, long productId, String name, String category,
                            String variant, String presentation, String equivalence, int quantity,
                            String price, String cost, String subtotal, String costSubtotal) {
        jdbc.update("""
                        INSERT INTO event_stand_sale_items(sale_id, product_id, product_name, category,
                            variant, presentation, unit_equivalence, quantity, unit_price, unit_cost,
                            subtotal, cost_subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, saleId, productId, name, category, variant, presentation,
                equivalence == null ? null : new BigDecimal(equivalence), quantity,
                new BigDecimal(price), new BigDecimal(cost), new BigDecimal(subtotal),
                new BigDecimal(costSubtotal));
    }

    private long insertStudent(String code, String name, String course) {
        return jdbc.queryForObject("INSERT INTO alumnos(codigo, nombre, curso, organization_id) "
                        + "VALUES (?, ?, ?, ?) RETURNING alumno_id",
                Long.class, code, name, course, organizationId());
    }

    private long insertFamily(long studentId, String code) {
        return jdbc.queryForObject("INSERT INTO familias(alumno_id, codigo, organization_id) "
                        + "VALUES (?, ?, ?) RETURNING familia_id",
                Long.class, studentId, code, organizationId());
    }

    private long insertGuardian(String code, String name, String email) {
        return jdbc.queryForObject("""
                INSERT INTO apoderados(codigo, nombre, email, telefono, organization_id)
                VALUES (?, ?, ?, '+56912345678', ?) RETURNING apoderado_id
                """, Long.class, code, name, email, organizationId());
    }

    private void insertRelationship(long familyId, long guardianId, boolean primary) {
        jdbc.update("""
                INSERT INTO familia_apoderados(familia_id, apoderado_id, parentesco, es_principal)
                VALUES (?, ?, 'MADRE', ?)
                """, familyId, guardianId, primary);
    }

    private Long organizationId() {
        return jdbc.queryForObject("SELECT id FROM organizations WHERE slug = 'default'", Long.class);
    }
}
