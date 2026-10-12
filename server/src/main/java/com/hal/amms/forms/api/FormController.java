package com.hal.amms.forms.api;

import com.hal.amms.forms.MongoFormSchemaService;
import com.hal.amms.platform.web.ApiException;
import org.bson.Document;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * CRUD + lifecycle for dynamic form definitions stored in MongoDB {@code form_schemas}.
 */
@RestController
@RequestMapping("/api/v1/forms")
@ConditionalOnBean(MongoFormSchemaService.class)
public class FormController {

    private final MongoFormSchemaService schemas;

    public FormController(MongoFormSchemaService schemas) {
        this.schemas = schemas;
    }

    public record FormColumnDto(String key, String label, String id) {}

    public record FormFieldDto(
            String name,
            String label,
            String type,
            String placeholder,
            Boolean required,
            List<String> options,
            String accept,
            Boolean multiple,
            String helpText,
            String content,
            String id,
            List<FormColumnDto> columns
    ) {}

    public record UpsertFormRequest(
            String formKey,
            String name,
            List<FormFieldDto> fields,
            String status
    ) {}

    public record CloneFormRequest(String newKey, String name) {}

    @GetMapping
    public List<Map<String, Object>> list(
            @RequestParam(name = "status", required = false) String status
    ) {
        return schemas.listAll(status).stream().map(schemas::toApi).toList();
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
            schemas.upsert(key, request.name(), toMaps(request.fields()), request.status(), 1);
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

    @PostMapping("/{formKey}/publish")
    public Map<String, Object> publish(@PathVariable String formKey) {
        try {
            return schemas.toApi(schemas.publish(formKey.trim().toLowerCase()));
        } catch (IllegalArgumentException ex) {
            throw ApiException.notFound(ex.getMessage());
        }
    }

    @PostMapping("/{formKey}/draft")
    public Map<String, Object> setDraft(@PathVariable String formKey) {
        try {
            return schemas.toApi(schemas.setDraft(formKey.trim().toLowerCase()));
        } catch (IllegalArgumentException ex) {
            throw ApiException.notFound(ex.getMessage());
        }
    }

    @PostMapping("/{formKey}/clone")
    public Map<String, Object> cloneForm(
            @PathVariable String formKey,
            @RequestBody CloneFormRequest request
    ) {
        if (request == null || request.newKey() == null || request.newKey().isBlank()) {
            throw ApiException.badRequest("newKey is required");
        }
        try {
            Document cloned = schemas.cloneForm(
                    formKey.trim().toLowerCase(),
                    request.newKey().trim().toLowerCase(),
                    request.name()
            );
            return schemas.toApi(cloned);
        } catch (IllegalArgumentException ex) {
            throw ApiException.badRequest(ex.getMessage());
        } catch (IllegalStateException ex) {
            throw ApiException.conflict(ex.getMessage());
        }
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
                    Map<String, Object> m = new LinkedHashMap<>();
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
                    if (f.content() != null) {
                        m.put("content", f.content());
                    }
                    if (f.id() != null) {
                        m.put("id", f.id());
                    }
                    if (f.columns() != null && !f.columns().isEmpty()) {
                        m.put(
                                "columns",
                                f.columns().stream()
                                        .map(c -> {
                                            Map<String, Object> col = new LinkedHashMap<>();
                                            col.put("key", c.key());
                                            col.put("label", c.label());
                                            if (c.id() != null) {
                                                col.put("id", c.id());
                                            }
                                            return col;
                                        })
                                        .toList()
                        );
                    }
                    return m;
                })
                .toList();
    }
}
