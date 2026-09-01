package com.tesoreria.improvement.application;

import com.tesoreria.improvement.infrastructure.persistence.*;
import com.tesoreria.improvement.infrastructure.web.*;
import com.tesoreria.organization.infrastructure.persistence.OrganizationEntity;
import com.tesoreria.organization.infrastructure.persistence.OrganizationJpaRepository;
import com.tesoreria.shared.domain.exception.DomainException;
import com.tesoreria.shared.domain.pagination.PageResponse;
import com.tesoreria.treasury.core.port.out.FileStorageService;
import com.tesoreria.user.core.constant.RoleEnum;
import com.tesoreria.user.core.exception.UserErrorCode;
import com.tesoreria.user.infrastructure.adapter.out.persistence.entity.UserEntity;
import com.tesoreria.user.infrastructure.adapter.out.persistence.repository.UserJpaRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.text.Normalizer;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@SuppressWarnings({"PMD.AvoidDuplicateLiterals", "PMD.TooManyMethods"})
public class ImprovementSuggestionService {
    private static final int MAX_TITLE = 120;
    private static final int MAX_DESCRIPTION = 2000;
    private static final int MAX_ROUTE = 300;
    private static final int MAX_SELECTED_ITEMS = 8;
    private static final int MAX_ITEM_LENGTH = 60;
    private static final int MAX_FILENAME_LENGTH = 255;
    private static final int MAX_PAGE_SIZE = 50;
    private static final long MAX_SCREENSHOT_BYTES = 3L * 1024L * 1024L;
    private static final String FIELD_SCREENSHOT = "screenshot";
    private static final String FIELD_SUGGESTION = "suggestion";
    private static final String MSG_NOT_FOUND = "Sugerencia no encontrada";
    private static final Map<String, String> TYPES = Map.of(
            "jpg", "image/jpeg", "jpeg", "image/jpeg", "png", "image/png", "webp", "image/webp");
    private final ImprovementSuggestionJpaRepository suggestions;
    private final ImprovementSuggestionNoteJpaRepository noteRepository;
    private final ImprovementSuggestionHistoryJpaRepository historyRepository;
    private final ImprovementSuggestionRelationJpaRepository relations;
    private final UserJpaRepository users;
    private final OrganizationJpaRepository organizations;
    private final ObjectProvider<FileStorageService> storageProvider;

    public ImprovementSuggestionService(ImprovementSuggestionJpaRepository suggestions,
            ImprovementSuggestionNoteJpaRepository notes,
            ImprovementSuggestionHistoryJpaRepository history,
            ImprovementSuggestionRelationJpaRepository relations,
            UserJpaRepository users,
            OrganizationJpaRepository organizations,
            ObjectProvider<FileStorageService> storageProvider) {
        this.suggestions = suggestions;
        this.noteRepository = notes;
        this.historyRepository = history;
        this.relations = relations;
        this.users = users;
        this.organizations = organizations;
        this.storageProvider = storageProvider;
    }

    @Transactional
    public ImprovementSuggestionResponse create(ImprovementSuggestionRequest request,
            MultipartFile screenshot, String email) {
        UserEntity user = currentUser(email);
        String objectName = null;
        String contentType = null;
        if (screenshot != null && !screenshot.isEmpty()) {
            ValidatedImage image = validate(screenshot);
            objectName = "mejoras/captura/%s/%s.%s".formatted(
                    screenshotOwnerFolder(user), UUID.randomUUID(), image.extension());
            storage().upload(objectName, image.bytes(), image.contentType());
            contentType = image.contentType();
        }
        try {
            ImprovementSuggestionEntity entity = new ImprovementSuggestionEntity();
            entity.setUser(user);
            entity.setOrganizationId(user.getOrganizationId());
            entity.setCategory(Objects.requireNonNull(request.category()));
            entity.setSelectedItems(serializeItems(request.selectedItems()));
            entity.setTitle(normalize(request.title(), MAX_TITLE, "title", "El título debe tener hasta 120 caracteres"));
            entity.setDescription(normalize(request.description(), MAX_DESCRIPTION, "description",
                    "La descripción debe tener hasta 2000 caracteres"));
            entity.setUserImpact(Objects.requireNonNull(request.userImpact()));
            entity.setInternalPriority(ImprovementPriority.MEDIUM);
            entity.setSourceRoute(normalizeRoute(request.sourceRoute()));
            entity.setScreenshotObjectName(objectName);
            entity.setScreenshotContentType(contentType);
            entity.setStatus(ImprovementStatus.RECEIVED);
            return response(suggestions.saveAndFlush(entity));
        } catch (RuntimeException exception) {
            if (objectName != null) cleanupUpload(objectName, exception);
            throw exception;
        }
    }

