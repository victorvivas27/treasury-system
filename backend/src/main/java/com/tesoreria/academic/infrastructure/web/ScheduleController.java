package com.tesoreria.academic.infrastructure.web;
import com.tesoreria.academic.application.ScheduleService;
import com.tesoreria.academic.core.Schedule;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import java.util.List;

@RestController
@RequestMapping("/api/v1/academic/schedules")
public class ScheduleController {
    private final ScheduleService service;
    public ScheduleController(ScheduleService service) { this.service = service; }
    @GetMapping("/periods")
    public List<ScheduleService.Period> periods() { return service.periods(); }
    @GetMapping("/{year}")
    public Schedule published(@PathVariable int year) { return service.read(year, false); }
    @GetMapping("/{year}/draft")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public Schedule draft(@PathVariable int year) { return service.read(year, true); }
    @PutMapping("/{year}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public Schedule save(@PathVariable int year, @RequestBody Schedule schedule,
                         @RequestParam(defaultValue = "false") boolean publish) {
        return service.save(year, schedule, publish);
    }
    @DeleteMapping("/{year}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public void delete(@PathVariable int year) { service.delete(year); }
}
