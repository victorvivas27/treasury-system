package com.tesoreria.treasury.infrastructure.adapter.out.persistence.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "bank_account_settings")
@Getter @Setter @NoArgsConstructor
public class BankAccountSettingEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "school_year", nullable = false, unique = true) private Integer schoolYear;
    @Column(name = "account_holder_name", nullable = false, length = 120) private String accountHolderName;
    @Column(name = "account_holder_rut", nullable = false, length = 20) private String accountHolderRut;
    @Column(name = "bank_name", nullable = false, length = 80) private String bankName;
    @Column(name = "account_type", nullable = false, length = 50) private String accountType;
    @Column(name = "account_number", nullable = false, length = 40) private String accountNumber;
    @Column(nullable = false, length = 120) private String email;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;
    @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;
}
