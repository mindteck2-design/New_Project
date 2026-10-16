package com.hal.amms.workpackage;

import com.hal.amms.shared.EnumCodes;

public enum PackageStatus {
    DRAFT,
    READY,
    IN_PROGRESS,
    COMPLETED,
    CANCELLED;

    public static PackageStatus parse(String raw) {
        return EnumCodes.parse(PackageStatus.class, raw);
    }

    public boolean canAcceptParts() {
        return this != CANCELLED;
    }
}
