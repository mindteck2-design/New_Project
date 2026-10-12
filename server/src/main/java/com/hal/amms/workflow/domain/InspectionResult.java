package com.hal.amms.workflow.domain;

import com.hal.amms.shared.EnumCodes;

import java.util.Optional;

/** Common Pass/Fail outcomes stored on inspection_records.result. */
public enum InspectionResult {
    PASS,
    FAIL;

    public static Optional<InspectionResult> tryParse(String raw) {
        return EnumCodes.tryParse(InspectionResult.class, raw);
    }
}
