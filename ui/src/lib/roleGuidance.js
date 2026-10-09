import { ROLE_LABELS } from '@/lib/demoUsers'

/**
 * Curated role briefing copy for post-login guidance.
 * Tone: HAL Overhaul Division ops — clear, calm, actionable.
 */
export const ROLE_GUIDANCE = {
  PROGRESS: {
    title: 'Progress Officer',
    charge:
      'You own work packages against aircraft PO/SO — ROUTINE or REPAIR — plus intake and document handoffs. Create the package, add parts, and open each part to start its master workflow.',
    whenClear:
      'Nothing is waiting on Progress right now. Open Work packages to map a PO/SO, or stay ready for the next handoff.',
    primaryWhenClear: { to: '/packages', label: 'Open work packages' },
    typicalDuties: [
      'Create a work package from PO/SO and choose ROUTINE or REPAIR',
      'Add parts and open them one by one for test / reassemble',
      'Record spares demand and document handoffs on running steps',
    ],
  },
  INSPECTION: {
    title: 'Inspector',
    charge:
      'You own bench-test results, serviceability decisions, and the full NDT Radiography path. Open any step that lists Inspection — the engine already chose the node.',
    whenClear:
      'Your Inspection queue is clear. Start NDT Radiography when a part arrives, or wait for Progress to hand off a bench-check unit.',
    primaryWhenClear: { to: '/workflows', label: 'Open workflows' },
    typicalDuties: [
      'Execute scheduled bench tests and record PASS / FAIL',
      'Drive NDT visual → exposure → examine → interpret → accept/reject',
      'Decide BER, Cat D labelling, and serviceability sign-off',
    ],
  },
  SHOP_MANAGER: {
    title: 'Shop Manager',
    charge:
      'You own repair / rework when Inspection fails a bench check. Complete the repair step so Inspection can retest — do not invent the next node.',
    whenClear:
      'No repair steps are waiting on Shop Manager. Failures from Inspection will appear here automatically.',
    primaryWhenClear: { to: '/inbox', label: 'Watch the action inbox' },
    typicalDuties: [
      'Perform repair / rework recorded against the failed unit',
      'Name the technician and work performed on the form',
      'Release the instance back for Inspection retest',
    ],
  },
  QA: {
    title: 'QA / ORDAQA',
    charge:
      'You oversee completed work and quality visibility. Review package test reports by PO/SO and use analytics for assurance.',
    whenClear:
      'No live steps require QA action. Open package reports or role analytics for assurance coverage.',
    primaryWhenClear: { to: '/packages', label: 'Review work packages' },
    typicalDuties: [
      'Review package test reports after all parts close',
      'Monitor role analytics for backlog and throughput',
      'Escalate process gaps through the audit trail',
    ],
  },
  STORES: {
    title: 'Stores Officer',
    charge:
      'You support material readiness around Overhaul workflows. MVP charts hand off primarily to Progress and Inspection — watch notifications when Stores is assigned.',
    whenClear:
      'No steps currently require Stores. Keep the inbox open for future material handoffs.',
    primaryWhenClear: { to: '/inbox', label: 'Open action inbox' },
    typicalDuties: [
      'Respond when a running node assigns Stores',
      'Coordinate spares availability with Progress',
      'Confirm document / material readiness on request',
    ],
  },
  CUSTOMER: {
    title: 'Customer Representative',
    charge:
      'You track completed work that concerns your organisation. Live execution nodes are owned by shop roles — your view emphasises finished, auditable outcomes.',
    whenClear:
      'No customer-action steps are pending. Browse completed instances for status you can report outward.',
    primaryWhenClear: { to: '/instances', label: 'Browse instances' },
    typicalDuties: [
      'Follow completed Accessories and NDT outcomes',
      'Use instance audit trails for status answers',
      'Escalate only through authorised shop channels',
    ],
  },
}

export function guidanceForRoles(roles = []) {
  const codes = [...new Set((roles || []).map((r) => String(r).toUpperCase()))]
  return codes
    .filter((code) => ROLE_GUIDANCE[code])
    .map((code) => ({ code, label: ROLE_LABELS[code] || code, ...ROLE_GUIDANCE[code] }))
}

export function primaryRoleGuidance(roles = []) {
  const list = guidanceForRoles(roles)
  return list[0] || null
}

/** Group actionable inbox items by required role, preserving order. */
export function groupPendingByRole(items = []) {
  const map = new Map()
  for (const item of items) {
    const code = (item.roleCode || 'UNASSIGNED').toUpperCase()
    if (!map.has(code)) map.set(code, [])
    map.get(code).push(item)
  }
  return [...map.entries()].map(([code, rows]) => ({
    code,
    label: ROLE_LABELS[code] || code,
    guidance: ROLE_GUIDANCE[code] || null,
    items: rows,
  }))
}

export function briefingHeadline(user, pendingCount) {
  const name = user?.displayName || user?.username || 'Operator'
  if (pendingCount > 0) {
    return `${name}, you have ${pendingCount} step${pendingCount === 1 ? '' : 's'} waiting on your role${pendingCount === 1 ? '' : 's'}.`
  }
  return `${name}, your role queue is clear — here is what you own today.`
}

export function reasonForPendingItem(item) {
  const role = ROLE_LABELS[item.roleCode] || item.roleCode || 'your role'
  const step = item.title || 'Current step'
  return `Waiting on ${role} · ${step}`
}
