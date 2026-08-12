package com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.FeePaymentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface FeePaymentJpaRepository extends JpaRepository<FeePaymentEntity, Long> {
    Optional<FeePaymentEntity> findFirstByObligationIdAndAnnulledFalse(Long obligationId);

    List<FeePaymentEntity> findByObligationIdInAndAnnulledFalse(Collection<Long> obligationIds);

    boolean existsByObligationIdInAndAnnulledFalse(Collection<Long> obligationIds);

    void deleteByObligationIdIn(Collection<Long> obligationIds);
}
