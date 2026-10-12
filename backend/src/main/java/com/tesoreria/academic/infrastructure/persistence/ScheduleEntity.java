package com.tesoreria.academic.infrastructure.persistence;

import com.tesoreria.organization.infrastructure.persistence.TenantScopedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "academic_schedules")
public class ScheduleEntity extends TenantScopedEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "period_id", nullable = false)
    private Long periodId;
    @Column(name = "draft_json", nullable = false, columnDefinition = "text")
    private String draft;
    @Column(name = "published_json", columnDefinition = "text")
    private String published;
    @Version
    private Long version;
    public Long getPeriodId() { return periodId; }
    public void setPeriodId(Long value) { periodId = value; }
    public String getDraft() { return draft; }
    public void setDraft(String value) { draft = value; }
    public String getPublished() { return published; }
    public void setPublished(String value) { published = value; }
}
