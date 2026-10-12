package com.hal.amms.workflow.domain;

import com.hal.amms.shared.EnumCodes;

import java.util.Optional;

public enum InstanceStatus {
    RUNNING,
    COMPLETED,
    CANCELLED;

    public static InstanceStatus parse(String raw) {
        return EnumCodes.parse(InstanceStatus.class, raw);
    }

    public static Optional<InstanceStatus> tryParse(String raw) {
        return EnumCodes.tryParse(InstanceStatus.class, raw);
    }

    public boolean isTerminal() {
        return this == COMPLETED || this == CANCELLED;
    }
}
