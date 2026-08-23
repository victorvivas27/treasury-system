package com.tesoreria.treasury.infrastructure.adapter.out.persistence.repository;
import com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity.BankAccountSettingEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface BankAccountSettingJpaRepository extends JpaRepository<BankAccountSettingEntity, Long> {
    Optional<BankAccountSettingEntity> findBySchoolYear(Integer schoolYear);
}
