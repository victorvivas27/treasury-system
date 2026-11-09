package com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository;

import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.CollectionCampaignEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface CollectionCampaignJpaRepository extends JpaRepository<CollectionCampaignEntity, Long> {
    List<CollectionCampaignEntity> findBySchoolYearOrderByCreatedAtDesc(int year);
    @Query("select c from CollectionCampaignEntity c join c.participants p where c.schoolYear = :year and p.familyId = :familyId order by c.createdAt desc")
    List<CollectionCampaignEntity> findForFamily(@Param("year") int year, @Param("familyId") Long familyId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from CollectionCampaignEntity c where c.id = :id")
    Optional<CollectionCampaignEntity> lockById(@Param("id") Long id);
}
