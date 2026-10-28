package egovframework.com.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;

import org.junit.jupiter.api.Test;

class MinioStorageConfigTest {

    @Test
    void minioDefaultsMatchProjectCredentials() throws IOException {
        String devProps = new String(Files.readAllBytes(Paths.get("src/main/resources/application-dev.properties")), StandardCharsets.UTF_8);
        String prodProps = new String(Files.readAllBytes(Paths.get("src/main/resources/application-prod.properties")), StandardCharsets.UTF_8);
        String configSource = new String(Files.readAllBytes(Paths.get("src/main/java/egovframework/com/config/MinioStorageConfig.java")), StandardCharsets.UTF_8);

        assertProfileDefaults(devProps, "dev");
        assertProfileDefaults(prodProps, "prod");
        assertTrue(configSource.contains("${storage.endpoint:${STORAGE_ENDPOINT:http://218.155.74.34:9000}}"),
                "Java config should use the project MinIO endpoint fallback");
        assertTrue(configSource.contains("${storage.accessKey:${MINIO_ACCESS_KEY:f1soft}}"),
                "Java config should use the project MinIO access key fallback");
        assertTrue(configSource.contains("${storage.secretKey:${MINIO_SECRET_KEY:f1soft@611}}"),
                "Java config should use the project MinIO secret key fallback");
        assertTrue(configSource.contains("${storage.region:${STORAGE_REGION:us-east-1}}"),
                "Java config should use the project MinIO region fallback");
    }

    @Test
    void minioClientDependencyUsesSingleSupportedVersion() throws IOException {
        String pom = new String(Files.readAllBytes(Paths.get("pom.xml")), StandardCharsets.UTF_8);

        assertEquals(1, countOccurrences(pom, "<artifactId>minio</artifactId>"),
                "MinIO client dependency should be declared once");
        assertTrue(pom.contains("<version>8.5.11</version>"),
                "MinIO client should use the supported version");
        assertFalse(pom.contains("<version>8.5.7</version>"),
                "Older MinIO client version should not override the supported version");
    }

    private void assertProfileDefaults(String properties, String profile) {
        assertTrue(properties.contains("storage.provider=${STORAGE_PROVIDER:minio}"),
                profile + " profile should default to MinIO");
        assertTrue(properties.contains("storage.bucket=${STORAGE_BUCKET:document-attachments}"),
                profile + " profile should default to the document attachment bucket");
        assertTrue(properties.contains("storage.autoCreateBucket=${STORAGE_AUTO_CREATE_BUCKET:false}"),
                profile + " profile should not require bucket management permission by default");
        assertTrue(properties.contains("storage.endpoint=${STORAGE_ENDPOINT:http://218.155.74.34:9000}"),
                profile + " profile should default to the project MinIO endpoint");
        assertTrue(properties.contains("storage.accessKey=${MINIO_ACCESS_KEY:f1soft}"),
                profile + " profile should default to the project MinIO access key");
        assertTrue(properties.contains("storage.secretKey=${MINIO_SECRET_KEY:f1soft@611}"),
                profile + " profile should default to the project MinIO secret key");
        assertTrue(properties.contains("storage.region=us-east-1"),
                profile + " profile should default to the project MinIO region");
        assertTrue(properties.contains("storage.presignExpirySeconds=600"),
                profile + " profile should default to a 600-second presign expiry");
    }

        private int countOccurrences(String text, String token) {
                int count = 0;
                int offset = 0;
                while ((offset = text.indexOf(token, offset)) >= 0) {
                        count++;
                        offset += token.length();
                }
                return count;
        }
}
