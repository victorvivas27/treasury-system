package com.tesoreria.treasury.infrastructure.adapter.in.web.controller;

import com.tesoreria.shared.infrastructure.constant.ApiConstants;
import com.tesoreria.treasury.application.usecase.ManagedCourseService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(ApiConstants.TREASURY + "/configuracion-general")
public class TreasurySettingsController {
    private final ManagedCourseService managedCourse;

    public TreasurySettingsController(ManagedCourseService managedCourse) {
        this.managedCourse = managedCourse;
    }

    @GetMapping("/curso")
    public ManagedCourseResponse getCourse() {
        return new ManagedCourseResponse(managedCourse.get());
    }

    @PutMapping("/curso")
    @PreAuthorize("hasRole('ADMIN')")
    public ManagedCourseResponse saveCourse(@Valid @RequestBody ManagedCourseRequest request) {
        return new ManagedCourseResponse(managedCourse.save(request.course()));
    }

    public record ManagedCourseRequest(@NotBlank @Size(max = 80) String course) {
    }

    public record ManagedCourseResponse(String course) {
    }
}
