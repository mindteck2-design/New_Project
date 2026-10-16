import { api } from '@/api/http'
import { env } from '@/config/env'
import { useAuthStore } from '@/stores/authStore'

export { api }

export async function login(username, password) {
  return useAuthStore.getState().login(username, password)
}

export function logout() {
  useAuthStore.getState().logout()
}

export function currentUser() {
  return useAuthStore.getState().user
}

export async function fetchWorkflows(params = {}) {
  const { includeInactive = false, workType, aircraftType } = params
  const { data } = await api.get('/workflows', {
    params: {
      includeInactive: includeInactive ? true : undefined,
      workType: workType || undefined,
      aircraftType: aircraftType || undefined,
    },
  })
  return data
}

export async function cloneWorkflow(key, body) {
  const { data } = await api.post(`/workflows/${encodeURIComponent(key)}/clone`, body)
  return data
}

export async function setWorkflowActive(key, active) {
  const { data } = await api.put(`/workflows/${encodeURIComponent(key)}/active`, { active })
  return data
}

export async function fetchRoles() {
  const { data } = await api.get('/roles')
  return data
}

export async function fetchUsers(params = {}) {
  const { data } = await api.get('/users', { params })
  return data
}

export async function fetchUser(id) {
  const { data } = await api.get(`/users/${encodeURIComponent(id)}`)
  return data
}

export async function createUser(body) {
  const { data } = await api.post('/users', body)
  return data
}

export async function updateUser(id, body) {
  const { data } = await api.patch(`/users/${encodeURIComponent(id)}`, body)
  return data
}

export async function resetUserPassword(id, temporaryPassword) {
  const { data } = await api.post(`/users/${encodeURIComponent(id)}/password-reset`, {
    temporaryPassword,
  })
  return data
}

export async function changeOwnPassword(currentPassword, newPassword) {
  const { data } = await api.post('/auth/password', { currentPassword, newPassword })
  return data
}

export async function createWorkflow(body) {
  const { data } = await api.post('/workflows', body)
  return data
}

export async function fetchWorkflowDefinition(key) {
  const { data } = await api.get(`/workflows/${key}`)
  return data
}

/** Attach an existing Mongo form schema to a workflow TASK node. */
export async function assignWorkflowNodeForm(workflowKey, nodeKey, formKey) {
  const { data } = await api.put(
    `/workflows/${encodeURIComponent(workflowKey)}/nodes/${encodeURIComponent(nodeKey)}/form`,
    { formKey },
  )
  return data
}

/**
 * Create a Mongo form schema, publish it, and bind it to a workflow node.
 */
export async function createFormForWorkflowNode(workflowKey, nodeKey, formBody) {
  const created = await createFormSchema(formBody)
  const published = await publishFormSchema(created.formKey)
  await assignWorkflowNodeForm(workflowKey, nodeKey, published.formKey)
  return published
}

export async function startInstance(key, businessKey) {
  const { data } = await api.post(`/workflows/${key}/instances`, { businessKey, context: {} })
  return data
}

export async function fetchInstances() {
  const { data } = await api.get('/instances')
  return data
}

export async function fetchInstance(id) {
  const { data } = await api.get(`/instances/${id}`)
  return data
}

export async function transition(id, body) {
  const { data } = await api.post(`/instances/${id}/transitions`, body)
  return data
}

export async function fetchAudit(id) {
  const { data } = await api.get(`/instances/${id}/audit`)
  return data
}

export async function fetchCurrentFormValues(id) {
  const { data } = await api.get(`/instances/${id}/forms/current`)
  return data
}

export async function fetchDocuments(id) {
  const { data } = await api.get(`/instances/${id}/documents`)
  return data
}

export async function uploadDocument(id, file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post(`/instances/${id}/documents`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export function documentDownloadUrl(instanceId, documentId) {
  return `${env.apiUrl}/instances/${instanceId}/documents/${documentId}/content`
}

export async function fetchNotifications() {
  const { data } = await api.get('/notifications')
  return data
}

export async function markNotificationRead(id) {
  const { data } = await api.post(`/notifications/${id}/read`)
  return data
}

export async function fetchRoleAnalytics() {
  const { data } = await api.get('/analytics/me')
  return data
}

/** Dynamic form schema from MongoDB (falls back client-side if 404). */
export async function fetchFormSchema(formKey) {
  if (!formKey) return null
  const { data } = await api.get(`/forms/${encodeURIComponent(formKey)}`)
  return data
}

export async function fetchFormSchemas(params = {}) {
  const { status } = params
  const { data } = await api.get('/forms', {
    params: { status: status || undefined },
  })
  return data
}

export async function createFormSchema(body) {
  const { data } = await api.post('/forms', body)
  return data
}

export async function updateFormSchema(formKey, body) {
  const { data } = await api.put(`/forms/${encodeURIComponent(formKey)}`, body)
  return data
}

export async function publishFormSchema(formKey) {
  const { data } = await api.post(`/forms/${encodeURIComponent(formKey)}/publish`)
  return data
}

export async function draftFormSchema(formKey) {
  const { data } = await api.post(`/forms/${encodeURIComponent(formKey)}/draft`)
  return data
}

export async function cloneFormSchema(formKey, body) {
  const { data } = await api.post(`/forms/${encodeURIComponent(formKey)}/clone`, body)
  return data
}

export async function deleteFormSchema(formKey) {
  const { data } = await api.delete(`/forms/${encodeURIComponent(formKey)}`)
  return data
}

/** Aircraft work orders (UI alias for packages: PO/SO + ROUTINE|REPAIR + parts). */
export async function fetchPackages() {
  const { data } = await api.get('/packages')
  return data
}

export async function fetchPackage(id) {
  const { data } = await api.get(`/packages/${id}`)
  return data
}

export async function createPackage(body) {
  const { data } = await api.post('/packages', body)
  return data
}

export async function addPackagePart(packageId, body) {
  const { data } = await api.post(`/packages/${packageId}/parts`, body)
  return data
}

export async function openPackagePart(packageId, partId) {
  const { data } = await api.post(`/packages/${packageId}/parts/${partId}/open`)
  return data
}

export async function fetchPackageReport(packageId) {
  const { data } = await api.get(`/packages/${packageId}/report`)
  return data
}

/** Instances waiting on one of the current user's roles. */
export function actionableNotifications(instances, user) {
  if (!user?.roles?.length || !instances?.length) return []
  const roles = new Set(user.roles.map((r) => r.toUpperCase()))
  return instances
    .filter((i) => i.status === 'RUNNING')
    .filter((i) => {
      const need = i.currentNode?.roleCode
      if (!need) return true
      return roles.has(need.toUpperCase())
    })
    .map((i) => ({
      id: i.instanceId,
      instanceId: i.instanceId,
      workflowKey: i.workflowKey,
      businessKey: i.businessKey,
      title: i.currentNode?.label || 'Action required',
      description: `${i.workflowName}${i.businessKey ? ` · ${i.businessKey}` : ''}`,
      roleCode: i.currentNode?.roleCode,
      href: `/instances/${i.instanceId}`,
      type: i.currentNode?.type,
    }))
}
