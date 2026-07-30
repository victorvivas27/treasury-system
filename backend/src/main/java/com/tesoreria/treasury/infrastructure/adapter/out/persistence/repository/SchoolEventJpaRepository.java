package com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.SchoolEventEntity;

public interface SchoolEventJpaRepository extends JpaRepository<SchoolEventEntity, Long> {
  List<SchoolEventEntity> findBySchoolYearOrderByEventDateDesc(int schoolYear);
  boolean existsByNameIgnoreCase(String name);
  boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}