    @Transactional(readOnly = true)
    public List<ImprovementSuggestionResponse> mine(String email) {
        UserEntity user = currentUser(email);
        List<ImprovementSuggestionEntity> rows = user.getOrganizationId() == null
                ? suggestions.findByUserIdAndOrganizationIdIsNullOrderByCreatedAtDesc(user.getId())
                : suggestions.findByUserIdAndOrganizationIdOrderByCreatedAtDesc(
                        user.getId(), user.getOrganizationId());
        return rows.stream().map(this::response).toList();
    }

    @Transactional(readOnly = true)
    public ImageContent screenshot(Long id, String email) {
        UserEntity user = currentUser(email);
        ImprovementSuggestionEntity suggestion = suggestions.findById(id)
                .orElseThrow(() -> error(FIELD_SUGGESTION, HttpStatus.NOT_FOUND, MSG_NOT_FOUND));
        if (!canUserReadSuggestion(user, suggestion)) {
            throw error(FIELD_SUGGESTION, HttpStatus.NOT_FOUND, MSG_NOT_FOUND);
        }
        return readScreenshot(suggestion);
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminImprovementSuggestionResponse> adminList(AdminQuery query, String email) {
        UserEntity admin = requireAdmin(email);
        org.springframework.data.domain.PageRequest pageRequest = org.springframework.data.domain.PageRequest.of(
                Math.max(0, query.page()), Math.max(1, Math.min(MAX_PAGE_SIZE, query.size())),
                Sort.by(direction(query.direction()), sortField(query.sortBy())));
        Page<ImprovementSuggestionEntity> page = suggestions.findAll(adminSpec(admin, query), pageRequest);
        return new PageResponse<>(page.getContent().stream().map(this::adminResponse).toList(),
                page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }

    @Transactional(readOnly = true)
    public ImprovementAdminSummaryResponse adminSummary(String email) {
        UserEntity admin = requireAdmin(email);
        if (admin.getRol() == RoleEnum.SUPER_ADMIN) {
            return new ImprovementAdminSummaryResponse(suggestions.countAllSuggestions(),
                    suggestions.countByStatus(ImprovementStatus.RECEIVED),
                    suggestions.countByStatus(ImprovementStatus.UNDER_REVIEW),
                    suggestions.countByStatus(ImprovementStatus.PLANNED),
                    suggestions.countByStatus(ImprovementStatus.IMPLEMENTED),
                    suggestions.countByInternalPriority(ImprovementPriority.CRITICAL));
        }
        Long organizationId = admin.getOrganizationId();
        return new ImprovementAdminSummaryResponse(suggestions.countByOrganizationId(organizationId),
                suggestions.countByOrganizationIdAndStatus(organizationId, ImprovementStatus.RECEIVED),
                suggestions.countByOrganizationIdAndStatus(organizationId, ImprovementStatus.UNDER_REVIEW),
                suggestions.countByOrganizationIdAndStatus(organizationId, ImprovementStatus.PLANNED),
                suggestions.countByOrganizationIdAndStatus(organizationId, ImprovementStatus.IMPLEMENTED),
                suggestions.countByOrganizationIdAndInternalPriority(organizationId, ImprovementPriority.CRITICAL));
    }

    @Transactional(readOnly = true)
    public AdminImprovementSuggestionResponse adminDetail(Long id, String email) {
        return adminResponse(requireInScope(id, requireAdmin(email)));
    }

    @Transactional(readOnly = true)
    public ImageContent adminScreenshot(Long id, String email) {
        return readScreenshot(requireInScope(id, requireAdmin(email)));
    }

    @Transactional
    public AdminImprovementSuggestionResponse updateStatus(Long id, ImprovementStatus status, String email) {
        UserEntity admin = requireAdmin(email);
        ImprovementSuggestionEntity suggestion = requireInScope(id, admin);
        ImprovementStatus old = suggestion.getStatus();
        suggestion.setStatus(Objects.requireNonNull(status));
        recordHistory(suggestion, admin, "status", old.name(), status.name());
        return adminResponse(suggestions.saveAndFlush(suggestion));
    }

    @Transactional
    public AdminImprovementSuggestionResponse updatePriority(Long id, ImprovementPriority priority, String email) {
        UserEntity admin = requireAdmin(email);
        ImprovementSuggestionEntity suggestion = requireInScope(id, admin);
        ImprovementPriority old = suggestion.getInternalPriority();
        suggestion.setInternalPriority(Objects.requireNonNull(priority));
        recordHistory(suggestion, admin, "priority", old.name(), priority.name());
        return adminResponse(suggestions.saveAndFlush(suggestion));
    }

    @Transactional
    public ImprovementSuggestionNoteResponse addNote(Long id, String content, String email) {
        UserEntity admin = requireAdmin(email);
        ImprovementSuggestionEntity suggestion = requireInScope(id, admin);
        ImprovementSuggestionNoteEntity note = new ImprovementSuggestionNoteEntity();
        note.setSuggestion(suggestion);
        note.setAuthor(admin);
        note.setContent(normalize(content, 1200, "content", "La nota debe tener hasta 1200 caracteres"));
        return noteResponse(noteRepository.saveAndFlush(note));
    }

    @Transactional(readOnly = true)
    public List<ImprovementSuggestionNoteResponse> notes(Long id, String email) {
        requireInScope(id, requireAdmin(email));
        return noteRepository.findBySuggestionIdOrderByCreatedAtDesc(id).stream().map(this::noteResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<ImprovementSuggestionHistoryResponse> history(Long id, String email) {
        requireInScope(id, requireAdmin(email));
        return historyRepository.findBySuggestionIdOrderByCreatedAtDesc(id).stream().map(item ->
                new ImprovementSuggestionHistoryResponse(item.getId(), item.getChangedBy().getNombre(),
                        item.getChangedBy().getCorreo(), item.getFieldName(), item.getOldValue(),
                        item.getNewValue(), item.getCreatedAt())).toList();
    }

    @Transactional
    public AdminImprovementSuggestionResponse relate(Long id, Long relatedSuggestionId, String email) {
        UserEntity admin = requireAdmin(email);
        ImprovementSuggestionEntity suggestion = requireInScope(id, admin);
        requireInScope(relatedSuggestionId, admin);
        if (Objects.equals(id, relatedSuggestionId)) {
            throw error("relatedSuggestionId", HttpStatus.BAD_REQUEST, "No puedes relacionar la misma sugerencia");
        }
        ImprovementSuggestionRelationEntity relation = new ImprovementSuggestionRelationEntity();
        relation.setSuggestionId(id);
        relation.setRelatedSuggestionId(relatedSuggestionId);
        relation.setCreatedBy(admin);
        relations.save(relation);
        return adminResponse(suggestion);
    }

    @Transactional
    public void deleteAdmin(Long id, String email) {
        ImprovementSuggestionEntity suggestion = requireInScope(id, requireAdmin(email));
        String objectName = suggestion.getScreenshotObjectName();
        relations.deleteAllForSuggestion(id);
        noteRepository.deleteBySuggestionId(id);
        historyRepository.deleteBySuggestionId(id);
        suggestions.delete(suggestion);
        suggestions.flush();
        deleteStoredScreenshot(objectName);
    }

    private Specification<ImprovementSuggestionEntity> adminSpec(UserEntity admin, AdminQuery query) {
        return (root, criteria, builder) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (admin.getRol() != RoleEnum.SUPER_ADMIN) {
                predicates.add(builder.equal(root.get("organizationId"), admin.getOrganizationId()));
            } else if (query.organizationId() != null) {
                predicates.add(builder.equal(root.get("organizationId"), query.organizationId()));
            }
            if (query.status() != null) predicates.add(builder.equal(root.get("status"), query.status()));
            if (query.category() != null) predicates.add(builder.equal(root.get("category"), query.category()));
            if (query.impact() != null) predicates.add(builder.equal(root.get("userImpact"), query.impact()));
            if (query.priority() != null) predicates.add(builder.equal(root.get("internalPriority"), query.priority()));
            if (query.from() != null) predicates.add(builder.greaterThanOrEqualTo(
                    root.get("createdAt"), query.from().atStartOfDay()));
            if (query.to() != null) predicates.add(builder.lessThan(
                    root.get("createdAt"), query.to().plusDays(1).atStartOfDay()));
            addSearchPredicate(query.search(), root, builder, predicates);
            return builder.and(predicates.toArray(Predicate[]::new));
        };
    }

    private void addSearchPredicate(String search, jakarta.persistence.criteria.Root<ImprovementSuggestionEntity> root,
            jakarta.persistence.criteria.CriteriaBuilder builder, List<Predicate> predicates) {
        String normalized = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        if (normalized.isEmpty()) return;
        List<Predicate> searchPredicates = new ArrayList<>();
        searchPredicates.add(builder.like(builder.lower(root.get("title")), "%" + normalized + "%"));
        searchPredicates.add(builder.like(builder.lower(root.get("description")), "%" + normalized + "%"));
        searchPredicates.add(builder.like(builder.lower(root.get("user").get("nombre")), "%" + normalized + "%"));
        searchPredicates.add(builder.like(builder.lower(root.get("user").get("correo")), "%" + normalized + "%"));
        try {
            searchPredicates.add(builder.equal(root.get("id"), Long.parseLong(normalized.replace("#", ""))));
        } catch (NumberFormatException ignored) {
            // Texto libre: solo aplica a campos textuales.
        }
        predicates.add(builder.or(searchPredicates.toArray(Predicate[]::new)));
    }

    private UserEntity requireAdmin(String email) {
        UserEntity user = currentUser(email);
        if (user.getRol() != RoleEnum.ADMIN && user.getRol() != RoleEnum.SUPER_ADMIN) {
            throw error("auth", HttpStatus.FORBIDDEN, "Acceso denegado");
        }
        return user;
    }

    private ImprovementSuggestionEntity requireInScope(Long id, UserEntity admin) {
        ImprovementSuggestionEntity suggestion = suggestions.findById(id)
                .orElseThrow(() -> error(FIELD_SUGGESTION, HttpStatus.NOT_FOUND, MSG_NOT_FOUND));
        if (admin.getRol() != RoleEnum.SUPER_ADMIN
                && !Objects.equals(suggestion.getOrganizationId(), admin.getOrganizationId())) {
            throw error(FIELD_SUGGESTION, HttpStatus.NOT_FOUND, MSG_NOT_FOUND);
        }
        return suggestion;
    }

    private boolean canUserReadSuggestion(UserEntity user, ImprovementSuggestionEntity suggestion) {
        if (user.getRol() == RoleEnum.ADMIN || user.getRol() == RoleEnum.SUPER_ADMIN) {
            return user.getRol() == RoleEnum.SUPER_ADMIN
                    || Objects.equals(suggestion.getOrganizationId(), user.getOrganizationId());
        }
        return Objects.equals(suggestion.getUser().getId(), user.getId())
                && Objects.equals(suggestion.getOrganizationId(), user.getOrganizationId());
    }

    private void recordHistory(ImprovementSuggestionEntity suggestion, UserEntity admin,
            String field, String oldValue, String newValue) {
        if (Objects.equals(oldValue, newValue)) return;
        ImprovementSuggestionHistoryEntity entry = new ImprovementSuggestionHistoryEntity();
        entry.setSuggestion(suggestion);
        entry.setChangedBy(admin);
        entry.setFieldName(field);
        entry.setOldValue(oldValue);
        entry.setNewValue(newValue);
        historyRepository.save(entry);
    }

    private AdminImprovementSuggestionResponse adminResponse(ImprovementSuggestionEntity value) {
        UserEntity user = value.getUser();
        OrganizationEntity organization = value.getOrganizationId() == null ? null
                : organizations.findById(value.getOrganizationId()).orElse(null);
        return new AdminImprovementSuggestionResponse(value.getId(), value.getCategory(),
                deserializeItems(value.getSelectedItems()), value.getTitle(), value.getDescription(),
                value.getUserImpact(), value.getInternalPriority(),
                value.getScreenshotObjectName() == null ? null : "/admin/improvements/%d/screenshot".formatted(value.getId()),
                value.getSourceRoute(), value.getStatus(), user.getId(), user.getNombre(), user.getCorreo(),
                user.getRol(), value.getOrganizationId(), organization == null ? null : organization.getName(),
                organization == null ? null : organization.getCourseName(),
                organization == null ? null : organization.getSchoolYear(),
                value.getCreatedAt(), value.getUpdatedAt(),
                relations.findBySuggestionIdOrderByCreatedAtDesc(value.getId()).stream()
                        .map(ImprovementSuggestionRelationEntity::getRelatedSuggestionId).toList());
    }

    private ImprovementSuggestionNoteResponse noteResponse(ImprovementSuggestionNoteEntity value) {
        return new ImprovementSuggestionNoteResponse(value.getId(), value.getAuthor().getId(),
                value.getAuthor().getNombre(), value.getAuthor().getCorreo(),
                value.getContent(), value.getCreatedAt(), value.getUpdatedAt());
    }

    private Sort.Direction direction(String value) {
        return "asc".equalsIgnoreCase(value) ? Sort.Direction.ASC : Sort.Direction.DESC;
    }

    private String sortField(String value) {
        return switch (Optional.ofNullable(value).orElse("createdAt")) {
            case "updatedAt" -> "updatedAt";
            case "priority", "internalPriority" -> "internalPriority";
            case "status" -> "status";
            default -> "createdAt";
        };
    }

    private ImageContent readScreenshot(ImprovementSuggestionEntity suggestion) {
        if (suggestion.getScreenshotObjectName() == null) {
            throw error(FIELD_SCREENSHOT, HttpStatus.NOT_FOUND, "Captura no encontrada");
        }
        var stored = storage().read(suggestion.getScreenshotObjectName());
        return new ImageContent(stored.bytes(), suggestion.getScreenshotContentType());
    }

    private void cleanupUpload(String objectName, RuntimeException exception) {
        try {
            storage().delete(objectName);
        } catch (RuntimeException cleanup) {
            exception.addSuppressed(cleanup);
        }
    }

    private void deleteStoredScreenshot(String objectName) {
        if (objectName == null) return;
        FileStorageService storage = storageProvider.getIfAvailable();
        if (storage == null) return;
        try {
            storage.delete(objectName);
        } catch (RuntimeException ignored) {
            // La sugerencia ya fue eliminada; el archivo se limpia en best-effort.
        }
    }

    private UserEntity currentUser(String email) {
        return users.findByCorreo(email).orElseThrow(() ->
                new DomainException(UserErrorCode.NOT_FOUND.getField(),
                        UserErrorCode.NOT_FOUND.getStatus(), "Usuario no encontrado"));
    }

    private String normalize(String value, int max, String field, String message) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.isEmpty()) throw error(field, HttpStatus.BAD_REQUEST, message);
        if (normalized.length() > max) throw error(field, HttpStatus.BAD_REQUEST, message);
        return normalized;
    }

    private String normalizeRoute(String value) {
        String normalized = normalize(value, MAX_ROUTE, "sourceRoute", "La ruta debe tener hasta 300 caracteres");
        if (!normalized.startsWith("/")) throw error("sourceRoute", HttpStatus.BAD_REQUEST, "La ruta de origen no es válida");
        return normalized;
    }

    private String serializeItems(List<String> items) {
        if (items == null || items.isEmpty()) return null;
        List<String> normalized = items.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(item -> !item.isEmpty())
                .distinct()
                .toList();
        if (normalized.size() > MAX_SELECTED_ITEMS)
            throw error("selectedItems", HttpStatus.BAD_REQUEST, "Puedes seleccionar hasta 8 opciones");
        if (normalized.stream().anyMatch(item -> item.length() > MAX_ITEM_LENGTH))
            throw error("selectedItems", HttpStatus.BAD_REQUEST, "Cada opción debe tener hasta 60 caracteres");
        return normalized.stream().collect(Collectors.joining("\n"));
    }

    private List<String> deserializeItems(String value) {
        if (value == null || value.isBlank()) return List.of();
        return Arrays.stream(value.split("\\n")).filter(item -> !item.isBlank()).toList();
    }

    private ValidatedImage validate(MultipartFile file) {
        if (file.getSize() > MAX_SCREENSHOT_BYTES)
            throw error(FIELD_SCREENSHOT, HttpStatus.PAYLOAD_TOO_LARGE, "La captura supera 3 MB");
        String name = Optional.ofNullable(file.getOriginalFilename()).orElse("").replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1).trim();
        int dot = name.lastIndexOf('.');
        if (dot < 1 || name.contains("..") || name.length() > MAX_FILENAME_LENGTH)
            throw error(FIELD_SCREENSHOT, HttpStatus.BAD_REQUEST, "Nombre de archivo inválido");
        String extension = name.substring(dot + 1).toLowerCase(Locale.ROOT);
        String expectedType = TYPES.get(extension);
        String contentType = Optional.ofNullable(file.getContentType()).orElse("").toLowerCase(Locale.ROOT);
        if (expectedType == null || !expectedType.equals(contentType))
            throw error(FIELD_SCREENSHOT, HttpStatus.BAD_REQUEST, "Solo se permiten imágenes JPG, PNG o WEBP");
        try {
            byte[] bytes = file.getBytes();
            boolean valid = switch (extension) {
                case "jpg", "jpeg" -> bytes.length >= 2 && (bytes[0] & 255) == 0xff && (bytes[1] & 255) == 0xd8;
                case "png" -> bytes.length >= 4 && (bytes[0] & 255) == 0x89
                        && bytes[1] == 'P' && bytes[2] == 'N' && bytes[3] == 'G';
                case "webp" -> bytes.length >= 12 && bytes[0] == 'R' && bytes[1] == 'I'
                        && bytes[8] == 'W' && bytes[9] == 'E';
                default -> false;
            };
            if (!valid) throw error(FIELD_SCREENSHOT, HttpStatus.BAD_REQUEST,
                    "El contenido no corresponde a una imagen válida");
            return new ValidatedImage(extension, contentType, bytes);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No se pudo leer la captura", exception);
        }
    }

