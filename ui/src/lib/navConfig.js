/**
 * AMMS information architecture — single source for sidebar labels and groups.
 *
 * Configure → Form Master, Workflow Master
 * Execute   → Pending actions, Work packages
 * Track     → Maintenance runs (+ dashboard/analytics overview)
 *
 * Routes stay stable (AGENTS.md). Labels speak aircraft-maintenance language.
 * "Process map" is not a top-level menu — charts live under Workflow Master.
 */

import {
  BarChart3,
  Bell,
  ClipboardList,
  FileStack,
  LayoutDashboard,
  Package,
  Workflow,
} from 'lucide-react'

export const APP_BRAND = {
  name: 'AMMS',
  subtitle: 'Aircraft Maintenance',
}

/** Canonical labels for breadcrumbs and page headers. */
export const NAV_LABELS = {
  dashboard: 'Dashboard',
  analytics: 'Analytics',
  inbox: 'Pending actions',
  packages: 'Work packages',
  runs: 'Maintenance runs',
  forms: 'Form Master',
  workflows: 'Workflow Master',
}

export const NAV_GROUPS = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      {
        id: 'dashboard',
        to: '/',
        label: NAV_LABELS.dashboard,
        icon: LayoutDashboard,
        match: (pathname) => pathname === '/',
      },
      {
        id: 'analytics',
        to: '/analytics',
        label: NAV_LABELS.analytics,
        icon: BarChart3,
        match: (pathname) => pathname.startsWith('/analytics'),
      },
    ],
  },
  {
    id: 'execute',
    label: 'Execute',
    items: [
      {
        id: 'inbox',
        to: '/inbox',
        label: NAV_LABELS.inbox,
        icon: Bell,
        badge: true,
        match: (pathname) => pathname.startsWith('/inbox'),
      },
      {
        id: 'packages',
        to: '/packages',
        label: NAV_LABELS.packages,
        icon: Package,
        match: (pathname) => pathname === '/packages' || pathname.startsWith('/packages/'),
      },
    ],
  },
  {
    id: 'track',
    label: 'Track',
    items: [
      {
        id: 'instances',
        to: '/instances',
        label: NAV_LABELS.runs,
        icon: ClipboardList,
        match: (pathname) => pathname.startsWith('/instances'),
      },
    ],
  },
  {
    id: 'configure',
    label: 'Configure',
    items: [
      {
        id: 'forms',
        to: '/forms',
        label: NAV_LABELS.forms,
        icon: FileStack,
        match: (pathname) => pathname === '/forms' || pathname.startsWith('/forms/'),
      },
      {
        id: 'workflows',
        to: '/workflows',
        label: NAV_LABELS.workflows,
        icon: Workflow,
        match: (pathname) => pathname === '/workflows' || pathname.startsWith('/workflows/'),
      },
    ],
  },
]
