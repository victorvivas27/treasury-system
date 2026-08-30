package com.tesoreria.organization.infrastructure.persistence;

import com.tesoreria.organization.core.model.OrganizationType;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "organizations")
public class OrganizationEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 150)
    private String name;
    @Column(nullable = false, unique = true, length = 150)
    private String slug;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private OrganizationType type = OrganizationType.COURSE;
    @Column(nullable = false)
    private boolean active = true;
    @Column(name = "course_name", length = 80)
    private String courseName;
    @Column(name = "school_year", nullable = false)
    private Integer schoolYear;
    @Column(name = "sender_name", length = 150)
    private String senderName;
    @Column(name = "reply_to_email", length = 150)
    private String replyToEmail;
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long value) { id = value; }
    public String getName() { return name; }
    public void setName(String value) { name = value; }
    public String getSlug() { return slug; }
    public void setSlug(String value) { slug = value; }
    public OrganizationType getType() { return type; }
    public void setType(OrganizationType value) { type = value; }
    public boolean isActive() { return active; }
    public void setActive(boolean value) { active = value; }
    public String getCourseName() { return courseName; }
    public void setCourseName(String value) { courseName = value; }
    public Integer getSchoolYear() { return schoolYear; }
    public void setSchoolYear(Integer value) { schoolYear = value; }
    public String getSenderName() { return senderName; }
    public void setSenderName(String value) { senderName = value; }
    public String getReplyToEmail() { return replyToEmail; }
    public void setReplyToEmail(String value) { replyToEmail = value; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
