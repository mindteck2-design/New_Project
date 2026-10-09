package com.hal.amms.web;

import com.hal.amms.service.MongoFormSchemaService;
import org.bson.Document;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Serves dynamic form definitions from MongoDB {@code form_schemas}.
 */
@RestController
@RequestMapping("/api/v1/forms")
@ConditionalOnBean(MongoFormSchemaService.class)
public class FormController {

    private final MongoFormSchemaService schemas;

    public FormController(MongoFormSchemaService schemas) {
        this.schemas = schemas;
    }

    @GetMapping("/{formKey}")
    public Map<String, Object> getSchema(@PathVariable String formKey) {
        Document doc = schemas.findByKey(formKey)
                .orElseThrow(() -> ApiException.notFound("Form schema not found: " + formKey));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("formKey", doc.getString("formKey"));
        out.put("name", doc.getString("name"));
        out.put("fields", doc.get("fields", List.class));
        out.put("store", "mongo");
        return out;
    }
}
