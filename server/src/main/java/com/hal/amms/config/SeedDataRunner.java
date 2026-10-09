package com.hal.amms.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.hal.amms.dao.UserDao;
import com.hal.amms.dao.WorkflowDao;
import com.hal.amms.model.Models.WorkflowNode;
import com.hal.amms.model.Models.WorkflowTransition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

@Component
public class SeedDataRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SeedDataRunner.class);

    private final UserDao userDao;
    private final WorkflowDao workflowDao;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper mapper;
    private final String seedPassword;
    private final String workflowsDir;

    public SeedDataRunner(
            UserDao userDao,
            WorkflowDao workflowDao,
            PasswordEncoder passwordEncoder,
            ObjectMapper mapper,
            @Value("${amms.seed.password:Passw0rd!}") String seedPassword,
            @Value("${amms.workflows-dir:../docs/workflows}") String workflowsDir
    ) {
        this.userDao = userDao;
        this.workflowDao = workflowDao;
        this.passwordEncoder = passwordEncoder;
        this.mapper = mapper;
        this.seedPassword = seedPassword;
        this.workflowsDir = workflowsDir;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws Exception {
        seedUsers();
        seedWorkflows();
    }

    private void seedUsers() {
        seedUser("progress.user", "Progress Officer", "PROGRESS");
        seedUser("inspection.user", "Inspector", "INSPECTION");
        seedUser("qa.user", "QA Officer", "QA");
        seedUser("stores.user", "Stores Officer", "STORES");
        seedUser("customer.user", "Customer Rep", "CUSTOMER");
        seedUser("shop.user", "Shop Manager", "SHOP_MANAGER");
        if (!userDao.existsByUsername("admin")) {
            UUID id = UUID.randomUUID();
            userDao.insertUser(id, "admin", passwordEncoder.encode(seedPassword), "AMMS Admin");
            for (String role : new String[]{"PROGRESS", "INSPECTION", "QA", "STORES", "CUSTOMER", "SHOP_MANAGER"}) {
                userDao.linkRole(id, role);
            }
            log.info("Seeded admin user");
        }
    }

    private void seedUser(String username, String displayName, String role) {
        if (userDao.existsByUsername(username)) {
            return;
        }
        UUID id = UUID.randomUUID();
        userDao.insertUser(id, username, passwordEncoder.encode(seedPassword), displayName);
        userDao.linkRole(id, role);
        log.info("Seeded user {} ({})", username, role);
    }

    private void seedWorkflows() throws Exception {
        Path dir = Path.of(workflowsDir).toAbsolutePath().normalize();
        if (Files.isDirectory(dir)) {
            try (var stream = Files.list(dir)) {
                stream.filter(p -> p.getFileName().toString().endsWith(".json"))
                        .forEach(p -> {
                            try {
                                loadWorkflow(Files.readString(p, StandardCharsets.UTF_8));
                            } catch (Exception e) {
                                throw new IllegalStateException("Failed loading " + p, e);
                            }
                        });
            }
            return;
        }
        PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        Resource[] resources = resolver.getResources("classpath:workflows/*.json");
        for (Resource resource : resources) {
            loadWorkflow(resource.getContentAsString(StandardCharsets.UTF_8));
        }
    }

    private void loadWorkflow(String json) throws Exception {
        JsonNode root = mapper.readTree(json);
        String key = root.path("key").asText();
        String name = root.path("name").asText();
        int version = root.path("version").asInt(1);

        UUID defId = workflowDao.definitionExists(key)
                ? workflowDao.definitionIdByKey(key)
                : UUID.randomUUID();

        workflowDao.upsertDefinition(defId, key, name, version, json);
        defId = workflowDao.definitionIdByKey(key);

        for (JsonNode n : root.path("nodes")) {
            String config = null;
            if (n.has("options") || n.has("expression")) {
                ObjectNode obj = mapper.createObjectNode();
                if (n.has("options")) {
                    obj.set("options", n.get("options"));
                }
                if (n.has("expression") && !n.get("expression").isNull()) {
                    obj.put("expression", n.get("expression").asText());
                }
                config = obj.toString();
            }
            workflowDao.insertNode(new WorkflowNode(
                    UUID.randomUUID(),
                    defId,
                    n.path("key").asText(),
                    n.path("type").asText(),
                    textOrNull(n, "roleCode"),
                    textOrNull(n, "formKey"),
                    n.path("label").asText(),
                    config
            ));
        }

        int priority = 0;
        for (JsonNode t : root.path("transitions")) {
            workflowDao.insertTransition(new WorkflowTransition(
                    UUID.randomUUID(),
                    defId,
                    t.path("from").asText(),
                    t.path("to").asText(),
                    textOrNull(t, "when"),
                    priority++
            ));
        }
        log.info("Seeded workflow {}", key);
    }

    private static String textOrNull(JsonNode node, String field) {
        JsonNode v = node.get(field);
        if (v == null || v.isNull() || v.asText().isBlank()) {
            return null;
        }
        return v.asText();
    }
}