    private String screenshotOwnerFolder(UserEntity user) {
        String normalizedName = Normalizer.normalize(
                        Optional.ofNullable(user.getNombre()).orElse("usuario"),
                        Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-+|-+$)", "");
        if (normalizedName.isBlank()) normalizedName = "usuario";
        String code = Optional.ofNullable(user.getCode())
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .orElse(String.valueOf(user.getId()))
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-+|-+$)", "");
        return "%s-%s".formatted(normalizedName, code);
    }

    private FileStorageService storage() {
        return Optional.ofNullable(storageProvider.getIfAvailable())
                .orElseThrow(() -> error(FIELD_SCREENSHOT, HttpStatus.SERVICE_UNAVAILABLE,
                        "El almacenamiento de imágenes no está disponible"));
    }

    private ImprovementSuggestionResponse response(ImprovementSuggestionEntity value) {
        return new ImprovementSuggestionResponse(value.getId(), value.getCategory(),
                deserializeItems(value.getSelectedItems()), value.getTitle(), value.getDescription(),
                value.getUserImpact(),
                value.getScreenshotObjectName() == null ? null : "/improvements/%d/screenshot".formatted(value.getId()),
                value.getSourceRoute(), value.getStatus(), value.getCreatedAt(), value.getUpdatedAt());
    }

    private DomainException error(String field, HttpStatus status, String message) {
        return new DomainException(field, status, message);
    }

    public record AdminQuery(int page, int size, String search, ImprovementStatus status,
            ImprovementCategory category, UserImpact impact, ImprovementPriority priority,
            Long organizationId, LocalDate from, LocalDate to, String sortBy, String direction) {
    }

    private record ValidatedImage(String extension, String contentType, byte[] bytes) { }
    public record ImageContent(byte[] bytes, String contentType) { }
}
