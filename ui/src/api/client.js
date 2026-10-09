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

export async function fetchWorkflows() {
  const { data } = await api.get('/workflows')
  return data
}

export async function fetchWorkflowDefinition(key) {
  const { data } = await api.get(`/workflows/${key}`)
  return data
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
      title: i.currentNode?.label || 'Action required',
      description: `${i.workflowName}${i.businessKey ? ` · ${i.businessKey}` : ''}`,
      roleCode: i.currentNode?.roleCode,
      href: `/instances/${i.instanceId}`,
      type: i.currentNode?.type,
    }))
}
