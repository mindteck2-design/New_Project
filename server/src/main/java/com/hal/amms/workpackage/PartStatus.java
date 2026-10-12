package com.hal.amms.workpackage;

import com.hal.amms.shared.EnumCodes;

public enum PartStatus {
    PENDING,
    IN_TEST,
    REASSEMBLED,
    PASSED,
    FAILED,
    SKIPPED;

    public static PartStatus parse(String raw) {
        return EnumCodes.parse(PartStatus.class, raw);
    }

    public boolean isTerminal() {
        return this == PASSED || this == FAILED || this == SKIPPED;
    }

    public boolean closesPart() {
        return isTerminal();
    }

    public boolean isOpenWork() {
        return this == PENDING || this == IN_TEST;
    }
}
