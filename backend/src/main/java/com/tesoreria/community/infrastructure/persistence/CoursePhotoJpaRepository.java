package com.tesoreria.community.infrastructure.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CoursePhotoJpaRepository extends JpaRepository<CoursePhotoEntity, Long> {
    List<CoursePhotoEntity> findAllByOrderByDisplayOrderAscIdAsc();
}
