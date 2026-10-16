package com.hal.amms.workflow;

import com.hal.amms.platform.web.ApiException;
import com.hal.amms.workflow.api.WorkflowDtos.WorkflowNodeDraft;
import com.hal.amms.workflow.api.WorkflowDtos.WorkflowTransitionDraft;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

public final class WorkflowGraphValidator {

    private WorkflowGraphValidator() {}

    public static void validate(List<WorkflowNodeDraft> nodes, List<WorkflowTransitionDraft> transitions) {
        Map<String, WorkflowNodeDraft> nodesByKey = new HashMap<>();
        List<String> startNodes = new ArrayList<>();
        List<String> endNodes = new ArrayList<>();

        for (WorkflowNodeDraft node : nodes) {
            String key = node.key().trim();
            if (nodesByKey.putIfAbsent(key, node) != null) {
                throw ApiException.badRequest("duplicate workflow node key: " + key);
            }
            if ((isType(node.type(), "TASK") || isType(node.type(), "DECISION"))
                    && (node.formKey() == null || node.formKey().isBlank())) {
                throw ApiException.badRequest(node.type() + " node " + key + " must select a master form");
            }
            if (isType(node.type(), "START")) {
                startNodes.add(key);
            } else if (isType(node.type(), "END")) {
                endNodes.add(key);
            }
        }

        if (startNodes.size() != 1) {
            throw ApiException.badRequest("workflow must include exactly one START node");
        }
        if (endNodes.isEmpty()) {
            throw ApiException.badRequest("workflow must include at least one END node");
        }

        Map<String, List<String>> outgoing = new HashMap<>();
        Map<String, List<String>> incoming = new HashMap<>();
        Map<String, Set<String>> decisionOutcomes = new HashMap<>();
        for (String key : nodesByKey.keySet()) {
            outgoing.put(key, new ArrayList<>());
            incoming.put(key, new ArrayList<>());
        }

        for (WorkflowTransitionDraft transition : transitions) {
            if (transition == null) {
                throw ApiException.badRequest("workflow transitions cannot contain null entries");
            }
            String from = transition.from() == null ? "" : transition.from().trim();
            String to = transition.to() == null ? "" : transition.to().trim();
            WorkflowNodeDraft source = nodesByKey.get(from);
            if (source == null || !nodesByKey.containsKey(to)) {
                throw ApiException.badRequest("transition references an unknown node: " + from + " -> " + to);
            }
            if (from.equals(to)) {
                throw ApiException.badRequest("workflow nodes cannot transition to themselves: " + from);
            }
            if (isType(source.type(), "END")) {
                throw ApiException.badRequest("END nodes cannot have outgoing transitions");
            }
            if (isType(nodesByKey.get(to).type(), "START")) {
                throw ApiException.badRequest("transitions cannot target a START node");
            }

            String outcome = normalize(transition.when());
            if (isType(source.type(), "DECISION")) {
                Set<String> options = normalizedOptions(source);
                if (outcome.isEmpty() || !options.contains(outcome)) {
                    throw ApiException.badRequest(
                            "decision transition from " + from + " must use one of its configured outcomes"
                    );
                }
                if (!decisionOutcomes.computeIfAbsent(from, ignored -> new HashSet<>()).add(outcome)) {
                    throw ApiException.badRequest("decision outcome " + outcome + " has multiple destinations at " + from);
                }
            } else if (!outcome.isEmpty()) {
                throw ApiException.badRequest("only DECISION nodes may have conditional transitions: " + from);
            }

            outgoing.get(from).add(to);
            incoming.get(to).add(from);
        }

        for (Map.Entry<String, WorkflowNodeDraft> entry : nodesByKey.entrySet()) {
            String key = entry.getKey();
            WorkflowNodeDraft node = entry.getValue();
            List<String> destinations = outgoing.get(key);
            if (isType(node.type(), "DECISION")) {
                Set<String> options = normalizedOptions(node);
                if (options.isEmpty() || !options.equals(decisionOutcomes.getOrDefault(key, Set.of()))) {
                    throw ApiException.badRequest("each configured decision outcome must have exactly one destination: " + key);
                }
            } else if (!isType(node.type(), "END") && destinations.size() != 1) {
                throw ApiException.badRequest("node " + key + " must have exactly one outgoing transition");
            }
        }

        if (!reachableFrom(startNodes.get(0), outgoing).containsAll(nodesByKey.keySet())) {
            throw ApiException.badRequest("every workflow node must be reachable from START");
        }
        if (!canReachAny(endNodes, incoming).containsAll(nodesByKey.keySet())) {
            throw ApiException.badRequest("every workflow node and decision route must have a path to END");
        }
    }

    private static Set<String> normalizedOptions(WorkflowNodeDraft node) {
        Set<String> options = new HashSet<>();
        if (node.options() == null) {
            return options;
        }
        for (String option : node.options()) {
            String normalized = normalize(option);
            if (normalized.isEmpty() || !options.add(normalized)) {
                throw ApiException.badRequest("decision node " + node.key() + " has an empty or duplicate outcome");
            }
        }
        return options;
    }

    private static Set<String> reachableFrom(String start, Map<String, List<String>> edges) {
        return traverse(List.of(start), edges);
    }

    private static Set<String> canReachAny(List<String> ends, Map<String, List<String>> incoming) {
        return traverse(ends, incoming);
    }

    private static Set<String> traverse(List<String> starts, Map<String, List<String>> edges) {
        Set<String> reached = new HashSet<>();
        ArrayDeque<String> queue = new ArrayDeque<>(starts);
        while (!queue.isEmpty()) {
            String current = queue.removeFirst();
            if (reached.add(current)) {
                queue.addAll(edges.getOrDefault(current, List.of()));
            }
        }
        return reached;
    }

    private static boolean isType(String actual, String expected) {
        return actual != null && actual.trim().equalsIgnoreCase(expected);
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }
}
