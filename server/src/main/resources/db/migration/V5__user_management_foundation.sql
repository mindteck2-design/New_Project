INSERT INTO roles (id, code, name)
VALUES ('11111111-1111-1111-1111-111111111107', 'ADMIN', 'System Administrator');

ALTER TABLE users
    ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE user_admin_audit_logs (
    id UUID PRIMARY KEY,
    actor_user_id UUID REFERENCES users (id),
    target_user_id UUID NOT NULL REFERENCES users (id),
    action VARCHAR(50) NOT NULL,
    changes_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_admin_audit_target_created
    ON user_admin_audit_logs (target_user_id, created_at DESC);

CREATE INDEX idx_user_admin_audit_actor_created
    ON user_admin_audit_logs (actor_user_id, created_at DESC);
