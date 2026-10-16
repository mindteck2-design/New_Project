package com.hal.amms.workflow;

import com.hal.amms.platform.web.ApiException;
import com.hal.amms.workflow.api.WorkflowDtos.WorkflowNodeDraft;
import com.hal.amms.workflow.api.WorkflowDtos.WorkflowTransitionDraft;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class WorkflowGraphValidatorTest {

    private static final List<WorkflowNodeDraft> NODES = List.of(
            node("start", "START"),
            node("inspect", "TASK"),
            decision("result"),
            node("repair", "TASK"),
            node("end", "END")
    );

    @Test
    void allowsFailToRouteBackToEarlierStep() {
        assertValid(List.of(
                edge("start", "inspect", null),
                edge("inspect", "result", null),
                edge("result", "repair", "PASS"),
                edge("result", "inspect", "FAIL"),
                edge("repair", "end", null)
        ));
    }

    @Test
    void allowsFailToRouteToAnotherTaskNode() {
        assertValid(List.of(
                edge("start", "inspect", null),
                edge("inspect", "result", null),
                edge("result", "end", "PASS"),
                edge("result", "repair", "FAIL"),
                edge("repair", "end", null)
        ));
    }

    @Test
    void allowsFailToCompleteWorkflow() {
        assertValid(List.of(
                edge("start", "inspect", null),
                edge("inspect", "result", null),
                edge("result", "repair", "PASS"),
                edge("result", "end", "FAIL"),
                edge("repair", "end", null)
        ));
    }

    @Test
    void rejectsDecisionWithMissingOutcomeDestination() {
        ApiException exception = assertThrows(ApiException.class, () -> assertValid(List.of(
                edge("start", "inspect", null),
                edge("inspect", "result", null),
                edge("result", "end", "PASS"),
                edge("repair", "end", null)
        )));

        assertEquals("each configured decision outcome must have exactly one destination: result",
                exception.getMessage());
    }

    @Test
    void decisionStepMustHaveAForm() {
        List<WorkflowNodeDraft> nodesWithoutDecisionForm = List.of(
                node("start", "START"),
                node("inspect", "TASK"),
                new WorkflowNodeDraft("result", "DECISION", "result", "INSPECTION",
                        null, List.of("PASS", "FAIL"), "result"),
                node("repair", "TASK"),
                node("end", "END")
        );

        ApiException exception = assertThrows(ApiException.class, () ->
                WorkflowGraphValidator.validate(nodesWithoutDecisionForm, List.of()));

        assertEquals("DECISION node result must select a master form", exception.getMessage());
    }

    private static void assertValid(List<WorkflowTransitionDraft> transitions) {
        WorkflowGraphValidator.validate(NODES, transitions);
    }

    private static WorkflowNodeDraft node(String key, String type) {
        return new WorkflowNodeDraft(key, type, key, "INSPECTION",
                "TASK".equals(type) ? "test-form" : null, null, null);
    }

    private static WorkflowNodeDraft decision(String key) {
        return new WorkflowNodeDraft(key, "DECISION", key, "INSPECTION",
                "decision-form", List.of("PASS", "FAIL"), "result");
    }

    private static WorkflowTransitionDraft edge(String from, String to, String when) {
        return new WorkflowTransitionDraft(from, to, when);
    }
}
