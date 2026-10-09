package com.hal.amms.workflow;

import com.hal.amms.model.Models.WorkflowTransition;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class DecisionEngineTest {

    private final DecisionEngine engine = new DecisionEngine();

    @Test
    void resolvesPassFailBranches() {
        UUID def = UUID.randomUUID();
        List<WorkflowTransition> transitions = List.of(
                new WorkflowTransition(UUID.randomUUID(), def, "result", "repair", "FAIL", 0),
                new WorkflowTransition(UUID.randomUUID(), def, "result", "inspect_pass", "PASS", 1)
        );

        assertEquals("repair", engine.resolve(transitions, "fail").orElseThrow().toNodeKey());
        assertEquals("inspect_pass", engine.resolve(transitions, "PASS").orElseThrow().toNodeKey());
    }

    @Test
    void fallsBackToUnconditional() {
        UUID def = UUID.randomUUID();
        List<WorkflowTransition> transitions = List.of(
                new WorkflowTransition(UUID.randomUUID(), def, "start", "spares", null, 0)
        );
        assertEquals("spares", engine.resolve(transitions, null).orElseThrow().toNodeKey());
    }

    @Test
    void matchesHelperIsCaseInsensitive() {
        assertTrue(engine.matches("YES", "yes"));
        assertFalse(engine.matches("YES", "NO"));
        assertTrue(engine.matches(null, "anything"));
    }
}
