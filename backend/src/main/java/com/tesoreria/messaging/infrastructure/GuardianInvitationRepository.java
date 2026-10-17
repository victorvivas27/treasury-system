package com.tesoreria.messaging.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import java.util.Optional;

public interface GuardianInvitationRepository extends JpaRepository<GuardianInvitationEntity, Long> {
    Optional<GuardianInvitationEntity> findFirstByGuardianIdAndOrganizationIdOrderByIdDesc(Long guardianId, Long organizationId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<GuardianInvitationEntity> findByMessageId(String messageId);
}
