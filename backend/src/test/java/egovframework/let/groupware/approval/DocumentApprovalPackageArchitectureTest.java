package egovframework.let.groupware.approval;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.util.ClassUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

class DocumentApprovalPackageArchitectureTest {

    private static final String BASE = "egovframework.let.groupware.approval.";
    private static final String LEGACY_SERVICE = BASE + "service.DocumentApprovalService";

    @Test
    void featureTypesUseFeaturePackagesAndEgovServiceImplementations() {
        assertPresent("write.controller.DocumentApprovalWriteApiController");
        assertPresent("write.service.DocumentApprovalWriteService");
        assertEgovService("write.service.impl.DocumentApprovalWriteServiceImpl");
        assertPresent("status.controller.DocumentApprovalStatusApiController");
        assertPresent("status.service.DocumentApprovalStatusService");
        assertEgovService("status.service.impl.DocumentApprovalStatusServiceImpl");
        assertPresent("shared.controller.DocumentApprovalInteractionApiController");
        assertPresent("shared.service.DocumentApprovalInteractionService");
        assertEgovService("shared.service.impl.DocumentApprovalInteractionServiceImpl");
        assertPresent("common.service.DocumentApprovalAccessService");
        assertEgovService("common.service.impl.DocumentApprovalAccessServiceImpl");
        assertPresent("common.service.DocumentApprovalDraftSupportService");
        assertEgovService("common.service.impl.DocumentApprovalDraftSupportServiceImpl");
        assertPresent("common.service.DocumentApprovalCommentSupportService");
        assertEgovService("common.service.impl.DocumentApprovalCommentSupportServiceImpl");
    }

    @Test
    void featureServicesDoNotDelegateToTheLegacyMonolithicService() {
        assertThat(ClassUtils.isPresent(LEGACY_SERVICE, getClass().getClassLoader())).isFalse();
        for (String implementationName : new String[] {
                "write.service.impl.DocumentApprovalWriteServiceImpl",
                "status.service.impl.DocumentApprovalStatusServiceImpl",
                "shared.service.impl.DocumentApprovalInteractionServiceImpl",
                "common.service.impl.DocumentApprovalAccessServiceImpl",
                "common.service.impl.DocumentApprovalDraftSupportServiceImpl",
                "common.service.impl.DocumentApprovalCommentSupportServiceImpl"}) {
            Class<?> implementation = ClassUtils.resolveClassName(BASE + implementationName,
                    getClass().getClassLoader());
            Stream<Class<?>> constructorTypes = Arrays.stream(implementation.getDeclaredConstructors())
                    .flatMap(constructor -> Arrays.stream(constructor.getParameterTypes()));
            Stream<Class<?>> fieldTypes = Arrays.stream(implementation.getDeclaredFields())
                    .map(Field::getType);
            List<String> dependencyNames = Stream.concat(constructorTypes, fieldTypes)
                    .map(Class::getName)
                    .collect(Collectors.toList());
            assertThat(dependencyNames).doesNotContain(LEGACY_SERVICE);
        }
    }

    @Test
    void featureControllersDoNotDeclareDuplicateRoutes() {
        Map<String, String> routeOwners = new HashMap<>();
        for (Class<?> controller : new Class<?>[] {
                type("write.controller.DocumentApprovalWriteApiController"),
                type("status.controller.DocumentApprovalStatusApiController"),
                type("shared.controller.DocumentApprovalInteractionApiController")}) {
            RequestMapping baseMapping = controller.getAnnotation(RequestMapping.class);
            assertThat(baseMapping).as("controller %s declares a base mapping", controller.getName()).isNotNull();
            String[] basePaths = baseMapping.path().length == 0 ? baseMapping.value() : baseMapping.path();
            for (java.lang.reflect.Method method : controller.getDeclaredMethods()) {
                registerRoute(routeOwners, controller, method, basePaths);
            }
        }
    }

    private void registerRoute(Map<String, String> routeOwners, Class<?> controller,
            java.lang.reflect.Method method, String[] basePaths) {
        RequestMapping requestMapping = method.getAnnotation(RequestMapping.class);
        String[] paths;
        RequestMethod[] methods;
        if (requestMapping != null) {
            paths = requestMapping.path().length == 0 ? requestMapping.value() : requestMapping.path();
            methods = requestMapping.method();
        } else if (method.isAnnotationPresent(GetMapping.class)) {
            GetMapping mapping = method.getAnnotation(GetMapping.class);
            paths = mapping.path().length == 0 ? mapping.value() : mapping.path();
            methods = new RequestMethod[] {RequestMethod.GET};
        } else if (method.isAnnotationPresent(PostMapping.class)) {
            PostMapping mapping = method.getAnnotation(PostMapping.class);
            paths = mapping.path().length == 0 ? mapping.value() : mapping.path();
            methods = new RequestMethod[] {RequestMethod.POST};
        } else if (method.isAnnotationPresent(PutMapping.class)) {
            PutMapping mapping = method.getAnnotation(PutMapping.class);
            paths = mapping.path().length == 0 ? mapping.value() : mapping.path();
            methods = new RequestMethod[] {RequestMethod.PUT};
        } else if (method.isAnnotationPresent(PatchMapping.class)) {
            PatchMapping mapping = method.getAnnotation(PatchMapping.class);
            paths = mapping.path().length == 0 ? mapping.value() : mapping.path();
            methods = new RequestMethod[] {RequestMethod.PATCH};
        } else if (method.isAnnotationPresent(DeleteMapping.class)) {
            DeleteMapping mapping = method.getAnnotation(DeleteMapping.class);
            paths = mapping.path().length == 0 ? mapping.value() : mapping.path();
            methods = new RequestMethod[] {RequestMethod.DELETE};
        } else {
            return;
        }
        if (paths.length == 0) {
            paths = new String[] {""};
        }
        for (String basePath : basePaths) {
            for (String path : paths) {
                String fullPath = basePath.replaceAll("/$", "") + "/" + path.replaceAll("^/", "");
                for (RequestMethod requestMethod : methods) {
                    String route = requestMethod.name() + " " + fullPath;
                    String previousOwner = routeOwners.putIfAbsent(route, controller.getName() + "#" + method.getName());
                    assertThat(previousOwner)
                            .as("route %s has a single feature controller method", route)
                            .isNull();
                }
            }
        }
    }

    private Class<?> type(String relativeName) {
        return ClassUtils.resolveClassName(BASE + relativeName, getClass().getClassLoader());
    }

    private void assertPresent(String relativeName) {
        assertThat(ClassUtils.isPresent(BASE + relativeName, getClass().getClassLoader()))
                .as("class %s exists", relativeName)
                .isTrue();
    }

    private void assertEgovService(String relativeName) {
        Class<?> implementation = ClassUtils.resolveClassName(BASE + relativeName,
                getClass().getClassLoader());
        assertThat(EgovAbstractServiceImpl.class.isAssignableFrom(implementation))
                .as("service %s extends EgovAbstractServiceImpl", relativeName)
                .isTrue();
    }
}
