package com.tesoreria.community.core.port.out;

import com.tesoreria.community.core.model.AboutSection;
import java.util.List;
import java.util.Optional;

public interface AboutSectionRepositoryOutPort {
    List<AboutSection> findAll();
    List<AboutSection> findVisible();
    Optional<AboutSection> findById(Long id);
    AboutSection save(AboutSection section);
    void deleteById(Long id);
}
