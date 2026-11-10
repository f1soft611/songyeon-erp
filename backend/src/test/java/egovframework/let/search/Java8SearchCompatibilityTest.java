package egovframework.let.search;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.File;
import java.io.StringWriter;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import javax.tools.JavaCompiler;
import javax.tools.StandardJavaFileManager;
import javax.tools.ToolProvider;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class Java8SearchCompatibilityTest {
    @TempDir
    Path output;

    @Test
    void searchAndRealtimeProductionSourcesUseJava8PlatformApis() throws Exception {
        JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
        assertNotNull(compiler, "Run this regression with the project's development JDK.");
        List<File> sources;
        try (Stream<Path> search = Files.walk(Paths.get("src/main/java/egovframework/let/search"));
                Stream<Path> realtime = Files.walk(Paths.get("src/main/java/egovframework/let/groupware/realtime"))) {
            sources = Stream.concat(search, realtime)
                    .filter(path -> path.toString().endsWith(".java"))
                    .map(Path::toFile).collect(Collectors.toList());
        }
        StringWriter diagnostics = new StringWriter();
        try (StandardJavaFileManager files = compiler.getStandardFileManager(null, null, null)) {
            List<String> options = Arrays.asList("--release", "8",
                    "-processor", "lombok.launch.AnnotationProcessorHider$AnnotationProcessor", "-encoding", "UTF-8",
                    "-classpath", System.getProperty("surefire.test.class.path", System.getProperty("java.class.path")),
                    "-d", output.toString());
            boolean compiled = compiler.getTask(diagnostics, files, null, options, null,
                    files.getJavaFileObjectsFromFiles(sources)).call();
            assertTrue(compiled, diagnostics.toString());
        }
    }
}
