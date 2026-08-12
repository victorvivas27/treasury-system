package com.tesoreria.familia.core.model;

public record FamilyTreasuryData(Long familyId, String familyCode, Long studentId,
                                 String studentName, String course, String primaryGuardian) {
}
