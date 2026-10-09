package com.hal.amms.web;

import com.hal.amms.service.MongoFormSchemaService;
import org.bson.Document;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * CRUD for dynamic form definitions stored in MongoDB {@code form_schemas}.
 */
@RestController
@RequestMapping("/api/v1/forms")
@ConditionalOnBean(MongoFormSchemaService.class)
public class FormController {

    private final MongoFormSchemaService schemas;

    public FormController(MongoFormSchemaService schemas) {
        this.schemas = schemas;
    }

    public record FormFieldDto(
            String name,
            String label,
            String type,
            String placeholder,
            Boolean required,
            List<String> options,
            String accept,
            Boolean multiple,
            String helpText
    ) {}

    public record UpsertFormRequest(String formKey, String name, List<FormFieldDto> fields) {}

    @GetMapping
    public List<Map<String, Object>> list() {
        return schemas.listAll().stream().map(schemas::toApi).toList();
    }

    @GetMapping("/{formKey}")
    public Map<String, Object> getSchema(@PathVariable String formKey) {
        Document doc = schemas.findByKey(formKey)
                .orElseThrow(() -> ApiException.notFound("Form schema not found: " + formKey));
        return schemas.toApi(doc);
    }

    @PostMapping
    public Map<String, Object> create(@RequestBody UpsertFormRequest request) {
        if (request == null || request.formKey() == null || request.formKey().isBlank()) {
            throw ApiException.badRequest("formKey is required");
        }
        String key = request.formKey().trim().toLowerCase();
        if (schemas.exists(key)) {
            throw ApiException.conflict("Form schema already exists: " + key);
        }
        try {
            schemas.upsert(key, request.name(), toMaps(request.fields()));
        } catch (IllegalArgumentException ex) {
            throw ApiException.badRequest(ex.getMessage());
        }
        return schemas.toApi(schemas.findByKey(key).orElseThrow());
    }

    @PutMapping("/{formKey}")
    public Map<String, Object> update(@PathVariable String formKey, @RequestBody UpsertFormRequest request) {
        String key = formKey.trim().toLowerCase();
        if (!schemas.exists(key)) {
            throw ApiException.notFound("Form schema not found: " + key);
        }
        String name = request != null && request.name() != null ? request.name() : null;
        List<FormFieldDto> fields = request != null ? request.fields() : null;
        try {
            schemas.upsert(key, name, toMaps(fields));
        } catch (IllegalArgumentException ex) {
            throw ApiException.badRequest(ex.getMessage());
        }
        return schemas.toApi(schemas.findByKey(key).orElseThrow());
    }

    @DeleteMapping("/{formKey}")
    public Map<String, String> delete(@PathVariable String formKey) {
        if (!schemas.deleteByKey(formKey)) {
            throw ApiException.notFound("Form schema not found: " + formKey);
        }
        return Map.of("status", "deleted", "formKey", formKey);
    }

    private static List<Map<String, Object>> toMaps(List<FormFieldDto> fields) {
        if (fields == null) {
            return List.of();
        }
        return fields.stream()
                .map(f -> {
                    Map<String, Object> m = new java.util.LinkedHashMap<>();
                    m.put("name", f.name());
                    m.put("label", f.label());
                    m.put("type", f.type());
                    m.put("placeholder", f.placeholder());
                    m.put("required", f.required());
                    if (f.options() != null) {
                        m.put("options", f.options());
                    }
                    if (f.accept() != null) {
                        m.put("accept", f.accept());
                    }
                    if (f.multiple() != null) {
                        m.put("multiple", f.multiple());
                    }
                    if (f.helpText() != null) {
                        m.put("helpText", f.helpText());
                    }
                    return m;
                })
                .toList();
    }
}
