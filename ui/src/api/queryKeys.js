/**
 * Hierarchical TanStack Query key factory (enterprise cache hygiene).
 * Keep all server-state keys here — do not scatter string literals.
 */
export const queryKeys = {
  workflows: {
    all: ['workflows'],
    detail: (key) => ['workflow-def', key],
  },
  instances: {
    all: (userId) => ['instances', userId],
    detail: (id) => ['instance', id],
    audit: (id) => ['audit', id],
    documents: (id) => ['documents', id],
  },
  notifications: {
    all: (userId) => ['notifications', userId],
  },
  analytics: {
    me: (userId) => ['analytics-me', userId],
  },
  forms: {
    all: ['form-schemas'],
    detail: (formKey) => ['form-schema', formKey],
  },
  roles: {
    all: ['roles'],
  },
  packages: {
    all: ['packages'],
    detail: (id) => ['package', id],
    report: (id) => ['package-report', id],
  },
}
