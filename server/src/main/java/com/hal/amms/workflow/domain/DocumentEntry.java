package com.hal.amms.workflow.domain;

import java.time.Instant;
import java.util.UUID;

public record DocumentEntry(
        UUID id,
        UUID instanceId,
        String nodeKey,
        String fileName,
        String contentType,
        String storageKey,
        UUID uploadedBy,
        Instant uploadedAt
) {}
