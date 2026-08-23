package com.tesoreria.community.application.usecase;

import com.tesoreria.apoderado.infrastructure.adapter.out.persistence.repository.ApoderadoJpaRepository;
import com.tesoreria.community.infrastructure.persistence.*;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserJpaRepository;
import java.time.Year;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CourseBoardService {
    private static final String PASTORAL = "PASTORAL";
    private static final Set<String> ROLES = Set.of("PRESIDENTE", "VICEPRESIDENTE", "SECRETARIA", "TESORERO", PASTORAL);
    private static final List<String> ROLE_ORDER = List.of(
            "PRESIDENTE", "VICEPRESIDENTE", "SECRETARIA", "TESORERO", PASTORAL);
    private final BoardMemberJpaRepository members;
    private final ApoderadoJpaRepository apoderados;
    private final UserJpaRepository users;

    public CourseBoardService(BoardMemberJpaRepository members, ApoderadoJpaRepository apoderados,
                              UserJpaRepository users) {
        this.members = members; this.apoderados = apoderados; this.users = users;
    }

    @Transactional(readOnly = true)
    public List<MemberView> list(Integer year) {
        int selectedYear = normalizeYear(year);
        return members.findAllByElectionYearOrderByRoleAscPositionNumberAsc(selectedYear).stream()
                .sorted(Comparator.comparingInt((BoardMemberEntity member) -> ROLE_ORDER.indexOf(member.getRole()))
                        .thenComparing(BoardMemberEntity::getPositionNumber))
                .map(member -> {
            var parent = apoderados.findById(member.getApoderadoId()).orElseThrow(
                    () -> error(HttpStatus.NOT_FOUND, "Apoderado de la directiva no encontrado"));
            var user = users.findByCorreo(parent.getEmail()).orElse(null);
            return new MemberView(member.getId(), member.getElectionYear(), member.getRole(),
                    member.getPositionNumber(), parent.getCodigo(), parent.getNombre(), parent.getEmail(),
                    user == null ? "INITIALS" : user.getProfileImageType().name(),
                    user == null ? null : user.getProfileImageUrl(), user == null ? null : user.getId());
        }).toList();
    }

    @Transactional
    public MemberView assign(Integer year, String roleValue, Integer positionValue, String codigo) {
        int selectedYear = normalizeYear(year);
        String role = normalizeRole(roleValue);
        int position = normalizePosition(role, positionValue);
        var parent = apoderados.findByCodigo(codigo).orElseThrow(
                () -> error(HttpStatus.NOT_FOUND, "Apoderado no encontrado"));
        var existing = members.findByElectionYearAndRoleAndPositionNumber(selectedYear, role, position);
        if (members.existsByElectionYearAndApoderadoId(selectedYear, parent.getApoderadoId())
                && existing.map(value -> !value.getApoderadoId().equals(parent.getApoderadoId())).orElse(true))
            throw error(HttpStatus.CONFLICT, "El apoderado ya ocupa un cargo este año");
        BoardMemberEntity member = existing.orElseGet(BoardMemberEntity::new);
        member.setElectionYear(selectedYear); member.setRole(role); member.setPositionNumber(position);
        member.setApoderadoId(parent.getApoderadoId()); members.save(member);
        return list(selectedYear).stream().filter(item -> item.role().equals(role)
                && item.positionNumber().equals(position)).findFirst().orElseThrow();
    }

    @Transactional
    public void delete(Long id) {
        if (!members.existsById(id)) throw error(HttpStatus.NOT_FOUND, "Integrante de directiva no encontrado");
        members.deleteById(id);
    }

    private int normalizeYear(Integer year) {
        int value = year == null ? Year.now().getValue() : year;
        if (value < 2020 || value > Year.now().getValue() + 1) throw error(HttpStatus.BAD_REQUEST, "Año de elección inválido");
        return value;
    }
    private String normalizeRole(String value) {
        String role = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        if (!ROLES.contains(role)) throw error(HttpStatus.BAD_REQUEST, "Cargo de directiva inválido");
        return role;
    }
    private int normalizePosition(String role, Integer value) {
        int position = value == null ? 1 : value;
        if ((PASTORAL.equals(role) && (position < 1 || position > 2))
                || (!PASTORAL.equals(role) && position != 1))
            throw error(HttpStatus.BAD_REQUEST, "Posición de cargo inválida");
        return position;
    }
    private ResponseStatusException error(HttpStatus status, String message) { return new ResponseStatusException(status, message); }
    public record MemberView(Long id, Integer electionYear, String role, Integer positionNumber,
            String apoderadoCodigo, String nombre, String email, String profileImageType,
            String profileImageUrl, Long userId) { }
}
