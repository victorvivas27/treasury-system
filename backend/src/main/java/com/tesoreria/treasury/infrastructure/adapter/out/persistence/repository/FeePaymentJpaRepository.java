package com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository;

import java.util.Collection;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.FeePaymentEntity;

public interface FeePaymentJpaRepository extends JpaRepository<FeePaymentEntity, Long> {
  Optional<FeePaymentEntity> findFirstByObligationIdAndAnnulledFalse(Long obligationId);
  boolean existsByObligationIdInAndAnnulledFalse(Collection<Long> obligationIds);
}
