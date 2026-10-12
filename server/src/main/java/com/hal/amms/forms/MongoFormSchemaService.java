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
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Dynamic form schemas live in MongoDB {@code form_schemas} — ADR-002.
 * Lifecycle: DRAFT → PUBLISHED; clone creates a new DRAFT key; edits to PUBLISHED bump version.
 */
@Service
@ConditionalOnProperty(name = "amms.forms.store", havingValue = "mongo")
public class MongoFormSchemaService {

    public static final String COLLECTION = "form_schemas";
    public static final String STATUS_DRAFT = "DRAFT";
    public static final String STATUS_PUBLISHED = "PUBLISHED";

    private static final Pattern FORM_KEY = Pattern.compile("^[a-z][a-z0-9-]{1,62}$");
    private static final java.util.Set<String> ALLOWED_TYPES = java.util.Set.of(
            // Content / Markdown layout blocks (no operator payload)
            "heading1", "heading2", "heading3", "paragraph", "callout", "divider", "bullets",
            // Input blocks
            "text", "textarea", "number", "measurement", "email", "phone", "url",
            "date", "time", "datetime",
            "select", "radio", "checkbox", "multiselect", "table", "attachment", "signature"
    );

    private static final java.util.Set<String> CONTENT_TYPES = java.util.Set.of(
            "heading1", "heading2", "heading3", "paragraph", "callout", "divider", "bullets"
    );

    /** Input types allowed for individual table columns (cells). */
    private static final java.util.Set<String> TABLE_COLUMN_TYPES = java.util.Set.of(
            "text", "textarea", "number", "measurement", "email", "phone", "url",
            "date", "time", "datetime",
            "select", "radio", "checkbox"
    );

    private final MongoTemplate mongoTemplate;

