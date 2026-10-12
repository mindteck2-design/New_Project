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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assumptions.assumeTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
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
                {"action":"DECISION","decisionValue":"FAIL"}
                """);
        assertEquals("repair", after.path("currentNode").path("key").asText());
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
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"Passw0rd!\"}"))
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
