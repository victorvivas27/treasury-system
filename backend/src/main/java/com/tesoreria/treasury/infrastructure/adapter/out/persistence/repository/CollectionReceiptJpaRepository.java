package com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.CollectionReceiptEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CollectionReceiptJpaRepository extends JpaRepository<CollectionReceiptEntity, Long> {
    List<CollectionReceiptEntity> findAllByCampaignId(Long campaignId);
    Optional<CollectionReceiptEntity> findByCampaignIdAndRequestId(Long campaignId, String requestId);
}
