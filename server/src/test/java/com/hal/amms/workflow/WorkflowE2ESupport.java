package com.hal.amms.workflow;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Shared helpers for role-matrix / workflow E2E MockMvc tests.
 */
final class WorkflowE2ESupport {

    static final String PASSWORD = "Passw0rd!";

    private final MockMvc mockMvc;
    private final JsonMapper mapper;

    WorkflowE2ESupport(MockMvc mockMvc, JsonMapper mapper) {
        this.mockMvc = mockMvc;
        this.mapper = mapper;
    }

    String login(String username) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String token = mapper.readTree(result.getResponse().getContentAsString()).path("token").asText();
        assertTrue(token != null && !token.isBlank(), "login token missing for " + username);
        return token;
    }

    String start(String token, String workflowKey, String businessKey) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/workflows/" + workflowKey + "/instances")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"businessKey\":\"" + businessKey + "\",\"context\":{}}"))
                .andExpect(status().isOk())
                .andReturn();
        return mapper.readTree(result.getResponse().getContentAsString()).path("instanceId").asText();
    }

    void startForbidden(String token, String workflowKey) throws Exception {
        mockMvc.perform(post("/api/v1/workflows/" + workflowKey + "/instances")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"businessKey\":\"FORBID\",\"context\":{}}"))
                .andExpect(status().isForbidden());
    }

    JsonNode getInstance(String token, String instanceId) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/instances/" + instanceId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        return mapper.readTree(result.getResponse().getContentAsString());
    }

    void getInstanceForbidden(String token, String instanceId) throws Exception {
        mockMvc.perform(get("/api/v1/instances/" + instanceId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    JsonNode transition(String token, String instanceId, String body) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/instances/" + instanceId + "/transitions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn();
        return mapper.readTree(result.getResponse().getContentAsString());
    }

    void transitionForbidden(String token, String instanceId, String body) throws Exception {
        mockMvc.perform(post("/api/v1/instances/" + instanceId + "/transitions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());
    }

    JsonNode complete(String token, String instanceId, String formJsonObject) throws Exception {
        return transition(token, instanceId,
                "{\"action\":\"COMPLETE\",\"formPayload\":" + formJsonObject
                        + ",\"signaturePlaceholder\":\"e2e-sig\"}");
    }

    JsonNode decide(String token, String instanceId, String value) throws Exception {
        return transition(token, instanceId,
                "{\"action\":\"DECISION\",\"decisionValue\":\"" + value
                        + "\",\"signaturePlaceholder\":\"e2e-sig\"}");
    }

    void assertNode(JsonNode view, String expectedKey) {
        assertEquals(expectedKey, view.path("currentNode").path("key").asText(),
                "unexpected current node: " + view);
    }

    void assertStatus(JsonNode view, String expected) {
        assertEquals(expected, view.path("status").asText(), "unexpected status: " + view);
    }

    JsonNode audit(String token, String instanceId) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/instances/" + instanceId + "/audit")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        return mapper.readTree(result.getResponse().getContentAsString());
    }

    JsonNode notifications(String token) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/notifications")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        return mapper.readTree(result.getResponse().getContentAsString());
    }

    String upload(String token, String instanceId, String fileName, byte[] bytes) throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", fileName, "text/plain", bytes);
        MvcResult result = mockMvc.perform(multipart("/api/v1/instances/" + instanceId + "/documents")
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        return mapper.readTree(result.getResponse().getContentAsString()).path("id").asText();
    }

    static boolean canConnectToPostgres() {
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
