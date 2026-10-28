package egovframework.com.cmm.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertSame;

import io.minio.BucketExistsArgs;
import io.minio.CopyObjectArgs;
import io.minio.Directive;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.StatObjectArgs;
import io.minio.StatObjectResponse;

class MinioStorageServiceTest {

    @Test
    void uploadDoesNotRequireBucketManagementByDefault() throws Exception {
        MinioClient minioClient = org.mockito.Mockito.mock(MinioClient.class);
        when(minioClient.bucketExists(any(BucketExistsArgs.class)))
            .thenThrow(new RuntimeException("bucket check denied"));
        MinioStorageService service = new MinioStorageService(minioClient);

        service.upload("document-attachments", "tenant/1/notice/2/notice.txt",
            new ByteArrayInputStream("hello".getBytes(StandardCharsets.UTF_8)), 5L, "text/plain");

        verify(minioClient, never()).bucketExists(any(BucketExistsArgs.class));
        verify(minioClient).putObject(any(PutObjectArgs.class));
    }

    @Test
    void copyUsesServerSideCopyWithoutReadingImageIntoApplicationMemory() throws Exception {
        MinioClient minioClient = org.mockito.Mockito.mock(MinioClient.class);
        MinioStorageService service = new MinioStorageService(minioClient);

        service.copy("document-attachments", "tenant/1/temp/image.png", "tenant/1/form/image.png");

        verify(minioClient).copyObject(any(CopyObjectArgs.class));
    }

    @Test
    void statReturnsObjectMetadataFromMinio() throws Exception {
        MinioClient minioClient = org.mockito.Mockito.mock(MinioClient.class);
        StatObjectResponse objectStat = org.mockito.Mockito.mock(StatObjectResponse.class);
        when(minioClient.statObject(any(StatObjectArgs.class))).thenReturn(objectStat);
        MinioStorageService service = new MinioStorageService(minioClient);

        assertSame(objectStat, service.stat("document-attachments", "tenant/1/temp/image.png"));
        verify(minioClient).statObject(any(StatObjectArgs.class));
    }

    @Test
    void uploadTaggedStoresTemporaryObjectLifecycleTags() throws Exception {
        MinioClient minioClient = org.mockito.Mockito.mock(MinioClient.class);
        MinioStorageService service = new MinioStorageService(minioClient);

        service.uploadTagged("document-attachments", "tenant/1/drafting-work-form-temp/77/token/image.png",
            new ByteArrayInputStream("image".getBytes(StandardCharsets.UTF_8)), 5L, "image/png",
            Collections.singletonMap("s-erp-temp-owner", "drafting-work-form"));

        org.mockito.ArgumentCaptor<PutObjectArgs> args = org.mockito.ArgumentCaptor.forClass(PutObjectArgs.class);
        verify(minioClient).putObject(args.capture());
        assertEquals("drafting-work-form", args.getValue().tags().get().get("s-erp-temp-owner"));
    }

    @Test
    void copyReplacesSourceTagsSoTemporaryLifecycleDoesNotApplyToPermanentObject() throws Exception {
        MinioClient minioClient = org.mockito.Mockito.mock(MinioClient.class);
        MinioStorageService service = new MinioStorageService(minioClient);

        service.copyWithoutTags("document-attachments", "tenant/1/temp/image.png", "tenant/1/form/image.png");

        verify(minioClient).copyObject(argThat(args -> args.taggingDirective() == Directive.REPLACE));
    }
}