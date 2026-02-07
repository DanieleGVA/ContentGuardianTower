import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import type { Role, CountryScopeType } from '@prisma/client';
import { UnauthorizedError, ForbiddenError } from '../../shared/errors.js';

export interface RequestUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: Role;
  countryScopeType: CountryScopeType;
  countryCodes: string[];
  isEnabled: boolean;
}

// JWT payload shape
interface JwtPayload {
  sub: string;
  role: Role;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: RequestUser;
  }
}

async function authPlugin(app: FastifyInstance) {
  app.decorate('authenticate', async function (request: FastifyRequest, _reply: FastifyReply) {
    let payload: JwtPayload;
    try {
      await request.jwtVerify();
      // After jwtVerify, request.user contains the JWT payload
      payload = request.user as unknown as JwtPayload;
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }

    const dbUser = await app.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        countryScopeType: true,
        countryCodes: true,
        isEnabled: true,
      },
    });

    if (!dbUser || !dbUser.isEnabled) {
      throw new UnauthorizedError('User account is disabled or not found');
    }

    // Replace the JWT payload with full user info
    (request as { user: RequestUser }).user = dbUser as RequestUser;
  });
}

export default fp(authPlugin, { name: 'auth', dependencies: ['@fastify/jwt'] });

/**
 * Fastify preHandler that checks if the request user has one of the allowed roles.
 */
export function requireRole(...roles: Role[]) {
  return async function (request: FastifyRequest) {
    if (!request.user) {
      throw new UnauthorizedError();
    }
    if (!roles.includes(request.user.role)) {
      throw new ForbiddenError(`Role '${request.user.role}' is not authorized for this action`);
    }
  };
}

/**
 * Fastify preHandler that checks the request user has access to a specific country.
 * Reads countryCode from request params or query.
 */
export function requireCountryAccess(paramName = 'countryCode') {
  return async function (request: FastifyRequest) {
    if (!request.user) {
      throw new UnauthorizedError();
    }
    if (request.user.countryScopeType === 'ALL') return;

    const params = request.params as Record<string, string>;
    const query = request.query as Record<string, string>;
    const countryCode = params[paramName] || query[paramName];

    if (countryCode && !request.user.countryCodes.includes(countryCode)) {
      throw new ForbiddenError(`Access denied for country '${countryCode}'`);
    }
  };
}
