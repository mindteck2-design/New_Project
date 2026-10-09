CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE roles (
    id UUID PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id),
    role_id UUID NOT NULL REFERENCES roles(id),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE workflow_definitions (
    id UUID PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    version INT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    definition_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workflow_nodes (
    id UUID PRIMARY KEY,
    definition_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
    node_key VARCHAR(100) NOT NULL,
    node_type VARCHAR(30) NOT NULL,
    role_code VARCHAR(50),
    form_key VARCHAR(100),
    label VARCHAR(300) NOT NULL,
    config_json JSONB,
    UNIQUE (definition_id, node_key)
);

CREATE TABLE workflow_transitions (
    id UUID PRIMARY KEY,
    definition_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
    from_node_key VARCHAR(100) NOT NULL,
    to_node_key VARCHAR(100) NOT NULL,
    condition_value VARCHAR(100),
    priority INT NOT NULL DEFAULT 0
);

CREATE TABLE workflow_instances (
    id UUID PRIMARY KEY,
    definition_id UUID NOT NULL REFERENCES workflow_definitions(id),
    business_key VARCHAR(200),
    status VARCHAR(30) NOT NULL,
    current_node_key VARCHAR(100) NOT NULL,
    context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_by UUID REFERENCES users(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE inspection_records (
    id UUID PRIMARY KEY,
    instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
    node_key VARCHAR(100) NOT NULL,
    result VARCHAR(50),
    notes TEXT,
    recorded_by UUID REFERENCES users(id),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE documents (
    id UUID PRIMARY KEY,
    instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
    node_key VARCHAR(100),
    file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(120),
    storage_key VARCHAR(500) NOT NULL,
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    instance_id UUID,
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    from_node VARCHAR(100),
    to_node VARCHAR(100),
    payload_json JSONB,
    signature_placeholder VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE form_documents (
    id UUID PRIMARY KEY,
    instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
    form_key VARCHAR(100) NOT NULL,
    node_key VARCHAR(100) NOT NULL,
    payload_json JSONB NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_instances_status ON workflow_instances(status);
CREATE INDEX idx_audit_instance ON audit_logs(instance_id);
CREATE INDEX idx_nodes_def ON workflow_nodes(definition_id);
CREATE INDEX idx_transitions_def ON workflow_transitions(definition_id);

INSERT INTO roles (id, code, name) VALUES
    ('11111111-1111-1111-1111-111111111101', 'PROGRESS', 'Progress Department'),
    ('11111111-1111-1111-1111-111111111102', 'INSPECTION', 'Inspection'),
    ('11111111-1111-1111-1111-111111111103', 'QA', 'QA / ORDAQA'),
    ('11111111-1111-1111-1111-111111111104', 'STORES', 'Stores'),
    ('11111111-1111-1111-1111-111111111105', 'CUSTOMER', 'Customer'),
    ('11111111-1111-1111-1111-111111111106', 'SHOP_MANAGER', 'Shop Manager');
