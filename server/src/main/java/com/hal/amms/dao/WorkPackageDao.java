package com.hal.amms.dao;

import org.jooq.DSLContext;
import org.jooq.Record;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.hal.amms.db.Tables.*;

@Repository
public class WorkPackageDao {

    public record WorkPackageRow(
            UUID id,
            String packageNo,
            String aircraftId,
            String poNumber,
            String soNumber,
            String testingType,
            UUID workflowDefinitionId,
            String status,
            String notes,
            UUID createdBy,
            Instant createdAt,
            Instant updatedAt
    ) {}

    public record PartRow(
            UUID id,
            UUID packageId,
            int sequenceNo,
            String partNo,
            String serialNo,
            String description,
            String status,
            UUID instanceId,
            Instant openedAt,
            Instant closedAt
    ) {}

    private final DSLContext dsl;

    public WorkPackageDao(DSLContext dsl) {
        this.dsl = dsl;
    }

    public void insertPackage(WorkPackageRow row) {
        dsl.insertInto(WORK_PACKAGES)
                .columns(
                        WP_ID, WP_PACKAGE_NO, WP_AIRCRAFT_ID, WP_PO, WP_SO, WP_TESTING_TYPE,
                        WP_DEFINITION_ID, WP_STATUS, WP_NOTES, WP_CREATED_BY, WP_CREATED_AT, WP_UPDATED_AT
                )
                .values(
                        row.id(), row.packageNo(), row.aircraftId(), row.poNumber(), row.soNumber(),
                        row.testingType(), row.workflowDefinitionId(), row.status(), row.notes(),
                        row.createdBy(), odt(row.createdAt()), odt(row.updatedAt())
                )
                .execute();
    }

    public void updatePackageStatus(UUID id, String status) {
        dsl.update(WORK_PACKAGES)
                .set(WP_STATUS, status)
                .set(WP_UPDATED_AT, OffsetDateTime.now(ZoneOffset.UTC))
                .where(WP_ID.eq(id))
                .execute();
    }

    public Optional<WorkPackageRow> findPackage(UUID id) {
        return dsl.selectFrom(WORK_PACKAGES).where(WP_ID.eq(id)).fetchOptional(this::mapPackage);
    }

    public List<WorkPackageRow> listPackages() {
        return dsl.selectFrom(WORK_PACKAGES)
                .orderBy(WP_UPDATED_AT.desc())
                .fetch(this::mapPackage);
    }

    public boolean packageNoExists(String packageNo) {
        return dsl.fetchExists(dsl.selectOne().from(WORK_PACKAGES).where(WP_PACKAGE_NO.eq(packageNo)));
    }

    public void insertPart(PartRow row) {
        dsl.insertInto(WORK_PACKAGE_PARTS)
                .columns(
                        WPP_ID, WPP_PACKAGE_ID, WPP_SEQ, WPP_PART_NO, WPP_SERIAL, WPP_DESCRIPTION,
                        WPP_STATUS, WPP_INSTANCE_ID, WPP_OPENED_AT, WPP_CLOSED_AT
                )
                .values(
                        row.id(), row.packageId(), row.sequenceNo(), row.partNo(), row.serialNo(),
                        row.description(), row.status(), row.instanceId(),
                        odt(row.openedAt()), odt(row.closedAt())
                )
                .execute();
    }

    public List<PartRow> partsFor(UUID packageId) {
        return dsl.selectFrom(WORK_PACKAGE_PARTS)
                .where(WPP_PACKAGE_ID.eq(packageId))
                .orderBy(WPP_SEQ.asc())
                .fetch(this::mapPart);
    }

    public Optional<PartRow> findPart(UUID partId) {
        return dsl.selectFrom(WORK_PACKAGE_PARTS).where(WPP_ID.eq(partId)).fetchOptional(this::mapPart);
    }

    public int nextSequence(UUID packageId) {
        Integer max = dsl.select(DSL_MAX_SEQ())
                .from(WORK_PACKAGE_PARTS)
                .where(WPP_PACKAGE_ID.eq(packageId))
                .fetchOne(0, Integer.class);
        return max == null ? 1 : max + 1;
    }

    private org.jooq.Field<Integer> DSL_MAX_SEQ() {
        return org.jooq.impl.DSL.max(WPP_SEQ);
    }

    public void linkPartInstance(UUID partId, UUID instanceId) {
        dsl.update(WORK_PACKAGE_PARTS)
                .set(WPP_INSTANCE_ID, instanceId)
                .set(WPP_STATUS, "IN_TEST")
                .set(WPP_OPENED_AT, OffsetDateTime.now(ZoneOffset.UTC))
                .where(WPP_ID.eq(partId))
                .execute();
    }

    public void updatePartStatus(UUID partId, String status) {
        var q = dsl.update(WORK_PACKAGE_PARTS).set(WPP_STATUS, status);
        if ("PASSED".equals(status) || "FAILED".equals(status) || "SKIPPED".equals(status)) {
            q = q.set(WPP_CLOSED_AT, OffsetDateTime.now(ZoneOffset.UTC));
        }
        q.where(WPP_ID.eq(partId)).execute();
    }

    public Optional<PartRow> findPartByInstance(UUID instanceId) {
        return dsl.selectFrom(WORK_PACKAGE_PARTS)
                .where(WPP_INSTANCE_ID.eq(instanceId))
                .fetchOptional(this::mapPart);
    }

    private WorkPackageRow mapPackage(Record r) {
        return new WorkPackageRow(
                r.get(WP_ID), r.get(WP_PACKAGE_NO), r.get(WP_AIRCRAFT_ID), r.get(WP_PO), r.get(WP_SO),
                r.get(WP_TESTING_TYPE), r.get(WP_DEFINITION_ID), r.get(WP_STATUS), r.get(WP_NOTES),
                r.get(WP_CREATED_BY), toInstant(r.get(WP_CREATED_AT)), toInstant(r.get(WP_UPDATED_AT))
        );
    }

    private PartRow mapPart(Record r) {
        return new PartRow(
                r.get(WPP_ID), r.get(WPP_PACKAGE_ID), r.get(WPP_SEQ), r.get(WPP_PART_NO), r.get(WPP_SERIAL),
                r.get(WPP_DESCRIPTION), r.get(WPP_STATUS), r.get(WPP_INSTANCE_ID),
                toInstant(r.get(WPP_OPENED_AT)), toInstant(r.get(WPP_CLOSED_AT))
        );
    }

    private static OffsetDateTime odt(Instant i) {
        return i == null ? null : OffsetDateTime.ofInstant(i, ZoneOffset.UTC);
    }

    private static Instant toInstant(OffsetDateTime odt) {
        return odt == null ? null : odt.toInstant();
    }
}
