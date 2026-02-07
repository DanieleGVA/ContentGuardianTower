import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import { loginSchema } from '../../shared/zod-schemas.js';
import { UnauthorizedError } from '../../shared/errors.js';
import { logAuditEvent } from '../../shared/audit.js';

export default async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/login
  app.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const { username, password } = loginSchema.parse(request.body);

    const user = await app.prisma.user.findUnique({
      where: { username },
    });

    if (!user || !user.isEnabled) {
      await logAuditEvent(app.prisma, {
        eventType: 'LOGIN_FAILURE',
        entityType: 'USER',
        entityId: user?.id ?? 'unknown',
        actorType: 'USER',
        message: `Failed login attempt for '${username}'`,
      });
      throw new UnauthorizedError('Invalid username or password');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await logAuditEvent(app.prisma, {
        eventType: 'LOGIN_FAILURE',
        entityType: 'USER',
        entityId: user.id,
        actorType: 'USER',
        actorUserId: user.id,
        message: `Failed login attempt for '${username}'`,
      });
      throw new UnauthorizedError('Invalid username or password');
    }

    // Issue JWT
    const token = app.jwt.sign({ sub: user.id, role: user.role });

    // Update last login
    await app.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await logAuditEvent(app.prisma, {
      eventType: 'LOGIN_SUCCESS',
      entityType: 'USER',
      entityId: user.id,
      actorType: 'USER',
      actorUserId: user.id,
      message: `User '${username}' logged in`,
    });

    return reply.send({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        countryScopeType: user.countryScopeType,
        countryCodes: user.countryCodes,
      },
    });
  });

  // POST /api/auth/logout
  app.post(
    '/logout',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      await logAuditEvent(app.prisma, {
        eventType: 'LOGOUT',
        entityType: 'USER',
        entityId: request.user.id,
        actorType: 'USER',
        actorUserId: request.user.id,
        message: `User '${request.user.username}' logged out`,
      });

      return reply.send({ message: 'Logged out successfully' });
    },
  );

  // GET /api/auth/me
  app.get(
    '/me',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest) => {
      const user = await app.prisma.user.findUnique({
        where: { id: request.user.id },
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
        },
      });
      return user;
    },
  );

  // POST /api/auth/refresh
  app.post(
    '/refresh',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest) => {
      const token = app.jwt.sign({ sub: request.user.id, role: request.user.role });
      return { token };
    },
  );
}
