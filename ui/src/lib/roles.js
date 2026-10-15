export function normalizeRoleCode(role) {
  const code = typeof role === 'string'
    ? role.trim().toUpperCase().replace(/^ROLE_/, '')
    : ''
  if (code === 'ADMINISTRATOR' || code === 'SYSTEM ADMINISTRATOR') return 'ADMIN'
  return code
}

export function getUserRoles(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : []
  const role = user?.role
  const roleValues = Array.isArray(role) ? role : role ? [role] : []
  return [...new Set([...roles, ...roleValues]
    .map((value) => (typeof value === 'object' && value !== null
      ? value.code || value.name
      : value))
    .map(normalizeRoleCode)
    .filter(Boolean))]
}

export function hasRole(roles, expectedRole) {
  const expected = normalizeRoleCode(expectedRole)
  const roleValues = Array.isArray(roles) ? roles : getUserRoles(roles)
  return Boolean(expected && roleValues.some((role) => normalizeRoleCode(role) === expected))
}
