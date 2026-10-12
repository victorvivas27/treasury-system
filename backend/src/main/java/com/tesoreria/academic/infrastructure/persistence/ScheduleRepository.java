package com.tesoreria.academic.infrastructure.persistence;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface ScheduleRepository extends JpaRepository<ScheduleEntity, Long> {
    Optional<ScheduleEntity> findByOrganizationIdAndPeriodId(Long organizationId, Long periodId);
}
