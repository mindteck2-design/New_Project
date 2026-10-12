package com.hal.amms.workflow;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Role-wise end-to-end coverage for seeded MVP workflows.
 * Each actor uses their seeded account; wrong roles must receive 403.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RoleMatrixE2ETest {

    @Autowired MockMvc mockMvc;
    @Autowired JsonMapper mapper;

    WorkflowE2ESupport e2e;

    @BeforeEach
    void setUp() throws Exception {
        assumeTrue(WorkflowE2ESupport.canConnectToPostgres(), "PostgreSQL required for role E2E");
        Files.createDirectories(Path.of("target/test-attachments"));
        e2e = new WorkflowE2ESupport(mockMvc, mapper);
    }

    @Nested
    @DisplayName("Start authorization by START.roleCode")
    class StartAuthz {

        @Test
        void accessoriesRequiresProgressRole() throws Exception {
            e2e.startForbidden(e2e.login("inspection.user"), "accessories-bench-check");
            e2e.startForbidden(e2e.login("stores.user"), "accessories-bench-check");
            e2e.startForbidden(e2e.login("qa.user"), "accessories-bench-check");
            e2e.startForbidden(e2e.login("customer.user"), "accessories-bench-check");
            e2e.startForbidden(e2e.login("shop.user"), "accessories-bench-check");

            String id = e2e.start(e2e.login("progress.user"), "accessories-bench-check", "ACC-START-1");
            e2e.assertNode(e2e.getInstance(e2e.login("progress.user"), id), "spares");
        }

        @Test
        void ndtRequiresInspectionRole() throws Exception {
            e2e.startForbidden(e2e.login("progress.user"), "ndt-radiography");
            e2e.startForbidden(e2e.login("stores.user"), "ndt-radiography");
            e2e.startForbidden(e2e.login("shop.user"), "ndt-radiography");

            String id = e2e.start(e2e.login("inspection.user"), "ndt-radiography", "NDT-START-1");
            e2e.assertNode(e2e.getInstance(e2e.login("inspection.user"), id), "visual");
        }
    }

    @Nested
    @DisplayName("Accessories Bench Check — role handoffs")
    class AccessoriesFlows {

        @Test
        @DisplayName("PASS → Cat D → no repair → serviceable complete (PROGRESS + INSPECTION)")
        void passPathCompletesWithoutShopManager() throws Exception {
            String progress = e2e.login("progress.user");
            String inspection = e2e.login("inspection.user");
            String shop = e2e.login("shop.user");
            String stores = e2e.login("stores.user");

            String id = e2e.start(progress, "accessories-bench-check", "ACC-PASS-1");
            e2e.assertNode(e2e.getInstance(progress, id), "spares");

            // Wrong roles blocked at Progress step
            e2e.transitionForbidden(inspection, id, "{\"action\":\"COMPLETE\",\"formPayload\":{\"x\":1}}");
            e2e.transitionForbidden(shop, id, "{\"action\":\"COMPLETE\",\"formPayload\":{\"x\":1}}");
            e2e.transitionForbidden(stores, id, "{\"action\":\"COMPLETE\",\"formPayload\":{\"x\":1}}");

            JsonNode afterSpares = e2e.complete(progress, id, "{\"sparesRequired\":\"No\"}");
            e2e.assertNode(afterSpares, "test");

            // Progress cannot do Inspection step
            e2e.transitionForbidden(progress, id, "{\"action\":\"COMPLETE\",\"formPayload\":{\"scheduleRef\":\"SCH\"}}");

            e2e.assertNode(e2e.complete(inspection, id, "{\"scheduleRef\":\"SCH-1\",\"resultNotes\":\"ok\"}"), "result");
            e2e.assertNode(e2e.decide(inspection, id, "PASS"), "inspect_pass");
            e2e.assertNode(e2e.complete(inspection, id, "{\"serviceable\":\"Yes\"}"), "ber");
            e2e.assertNode(e2e.decide(inspection, id, "NO"), "repairable_label");
            e2e.assertNode(e2e.complete(inspection, id, "{\"labelApplied\":\"Cat-D\"}"), "repair_permitted");

            JsonNode done = e2e.decide(inspection, id, "NO");
            e2e.assertStatus(done, "COMPLETED");
            e2e.assertNode(done, "complete_serviceable");

            JsonNode audit = e2e.audit(progress, id);
            assertTrue(audit.isArray() && audit.size() >= 8, "audit trail too short: " + audit.size());

            // Acceptance visibility
            e2e.getInstance(e2e.login("qa.user"), id);
            e2e.getInstance(e2e.login("customer.user"), id);
        }

        @Test
        @DisplayName("FAIL → Shop Manager repair → retest → return to Progress")
        void failPathUsesShopManagerThenInspection() throws Exception {
            String progress = e2e.login("progress.user");
            String inspection = e2e.login("inspection.user");
            String shop = e2e.login("shop.user");
            String qa = e2e.login("qa.user");

            String id = e2e.start(progress, "accessories-bench-check", "ACC-FAIL-1");
            e2e.complete(progress, id, "{\"sparesRequired\":\"Yes\",\"partNo\":\"A-100\"}");
            e2e.complete(inspection, id, "{\"scheduleRef\":\"SCH-2\"}");
            e2e.assertNode(e2e.decide(inspection, id, "FAIL"), "repair");

            // Only Shop Manager may repair
            e2e.transitionForbidden(progress, id, "{\"action\":\"COMPLETE\",\"formPayload\":{\"work\":\"x\"}}");
            e2e.transitionForbidden(inspection, id, "{\"action\":\"COMPLETE\",\"formPayload\":{\"work\":\"x\"}}");
            e2e.transitionForbidden(qa, id, "{\"action\":\"COMPLETE\",\"formPayload\":{\"work\":\"x\"}}");

            e2e.assertNode(e2e.complete(shop, id, "{\"workDone\":\"Reworked impeller\",\"hours\":4}"), "retest");
            e2e.assertNode(e2e.complete(inspection, id, "{\"retestResult\":\"Documented\"}"), "return_fail");

            JsonNode done = e2e.getInstance(progress, id);
            e2e.assertStatus(done, "COMPLETED");
            e2e.assertNode(done, "return_fail");

            // Shop participated → can still view
            e2e.getInstance(shop, id);
        }

        @Test
        @DisplayName("PASS → BER YES → Cat E condemn")
        void berYesCondemns() throws Exception {
            String progress = e2e.login("progress.user");
            String inspection = e2e.login("inspection.user");

            String id = e2e.start(progress, "accessories-bench-check", "ACC-BER-1");
            e2e.complete(progress, id, "{\"sparesRequired\":\"No\"}");
            e2e.complete(inspection, id, "{\"scheduleRef\":\"SCH-3\"}");
            e2e.decide(inspection, id, "PASS");
            e2e.complete(inspection, id, "{\"serviceable\":\"Borderline\"}");
            JsonNode done = e2e.decide(inspection, id, "YES");
            e2e.assertStatus(done, "COMPLETED");
            e2e.assertNode(done, "condemn");
        }

        @Test
        @DisplayName("PASS → Cat D → repair permitted → Progress rotable → SST complete")
        void repairPermittedRotablePath() throws Exception {
            String progress = e2e.login("progress.user");
            String inspection = e2e.login("inspection.user");

            String id = e2e.start(progress, "accessories-bench-check", "ACC-ROT-1");
            e2e.complete(progress, id, "{\"sparesRequired\":\"No\"}");
            e2e.complete(inspection, id, "{\"scheduleRef\":\"SCH-4\"}");
            e2e.decide(inspection, id, "PASS");
            e2e.complete(inspection, id, "{\"serviceable\":\"Yes\"}");
            e2e.decide(inspection, id, "NO");
            e2e.complete(inspection, id, "{\"labelApplied\":\"Cat-D\"}");
            e2e.assertNode(e2e.decide(inspection, id, "YES"), "rotable_input");

            // Inspection cannot do Progress rotable handoff
            e2e.transitionForbidden(inspection, id, "{\"action\":\"COMPLETE\",\"formPayload\":{\"docs\":\"x\"}}");
            e2e.assertNode(e2e.complete(progress, id, "{\"docsAttached\":\"Yes\",\"pdr\":\"PDR-9\"}"), "sst");
            JsonNode done = e2e.complete(inspection, id, "{\"sstResult\":\"PASS\"}");
            e2e.assertStatus(done, "COMPLETED");
            e2e.assertNode(done, "complete_serviceable");
        }
    }

    @Nested
    @DisplayName("NDT Radiography — role handoffs")
    class NdtFlows {

        @Test
        @DisplayName("Accept path completes to dispatch (INSPECTION)")
        void acceptPath() throws Exception {
            String inspection = e2e.login("inspection.user");
            String progress = e2e.login("progress.user");
            String stores = e2e.login("stores.user");

            String id = e2e.start(inspection, "ndt-radiography", "NDT-OK-1");
            e2e.transitionForbidden(progress, id, "{\"action\":\"COMPLETE\",\"formPayload\":{\"partNo\":\"X\"}}");
            e2e.transitionForbidden(stores, id, "{\"action\":\"COMPLETE\",\"formPayload\":{\"partNo\":\"X\"}}");

            e2e.complete(inspection, id, "{\"partNo\":\"P-1\",\"serialNo\":\"S-1\",\"po\":\"PO-9\"}");
            e2e.complete(inspection, id, "{\"filmType\":\"D4\",\"kV\":\"120\"}");
            e2e.complete(inspection, id, "{\"shots\":\"3\"}");
            e2e.complete(inspection, id, "{\"processed\":\"Yes\"}");
            e2e.complete(inspection, id, "{\"findings\":\"No indications\"}");
            e2e.assertNode(e2e.decide(inspection, id, "YES"), "accept");

            String docId = e2e.upload(inspection, id, "lab-report.txt", "OK".getBytes());
            assertTrue(docId != null && !docId.isBlank());

            JsonNode done = e2e.complete(inspection, id, "{\"endorsed\":\"Yes\",\"registerRef\":\"MR-22\"}");
            e2e.assertStatus(done, "COMPLETED");
            e2e.assertNode(done, "dispatch");

            e2e.getInstance(e2e.login("qa.user"), id);
            e2e.getInstance(e2e.login("customer.user"), id);
        }

        @Test
        @DisplayName("Reject path ends at reject")
        void rejectPath() throws Exception {
            String inspection = e2e.login("inspection.user");
            String id = e2e.start(inspection, "ndt-radiography", "NDT-REJ-1");
            e2e.complete(inspection, id, "{\"partNo\":\"P-2\",\"serialNo\":\"S-2\"}");
            e2e.complete(inspection, id, "{\"filmType\":\"D5\",\"kV\":\"140\"}");
            e2e.complete(inspection, id, "{\"shots\":\"2\"}");
            e2e.complete(inspection, id, "{\"processed\":\"Yes\"}");
            e2e.complete(inspection, id, "{\"findings\":\"Crack at root\"}");
            JsonNode done = e2e.decide(inspection, id, "NO");
            e2e.assertStatus(done, "COMPLETED");
            e2e.assertNode(done, "reject");
        }
    }

    @Nested
    @DisplayName("Cross-role isolation")
    class Isolation {

        @Test
        void storesAndCustomerCannotDriveRunningAccessoriesSteps() throws Exception {
            String progress = e2e.login("progress.user");
            String id = e2e.start(progress, "accessories-bench-check", "ACC-ISO-1");

            e2e.transitionForbidden(e2e.login("stores.user"), id,
                    "{\"action\":\"COMPLETE\",\"formPayload\":{\"sparesRequired\":\"No\"}}");
            e2e.transitionForbidden(e2e.login("customer.user"), id,
                    "{\"action\":\"COMPLETE\",\"formPayload\":{\"sparesRequired\":\"No\"}}");
            e2e.transitionForbidden(e2e.login("qa.user"), id,
                    "{\"action\":\"COMPLETE\",\"formPayload\":{\"sparesRequired\":\"No\"}}");

            // Non-participants without matching role cannot view mid-flight (stores at Progress step)
            e2e.getInstanceForbidden(e2e.login("stores.user"), id);
            e2e.getInstanceForbidden(e2e.login("customer.user"), id);
        }

        @Test
        void wrongRoleSeesEmptyAllowedActions() throws Exception {
            String progress = e2e.login("progress.user");
            String id = e2e.start(progress, "accessories-bench-check", "ACC-ACT-1");
            // Move to inspection step
            e2e.complete(progress, id, "{\"sparesRequired\":\"No\"}");

            JsonNode asProgress = e2e.getInstance(progress, id);
            e2e.assertNode(asProgress, "test");
            assertTrue(asProgress.path("allowedActions").isArray()
                    && asProgress.path("allowedActions").isEmpty(),
                    "Progress must not get actions on Inspection step");

            JsonNode asInspection = e2e.getInstance(e2e.login("inspection.user"), id);
            assertTrue(asInspection.path("allowedActions").size() >= 1,
                    "Inspection must see COMPLETE action");
        }

        @Test
        void notificationsReachTargetRoleAfterHandoff() throws Exception {
            String progress = e2e.login("progress.user");
            String inspection = e2e.login("inspection.user");
            String id = e2e.start(progress, "accessories-bench-check", "ACC-NOTIF-1");
            e2e.complete(progress, id, "{\"sparesRequired\":\"No\"}");

            JsonNode notifs = e2e.notifications(inspection);
            assertTrue(notifs.isArray(), "notifications payload must be array");
            boolean matched = false;
            for (JsonNode n : notifs) {
                if (id.equals(n.path("instanceId").asText())) {
                    matched = true;
                    break;
                }
            }
            assertTrue(matched, "Inspection should receive notification for instance " + id);
        }
    }
}
