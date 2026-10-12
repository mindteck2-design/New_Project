package com.hal.amms.workpackage;

import com.hal.amms.shared.AmmsDateTimes;
import com.hal.amms.shared.EnumCodes;
import org.jooq.DSLContext;
import org.jooq.Record;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.hal.amms.jooq.Tables.*;

@Repository
public class WorkPackageRepository {

    public record WorkPackageRow(
            UUID id,
            String packageNo,
            String aircraftId,
            String poNumber,
            String soNumber,
            TestingType testingType,
            UUID workflowDefinitionId,
            PackageStatus status,
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
            PartStatus status,
            UUID workflowDefinitionId,
            UUID instanceId,
            Instant openedAt,
            Instant closedAt
    ) {}

    private final DSLContext dsl;

    public WorkPackageRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public void insertPackage(WorkPackageRow row) {
        dsl.insertInto(WORK_PACKAGES)
                .columns(
                        WORK_PACKAGES.ID, WORK_PACKAGES.PACKAGE_NO, WORK_PACKAGES.AIRCRAFT_ID, WORK_PACKAGES.PO_NUMBER, WORK_PACKAGES.SO_NUMBER, WORK_PACKAGES.TESTING_TYPE,
                        WORK_PACKAGES.WORKFLOW_DEFINITION_ID, WORK_PACKAGES.STATUS, WORK_PACKAGES.NOTES, WORK_PACKAGES.CREATED_BY, WORK_PACKAGES.CREATED_AT, WORK_PACKAGES.UPDATED_AT
                )
                .values(
                        row.id(), row.packageNo(), row.aircraftId(), row.poNumber(), row.soNumber(),
                        EnumCodes.code(row.testingType()), row.workflowDefinitionId(), EnumCodes.code(row.status()), row.notes(),
                        row.createdBy(), odt(row.createdAt()), odt(row.updatedAt())
                )
                .execute();
    }

    public void updatePackageStatus(UUID id, PackageStatus status) {
        dsl.update(WORK_PACKAGES)
                .set(WORK_PACKAGES.STATUS, EnumCodes.code(status))
                .set(WORK_PACKAGES.UPDATED_AT, AmmsDateTimes.nowOdt())
                .where(WORK_PACKAGES.ID.eq(id))
                .execute();
    }

    public Optional<WorkPackageRow> findPackage(UUID id) {
        return dsl.selectFrom(WORK_PACKAGES).where(WORK_PACKAGES.ID.eq(id)).fetchOptional(this::mapPackage);
    }

    public List<WorkPackageRow> listPackages() {
        return dsl.selectFrom(WORK_PACKAGES)
                .orderBy(WORK_PACKAGES.UPDATED_AT.desc())
                .fetch(this::mapPackage);
    }

    public boolean packageNoExists(String packageNo) {
        return dsl.fetchExists(dsl.selectOne().from(WORK_PACKAGES).where(WORK_PACKAGES.PACKAGE_NO.eq(packageNo)));
    }

    public void insertPart(PartRow row) {
        dsl.insertInto(WORK_PACKAGE_PARTS)
                .columns(
                        WORK_PACKAGE_PARTS.ID, WORK_PACKAGE_PARTS.PACKAGE_ID, WORK_PACKAGE_PARTS.SEQUENCE_NO, WORK_PACKAGE_PARTS.PART_NO, WORK_PACKAGE_PARTS.SERIAL_NO, WORK_PACKAGE_PARTS.DESCRIPTION,
                        WORK_PACKAGE_PARTS.STATUS, WORK_PACKAGE_PARTS.WORKFLOW_DEFINITION_ID, WORK_PACKAGE_PARTS.INSTANCE_ID, WORK_PACKAGE_PARTS.OPENED_AT, WORK_PACKAGE_PARTS.CLOSED_AT
                )
                .values(
                        row.id(), row.packageId(), row.sequenceNo(), row.partNo(), row.serialNo(),
                        row.description(), EnumCodes.code(row.status()), row.workflowDefinitionId(), row.instanceId(),
                        odt(row.openedAt()), odt(row.closedAt())
                )
                .execute();
    }

    public List<PartRow> partsFor(UUID packageId) {
        return dsl.selectFrom(WORK_PACKAGE_PARTS)
                .where(WORK_PACKAGE_PARTS.PACKAGE_ID.eq(packageId))
                .orderBy(WORK_PACKAGE_PARTS.SEQUENCE_NO.asc())
                .fetch(this::mapPart);
    }

