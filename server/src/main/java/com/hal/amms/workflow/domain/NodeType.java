package com.hal.amms.workflow.domain;

import com.hal.amms.shared.EnumCodes;

import java.util.Optional;

public enum NodeType {
    START,
    END,
    TASK,
    DECISION;

    public static NodeType parse(String raw) {
        return EnumCodes.parse(NodeType.class, raw);
    }

    public static Optional<NodeType> tryParse(String raw) {
        return EnumCodes.tryParse(NodeType.class, raw);
    }

    public boolean matches(String raw) {
        return tryParse(raw).filter(this::equals).isPresent();
    }
}
