package com.hal.amms.forms;

import org.bson.Document;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import com.hal.amms.shared.AmmsDateTimes;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Dynamic form schemas live in MongoDB {@code form_schemas} — ADR-002.
 */
@Service
@ConditionalOnProperty(name = "amms.forms.store", havingValue = "mongo")
public class MongoFormSchemaService {

    public static final String COLLECTION = "form_schemas";
    private static final Pattern FORM_KEY = Pattern.compile("^[a-z][a-z0-9-]{1,62}$");
    private static final java.util.Set<String> ALLOWED_TYPES = java.util.Set.of(
            // Content / Markdown layout blocks (no operator payload)
            "heading1", "heading2", "heading3", "paragraph", "callout", "divider", "bullets",
            // Input blocks
            "text", "textarea", "number", "measurement", "email", "phone", "url",
            "date", "time", "datetime",
            "select", "radio", "checkbox", "multiselect", "attachment", "signature"
    );

    private static final java.util.Set<String> CONTENT_TYPES = java.util.Set.of(
            "heading1", "heading2", "heading3", "paragraph", "callout", "divider", "bullets"
    );

    private final MongoTemplate mongoTemplate;

    public MongoFormSchemaService(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public void upsert(String formKey, String name, List<Map<String, Object>> fields) {
        validate(formKey, name, fields);
        Query q = Query.query(Criteria.where("formKey").is(formKey));
        Document existing = mongoTemplate.findOne(q, Document.class, COLLECTION);
        Document doc = new Document()
                .append("formKey", formKey)
                .append("name", name.trim())
                .append("fields", normalizeFields(fields))
                .append("updatedAt", AmmsDateTimes.now());
        if (existing != null && existing.get("_id") != null) {
            doc.put("_id", existing.get("_id"));
            if (existing.get("createdAt") != null) {
                doc.put("createdAt", existing.get("createdAt"));
            }
            mongoTemplate.save(doc, COLLECTION);
        } else {
            doc.put("createdAt", AmmsDateTimes.now());
            mongoTemplate.insert(doc, COLLECTION);
        }
    }

    public Optional<Document> findByKey(String formKey) {
        if (formKey == null || formKey.isBlank()) {
            return Optional.empty();
        }
        Document doc = mongoTemplate.findOne(
                Query.query(Criteria.where("formKey").is(formKey)),
                Document.class,
                COLLECTION
        );
        return Optional.ofNullable(doc);
    }

    public List<Document> listAll() {
        List<Document> docs = mongoTemplate.findAll(Document.class, COLLECTION);
        docs.sort(Comparator.comparing(d -> String.valueOf(d.get("formKey")), String.CASE_INSENSITIVE_ORDER));
        return docs;
    }

    public boolean deleteByKey(String formKey) {
        var result = mongoTemplate.remove(
                Query.query(Criteria.where("formKey").is(formKey)),
                COLLECTION
        );
        return result.getDeletedCount() > 0;
    }

    public boolean exists(String formKey) {
        return findByKey(formKey).isPresent();
    }

    public long count() {
        return mongoTemplate.getCollection(COLLECTION).countDocuments();
    }

    public Map<String, Object> toApi(Document doc) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("formKey", doc.getString("formKey"));
        out.put("name", doc.getString("name"));
        out.put("fields", doc.get("fields", List.class));
        out.put("store", "mongo");
        Object created = doc.get("createdAt");
        Object updated = doc.get("updatedAt");
        if (created != null) {
            out.put("createdAt", created.toString());
        }
        if (updated != null) {
            out.put("updatedAt", updated.toString());
        }
        return out;
    }

