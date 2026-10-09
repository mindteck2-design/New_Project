package com.hal.amms.service;

import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;

@Component
@ConditionalOnProperty(name = "amms.attachments.store", havingValue = "minio")
public class MinioAttachmentStore implements AttachmentStore {

    private final MinioClient client;
    private final String bucket;

    public MinioAttachmentStore(
            @Value("${amms.minio.endpoint}") String endpoint,
            @Value("${amms.minio.access-key}") String accessKey,
            @Value("${amms.minio.secret-key}") String secretKey,
            @Value("${amms.minio.bucket:amms}") String bucket
    ) {
        this.bucket = bucket;
        this.client = MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();
    }

    @PostConstruct
    void ensureBucket() throws Exception {
        if (!client.bucketExists(BucketExistsArgs.builder().bucket(bucket).build())) {
            client.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
        }
    }

    @Override
    public void store(String storageKey, MultipartFile file) throws IOException {
        try (InputStream in = file.getInputStream()) {
            client.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucket)
                            .object(storageKey)
                            .stream(in, file.getSize(), -1)
                            .contentType(file.getContentType() == null ? "application/octet-stream" : file.getContentType())
                            .build()
            );
        } catch (Exception e) {
            throw new IOException("MinIO upload failed: " + e.getMessage(), e);
        }
    }

    @Override
    public Resource loadAsResource(String storageKey) {
        try {
            InputStream stream = client.getObject(
                    GetObjectArgs.builder().bucket(bucket).object(storageKey).build()
            );
            return new InputStreamResource(stream);
        } catch (Exception e) {
            return null;
        }
    }
}
