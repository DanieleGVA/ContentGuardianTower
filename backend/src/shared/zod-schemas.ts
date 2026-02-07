import { z } from 'zod';

// ============================================================
// Auth
// ============================================================

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  token: z.string().min(1),
});

// ============================================================
// Users
// ============================================================

export const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  fullName: z.string().min(1).max(100),
  password: z.string().min(8).max(128),
  role: z.enum(['ADMIN', 'GLOBAL_MANAGER', 'REGIONAL_MANAGER', 'LOCAL_MANAGER', 'VIEWER']),
  countryScopeType: z.enum(['ALL', 'LIST']).default('ALL'),
  countryCodes: z.array(z.string().length(2).toUpperCase()).default([]),
  isEnabled: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  fullName: z.string().min(1).max(100).optional(),
  role: z.enum(['ADMIN', 'GLOBAL_MANAGER', 'REGIONAL_MANAGER', 'LOCAL_MANAGER', 'VIEWER']).optional(),
  countryScopeType: z.enum(['ALL', 'LIST']).optional(),
  countryCodes: z.array(z.string().length(2).toUpperCase()).optional(),
  isEnabled: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
  newPassword: z.string().min(8).max(128),
});

// ============================================================
// Sources
// ============================================================

export const createSourceSchema = z.object({
  platform: z.string().min(1),
  channel: z.enum(['WEB', 'FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'YOUTUBE']),
  countryCode: z.string().length(2).toUpperCase(),
  sourceType: z.enum(['WEB_OWNED', 'WEB_SEARCH_DISCOVERY', 'SOCIAL_ACCOUNT', 'YOUTUBE_CHANNEL']),
  identifier: z.string().min(1),
  displayName: z.string().min(1).max(200),
  isEnabled: z.boolean().default(true),
  startUrls: z.array(z.string().url()).default([]),
  domainAllowlist: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  languageTargets: z.array(z.string()).default([]),
  urlAllowPatterns: z.array(z.string()).default([]),
  urlBlockPatterns: z.array(z.string()).default([]),
  crawlFrequencyMinutes: z.number().int().min(1).optional(),
  credentialRefId: z.string().uuid().optional(),
});

export const updateSourceSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  isEnabled: z.boolean().optional(),
  startUrls: z.array(z.string().url()).optional(),
  domainAllowlist: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  languageTargets: z.array(z.string()).optional(),
  urlAllowPatterns: z.array(z.string()).optional(),
  urlBlockPatterns: z.array(z.string()).optional(),
  crawlFrequencyMinutes: z.number().int().min(1).nullable().optional(),
  credentialRefId: z.string().uuid().nullable().optional(),
});

// ============================================================
// Rules
// ============================================================

export const createRuleSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.string().min(1),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  applicableChannels: z.array(z.enum(['WEB', 'FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'YOUTUBE'])).min(1),
  applicableCountries: z.array(z.string().length(2).toUpperCase()).min(1),
  payload: z.record(z.unknown()),
});

export const updateRuleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.string().min(1).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  applicableChannels: z
    .array(z.enum(['WEB', 'FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'YOUTUBE']))
    .min(1)
    .optional(),
  applicableCountries: z.array(z.string().length(2).toUpperCase()).min(1).optional(),
  payload: z.record(z.unknown()).optional(),
});

// ============================================================
// Tickets
// ============================================================

export const updateTicketStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
});

export const assignTicketSchema = z.object({
  assigneeUserId: z.string().uuid().nullable(),
});

export const createCommentSchema = z.object({
  body: z.string().min(1).max(10000),
});

// ============================================================
// Settings
// ============================================================

export const updateSettingsSchema = z.object({
  allowedCountryCodes: z.array(z.string().length(2).toUpperCase()).optional(),
  languageConfidenceThreshold: z.number().min(0).max(1).optional(),
  defaultDueHoursHigh: z.number().int().min(1).optional(),
  defaultDueHoursMedium: z.number().int().min(1).optional(),
  defaultDueDaysLow: z.number().int().min(1).optional(),
  uncertainDefaultRiskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'UNCERTAIN_MEDIUM']).optional(),
  escalationAfterHours: z.number().int().min(1).optional(),
  retentionDays: z.number().int().min(1).optional(),
  piiRedactionEnabledDefault: z.boolean().optional(),
  llmProvider: z.string().min(1).optional(),
  llmModel: z.string().min(1).optional(),
  llmMaxTokens: z.number().int().min(1).optional(),
  exportMaxRows: z.number().int().min(1).optional(),
  maxRetriesPerStep: z.number().int().min(1).optional(),
  defaultScheduleIntervalMinutes: z.number().int().min(1).optional(),
});

// ============================================================
// Exports
// ============================================================

export const createExportSchema = z.object({
  exportType: z.enum(['TICKETS_CSV', 'AUDIT_CSV']),
  filters: z.record(z.unknown()).optional(),
});

// ============================================================
// Shared query params
// ============================================================

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const searchQuerySchema = paginationQuerySchema.extend({
  q: z.string().optional(),
});

export const ticketListQuerySchema = searchQuerySchema.extend({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'UNCERTAIN_MEDIUM']).optional(),
  escalationLevel: z.enum(['LOCAL', 'REGIONAL', 'GLOBAL']).optional(),
  channel: z.enum(['WEB', 'FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'YOUTUBE']).optional(),
  countryCode: z.string().length(2).optional(),
  sourceId: z.string().uuid().optional(),
  assigneeUserId: z.string().uuid().optional(),
  isOverdue: z.coerce.boolean().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export const auditListQuerySchema = searchQuerySchema.extend({
  eventType: z.string().optional(),
  actorUserId: z.string().uuid().optional(),
  entityType: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});
