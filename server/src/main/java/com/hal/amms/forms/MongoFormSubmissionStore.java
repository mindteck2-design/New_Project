package com.hal.amms.forms;

import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;
import com.hal.amms.shared.AmmsDateTimes;

import java.util.Optional;
import java.util.UUID;

/**
 * Persists dynamic form submissions to MongoDB (ADR-002 required store for forms).
 */
@Component
@ConditionalOnProperty(name = "amms.forms.store", havingValue = "mongo")
public class MongoFormSubmissionStore implements FormSubmissionStore {

    private static final Logger log = LoggerFactory.getLogger(MongoFormSubmissionStore.class);
    public static final String COLLECTION = "form_submissions";

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
                .append("createdAt", AmmsDateTimes.now());
        mongoTemplate.insert(doc, COLLECTION);
        log.debug("Mongo form_submissions saved formKey={} instanceId={}", formKey, instanceId);
    }

    @Override
    public Optional<String> findLatest(UUID instanceId, String nodeKey, String formKey) {
        Query query = Query.query(Criteria.where("instanceId").is(instanceId.toString())
                .and("nodeKey").is(nodeKey)
                .and("formKey").is(formKey))
                .with(Sort.by(Sort.Direction.DESC, "createdAt"));
        Document doc = mongoTemplate.findOne(query, Document.class, COLLECTION);
        return Optional.ofNullable(doc == null ? null : doc.getString("payloadJson"));
    }
}
