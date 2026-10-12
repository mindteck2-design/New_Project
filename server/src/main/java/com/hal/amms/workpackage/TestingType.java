package com.hal.amms.workpackage;

import com.hal.amms.shared.EnumCodes;

public enum TestingType {
    ROUTINE,
    REPAIR;

    public static TestingType parse(String raw) {
        return EnumCodes.parse(TestingType.class, raw);
    }
}
