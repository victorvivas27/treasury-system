package com.tesoreria.community.infrastructure.web;

import com.tesoreria.community.application.usecase.CoursePhotoService;
import java.util.List;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/community/gallery")
public class CoursePhotoController {
    private static final String ADMIN = "hasRole('ADMIN')";
    private final CoursePhotoService service;
    public CoursePhotoController(CoursePhotoService service) { this.service = service; }

    @GetMapping public List<CoursePhotoService.PhotoView> list() { return service.list(); }
    @GetMapping("/{id}/content") public ResponseEntity<byte[]> content(@PathVariable Long id) {
        var image = service.content(id);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(image.contentType()))
                .cacheControl(CacheControl.maxAge(java.time.Duration.ofHours(1)).cachePublic()).body(image.bytes());
    }
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE) @PreAuthorize(ADMIN)
    public ResponseEntity<CoursePhotoService.PhotoView> upload(@RequestPart("file") MultipartFile file,
            @RequestParam(required = false) String caption) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.upload(file, caption));
    }
    @PutMapping("/{id}") @PreAuthorize(ADMIN)
    public CoursePhotoService.PhotoView update(@PathVariable Long id, @RequestBody UpdatePhotoRequest request) {
        return service.update(id, request.caption(), request.displayOrder());
    }
    @DeleteMapping("/{id}") @PreAuthorize(ADMIN) @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) { service.delete(id); }
    public record UpdatePhotoRequest(String caption, Integer displayOrder) { }
}
