import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:18080/api/v1'

export const api = axios.create({
  baseURL: API_URL,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('amms_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export async function login(username, password) {
  const { data } = await api.post('/auth/login', { username, password })
  localStorage.setItem('amms_token', data.token)
  localStorage.setItem('amms_user', JSON.stringify(data.user))
  return data
}

export function logout() {
  localStorage.removeItem('amms_token')
  localStorage.removeItem('amms_user')
}

export function currentUser() {
  const raw = localStorage.getItem('amms_user')
  return raw ? JSON.parse(raw) : null
}

export async function fetchWorkflows() {
  const { data } = await api.get('/workflows')
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
