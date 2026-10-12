package com.hal.amms.workflow.domain;

import com.hal.amms.shared.EnumCodes;

import java.util.Optional;

/** Client transition actions for non-decision TASK steps. */
public enum StepAction {
    COMPLETE,
    SUBMIT;

    public static Optional<StepAction> tryParse(String raw) {
        return EnumCodes.tryParse(StepAction.class, raw);
    }

    /** Blank action defaults to COMPLETE (legacy clients). */
    public static boolean isCompleteLike(String raw) {
        if (raw == null || raw.isBlank()) {
            return true;
        }
        return tryParse(raw).isPresent();
    }
}