    public MongoFormSchemaService(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public void upsert(String formKey, String name, List<Map<String, Object>> fields) {
        upsert(formKey, name, fields, null, null);
    }

    /**
     * @param statusHint optional DRAFT|PUBLISHED on create; ignored on update (use publish/setDraft)
     * @param versionHint optional starting version on create
     */
    public void upsert(
            String formKey,
            String name,
            List<Map<String, Object>> fields,
            String statusHint,
            Integer versionHint
    ) {
        validate(formKey, name, fields);
        Query q = Query.query(Criteria.where("formKey").is(formKey));
        Document existing = mongoTemplate.findOne(q, Document.class, COLLECTION);
        List<Map<String, Object>> normalized = normalizeFields(fields);

        Document doc = new Document()
                .append("formKey", formKey)
                .append("name", name.trim())
                .append("fields", normalized)
                .append("updatedAt", AmmsDateTimes.now());

        if (existing != null && existing.get("_id") != null) {
            doc.put("_id", existing.get("_id"));
            if (existing.get("createdAt") != null) {
                doc.put("createdAt", existing.get("createdAt"));
            }
            String status = normalizeStatus(existing.get("status"));
            int version = readVersion(existing);
            // Editing a published schema preserves publish status and bumps version.
            if (STATUS_PUBLISHED.equals(status)) {
                version = Math.max(1, version) + 1;
            } else {
                status = STATUS_DRAFT;
                if (version < 1) {
                    version = 1;
                }
            }
            doc.put("status", status);
            doc.put("version", version);
            if (existing.get("clonedFrom") != null) {
                doc.put("clonedFrom", existing.get("clonedFrom"));
            }
            mongoTemplate.save(doc, COLLECTION);
        } else {
            String status = statusHint == null || statusHint.isBlank()
                    ? STATUS_DRAFT
                    : normalizeStatus(statusHint);
            int version = versionHint == null || versionHint < 1 ? 1 : versionHint;
            doc.put("status", status);
            doc.put("version", version);
            doc.put("createdAt", AmmsDateTimes.now());
            mongoTemplate.insert(doc, COLLECTION);
        }
    }

    public Document publish(String formKey) {
        Document existing = findByKey(formKey)
                .orElseThrow(() -> new IllegalArgumentException("Form schema not found: " + formKey));
        String status = normalizeStatus(existing.get("status"));
        int version = readVersion(existing);
        if (!STATUS_PUBLISHED.equals(status)) {
            // First publish keeps current version (usually 1); re-publish after draft edit bumps.
            if (version < 1) {
                version = 1;
            }
        }
        existing.put("status", STATUS_PUBLISHED);
        existing.put("version", version);
        existing.put("updatedAt", AmmsDateTimes.now());
        existing.put("publishedAt", AmmsDateTimes.now());
        mongoTemplate.save(existing, COLLECTION);
        return existing;
    }

    public Document setDraft(String formKey) {
        Document existing = findByKey(formKey)
                .orElseThrow(() -> new IllegalArgumentException("Form schema not found: " + formKey));
        existing.put("status", STATUS_DRAFT);
        existing.put("updatedAt", AmmsDateTimes.now());
        mongoTemplate.save(existing, COLLECTION);
        return existing;
    }

    public Document cloneForm(String sourceKey, String newKey, String newName) {
        Document source = findByKey(sourceKey)
                .orElseThrow(() -> new IllegalArgumentException("Form schema not found: " + sourceKey));
        if (newKey == null || !FORM_KEY.matcher(newKey).matches()) {
            throw new IllegalArgumentException(
                    "newKey must be lowercase kebab-case (2–63 chars), e.g. torque-check-v2");
        }
        if (exists(newKey)) {
            throw new IllegalStateException("Form schema already exists: " + newKey);
        }
        String name = newName == null || newName.isBlank()
                ? source.getString("name") + " (copy)"
                : newName.trim();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> fields = (List<Map<String, Object>>) source.get("fields");
        Document doc = new Document()
                .append("formKey", newKey)
                .append("name", name)
                .append("fields", fields == null ? List.of() : fields)
                .append("status", STATUS_DRAFT)
                .append("version", 1)
                .append("clonedFrom", sourceKey)
                .append("createdAt", AmmsDateTimes.now())
                .append("updatedAt", AmmsDateTimes.now());
        mongoTemplate.insert(doc, COLLECTION);
        return doc;
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
        return listAll(null);
    }

    /** @param statusFilter DRAFT|PUBLISHED|null (all) */
    public List<Document> listAll(String statusFilter) {
        List<Document> docs;
        if (statusFilter != null && !statusFilter.isBlank() && !"ALL".equalsIgnoreCase(statusFilter)) {
            String status = normalizeStatus(statusFilter);
            docs = mongoTemplate.find(
                    Query.query(Criteria.where("status").is(status)),
                    Document.class,
                    COLLECTION
            );
            // Legacy docs without status are treated as PUBLISHED when filtering published.
            if (STATUS_PUBLISHED.equals(status)) {
                List<Document> legacy = mongoTemplate.find(
                        Query.query(Criteria.where("status").exists(false)),
                        Document.class,
                        COLLECTION
                );
                docs = new ArrayList<>(docs);
                docs.addAll(legacy);
            }
        } else {
            docs = mongoTemplate.findAll(Document.class, COLLECTION);
        }
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
        out.put("status", normalizeStatus(doc.get("status")));
        out.put("version", readVersion(doc));
        out.put("store", "mongo");
        Object clonedFrom = doc.get("clonedFrom");
        if (clonedFrom != null) {
            out.put("clonedFrom", String.valueOf(clonedFrom));
        }
        Object created = doc.get("createdAt");
        Object updated = doc.get("updatedAt");
        Object published = doc.get("publishedAt");
        if (created != null) {
            out.put("createdAt", created.toString());
        }
        if (updated != null) {
            out.put("updatedAt", updated.toString());
        }
        if (published != null) {
            out.put("publishedAt", published.toString());
        }
        return out;
    }

    private static String normalizeStatus(Object raw) {
        if (raw == null || String.valueOf(raw).isBlank()) {
            return STATUS_PUBLISHED; // legacy seeded docs without status are live
        }
        String s = String.valueOf(raw).trim().toUpperCase(Locale.ROOT);
        if (STATUS_DRAFT.equals(s)) {
            return STATUS_DRAFT;
        }
        return STATUS_PUBLISHED;
    }

    private static int readVersion(Document doc) {
        if (doc == null || doc.get("version") == null) {
            return 1;
        }
        Object v = doc.get("version");
        if (v instanceof Number n) {
            return Math.max(1, n.intValue());
        }
        try {
            return Math.max(1, Integer.parseInt(String.valueOf(v)));
        } catch (NumberFormatException e) {
            return 1;
        }
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
            if ("table".equals(type)) {
                List<Map<String, Object>> columns = normalizeColumns(field.get("columns"));
                if (columns.isEmpty()) {
                    throw new IllegalArgumentException("table field " + n + " needs at least one column");
                }
                for (Map<String, Object> col : columns) {
                    String colType = String.valueOf(col.getOrDefault("type", "text"));
                    if ("select".equals(colType) || "radio".equals(colType)) {
                        List<String> colOpts = asStringList(col.get("options"));
                        if (colOpts.isEmpty()) {
                            throw new IllegalArgumentException(
                                    "table field " + n + " column " + col.get("key")
                                            + " (" + colType + ") needs at least one option"
                            );
                        }
                    }
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
                if ("table".equals(normalizedType)) {
                    f.put("columns", normalizeColumns(raw.get("columns")));
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
    private static List<Map<String, Object>> normalizeColumns(Object raw) {
        if (raw == null) {
            return List.of();
        }
        List<?> list;
        if (raw instanceof List<?> l) {
            list = l;
        } else {
            return List.of();
        }
        List<Map<String, Object>> out = new ArrayList<>();
        int i = 0;
        for (Object item : list) {
            i++;
            if (item == null) {
                continue;
            }
            Map<String, Object> col = new LinkedHashMap<>();
            if (item instanceof Map<?, ?> map) {
                Object keyObj = map.get("key");
                Object labelObj = map.get("label");
                String label = labelObj == null ? "" : String.valueOf(labelObj).trim();
                String key = keyObj == null ? "" : String.valueOf(keyObj).trim().replaceAll("[^a-zA-Z0-9_]", "");
                if (label.isBlank() && key.isBlank()) {
                    continue;
                }
                if (key.isBlank() || !key.matches("^[a-zA-Z].*")) {
                    key = "col_" + i;
                }
                if (label.isBlank()) {
                    label = key;
                }
                col.put("key", key);
                col.put("label", label);
                Object id = map.get("id");
                if (id != null && !String.valueOf(id).isBlank()) {
                    col.put("id", String.valueOf(id).trim());
                }
                String colType = normalizeTableColumnType(map.get("type"));
                col.put("type", colType);
                Object placeholder = map.get("placeholder");
                if (placeholder != null && !String.valueOf(placeholder).isBlank()) {
                    col.put("placeholder", String.valueOf(placeholder).trim());
                }
                if ("select".equals(colType) || "radio".equals(colType)) {
                    List<String> options = asStringList(map.get("options"));
                    if (options.isEmpty()) {
                        options = List.of("Option A", "Option B");
                    }
                    col.put("options", options);
                }
            } else {
                String label = String.valueOf(item).trim();
                if (label.isBlank()) {
                    continue;
                }
                String key = label.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "_")
                        .replaceAll("^_+|_+$", "");
                if (key.isBlank() || !key.matches("^[a-z].*")) {
                    key = "col_" + i;
                }
                col.put("key", key);
                col.put("label", label);
                col.put("type", "text");
            }
            out.add(col);
        }
        return out;
    }

    private static String normalizeTableColumnType(Object raw) {
        if (raw == null || String.valueOf(raw).isBlank()) {
            return "text";
        }
        String t = String.valueOf(raw).trim().toLowerCase(Locale.ROOT);
        return TABLE_COLUMN_TYPES.contains(t) ? t : "text";
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
