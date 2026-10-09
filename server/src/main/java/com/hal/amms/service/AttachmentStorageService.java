package com.hal.amms.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;

@Service
public class AttachmentStorageService {

    private final Path root;

    public AttachmentStorageService(@Value("${amms.attachments.dir:.data/attachments}") String attachmentsDir) {
        this.root = Path.of(attachmentsDir).toAbsolutePath().normalize();
    }

    public Path resolveStorageKey(String storageKey) {
        Path resolved = root.resolve(storageKey).normalize();
        if (!resolved.startsWith(root)) {
            throw new IllegalArgumentException("Invalid storage path");
        }
        return resolved;
    }

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

    public Path store(String storageKey, org.springframework.web.multipart.MultipartFile file) throws java.io.IOException {
        Path target = resolveStorageKey(storageKey);
        Files.createDirectories(target.getParent());
        file.transferTo(target);
        return target;
    }
}
