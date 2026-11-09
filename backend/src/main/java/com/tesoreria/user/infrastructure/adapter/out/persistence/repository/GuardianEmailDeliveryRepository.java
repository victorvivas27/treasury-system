package com.tesoreria.user.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.GuardianEmailDeliveryEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import java.util.Optional;

public interface GuardianEmailDeliveryRepository extends JpaRepository<GuardianEmailDeliveryEntity, Long> {
    Optional<GuardianEmailDeliveryEntity> findFirstByOrganizationIdAndGuardianIdOrderByIdDesc(Long organizationId, Long guardianId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<GuardianEmailDeliveryEntity> findByMessageId(String messageId);
}
