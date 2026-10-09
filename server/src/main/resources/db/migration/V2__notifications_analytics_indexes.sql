-- Durable action notifications (P7) + hot-path indexes for multi-year growth (P9 starter)

CREATE TABLE workflow_notifications (
    id UUID PRIMARY KEY,
    instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
    target_role VARCHAR(50) NOT NULL,
    title VARCHAR(300) NOT NULL,
    body VARCHAR(500),
    action_path VARCHAR(500) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_reads (
    notification_id UUID NOT NULL REFERENCES workflow_notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (notification_id, user_id)
);

CREATE INDEX idx_wf_notifications_role_created
    ON workflow_notifications (target_role, created_at DESC);

CREATE INDEX idx_wf_notifications_instance
    ON workflow_notifications (instance_id);

CREATE INDEX idx_wf_instances_status_updated
    ON workflow_instances (status, updated_at DESC);

CREATE INDEX idx_wf_instances_running_node
    ON workflow_instances (current_node_key)
    WHERE status = 'RUNNING';

CREATE INDEX idx_audit_logs_instance_created
    ON audit_logs (instance_id, created_at DESC);

CREATE INDEX idx_inspection_records_instance
    ON inspection_records (instance_id, created_at DESC);

CREATE INDEX idx_form_documents_instance
    ON form_documents (instance_id, created_at DESC);
