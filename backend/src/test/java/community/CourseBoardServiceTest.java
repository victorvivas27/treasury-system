package community;

import com.tesoreria.apoderado.infrastructure.adapter.out.persistence.entity.ApoderadoEntity;
import com.tesoreria.apoderado.infrastructure.adapter.out.persistence.repository.ApoderadoJpaRepository;
import com.tesoreria.community.application.usecase.CourseBoardService;
import com.tesoreria.community.infrastructure.persistence.*;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserJpaRepository;
import java.time.Year;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CourseBoardServiceTest {
    @Mock private BoardMemberJpaRepository members;
    @Mock private ApoderadoJpaRepository parents;
    @Mock private UserJpaRepository users;
    private CourseBoardService service;
    private final int year = Year.now().getValue();

    @BeforeEach void setUp() { service = new CourseBoardService(members, parents, users); }

    @Test void assignDeberiaCrearCargoConDatosDelApoderado() {
        ApoderadoEntity parent = parent();
        when(parents.findByCodigo("AP-12345678")).thenReturn(Optional.of(parent));
        when(members.findByElectionYearAndRoleAndPositionNumber(year, "PRESIDENTE", 1))
                .thenReturn(Optional.empty());
        when(members.existsByElectionYearAndApoderadoId(year, 7L)).thenReturn(false);
        when(members.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(members.findAllByElectionYearOrderByRoleAscPositionNumberAsc(year)).thenAnswer(invocation -> {
            BoardMemberEntity member = new BoardMemberEntity(); member.setElectionYear(year);
            member.setRole("PRESIDENTE"); member.setPositionNumber(1); member.setApoderadoId(7L);
            return List.of(member);
        });
        when(parents.findById(7L)).thenReturn(Optional.of(parent));
        when(users.findByCorreoAndOrganizationId("ana@correo.cl", null)).thenReturn(Optional.empty());
        var result = service.assign(year, "presidente", 1, "AP-12345678");
        assertAll(() -> assertEquals("Ana Pérez", result.nombre()),
                () -> assertEquals("INITIALS", result.profileImageType()));
        verify(members).save(any(BoardMemberEntity.class));
    }

    @Test void assignDeberiaImpedirDuplicadoYPosicionInvalida() {
        ApoderadoEntity parent = parent();
        when(parents.findByCodigo("AP-12345678")).thenReturn(Optional.of(parent));
        when(members.findByElectionYearAndRoleAndPositionNumber(year, "TESORERO", 1))
                .thenReturn(Optional.empty());
        when(members.existsByElectionYearAndApoderadoId(year, 7L)).thenReturn(true);
        assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class,
                () -> service.assign(year, "TESORERO", 1, "AP-12345678")).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> service.assign(year, "PASTORAL", 3, "AP-12345678")).getStatusCode());
    }

    @Test void deleteDeberiaValidarExistencia() {
        when(members.existsById(1L)).thenReturn(true);
        service.delete(1L); verify(members).deleteById(1L);
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class,
                () -> service.delete(9L)).getStatusCode());
    }

    @Test void listDeberiaOrdenarPorJerarquiaDelCargo() {
        ApoderadoEntity parent = parent();
        BoardMemberEntity pastoral = member("PASTORAL", 1);
        BoardMemberEntity treasurer = member("TESORERO", 1);
        BoardMemberEntity president = member("PRESIDENTE", 1);
        when(members.findAllByElectionYearOrderByRoleAscPositionNumberAsc(year))
                .thenReturn(List.of(pastoral, treasurer, president));
        when(parents.findById(7L)).thenReturn(Optional.of(parent));
        when(users.findByCorreoAndOrganizationId("ana@correo.cl", null)).thenReturn(Optional.empty());
        assertEquals(List.of("PRESIDENTE", "TESORERO", "PASTORAL"),
                service.list(year).stream().map(CourseBoardService.MemberView::role).toList());
    }

    private BoardMemberEntity member(String role, int position) {
        BoardMemberEntity member = new BoardMemberEntity();
        member.setElectionYear(year); member.setRole(role); member.setPositionNumber(position);
        member.setApoderadoId(7L); return member;
    }

    private ApoderadoEntity parent() {
        return new ApoderadoEntity(7L, "AP-12345678", "Ana Pérez", "ana@correo.cl", "+56912345678", null);
    }
}
