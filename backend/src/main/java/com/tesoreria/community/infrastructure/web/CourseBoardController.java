package com.tesoreria.community.infrastructure.web;

import com.tesoreria.community.application.usecase.CourseBoardService;
import java.util.List;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/community/board")
public class CourseBoardController {
    private final CourseBoardService service;
    public CourseBoardController(CourseBoardService service) { this.service = service; }
    @GetMapping public List<CourseBoardService.MemberView> list(@RequestParam(required = false) Integer year) {
        return service.list(year);
    }
    @PutMapping @PreAuthorize("hasRole('ADMIN')")
    public CourseBoardService.MemberView assign(@RequestBody BoardAssignmentRequest request) {
        return service.assign(request.electionYear(), request.role(), request.positionNumber(), request.apoderadoCodigo());
    }
    @DeleteMapping("/{id}") @PreAuthorize("hasRole('ADMIN')") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) { service.delete(id); }
    public record BoardAssignmentRequest(Integer electionYear, String role, Integer positionNumber,
                                         String apoderadoCodigo) { }
}
