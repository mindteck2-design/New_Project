package com.hal.amms.workflow;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class WorkflowApiIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired JsonMapper mapper;

    @BeforeEach
    void assumeDb() throws Exception {
        assumeTrue(canConnectToPostgres(), "PostgreSQL not available for integration tests");
        Files.createDirectories(Path.of("target/test-attachments"));
    }

    @Test
    void wrongRoleGets403OnTransition() throws Exception {
        String adminToken = login("admin");
        String instanceId = startWorkflow(adminToken, "ndt-radiography");

        String storesToken = login("stores.user");
        mockMvc.perform(post("/api/v1/instances/" + instanceId + "/transitions")
                        .header("Authorization", "Bearer " + storesToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"action":"COMPLETE","formPayload":{"partNo":"X"}}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void accessoriesBenchCheckFailRoutesToRepair() throws Exception {
        String token = login("admin");
        String instanceId = startWorkflow(token, "accessories-bench-check");

        transition(token, instanceId, """
                {"action":"COMPLETE","formPayload":{"sparesRequired":"No"}}
                """);
        transition(token, instanceId, """
                {"action":"COMPLETE","formPayload":{"scheduleRef":"SCH-1"}}
                """);
        JsonNode after = transition(token, instanceId, """
                {"action":"DECISION","decisionValue":"FAIL","formPayload":{"inspectionNotes":"crack observed"}}
                """);
        assertEquals("repair", after.path("currentNode").path("key").asText());
        assertEquals("crack observed", after.path("context").path("inspectionNotes").asText());
    }

    @Test
    void auditRetainsEachFormAttemptAndPrefillsLatestValuesAfterFailRoute() throws Exception {
        String token = login("admin");
        String workflowKey = "retry-" + UUID.randomUUID().toString().replace("-", "");
        mockMvc.perform(post("/api/v1/workflows")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "key":"%s",
                                  "name":"Retry form history test",
                                  "version":1,
                                  "nodes":[
                                    {"key":"start","type":"START","label":"Start","roleCode":"PROGRESS"},
                                    {"key":"prepare","type":"TASK","label":"Prepare","roleCode":"PROGRESS","formKey":"retry-test-form"},
                                    {"key":"inspect","type":"DECISION","label":"Inspect","roleCode":"INSPECTION","formKey":"retry-test-form","options":["PASS","FAIL"],"expression":"inspection"},
                                    {"key":"end","type":"END","label":"Complete","roleCode":"PROGRESS"}
                                  ],
                                  "transitions":[
                                    {"from":"start","to":"prepare"},
                                    {"from":"prepare","to":"inspect"},
                                    {"from":"inspect","to":"end","when":"PASS"},
                                    {"from":"inspect","to":"prepare","when":"FAIL"}
                                  ]
                                }
                                """.formatted(workflowKey)))
                .andExpect(status().isOk());
        String instanceId = startWorkflow(token, workflowKey);

        transition(token, instanceId, """
                {"action":"COMPLETE","formPayload":{"serialNumber":"SN-100","condition":"Initial"}}
                """);
        transition(token, instanceId, """
                {"action":"DECISION","decisionValue":"FAIL","formPayload":{"inspectionNotes":"Rework required"}}
                """);
        MvcResult firstPrefill = mockMvc.perform(get("/api/v1/instances/" + instanceId + "/forms/current")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode firstValues = mapper.readTree(firstPrefill.getResponse().getContentAsString()).path("values");
        assertEquals("SN-100", firstValues.path("serialNumber").asText());
        assertEquals("Initial", firstValues.path("condition").asText());
        assertFalse(firstValues.has("inspectionNotes"));
        mockMvc.perform(get("/api/v1/instances/" + instanceId + "/forms/current")
                        .header("Authorization", "Bearer " + login("stores.user")))
                .andExpect(status().isForbidden());

        transition(token, instanceId, """
                {"action":"COMPLETE","formPayload":{"serialNumber":"SN-101","condition":"Reworked"}}
                """);
        transition(token, instanceId, """
                {"action":"DECISION","decisionValue":"FAIL","formPayload":{"inspectionNotes":"Second attempt"}}
                """);
        MvcResult latestPrefill = mockMvc.perform(get("/api/v1/instances/" + instanceId + "/forms/current")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode latestValues = mapper.readTree(latestPrefill.getResponse().getContentAsString()).path("values");
        assertEquals("SN-101", latestValues.path("serialNumber").asText());
        assertEquals("Reworked", latestValues.path("condition").asText());
        assertFalse(latestValues.has("inspectionNotes"));

        String freshInstanceId = startWorkflow(token, workflowKey);
        MvcResult freshPrefill = mockMvc.perform(get("/api/v1/instances/" + freshInstanceId + "/forms/current")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        assertEquals(0, mapper.readTree(freshPrefill.getResponse().getContentAsString()).path("values").size());

        MvcResult auditResult = mockMvc.perform(get("/api/v1/instances/" + instanceId + "/audit")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode audit = mapper.readTree(auditResult.getResponse().getContentAsString());
        assertEquals(5, audit.size());
        assertEquals("SN-100", audit.get(1).path("payload").path("formPayload").path("serialNumber").asText());
        assertEquals("FAIL", audit.get(2).path("payload").path("decisionValue").asText());
        assertEquals("Second attempt", audit.get(4).path("payload").path("formPayload").path("inspectionNotes").asText());
    }

    @Test
    void failedWorkPackagePartRemainsFailedInReport() throws Exception {
        String token = login("admin");
        String poNumber = "WP-FAIL-" + UUID.randomUUID();
        MvcResult createdPackage = mockMvc.perform(post("/api/v1/packages")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"aircraftId":"A-1","poNumber":"%s","testingType":"REPAIR","workflowKey":"accessories-bench-check"}
                                """.formatted(poNumber)))
                .andExpect(status().isOk())
                .andReturn();
        String packageId = mapper.readTree(createdPackage.getResponse().getContentAsString()).path("id").asText();

        MvcResult addedPart = mockMvc.perform(post("/api/v1/packages/" + packageId + "/parts")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"partNo":"A-1-TEST","serialNo":"SN-FAIL-1"}
                                """))
                .andExpect(status().isOk())
                .andReturn();
        String partId = mapper.readTree(addedPart.getResponse().getContentAsString())
                .path("parts").get(0).path("id").asText();

        MvcResult openedPart = mockMvc.perform(post("/api/v1/packages/" + packageId + "/parts/" + partId + "/open")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        String instanceId = mapper.readTree(openedPart.getResponse().getContentAsString())
                .path("openedInstanceId").asText();

        transition(token, instanceId, """
                {"action":"COMPLETE","formPayload":{"sparesRequired":"No"}}
                """);
        transition(token, instanceId, """
                {"action":"COMPLETE","formPayload":{"scheduleRef":"SCH-FAIL"}}
                """);
        transition(token, instanceId, """
                {"action":"DECISION","decisionValue":"FAIL"}
                """);
        transition(token, instanceId, """
                {"action":"COMPLETE","formPayload":{"repairCompleted":"Yes"}}
                """);
        JsonNode done = transition(token, instanceId, """
                {"action":"COMPLETE","formPayload":{"retestResult":"Failed"}}
                """);
        assertEquals("COMPLETED", done.path("status").asText());

        MvcResult addedSecondPart = mockMvc.perform(post("/api/v1/packages/" + packageId + "/parts")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"partNo":"A-1-SECOND","serialNo":"SN-2"}
                                """))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode updatedPackage = mapper.readTree(addedSecondPart.getResponse().getContentAsString());
        assertEquals("IN_PROGRESS", updatedPackage.path("status").asText());
        assertEquals(2, updatedPackage.path("parts").size());

        MvcResult report = mockMvc.perform(get("/api/v1/packages/" + packageId + "/report")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode reportJson = mapper.readTree(report.getResponse().getContentAsString());
        assertEquals("FAILED", reportJson.path("parts").get(0).path("status").asText());
        assertEquals(0, reportJson.path("summary").path("passed").asInt());
        assertEquals(1, reportJson.path("summary").path("failed").asInt());
        assertEquals(1, reportJson.path("summary").path("pending").asInt());
    }

    @Test
    void completedInstanceRejectsTransitionWith409() throws Exception {
        String token = login("admin");
        String instanceId = startWorkflow(token, "accessories-bench-check");
        transition(token, instanceId, """
                {"action":"COMPLETE","formPayload":{"sparesRequired":"No"}}
                """);
        transition(token, instanceId, """
                {"action":"COMPLETE","formPayload":{"scheduleRef":"SCH-1"}}
                """);
        transition(token, instanceId, """
                {"action":"DECISION","decisionValue":"PASS"}
                """);
        transition(token, instanceId, """
                {"action":"COMPLETE","formPayload":{"serviceable":"Yes"}}
                """);
        transition(token, instanceId, """
                {"action":"DECISION","decisionValue":"NO"}
                """);
        transition(token, instanceId, """
                {"action":"COMPLETE","formPayload":{"labelApplied":"Cat-D"}}
                """);
        JsonNode done = transition(token, instanceId, """
                {"action":"DECISION","decisionValue":"NO"}
                """);
        assertEquals("COMPLETED", done.path("status").asText());

        mockMvc.perform(post("/api/v1/instances/" + instanceId + "/transitions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"action\":\"COMPLETE\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void missingDecisionValueReturns400() throws Exception {
        String token = login("admin");
        String instanceId = startWorkflow(token, "accessories-bench-check");
        transition(token, instanceId, """
                {"action":"COMPLETE","formPayload":{"sparesRequired":"No"}}
                """);
        transition(token, instanceId, """
                {"action":"COMPLETE","formPayload":{"scheduleRef":"SCH-1"}}
                """);
        mockMvc.perform(post("/api/v1/instances/" + instanceId + "/transitions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"action\":\"DECISION\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void userAdministrationEnforcesAdminAndTemporaryPasswordLifecycle() throws Exception {
        String adminToken = login("admin");
        String progressToken = login("progress.user");
        mockMvc.perform(get("/api/v1/users")
                        .header("Authorization", "Bearer " + progressToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/users")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        String username = "user-mgmt-" + UUID.randomUUID();
        String temporaryPassword = "AMMS-Temporary-123!";
        MvcResult created = mockMvc.perform(post("/api/v1/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"%s","displayName":"Temporary Operator","roles":["PROGRESS"],"temporaryPassword":"%s"}
                                """.formatted(username, temporaryPassword)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode createdUser = mapper.readTree(created.getResponse().getContentAsString());
        assertEquals(username, createdUser.path("username").asText());
        assertEquals(true, createdUser.path("mustChangePassword").asBoolean());
        assertFalse(created.getResponse().getContentAsString().contains("passwordHash"));
        assertFalse(created.getResponse().getContentAsString().contains("temporaryPassword"));

        String temporaryToken = login(username, temporaryPassword);
        MvcResult blocked = mockMvc.perform(get("/api/v1/users")
                        .header("Authorization", "Bearer " + temporaryToken))
                .andExpect(status().isForbidden())
                .andReturn();
        assertTrue(blocked.getResponse().getContentAsString().contains("PASSWORD_CHANGE_REQUIRED"));

        mockMvc.perform(post("/api/v1/auth/password")
                        .header("Authorization", "Bearer " + temporaryToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"%s","newPassword":"AMMS-Permanent-456!"}
                                """.formatted(temporaryPassword)))
                .andExpect(status().isOk());
        MvcResult currentUser = mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + temporaryToken))
                .andExpect(status().isOk())
                .andReturn();
        assertFalse(mapper.readTree(currentUser.getResponse().getContentAsString())
                .path("mustChangePassword").asBoolean());
        mockMvc.perform(get("/api/v1/users")
                        .header("Authorization", "Bearer " + temporaryToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/v1/users/" + createdUser.path("id").asText())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"displayName":"Disabled Operator","roles":["PROGRESS"],"active":false}
                                """))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + temporaryToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void ndtRadiographyAcceptPathCompletes() throws Exception {
        String token = login("admin");
        String instanceId = startWorkflow(token, "ndt-radiography");

        transition(token, instanceId, """
                {"action":"COMPLETE","formPayload":{"partNo":"P-1","serialNo":"S-1"}}
                """);
        transition(token, instanceId, """
                {"action":"COMPLETE","formPayload":{"filmType":"D4","kV":"120"}}
                """);
        transition(token, instanceId, """
                {"action":"COMPLETE","formPayload":{"shots":"2"}}
                """);
        transition(token, instanceId, """
                {"action":"COMPLETE","formPayload":{"processed":"Yes"}}
                """);
        transition(token, instanceId, """
                {"action":"COMPLETE","formPayload":{"findings":"No cracks"}}
                """);
        transition(token, instanceId, """
                {"action":"DECISION","decisionValue":"YES"}
                """);
        JsonNode endorsed = transition(token, instanceId, """
                {"action":"COMPLETE","formPayload":{"endorsed":"Yes","registerRef":"MR-9"}}
                """);
        assertEquals("COMPLETED", endorsed.path("status").asText());
        assertEquals("dispatch", endorsed.path("currentNode").path("key").asText());
    }

    @Test
    void attachmentDownloadRequiresAuthAndInstanceAccess() throws Exception {
        String token = login("admin");
        String instanceId = startWorkflow(token, "ndt-radiography");

        MvcResult upload = mockMvc.perform(multipart("/api/v1/instances/" + instanceId + "/documents")
                        .file("file", "rt-film-note.txt".getBytes())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        String docId = mapper.readTree(upload.getResponse().getContentAsString()).path("id").asText();

        // Anonymous callers must be rejected (Spring Security may return 401 or 403).
        mockMvc.perform(get("/api/v1/instances/" + instanceId + "/documents/" + docId + "/content"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    if (status != 401 && status != 403) {
                        throw new AssertionError("Expected 401/403 for anonymous download, got " + status);
                    }
                });

        mockMvc.perform(get("/api/v1/instances/" + instanceId + "/documents/" + docId + "/content")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    private String login(String username) throws Exception {
        return login(username, "Passw0rd!");
    }

    private String login(String username, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return mapper.readTree(result.getResponse().getContentAsString()).path("token").asText();
    }

    private String startWorkflow(String token, String key) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/workflows/" + key + "/instances")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"businessKey\":\"IT-1\",\"context\":{}}"))
                .andExpect(status().isOk())
                .andReturn();
        return mapper.readTree(result.getResponse().getContentAsString()).path("instanceId").asText();
    }

    private JsonNode transition(String token, String instanceId, String body) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/instances/" + instanceId + "/transitions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn();
        return mapper.readTree(result.getResponse().getContentAsString());
    }

    private static boolean canConnectToPostgres() {
        try {
            Process p = new ProcessBuilder("bash", "-lc",
                    "PGPASSWORD=amms_dev psql -h 127.0.0.1 -U amms -d amms -c 'select 1' >/dev/null 2>&1")
                    .start();
            return p.waitFor() == 0;
        } catch (Exception e) {
            return false;
        }
    }
}
