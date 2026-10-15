/**
 * Hierarchical TanStack Query key factory (enterprise cache hygiene).
 * Keep all server-state keys here — do not scatter string literals.
 */
export const queryKeys = {
  workflows: {
    all: ['workflows'],
    list: (filters = {}) => ['workflows', filters],
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
    list: (filters = {}) => ['form-schemas', filters],
    detail: (formKey) => ['form-schema', formKey],
  },
  roles: {
    all: ['roles'],
  },
  users: {
    all: ['users'],
    list: (filters = {}) => ['users', 'list', filters],
    detail: (id) => ['users', 'detail', id],
  },
  packages: {
    all: ['packages'],
    detail: (id) => ['package', id],
    report: (id) => ['package-report', id],
  },
}