    public Optional<PartRow> findPart(UUID partId) {
        return dsl.selectFrom(WORK_PACKAGE_PARTS).where(WORK_PACKAGE_PARTS.ID.eq(partId)).fetchOptional(this::mapPart);
    }

    public int nextSequence(UUID packageId) {
        Integer max = dsl.select(DSL_MAX_SEQ())
                .from(WORK_PACKAGE_PARTS)
                .where(WORK_PACKAGE_PARTS.PACKAGE_ID.eq(packageId))
                .fetchOne(0, Integer.class);
        return max == null ? 1 : max + 1;
    }

    private org.jooq.Field<Integer> DSL_MAX_SEQ() {
        return org.jooq.impl.DSL.max(WORK_PACKAGE_PARTS.SEQUENCE_NO);
    }

    public void linkPartInstance(UUID partId, UUID instanceId) {
        dsl.update(WORK_PACKAGE_PARTS)
                .set(WORK_PACKAGE_PARTS.INSTANCE_ID, instanceId)
                .set(WORK_PACKAGE_PARTS.STATUS, PartStatus.IN_TEST.name())
                .set(WORK_PACKAGE_PARTS.OPENED_AT, AmmsDateTimes.nowOdt())
                .where(WORK_PACKAGE_PARTS.ID.eq(partId))
                .execute();
    }

    public void updatePartStatus(UUID partId, PartStatus status) {
        var q = dsl.update(WORK_PACKAGE_PARTS).set(WORK_PACKAGE_PARTS.STATUS, EnumCodes.code(status));
        if (status.closesPart()) {
            q = q.set(WORK_PACKAGE_PARTS.CLOSED_AT, AmmsDateTimes.nowOdt());
        }
        q.where(WORK_PACKAGE_PARTS.ID.eq(partId)).execute();
    }

    public Optional<PartRow> findPartByInstance(UUID instanceId) {
        return dsl.selectFrom(WORK_PACKAGE_PARTS)
                .where(WORK_PACKAGE_PARTS.INSTANCE_ID.eq(instanceId))
                .fetchOptional(this::mapPart);
    }

    private WorkPackageRow mapPackage(Record r) {
        return new WorkPackageRow(
                r.get(WORK_PACKAGES.ID), r.get(WORK_PACKAGES.PACKAGE_NO), r.get(WORK_PACKAGES.AIRCRAFT_ID), r.get(WORK_PACKAGES.PO_NUMBER), r.get(WORK_PACKAGES.SO_NUMBER),
                TestingType.parse(r.get(WORK_PACKAGES.TESTING_TYPE)), r.get(WORK_PACKAGES.WORKFLOW_DEFINITION_ID), PackageStatus.parse(r.get(WORK_PACKAGES.STATUS)), r.get(WORK_PACKAGES.NOTES),
                r.get(WORK_PACKAGES.CREATED_BY), toInstant(r.get(WORK_PACKAGES.CREATED_AT)), toInstant(r.get(WORK_PACKAGES.UPDATED_AT))
        );
    }

    private PartRow mapPart(Record r) {
        return new PartRow(
                r.get(WORK_PACKAGE_PARTS.ID), r.get(WORK_PACKAGE_PARTS.PACKAGE_ID), r.get(WORK_PACKAGE_PARTS.SEQUENCE_NO), r.get(WORK_PACKAGE_PARTS.PART_NO), r.get(WORK_PACKAGE_PARTS.SERIAL_NO),
                r.get(WORK_PACKAGE_PARTS.DESCRIPTION), PartStatus.parse(r.get(WORK_PACKAGE_PARTS.STATUS)),
                r.get(WORK_PACKAGE_PARTS.WORKFLOW_DEFINITION_ID), r.get(WORK_PACKAGE_PARTS.INSTANCE_ID),
                toInstant(r.get(WORK_PACKAGE_PARTS.OPENED_AT)), toInstant(r.get(WORK_PACKAGE_PARTS.CLOSED_AT))
        );
    }

    private static OffsetDateTime odt(Instant i) {
        return AmmsDateTimes.toUtcOdt(i);
    }

    private static Instant toInstant(OffsetDateTime odt) {
        return AmmsDateTimes.toInstant(odt);
    }
}
