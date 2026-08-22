package com.tesoreria.community.infrastructure.persistence;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "course_photos")
public class CoursePhotoEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 255) private String originalName;
    @Column(nullable = false, length = 500, unique = true) private String storageObjectName;
    @Column(nullable = false, length = 80) private String contentType;
    @Column(length = 160) private String caption;
    @Column(nullable = false) private Integer displayOrder;
    @Column(nullable = false) private LocalDateTime createdAt;

    public Long getId() { return id; }
    public String getOriginalName() { return originalName; }
    public void setOriginalName(String value) { originalName = value; }
    public String getStorageObjectName() { return storageObjectName; }
    public void setStorageObjectName(String value) { storageObjectName = value; }
    public String getContentType() { return contentType; }
    public void setContentType(String value) { contentType = value; }
    public String getCaption() { return caption; }
    public void setCaption(String value) { caption = value; }
    public Integer getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(Integer value) { displayOrder = value; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime value) { createdAt = value; }
}
