package com.tesoreria.community.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BoardMemberJpaRepository extends JpaRepository<BoardMemberEntity, Long> {
    List<BoardMemberEntity> findAllByElectionYearOrderByRoleAscPositionNumberAsc(Integer year);
    Optional<BoardMemberEntity> findByElectionYearAndRoleAndPositionNumber(Integer year, String role, Integer position);
    boolean existsByElectionYearAndApoderadoId(Integer year, Long apoderadoId);
}
