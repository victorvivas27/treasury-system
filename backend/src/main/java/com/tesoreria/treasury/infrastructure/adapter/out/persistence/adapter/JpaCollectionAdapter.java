package com.tesoreria.treasury.infrastructure.adapter.out.persistence.adapter;

import com.tesoreria.treasury.core.model.CollectionCampaign;
import com.tesoreria.treasury.core.port.out.CollectionRepository;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.*;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository.CollectionCampaignJpaRepository;
import org.springframework.stereotype.Repository;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class JpaCollectionAdapter implements CollectionRepository {
    private final CollectionCampaignJpaRepository repository;
    public JpaCollectionAdapter(CollectionCampaignJpaRepository repository) { this.repository = repository; }
    @Override public List<CollectionCampaign> list(int year) {
        return repository.findBySchoolYearOrderByCreatedAtDesc(year).stream().filter(e -> !e.isArchived()).map(this::model).toList();
    }
    @Override public Optional<CollectionCampaign> find(Long id, boolean lock) {
        return (lock ? repository.lockById(id) : repository.findById(id)).filter(e -> !e.isArchived()).map(this::model);
    }
    @Override public void archive(Long id) {
        var entity = repository.lockById(id).orElseThrow();
        entity.setArchived(true);
        repository.save(entity);
    }
    @Override public CollectionCampaign save(CollectionCampaign value) {
        var entity = value.id() == null ? new CollectionCampaignEntity() : repository.findById(value.id()).orElseThrow();
        entity.setSchoolYear(value.schoolYear()); entity.setTitle(value.title());
        entity.setDefaultAmount(value.defaultAmount()); entity.setDueDate(value.dueDate());
        entity.setCreatedBy(value.createdBy()); entity.setCreatedAt(value.createdAt());
        entity.setIncomeId(value.incomeId());
        entity.getParticipants().clear();
        value.participants().forEach(p -> {
            var item = new CollectionParticipantEmbeddable();
            item.setFamilyId(p.familyId()); item.setFamilyCode(p.familyCode()); item.setStudentName(p.studentName());
            item.setGuardian(p.guardian()); item.setCourse(p.course()); item.setExpectedAmount(p.expectedAmount());
            entity.getParticipants().add(item);
        });
        entity.getMovements().clear();
        value.movements().forEach(m -> {
            var item = new CollectionMovementEmbeddable();
            item.setRequestId(m.requestId()); item.setFamilyId(m.familyId()); item.setIncomeId(m.incomeId());
            item.setExpenseId(m.expenseId()); item.setAmount(m.amount()); item.setDate(m.date());
            item.setReference(m.reference()); item.setRecipient(m.recipient()); item.setCancelled(m.cancelled()); entity.getMovements().add(item);
        });
        return model(repository.save(entity));
    }
    private CollectionCampaign model(CollectionCampaignEntity e) {
        return new CollectionCampaign(e.getId(), e.getSchoolYear(), e.getTitle(), e.getDefaultAmount(),
            e.getDueDate(), e.getCreatedBy(), e.getCreatedAt(), e.getIncomeId(),
            e.getParticipants().stream().map(p -> new CollectionCampaign.Participant(p.getFamilyId(), p.getFamilyCode(),
                p.getStudentName(), p.getGuardian(), p.getCourse(), p.getExpectedAmount())).toList(),
            e.getMovements().stream().map(m -> new CollectionCampaign.Movement(m.getRequestId(), m.getFamilyId(),
                m.getIncomeId(), m.getExpenseId(), m.getAmount(), m.getDate(), m.getReference(), m.getRecipient(), m.isCancelled())).toList());
    }
}
