package egovframework.com.cmm.service;

import java.io.InputStream;
import java.util.Collections;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.minio.BucketExistsArgs;
import io.minio.CopyObjectArgs;
import io.minio.CopySource;
import io.minio.Directive;
import io.minio.GetObjectArgs;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.StatObjectArgs;
import io.minio.StatObjectResponse;
import io.minio.http.Method;
import io.minio.messages.Tags;

@Service
public class MinioStorageService {

    private final MinioClient minioClient;

    @Value("${storage.bucket:${STORAGE_BUCKET:document-attachments}}")
    private String defaultBucket;

    @Value("${storage.autoCreateBucket:false}")
    private boolean autoCreateBucket;

    public MinioStorageService(MinioClient minioClient) {
        this.minioClient = minioClient;
    }

    public void ensureBucketExists(String bucketName) throws Exception {
        String targetBucket = bucketName == null || bucketName.trim().isEmpty() ? defaultBucket : bucketName;
        boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(targetBucket).build());
        if (!exists) {
            minioClient.makeBucket(MakeBucketArgs.builder().bucket(targetBucket).build());
        }
    }

    public void upload(String bucketName, String objectKey, InputStream inputStream, long size, String contentType) throws Exception {
        uploadInternal(bucketName, objectKey, inputStream, size, contentType, Collections.<String, String>emptyMap());
    }

    public void uploadTagged(
            String bucketName,
            String objectKey,
            InputStream inputStream,
            long size,
            String contentType,
            Map<String, String> tags) throws Exception {
        uploadInternal(bucketName, objectKey, inputStream, size, contentType, tags);
    }

    private void uploadInternal(
            String bucketName,
            String objectKey,
            InputStream inputStream,
            long size,
            String contentType,
            Map<String, String> tags) throws Exception {
        String targetBucket = bucketName == null || bucketName.trim().isEmpty() ? defaultBucket : bucketName;
        if (autoCreateBucket) {
            ensureBucketExists(targetBucket);
        }
        PutObjectArgs.Builder builder = PutObjectArgs.builder()
                .bucket(targetBucket)
                .object(objectKey)
                .stream(inputStream, size, -1)
                .contentType(contentType);
        if (tags != null && !tags.isEmpty()) {
            builder.tags(Tags.newObjectTags(tags));
        }
        minioClient.putObject(builder.build());
    }

    public InputStream download(String bucketName, String objectKey) throws Exception {
        String targetBucket = bucketName == null || bucketName.trim().isEmpty() ? defaultBucket : bucketName;
        return minioClient.getObject(GetObjectArgs.builder().bucket(targetBucket).object(objectKey).build());
    }

    public StatObjectResponse stat(String bucketName, String objectKey) throws Exception {
        String targetBucket = bucketName == null || bucketName.trim().isEmpty() ? defaultBucket : bucketName;
        return minioClient.statObject(StatObjectArgs.builder().bucket(targetBucket).object(objectKey).build());
    }

    public void copy(String bucketName, String sourceObjectKey, String targetObjectKey) throws Exception {
        String targetBucket = bucketName == null || bucketName.trim().isEmpty() ? defaultBucket : bucketName;
        minioClient.copyObject(CopyObjectArgs.builder()
                .bucket(targetBucket)
                .object(targetObjectKey)
                .source(CopySource.builder().bucket(targetBucket).object(sourceObjectKey).build())
                .build());
    }

    public void copyWithoutTags(String bucketName, String sourceObjectKey, String targetObjectKey) throws Exception {
        String targetBucket = bucketName == null || bucketName.trim().isEmpty() ? defaultBucket : bucketName;
        minioClient.copyObject(CopyObjectArgs.builder()
                .bucket(targetBucket)
                .object(targetObjectKey)
                .source(CopySource.builder().bucket(targetBucket).object(sourceObjectKey).build())
                .taggingDirective(Directive.REPLACE)
                .tags(Tags.newObjectTags(Collections.<String, String>emptyMap()))
                .build());
    }

    public String getPresignedObjectUrl(String bucketName, String objectKey, int expirySeconds) throws Exception {
        String targetBucket = bucketName == null || bucketName.trim().isEmpty() ? defaultBucket : bucketName;
        return minioClient.getPresignedObjectUrl(
            GetPresignedObjectUrlArgs.builder()
                .method(Method.GET)
                .bucket(targetBucket)
                .object(objectKey)
                .expiry(expirySeconds)
                .build());
    }

    public void delete(String bucketName, String objectKey) throws Exception {
        String targetBucket = bucketName == null || bucketName.trim().isEmpty() ? defaultBucket : bucketName;
        minioClient.removeObject(RemoveObjectArgs.builder().bucket(targetBucket).object(objectKey).build());
    }
}
