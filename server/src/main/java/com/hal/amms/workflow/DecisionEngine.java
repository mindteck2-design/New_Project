package com.hal.amms.workflow;

import com.hal.amms.workflow.domain.WorkflowTransition;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Evaluates transition conditions for DECISION nodes using jOOQ-backed transition rows.
 */
@Component
public class DecisionEngine {

    public Optional<WorkflowTransition> resolve(List<WorkflowTransition> candidates, String decisionValue) {
        if (candidates == null || candidates.isEmpty()) {
            return Optional.empty();
        }

        List<WorkflowTransition> ordered = candidates.stream()
                .sorted((a, b) -> Integer.compare(a.priority(), b.priority()))
                .toList();

        String normalized = decisionValue == null ? null : decisionValue.trim().toUpperCase(Locale.ROOT);

        Optional<WorkflowTransition> conditional = ordered.stream()
                .filter(t -> t.conditionValue() != null && !t.conditionValue().isBlank())
                .filter(t -> normalized != null
                        && t.conditionValue().trim().toUpperCase(Locale.ROOT).equals(normalized))
                .findFirst();

        if (conditional.isPresent()) {
            return conditional;
        }

        return ordered.stream()
                .filter(t -> t.conditionValue() == null || t.conditionValue().isBlank())
                .findFirst();
    }

    public boolean matches(String expected, String actual) {
        if (expected == null || expected.isBlank()) {
            return true;
        }
        if (actual == null) {
            return false;
        }
        return expected.trim().equalsIgnoreCase(actual.trim());
    }
}
