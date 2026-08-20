package com.tesoreria.community.infrastructure.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AboutSectionJpaRepository extends JpaRepository<AboutSectionEntity, Long> {
    List<AboutSectionEntity> findAllByOrderByDisplayOrderAscIdAsc();
    List<AboutSectionEntity> findByVisibleTrueOrderByDisplayOrderAscIdAsc();
}
