package com.hal.amms.forms;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Seeds Mongo {@code form_schemas} for MVP DynamicForm keys (Accessories + NDT).
 */
@Component
@Order(20)
@ConditionalOnBean(MongoFormSchemaService.class)
public class MongoFormSchemaSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(MongoFormSchemaSeeder.class);

    private final MongoFormSchemaService schemas;

    public MongoFormSchemaSeeder(MongoFormSchemaService schemas) {
        this.schemas = schemas;
    }

    @Override
    public void run(ApplicationArguments args) {
        seed("spares-demand", "Spares demand / supply", List.of(
                field("sparesRequired", "Spares required", "Yes / No / part list"),
                field("notes", "Notes", null)
        ));
        seed("bench-test", "Bench test", List.of(
                field("scheduleRef", "Test schedule ref", null),
                field("observations", "Observations", null)
        ));
        seed("repair-rework", "Repair / rework", List.of(
                field("workDone", "Repair / rework performed", null),
                field("technician", "Technician", null)
        ));
        seed("serviceable-inspect", "Serviceable inspect", List.of(
                field("condition", "Condition notes", null)
        ));
        seed("cat-d-label", "Cat D / repairable label", List.of(
                field("labelType", "Label (Repairable / Cat D)", null)
        ));
        seed("rotable-input", "Rotable input", List.of(
                field("documentRefs", "Document references", null)
        ));
        seed("sst", "SST / bench check", List.of(
                field("sstResult", "SST / bench check notes", null)
        ));
        seed("ndt-visual", "NDT visual", List.of(
                field("partNo", "Part No", null),
                field("serialNo", "Serial / PO No", null)
        ));
        seed("rt-exposure", "RT exposure", List.of(
                field("film", "Film / exposure factors", null)
        ));
        seed("rt-examine", "RT examine", List.of(
                field("technique", "Technique / procedure", null)
        ));
        seed("rt-process", "RT process", List.of(
                field("darkroomNotes", "Dark room notes", null)
        ));
        seed("rt-interpret", "RT interpret", List.of(
                field("interpretation", "Interpretation", null)
        ));
        seed("ndt-endorse", "NDT endorse", List.of(
                field("endorsement", "Document endorsement", null)
        ));
        log.info("Mongo form_schemas ready ({} docs)", schemas.count());
    }

    private void seed(String key, String name, List<Map<String, Object>> fields) {
        if (schemas.exists(key)) {
            return;
        }
        // Seed catalog forms as published so Workflow Master can bind them immediately.
        schemas.upsert(key, name, fields, MongoFormSchemaService.STATUS_PUBLISHED, 1);
    }

    private static Map<String, Object> field(String name, String label, String placeholder) {
        if (placeholder == null || placeholder.isBlank()) {
            return Map.of("name", name, "label", label, "required", true);
        }
        return Map.of("name", name, "label", label, "placeholder", placeholder, "required", true);
    }
}
