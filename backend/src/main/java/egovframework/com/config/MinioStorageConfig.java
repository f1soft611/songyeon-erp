package egovframework.com.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.minio.MinioClient;

@Configuration
public class MinioStorageConfig {

    @Bean
    public MinioClient minioClient(
            @Value("${storage.endpoint:${STORAGE_ENDPOINT:http://218.155.74.34:9000}}") String endpoint,
            @Value("${storage.accessKey:${MINIO_ACCESS_KEY:f1soft}}") String accessKey,
            @Value("${storage.secretKey:${MINIO_SECRET_KEY:f1soft@611}}") String secretKey,
            @Value("${storage.region:${STORAGE_REGION:us-east-1}}") String region) {
        return MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .region(region)
                .build();
    }
}
