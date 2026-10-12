-- Attach master workflows to aircraft parts (not only the work-order header).
-- Package-level workflow becomes an optional default; each part carries its own chart.

ALTER TABLE work_packages
    ALTER COLUMN workflow_definition_id DROP NOT NULL;

ALTER TABLE work_package_parts
    ADD COLUMN workflow_definition_id UUID REFERENCES workflow_definitions (id);

-- Backfill existing parts from the work-order chart they inherited.
-- Scalar subquery (not UPDATE…FROM) so jOOQ DDLDatabase can simulate the migration.
UPDATE work_package_parts
SET workflow_definition_id = (
    SELECT wp.workflow_definition_id
    FROM work_packages wp
    WHERE wp.id = work_package_parts.package_id
)
WHERE workflow_definition_id IS NULL;

ALTER TABLE work_package_parts
    ALTER COLUMN workflow_definition_id SET NOT NULL;

CREATE INDEX idx_wpp_workflow_def ON work_package_parts (workflow_definition_id);
