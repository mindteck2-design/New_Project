package com.hal.amms.analytics;

import com.hal.amms.workflow.WorkflowRepository;
import com.hal.amms.workflow.domain.WorkflowDefinition;
import com.hal.amms.workflow.domain.WorkflowInstance;
import com.hal.amms.workflow.domain.WorkflowNode;
import com.hal.amms.platform.security.UserPrincipal;
import com.hal.amms.analytics.api.AnalyticsDtos.RoleAnalyticsView;
import com.hal.amms.analytics.api.AnalyticsDtos.RoleMetric;
import org.jooq.DSLContext;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

import static com.hal.amms.jooq.Tables.*;

@Service
public class AnalyticsService {

    private final WorkflowRepository workflowRepository;
    private final DSLContext dsl;

    public AnalyticsService(WorkflowRepository workflowRepository, DSLContext dsl) {
        this.workflowRepository = workflowRepository;
        this.dsl = dsl;
    }

    public RoleAnalyticsView forUser(UserPrincipal user) {
        Set<String> roles = user.getRoles().stream()
                .map(r -> r.toUpperCase(Locale.ROOT))
                .collect(Collectors.toSet());

        List<WorkflowInstance> visible = workflowRepository.listInstances().stream()
                .filter(i -> canSee(i, user))
                .toList();

        long waitingOnMe = visible.stream()
                .filter(i -> "RUNNING".equals(i.status()))
                .filter(i -> {
                    WorkflowDefinition def = workflowRepository.findDefinitionById(i.definitionId()).orElse(null);
                    if (def == null) return false;
                    WorkflowNode node = workflowRepository.findNode(def.id(), i.currentNodeKey()).orElse(null);
                    if (node == null || node.roleCode() == null || node.roleCode().isBlank()) return true;
                    return roles.contains(node.roleCode().toUpperCase(Locale.ROOT));
                })
                .count();

        long running = visible.stream().filter(i -> "RUNNING".equals(i.status())).count();
        long completed = visible.stream().filter(i -> "COMPLETED".equals(i.status())).count();

        OffsetDateTime weekAgo = OffsetDateTime.now(ZoneOffset.UTC).minusDays(7);
        int decisions = dsl.fetchCount(
                dsl.selectFrom(INSPECTION_RECORDS).where(INSPECTION_RECORDS.RECORDED_AT.ge(weekAgo))
        );
        int passes = dsl.fetchCount(
                dsl.selectFrom(INSPECTION_RECORDS)
                        .where(INSPECTION_RECORDS.RECORDED_AT.ge(weekAgo).and(INSPECTION_RECORDS.RESULT.eq("PASS")))
        );
        int fails = dsl.fetchCount(
                dsl.selectFrom(INSPECTION_RECORDS)
                        .where(INSPECTION_RECORDS.RECORDED_AT.ge(weekAgo).and(INSPECTION_RECORDS.RESULT.eq("FAIL")))
        );

        List<RoleMetric> metrics = new ArrayList<>();
        metrics.add(new RoleMetric("waitingOnMe", "Waiting on your role", waitingOnMe, "Open the action inbox to continue."));
        metrics.add(new RoleMetric("runningVisible", "Visible in-progress", running, "Instances you can view."));
        metrics.add(new RoleMetric("completedVisible", "Visible completed", completed, "Closed instances in your scope."));

        if (roles.contains("INSPECTION") || roles.contains("QA") || roles.contains("SHOP_MANAGER")
                || roles.contains("PROGRESS") || roles.contains("ADMIN") || roles.size() > 3) {
            metrics.add(new RoleMetric("decisions7d", "Decisions (7d)", decisions, "Pass/Fail and related inspection outcomes."));
            metrics.add(new RoleMetric("pass7d", "PASS (7d)", passes, "Inspection PASS count this week."));
            metrics.add(new RoleMetric("fail7d", "FAIL (7d)", fails, "Inspection FAIL count this week."));
        }

        if (roles.contains("PROGRESS")) {
            long progressWaiting = waitingOnMe;
            metrics.add(new RoleMetric("progressHandoffs", "Progress handoffs", progressWaiting,
                    "Spares / rotable / return steps assigned to Progress."));
        }
        if (roles.contains("SHOP_MANAGER")) {
            long repair = visible.stream()
                    .filter(i -> "RUNNING".equals(i.status()))
                    .filter(i -> {
                        WorkflowDefinition def = workflowRepository.findDefinitionById(i.definitionId()).orElse(null);
                        if (def == null) return false;
                        WorkflowNode node = workflowRepository.findNode(def.id(), i.currentNodeKey()).orElse(null);
                        return node != null && "SHOP_MANAGER".equalsIgnoreCase(node.roleCode());
                    })
                    .count();
            metrics.add(new RoleMetric("repairWip", "Repair / rework WIP", repair, "Shop Manager tasks in flight."));
        }
        if (roles.contains("STORES")) {
            metrics.add(new RoleMetric("storesNote", "Stores workflows", 0,
                    "Stores RR charts are inventoried; runtime seed deferred (see PRODUCTION_GAPS)."));
        }
        if (roles.contains("CUSTOMER")) {
            metrics.add(new RoleMetric("customerVisible", "Customer-visible instances", completed + running,
                    "Acceptance / ferry charts deferred; visibility follows participation."));
        }

        String primaryRole = roles.stream().sorted().findFirst().orElse("USER");
        return new RoleAnalyticsView(primaryRole, List.copyOf(roles), metrics);
    }

    private boolean canSee(WorkflowInstance instance, UserPrincipal user) {
        if (instance.startedBy() != null && instance.startedBy().equals(user.getId())) {
            return true;
        }
        if (workflowRepository.userParticipated(instance.id(), user.getId())) {
            return true;
        }
        WorkflowDefinition def = workflowRepository.findDefinitionById(instance.definitionId()).orElse(null);
        if (def == null) return false;
        WorkflowNode node = workflowRepository.findNode(def.id(), instance.currentNodeKey()).orElse(null);
        if (node == null) return false;
        if (node.roleCode() == null || node.roleCode().isBlank()) return true;
        return user.getRoles().stream().anyMatch(r -> r.equalsIgnoreCase(node.roleCode()));
    }
}
