package quality;

import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.ObjectMapper;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.Set;

/** Declared application HTTP operations, without starting Spring or connecting to a database. */
public final class BrunoApiInventory {
    private BrunoApiInventory() { }

    public static void main(String[] args) throws Exception {
        var scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(RestController.class));
        Set<Operation> operations = new LinkedHashSet<>();
        for (var bean : scanner.findCandidateComponents("com.tesoreria")) {
            Class<?> controller = Class.forName(bean.getBeanClassName(), false, BrunoApiInventory.class.getClassLoader());
            var parent = AnnotatedElementUtils.findMergedAnnotation(controller, RequestMapping.class);
            for (var method : controller.getMethods()) {
                var mapping = AnnotatedElementUtils.findMergedAnnotation(method, RequestMapping.class);
                if (mapping == null) continue;
                RequestMethod[] verbs = mapping.method();
                if (verbs.length == 0 && parent != null) verbs = parent.method();
                if (verbs.length == 0) verbs = RequestMethod.values();
                for (String prefix : paths(parent)) {
                    for (String suffix : paths(mapping)) {
                        String route = ("/" + prefix + "/" + suffix).replaceAll("/+", "/");
                        if (route.length() > 1) route = route.replaceAll("/$", "");
                        for (var verb : verbs) operations.add(new Operation(verb.name(), route));
                    }
                }
            }
        }
        if (operations.isEmpty()) throw new IllegalStateException("Empty application API inventory");
        Path output = Path.of(args[0]);
        Files.createDirectories(output.getParent());
        Files.writeString(output, new ObjectMapper().writeValueAsString(operations.stream()
                .sorted(Comparator.comparing(Operation::path).thenComparing(Operation::method)).toList()));
    }

    private static String[] paths(RequestMapping mapping) {
        if (mapping == null) return new String[]{""};
        String[] result = mapping.path().length > 0 ? mapping.path() : mapping.value();
        return result.length == 0 ? new String[]{""} : Arrays.copyOf(result, result.length);
    }

    public record Operation(String method, String path) { }
}
