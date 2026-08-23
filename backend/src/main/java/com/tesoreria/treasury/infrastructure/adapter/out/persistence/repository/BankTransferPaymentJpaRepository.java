package com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.BankTransferPaymentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface BankTransferPaymentJpaRepository extends JpaRepository<BankTransferPaymentEntity, Long> {
    Optional<BankTransferPaymentEntity> findByPaymentId(Long paymentId);
    List<BankTransferPaymentEntity> findByPaymentIdIn(Collection<Long> paymentIds);
}
