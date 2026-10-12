package com.hal.amms.attachments;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@Component
@ConditionalOnProperty(name = "amms.attachments.store", havingValue = "filesystem", matchIfMissing = true)
public class FilesystemAttachmentStore implements AttachmentStore {

    private final Path root;

    public FilesystemAttachmentStore(@Value("${amms.attachments.dir:.data/attachments}") String attachmentsDir) {
        this.root = Path.of(attachmentsDir).toAbsolutePath().normalize();
    }

    @Override
    public void store(String storageKey, MultipartFile file) throws IOException {
        Path target = resolveStorageKey(storageKey);
        Files.createDirectories(target.getParent());
        file.transferTo(target);
    }

    @Override
    public Resource loadAsResource(String storageKey) {
        Path file = resolveStorageKey(storageKey);
        if (!Files.exists(file) || !Files.isRegularFile(file)) {
            return null;
        }
        try {
            return new UrlResource(file.toUri());
        } catch (Exception e) {
            return null;
        }
    }

    private Path resolveStorageKey(String storageKey) {
        Path resolved = root.resolve(storageKey).normalize();
        if (!resolved.startsWith(root)) {
            throw new IllegalArgumentException("Invalid storage path");
        }
        return resolved;
    }
}
