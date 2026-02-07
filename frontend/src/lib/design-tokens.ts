import type { ReactNode } from 'react';

// Ticket status
export const TICKET_STATUS = {
  OPEN: { label: 'Open', color: 'text-status-open', bg: 'bg-status-open/10', icon: '○' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-status-in-progress', bg: 'bg-status-in-progress/10', icon: '◐' },
  RESOLVED: { label: 'Resolved', color: 'text-status-resolved', bg: 'bg-status-resolved/10', icon: '✓' },
  CLOSED: { label: 'Closed', color: 'text-status-closed', bg: 'bg-status-closed/10', icon: '●' },
} as const;

// Risk levels
export const RISK_LEVEL = {
  HIGH: { label: 'High', color: 'text-risk-high', bg: 'bg-risk-high/10', icon: '▲' },
  MEDIUM: { label: 'Medium', color: 'text-risk-medium', bg: 'bg-risk-medium/10', icon: '■' },
  LOW: { label: 'Low', color: 'text-risk-low', bg: 'bg-risk-low/10', icon: '▼' },
  UNCERTAIN_MEDIUM: { label: 'Uncertain', color: 'text-risk-uncertain', bg: 'bg-risk-uncertain/10', icon: '◇' },
} as const;

// Escalation levels
export const ESCALATION_LEVEL = {
  LOCAL: { label: 'Local', color: 'text-text-secondary', bg: 'bg-transparent', icon: '' },
  REGIONAL: { label: 'Regional', color: 'text-escalation-regional', bg: 'bg-escalation-regional/10', icon: '↑' },
  GLOBAL: { label: 'Global', color: 'text-escalation-global', bg: 'bg-escalation-global/10', icon: '↑↑' },
} as const;

// Compliance status
export const COMPLIANCE_STATUS = {
  COMPLIANT: { label: 'Compliant', color: 'text-compliant', bg: 'bg-compliant/10', icon: '✓' },
  NON_COMPLIANT: { label: 'Non-Compliant', color: 'text-non-compliant', bg: 'bg-non-compliant/10', icon: '✗' },
  UNCERTAIN: { label: 'Uncertain', color: 'text-uncertain', bg: 'bg-uncertain/10', icon: '?' },
} as const;

// Channel icons (text-based)
export const CHANNEL_ICON: Record<string, string> = {
  WEB: '🌐',
  FACEBOOK: '📘',
  INSTAGRAM: '📸',
  LINKEDIN: '💼',
  YOUTUBE: '📺',
};

// Roles
export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  GLOBAL_MANAGER: 'Global Manager',
  REGIONAL_MANAGER: 'Regional Manager',
  LOCAL_MANAGER: 'Local Manager',
  VIEWER: 'Viewer',
};

// Navigation groups with role visibility
export type NavGroup = 'OPERATE' | 'MONITOR' | 'CONFIGURE' | 'GOVERN' | 'REPORT';

export const NAV_VISIBILITY: Record<NavGroup, string[]> = {
  OPERATE: ['ADMIN', 'GLOBAL_MANAGER', 'REGIONAL_MANAGER', 'LOCAL_MANAGER', 'VIEWER'],
  MONITOR: ['ADMIN', 'GLOBAL_MANAGER', 'REGIONAL_MANAGER', 'LOCAL_MANAGER'],
  CONFIGURE: ['ADMIN'],
  GOVERN: ['ADMIN'],
  REPORT: ['ADMIN', 'GLOBAL_MANAGER', 'REGIONAL_MANAGER', 'LOCAL_MANAGER'],
};