    private void validate(String formKey, String name, List<Map<String, Object>> fields) {
        if (formKey == null || !FORM_KEY.matcher(formKey).matches()) {
            throw new IllegalArgumentException(
                    "formKey must be lowercase kebab-case (2–63 chars), e.g. spares-demand");
        }
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("name is required");
        }
        if (fields == null || fields.isEmpty()) {
            throw new IllegalArgumentException("at least one field is required");
        }
        for (Map<String, Object> field : fields) {
            Object n = field == null ? null : field.get("name");
            Object label = field == null ? null : field.get("label");
            String type = field == null || field.get("type") == null || String.valueOf(field.get("type")).isBlank()
                    ? "text"
                    : String.valueOf(field.get("type")).trim().toLowerCase();
            if (!ALLOWED_TYPES.contains(type)) {
                throw new IllegalArgumentException("unsupported field type: " + type);
            }
            boolean content = CONTENT_TYPES.contains(type);
            if (n == null || String.valueOf(n).isBlank()) {
                throw new IllegalArgumentException("each field requires a name");
            }
            if (!String.valueOf(n).matches("^[a-zA-Z][a-zA-Z0-9_]{0,63}$")) {
                throw new IllegalArgumentException("field name must be a simple identifier: " + n);
            }
            if (!content && (label == null || String.valueOf(label).isBlank())) {
                throw new IllegalArgumentException("each input field requires a label");
            }
            if (content && !"divider".equals(type)) {
                Object body = field.get("content");
                String text = body != null && !String.valueOf(body).isBlank()
                        ? String.valueOf(body)
                        : label == null ? "" : String.valueOf(label);
                if (text.isBlank()) {
                    throw new IllegalArgumentException(type + " block requires Markdown content");
                }
            }
            if ("select".equals(type) || "radio".equals(type) || "multiselect".equals(type)) {
                List<String> options = asStringList(field.get("options"));
                if (options.isEmpty()) {
                    throw new IllegalArgumentException(type + " field " + n + " needs at least one option");
                }
            }
        }
    }

    private List<Map<String, Object>> normalizeFields(List<Map<String, Object>> fields) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> raw : fields) {
            Map<String, Object> f = new LinkedHashMap<>();
            f.put("name", String.valueOf(raw.get("name")).trim());
            Object type = raw.get("type");
            String normalizedType = type == null || String.valueOf(type).isBlank()
                    ? "text"
                    : String.valueOf(type).trim().toLowerCase();
            f.put("type", normalizedType);
            boolean content = CONTENT_TYPES.contains(normalizedType);
            Object labelRaw = raw.get("label");
            Object contentRaw = raw.get("content");
            String label = labelRaw == null ? "" : String.valueOf(labelRaw).trim();
            String body = contentRaw == null ? "" : String.valueOf(contentRaw).trim();
            if (content) {
                if ("divider".equals(normalizedType)) {
                    f.put("label", label.isBlank() ? "—" : label);
                } else {
                    String text = !body.isBlank() ? body : label;
                    f.put("label", text);
                    f.put("content", text);
                }
                f.put("required", false);
            } else {
                f.put("label", label);
                Object placeholder = raw.get("placeholder");
                if (placeholder != null && !String.valueOf(placeholder).isBlank()) {
                    f.put("placeholder", String.valueOf(placeholder).trim());
                }
                Object required = raw.get("required");
                f.put("required", required == null || Boolean.parseBoolean(String.valueOf(required)));
                List<String> options = asStringList(raw.get("options"));
                if (!options.isEmpty()) {
                    f.put("options", options);
                }
                Object accept = raw.get("accept");
                if (accept != null && !String.valueOf(accept).isBlank()) {
                    f.put("accept", String.valueOf(accept).trim());
                }
                Object multiple = raw.get("multiple");
                if (multiple != null) {
                    f.put("multiple", Boolean.parseBoolean(String.valueOf(multiple)));
                }
                if ("attachment".equals(normalizedType) && multiple == null) {
                    f.put("multiple", false);
                }
                Object helpText = raw.get("helpText");
                if (helpText != null && !String.valueOf(helpText).isBlank()) {
                    f.put("helpText", String.valueOf(helpText).trim());
                }
            }
            Object id = raw.get("id");
            if (id != null && !String.valueOf(id).isBlank()) {
                f.put("id", String.valueOf(id).trim());
            }
            out.add(f);
        }
        return out;
    }

    @SuppressWarnings("unchecked")
    private static List<String> asStringList(Object value) {
        if (value == null) {
            return List.of();
        }
        if (value instanceof List<?> list) {
            List<String> out = new ArrayList<>();
            for (Object item : list) {
                if (item == null) {
                    continue;
                }
                String s = String.valueOf(item).trim();
                if (!s.isEmpty()) {
                    out.add(s);
                }
            }
            return out;
        }
        String raw = String.valueOf(value).trim();
        if (raw.isEmpty()) {
            return List.of();
        }
        List<String> out = new ArrayList<>();
        for (String part : raw.split("[,\\n]")) {
            String s = part.trim();
            if (!s.isEmpty()) {
                out.add(s);
            }
        }
        return out;
    }
}
