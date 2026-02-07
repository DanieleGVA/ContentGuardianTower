import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { requireRole } from '../plugins/auth.plugin.js';
import { createUserSchema, updateUserSchema, changePasswordSchema } from '../../shared/zod-schemas.js';
import { parsePagination, buildPaginationMeta, buildPrismaSkipTake } from '../../shared/pagination.js';
import { logAuditEvent } from '../../shared/audit.js';
import { NotFoundError } from '../../shared/errors.js';

const SALT_ROUNDS = 12;

export default async function usersRoutes(app: FastifyInstance) {
  // All user routes require ADMIN
  app.addHook('preHandler', app.authenticate);
  app.addHook('preHandler', requireRole('ADMIN'));

  // GET /api/users
  app.get('/', async (request: FastifyRequest) => {
    const params = parsePagination(request.query as Record<string, string>);
    const { skip, take } = buildPrismaSkipTake(params);

    const [users, total] = await Promise.all([
      app.prisma.user.findMany({
        skip,
        take,
        orderBy: { [params.sortBy || 'createdAt']: params.sortOrder },
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          role: true,
          countryScopeType: true,
          countryCodes: true,
          isEnabled: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      app.prisma.user.count(),
    ]);

    return buildPaginationMeta(users, total, params);
  });

  // POST /api/users
  app.post('/', async (request: FastifyRequest) => {
    const data = createUserSchema.parse(request.body);
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    const user = await app.prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        fullName: data.fullName,
        passwordHash,
        role: data.role,
        countryScopeType: data.countryScopeType,
        countryCodes: data.countryCodes,
        isEnabled: data.isEnabled,
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        countryScopeType: true,
        countryCodes: true,
        isEnabled: true,
        createdAt: true,
      },
    });

    await logAuditEvent(app.prisma, {
      eventType: 'USER_CREATED',
      entityType: 'USER',
      entityId: user.id,
      actorType: 'USER',
      actorUserId: request.user.id,
      message: `User '${user.username}' created by '${request.user.username}'`,
    });

    return user;
  });

  // GET /api/users/:id
  app.get('/:id', async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };

    const user = await app.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        countryScopeType: true,
        countryCodes: true,
        isEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new NotFoundError('User', id);
    return user;
  });

  // PUT /api/users/:id
  app.put('/:id', async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };
    const data = updateUserSchema.parse(request.body);

    const user = await app.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        countryScopeType: true,
        countryCodes: true,
        isEnabled: true,
        updatedAt: true,
      },
    });

    await logAuditEvent(app.prisma, {
      eventType: 'USER_UPDATED',
      entityType: 'USER',
      entityId: id,
      actorType: 'USER',
      actorUserId: request.user.id,
      message: `User '${user.username}' updated by '${request.user.username}'`,
      payload: data as Prisma.InputJsonValue,
    });

    return user;
  });

  // PUT /api/users/:id/password
  app.put('/:id/password', async (request: FastifyRequest) => {
    const { id } = request.params as { id: string };
    const { newPassword } = changePasswordSchema.parse(request.body);
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await app.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    await logAuditEvent(app.prisma, {
      eventType: 'USER_PASSWORD_CHANGED',
      entityType: 'USER',
      entityId: id,
      actorType: 'USER',
      actorUserId: request.user.id,
      message: `Password changed for user '${id}' by '${request.user.username}'`,
    });

    return { message: 'Password updated successfully' };
  });
}
