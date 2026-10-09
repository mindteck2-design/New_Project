package com.hal.amms.service;

import org.bson.Document;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.UUID;

@Component
@ConditionalOnProperty(name = "amms.forms.store", havingValue = "mongo")
public class MongoFormSubmissionStore implements FormSubmissionStore {

    private static final String COLLECTION = "form_submissions";

    private final MongoTemplate mongoTemplate;

    public MongoFormSubmissionStore(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public void save(UUID id, UUID instanceId, String formKey, String nodeKey, String payloadJson, UUID createdBy) {
        Document doc = new Document()
                .append("_id", id.toString())
                .append("instanceId", instanceId.toString())
                .append("formKey", formKey)
                .append("nodeKey", nodeKey)
                .append("payloadJson", payloadJson)
                .append("createdBy", createdBy.toString())
                .append("createdAt", Instant.now());
        mongoTemplate.insert(doc, COLLECTION);
    }
}
