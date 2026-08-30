package com.tesoreria.organization.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "organization_school_periods", uniqueConstraints =
        @UniqueConstraint(name = "uk_school_period_organization_year",
                columnNames = {"organization_id", "school_year"}))
public class OrganizationSchoolPeriodEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "organization_id", nullable = false)
    private Long organizationId;
    @Column(name = "school_year", nullable = false)
    private Integer schoolYear;
    @Column(name = "course_name", nullable = false, length = 80)
    private String courseName;
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public Long getOrganizationId() { return organizationId; }
    public void setOrganizationId(Long value) { organizationId = value; }
    public Integer getSchoolYear() { return schoolYear; }
    public void setSchoolYear(Integer value) { schoolYear = value; }
    public String getCourseName() { return courseName; }
    public void setCourseName(String value) { courseName = value; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
