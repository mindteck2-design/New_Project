package com.hal.amms.service;

import org.bson.Document;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Dynamic form schemas live in MongoDB ({@code form_schemas}) — ADR-002.
 */
@Service
@ConditionalOnProperty(name = "amms.forms.store", havingValue = "mongo")
public class MongoFormSchemaService {

    public static final String COLLECTION = "form_schemas";

    private final MongoTemplate mongoTemplate;

    public MongoFormSchemaService(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public void upsert(String formKey, String name, List<Map<String, Object>> fields) {
        Query q = Query.query(Criteria.where("formKey").is(formKey));
        Document existing = mongoTemplate.findOne(q, Document.class, COLLECTION);
        Document doc = new Document()
                .append("formKey", formKey)
                .append("name", name)
                .append("fields", fields)
                .append("updatedAt", Instant.now());
        if (existing != null && existing.get("_id") != null) {
            doc.put("_id", existing.get("_id"));
            mongoTemplate.save(doc, COLLECTION);
        } else {
            doc.put("createdAt", Instant.now());
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

    public long count() {
        return mongoTemplate.getCollection(COLLECTION).countDocuments();
    }
}
