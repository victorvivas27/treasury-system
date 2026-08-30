package com.tesoreria.organization.application;

import com.tesoreria.treasury.core.port.out.FileStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Component
public class OrganizationResourceCleaner {
    private static final Logger LOGGER = LoggerFactory.getLogger(OrganizationResourceCleaner.class);
    private final JdbcTemplate jdbc;
    private final FileStorageService storage;

    public OrganizationResourceCleaner(JdbcTemplate jdbc,
                                       ObjectProvider<FileStorageService> storageProvider) {
        this.jdbc = jdbc;
        this.storage = storageProvider.getIfAvailable();
    }

    public List<String> findStoredObjects(Long organizationId) {
        Set<String> objects = new LinkedHashSet<>();
        add(objects, """
                SELECT profile_image_url FROM users
                WHERE organization_id = ? AND profile_image_type = 'CUSTOM_IMAGE'
                  AND profile_image_url IS NOT NULL
                """, organizationId);
        add(objects, "SELECT storage_object_name FROM course_photos WHERE organization_id = ?",
                organizationId);
        add(objects, "SELECT storage_object_name FROM treasury_expense_documents WHERE organization_id = ?",
                organizationId);
        add(objects, "SELECT storage_object_name FROM treasury_income_documents WHERE organization_id = ?",
                organizationId);
        add(objects, "SELECT proof_object_name FROM bank_transfer_payments WHERE organization_id = ?",
                organizationId);
        return new ArrayList<>(objects);
    }

    public void deleteAfterCommit(List<String> objects) {
        if (storage == null || objects.isEmpty()) return;
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                objects.forEach(OrganizationResourceCleaner.this::deleteQuietly);
            }
        });
    }

    private void add(Set<String> objects, String query, Long organizationId) {
        objects.addAll(jdbc.queryForList(query, String.class, organizationId));
    }

    private void deleteQuietly(String objectName) {
        try {
            storage.delete(objectName);
        } catch (RuntimeException exception) {
            LOGGER.warn("No fue posible eliminar el objeto {} de la administración borrada",
                    objectName, exception);
        }
    }
}
