package com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository;
import com.tesoreria.treasury.core.model.PaymentStatus;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.GenericPaymentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface GenericPaymentJpaRepository extends JpaRepository<GenericPaymentEntity, Long> {
    Optional<GenericPaymentEntity> findByExternalReference(String reference);
    List<GenericPaymentEntity> findByInstallmentIdInOrderByCreatedAtDesc(Collection<Long> ids);
    List<GenericPaymentEntity> findByStatusOrderByCreatedAtDesc(PaymentStatus status);
    List<GenericPaymentEntity> findAllByOrderByCreatedAtDesc();
    boolean existsByInstallmentIdAndStatusIn(Long id, Collection<PaymentStatus> statuses);
    Optional<GenericPaymentEntity> findFirstByInstallmentIdAndStatusOrderByCreatedAtDesc(Long id, PaymentStatus status);
    List<GenericPaymentEntity> findByInstallmentIdIn(Collection<Long> ids);
}
