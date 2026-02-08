import { PrismaClient, Role, CountryScopeType, RiskLevel, Channel, TicketStatus, EscalationLevel, ComplianceStatus, ContentType, ExtractionStatus, SourceType } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create default system settings
  await prisma.systemSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      allowedCountryCodes: ['IT', 'ES', 'DE', 'FR', 'BR', 'MX', 'AR'],
      languageConfidenceThreshold: 0.8,
      defaultDueHoursHigh: 24,
      defaultDueHoursMedium: 72,
      defaultDueDaysLow: 7,
      uncertainDefaultRiskLevel: RiskLevel.UNCERTAIN_MEDIUM,
      escalationAfterHours: 48,
      retentionDays: 180,
      piiRedactionEnabledDefault: true,
      llmProvider: 'openai',
      llmModel: 'gpt-4o',
      llmMaxTokens: 4096,
      exportMaxRows: 50000,
      maxRetriesPerStep: 3,
      defaultScheduleIntervalMinutes: 1440,
    },
  });
  console.log('  System settings created');

  // 2. Create admin user (password: admin123 - CHANGE IN PRODUCTION)
  const adminPasswordHash = await hash('admin123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { fullName: 'System Administrator' },
    create: {
      username: 'admin',
      email: 'admin@cgt.local',
      fullName: 'System Administrator',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      countryScopeType: CountryScopeType.ALL,
      countryCodes: [],
      isEnabled: true,
    },
  });
  console.log('  Admin user created (admin / admin123)');

  // 3. Create sample manager users for different scopes
  const managerPasswordHash = await hash('manager123', 10);

  await prisma.user.upsert({
    where: { username: 'global_manager' },
    update: { fullName: 'Global Manager' },
    create: {
      username: 'global_manager',
      email: 'global@cgt.local',
      fullName: 'Global Manager',
      passwordHash: managerPasswordHash,
      role: Role.GLOBAL_MANAGER,
      countryScopeType: CountryScopeType.ALL,
      countryCodes: [],
      isEnabled: true,
    },
  });

  await prisma.user.upsert({
    where: { username: 'regional_manager_eu' },
    update: { fullName: 'EU Regional Manager' },
    create: {
      username: 'regional_manager_eu',
      email: 'eu_manager@cgt.local',
      fullName: 'EU Regional Manager',
      passwordHash: managerPasswordHash,
      role: Role.REGIONAL_MANAGER,
      countryScopeType: CountryScopeType.LIST,
      countryCodes: ['IT', 'ES', 'DE', 'FR'],
      isEnabled: true,
    },
  });

  await prisma.user.upsert({
    where: { username: 'local_manager_it' },
    update: { fullName: 'Italy Local Manager' },
    create: {
      username: 'local_manager_it',
      email: 'it_manager@cgt.local',
      fullName: 'Italy Local Manager',
      passwordHash: managerPasswordHash,
      role: Role.LOCAL_MANAGER,
      countryScopeType: CountryScopeType.LIST,
      countryCodes: ['IT'],
      isEnabled: true,
    },
  });

  // 4. Create viewer user
  const viewerPasswordHash = await hash('viewer123', 10);
  await prisma.user.upsert({
    where: { username: 'viewer' },
    update: { fullName: 'Italy Viewer' },
    create: {
      username: 'viewer',
      email: 'viewer@cgt.local',
      fullName: 'Italy Viewer',
      passwordHash: viewerPasswordHash,
      role: Role.VIEWER,
      countryScopeType: CountryScopeType.LIST,
      countryCodes: ['IT'],
      isEnabled: true,
    },
  });
  console.log('  Sample users created');

  // 5. Create sample sources
  const admin = await prisma.user.findUniqueOrThrow({ where: { username: 'admin' } });

  const source1 = await prisma.source.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      platform: 'web',
      channel: Channel.WEB,
      countryCode: 'IT',
      sourceType: SourceType.WEB_OWNED,
      identifier: 'https://www.example.it',
      displayName: 'Example Italy',
      isEnabled: true,
      startUrls: ['https://www.example.it'],
      crawlFrequencyMinutes: 1440,
    },
  });

  const source2 = await prisma.source.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      platform: 'web',
      channel: Channel.WEB,
      countryCode: 'ES',
      sourceType: SourceType.WEB_SEARCH_DISCOVERY,
      identifier: 'spain-financial-products',
      displayName: 'Spain Financial Products',
      isEnabled: true,
      keywords: ['inversiones', 'fondos', 'rendimiento'],
      crawlFrequencyMinutes: 720,
    },
  });

  const source3 = await prisma.source.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      platform: 'facebook',
      channel: Channel.FACEBOOK,
      countryCode: 'DE',
      sourceType: SourceType.SOCIAL_ACCOUNT,
      identifier: 'company-de-official',
      displayName: 'Company DE Facebook',
      isEnabled: true,
      crawlFrequencyMinutes: 360,
    },
  });
  console.log('  Sample sources created');

  // 6. Create sample rules
  const rule1 = await prisma.rule.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      name: 'GDPR Cookie Compliance',
      type: 'COMPLIANCE',
      severity: 'HIGH',
      applicableChannels: [Channel.WEB],
      applicableCountries: ['IT', 'ES', 'DE', 'FR'],
      isActive: true,
      createdByUserId: admin.id,
      updatedByUserId: admin.id,
    },
  });
  await prisma.ruleVersion.upsert({
    where: { id: '00000000-0000-0000-0000-000000000011' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000011',
      ruleId: rule1.id,
      version: 1,
      nameSnapshot: 'GDPR Cookie Compliance',
      typeSnapshot: 'COMPLIANCE',
      severitySnapshot: 'HIGH',
      applicableChannelsSnapshot: [Channel.WEB],
      applicableCountriesSnapshot: ['IT', 'ES', 'DE', 'FR'],
      payload: { keywords: ['cookie', 'privacy', 'gdpr'], checkType: 'presence' },
      createdByUserId: admin.id,
    },
  });
  await prisma.rule.update({ where: { id: rule1.id }, data: { activeRuleVersionId: '00000000-0000-0000-0000-000000000011' } });

  const rule2 = await prisma.rule.upsert({
    where: { id: '00000000-0000-0000-0000-000000000012' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000012',
      name: 'Missing Risk Disclosure',
      type: 'DISCLOSURE',
      severity: 'HIGH',
      applicableChannels: [Channel.WEB, Channel.FACEBOOK],
      applicableCountries: ['IT', 'ES'],
      isActive: true,
      createdByUserId: admin.id,
      updatedByUserId: admin.id,
    },
  });
  await prisma.ruleVersion.upsert({
    where: { id: '00000000-0000-0000-0000-000000000013' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000013',
      ruleId: rule2.id,
      version: 1,
      nameSnapshot: 'Missing Risk Disclosure',
      typeSnapshot: 'DISCLOSURE',
      severitySnapshot: 'HIGH',
      applicableChannelsSnapshot: [Channel.WEB, Channel.FACEBOOK],
      applicableCountriesSnapshot: ['IT', 'ES'],
      payload: { checkType: 'absence', requiredText: 'investment risk disclaimer' },
      createdByUserId: admin.id,
    },
  });
  await prisma.rule.update({ where: { id: rule2.id }, data: { activeRuleVersionId: '00000000-0000-0000-0000-000000000013' } });

  const rule3 = await prisma.rule.upsert({
    where: { id: '00000000-0000-0000-0000-000000000014' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000014',
      name: 'Misleading Performance Claims',
      type: 'CLAIMS',
      severity: 'MEDIUM',
      applicableChannels: [Channel.WEB, Channel.FACEBOOK, Channel.INSTAGRAM],
      applicableCountries: ['IT', 'ES', 'DE', 'FR'],
      isActive: true,
      createdByUserId: admin.id,
      updatedByUserId: admin.id,
    },
  });
  await prisma.ruleVersion.upsert({
    where: { id: '00000000-0000-0000-0000-000000000015' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000015',
      ruleId: rule3.id,
      version: 1,
      nameSnapshot: 'Misleading Performance Claims',
      typeSnapshot: 'CLAIMS',
      severitySnapshot: 'MEDIUM',
      applicableChannelsSnapshot: [Channel.WEB, Channel.FACEBOOK, Channel.INSTAGRAM],
      applicableCountriesSnapshot: ['IT', 'ES', 'DE', 'FR'],
      payload: { patterns: ['guaranteed returns', 'risk-free', 'double your money'] },
      createdByUserId: admin.id,
    },
  });
  await prisma.rule.update({ where: { id: rule3.id }, data: { activeRuleVersionId: '00000000-0000-0000-0000-000000000015' } });
  console.log('  Sample rules created');

  // 7. Create content items, revisions, analysis, and tickets
  const ticketData = [
    { title: 'Missing cookie banner on landing page', risk: RiskLevel.HIGH, status: TicketStatus.OPEN, source: source1, channel: Channel.WEB, country: 'IT', escalation: EscalationLevel.LOCAL },
    { title: 'No risk disclaimer on fund promotion page', risk: RiskLevel.HIGH, status: TicketStatus.IN_PROGRESS, source: source1, channel: Channel.WEB, country: 'IT', escalation: EscalationLevel.REGIONAL },
    { title: 'Misleading ROI claims in blog post', risk: RiskLevel.MEDIUM, status: TicketStatus.OPEN, source: source2, channel: Channel.WEB, country: 'ES', escalation: EscalationLevel.LOCAL },
    { title: 'GDPR privacy policy link broken', risk: RiskLevel.LOW, status: TicketStatus.RESOLVED, source: source1, channel: Channel.WEB, country: 'IT', escalation: EscalationLevel.LOCAL },
    { title: 'Performance guarantee claim in Facebook post', risk: RiskLevel.HIGH, status: TicketStatus.OPEN, source: source3, channel: Channel.FACEBOOK, country: 'DE', escalation: EscalationLevel.LOCAL },
    { title: 'Missing terms and conditions link', risk: RiskLevel.MEDIUM, status: TicketStatus.IN_PROGRESS, source: source2, channel: Channel.WEB, country: 'ES', escalation: EscalationLevel.LOCAL },
    { title: 'Outdated compliance text on product page', risk: RiskLevel.LOW, status: TicketStatus.CLOSED, source: source1, channel: Channel.WEB, country: 'IT', escalation: EscalationLevel.LOCAL },
    { title: 'Unauthorized testimonial on social media', risk: RiskLevel.MEDIUM, status: TicketStatus.OPEN, source: source3, channel: Channel.FACEBOOK, country: 'DE', escalation: EscalationLevel.GLOBAL },
  ];

  for (let i = 0; i < ticketData.length; i++) {
    const td = ticketData[i];
    const idx = String(i + 1).padStart(2, '0');
    const contentId = `00000000-0000-0000-0001-0000000000${idx}`;
    const revisionId = `00000000-0000-0000-0002-0000000000${idx}`;
    const analysisId = `00000000-0000-0000-0003-0000000000${idx}`;
    const ticketId = `00000000-0000-0000-0004-0000000000${idx}`;

    await prisma.contentItem.upsert({
      where: { id: contentId },
      update: {},
      create: {
        id: contentId,
        channel: td.channel,
        countryCode: td.country,
        sourceId: td.source.id,
        contentType: td.channel === Channel.WEB ? ContentType.WEB_PAGE : ContentType.SOCIAL_POST,
        externalId: `ext-${idx}`,
        url: `https://example.com/page-${idx}`,
        lastSeenAt: new Date(),
      },
    });

    await prisma.contentRevision.upsert({
      where: { id: revisionId },
      update: {},
      create: {
        id: revisionId,
        contentId,
        revisionNumber: 1,
        normalizedTextHash: `hash-${idx}`,
        title: td.title,
        mainText: `Sample content for: ${td.title}`,
        extractionStatus: ExtractionStatus.OK,
        firstSeenOrModifiedAt: new Date(),
      },
    });

    await prisma.analysisResult.upsert({
      where: { id: analysisId },
      update: {},
      create: {
        id: analysisId,
        contentId,
        revisionId,
        channel: td.channel,
        countryCode: td.country,
        complianceStatus: td.risk === RiskLevel.HIGH ? ComplianceStatus.NON_COMPLIANT : ComplianceStatus.UNCERTAIN,
        violations: [],
        llmProvider: 'openai',
        llmModel: 'gpt-4o',
      },
    });

    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + (td.risk === RiskLevel.HIGH ? 1 : td.risk === RiskLevel.MEDIUM ? 3 : 7));

    await prisma.ticket.upsert({
      where: { id: ticketId },
      update: {},
      create: {
        id: ticketId,
        ticketKey: `TKT-${idx}`,
        contentId,
        revisionId,
        analysisId,
        sourceId: td.source.id,
        channel: td.channel,
        countryCode: td.country,
        status: td.status,
        riskLevel: td.risk,
        escalationLevel: td.escalation,
        dueAt,
        title: td.title,
        summary: `Compliance issue detected: ${td.title}`,
        createdBy: 'system',
        contentUrl: `https://example.com/page-${idx}`,
      },
    });
  }
  console.log('  Sample tickets created (8 tickets with content chain)');

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
