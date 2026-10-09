package com.hal.amms.service;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

public interface AttachmentStore {

    void store(String storageKey, MultipartFile file) throws IOException;

    Resource loadAsResource(String storageKey);
}
