import { PrismaClient, Role, CountryScopeType, RiskLevel } from '@prisma/client';
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
