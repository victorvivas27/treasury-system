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
        var settings = managedCourse.getSettings();
        return response(settings);
    }

    @PutMapping("/curso")
    @PreAuthorize("hasRole('ADMIN')")
    public ManagedCourseResponse saveCourse(@Valid @RequestBody ManagedCourseRequest request) {
        return response(managedCourse.save(request.course(), request.schoolYear()));
    }

    private ManagedCourseResponse response(ManagedCourseService.ManagedCourseSettings settings) {
        return new ManagedCourseResponse(settings.course(), settings.schoolYear(),
                settings.history().stream()
                        .map(value -> new ManagedCoursePeriodResponse(
                                value.course(), value.schoolYear()))
                        .toList());
    }

    public record ManagedCourseRequest(
            @NotBlank @Size(max = 80) String course,
            @jakarta.validation.constraints.NotNull
            @jakarta.validation.constraints.Min(2000)
            @jakarta.validation.constraints.Max(2100) Integer schoolYear) {
    }

    public record ManagedCourseResponse(
            String course,
            Integer schoolYear,
            java.util.List<ManagedCoursePeriodResponse> history) {
    }

    public record ManagedCoursePeriodResponse(String course, Integer schoolYear) { }
}
