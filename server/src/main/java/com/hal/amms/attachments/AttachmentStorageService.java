package com.hal.amms.attachments;

import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Service
public class AttachmentStorageService {

    private final AttachmentStore store;

    public AttachmentStorageService(AttachmentStore store) {
        this.store = store;
    }

    public Resource loadAsResource(String storageKey) {
        return store.loadAsResource(storageKey);
    }

    public void store(String storageKey, MultipartFile file) throws IOException {
        store.store(storageKey, file);
    }
}
