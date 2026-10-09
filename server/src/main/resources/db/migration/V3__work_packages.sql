-- Aircraft / accessory work packages: PO/SO header + parts mapped to workflow instances

CREATE TABLE work_packages (
    id                      UUID PRIMARY KEY,
    package_no              VARCHAR(64) NOT NULL UNIQUE,
    aircraft_id             VARCHAR(128) NOT NULL,
    po_number               VARCHAR(64) NOT NULL,
    so_number               VARCHAR(64),
    testing_type            VARCHAR(32) NOT NULL,
    workflow_definition_id  UUID NOT NULL REFERENCES workflow_definitions (id),
    status                  VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    notes                   TEXT,
    created_by              UUID REFERENCES users (id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_wp_testing_type CHECK (testing_type IN ('ROUTINE', 'REPAIR')),
    CONSTRAINT chk_wp_status CHECK (status IN ('DRAFT', 'READY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'))
);

CREATE INDEX idx_work_packages_po ON work_packages (po_number);
CREATE INDEX idx_work_packages_so ON work_packages (so_number);
CREATE INDEX idx_work_packages_status ON work_packages (status, updated_at DESC);
CREATE INDEX idx_work_packages_aircraft ON work_packages (aircraft_id);

CREATE TABLE work_package_parts (
    id              UUID PRIMARY KEY,
    package_id      UUID NOT NULL REFERENCES work_packages (id) ON DELETE CASCADE,
    sequence_no     INT NOT NULL DEFAULT 1,
    part_no         VARCHAR(128) NOT NULL,
    serial_no       VARCHAR(128),
    description     VARCHAR(512),
    status          VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    instance_id     UUID REFERENCES workflow_instances (id),
    opened_at       TIMESTAMPTZ,
    closed_at       TIMESTAMPTZ,
    CONSTRAINT chk_wpp_status CHECK (status IN (
        'PENDING', 'IN_TEST', 'REASSEMBLED', 'PASSED', 'FAILED', 'SKIPPED'
    )),
    CONSTRAINT uq_wpp_package_seq UNIQUE (package_id, sequence_no)
);

CREATE INDEX idx_wpp_package ON work_package_parts (package_id, sequence_no);
CREATE INDEX idx_wpp_instance ON work_package_parts (instance_id);
