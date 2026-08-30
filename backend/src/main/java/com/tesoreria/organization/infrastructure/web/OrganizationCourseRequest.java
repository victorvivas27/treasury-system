package com.tesoreria.organization.infrastructure.web;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record OrganizationCourseRequest(
        @NotBlank @Size(max = 80) String name,
        @NotNull @Min(2000) @Max(2100) Integer schoolYear
) { }
