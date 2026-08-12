package com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.SchoolEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SchoolEventJpaRepository extends JpaRepository<SchoolEventEntity, Long> {
    List<SchoolEventEntity> findBySchoolYearOrderByEventDateDesc(int schoolYear);

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}
