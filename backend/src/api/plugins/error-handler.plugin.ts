import type { FastifyInstance, FastifyError } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../../shared/errors.js';

async function errorHandlerPlugin(app: FastifyInstance) {
  app.setErrorHandler(function (error: FastifyError | Error, request, reply) {
    // AppError hierarchy (our custom errors)
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      });
    }

    // Zod validation errors
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    // Prisma known errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = (error.meta?.target as string[])?.join(', ') ?? 'field';
        return reply.status(409).send({
          error: 'CONFLICT',
          message: `A record with this ${target} already exists`,
        });
      }
      if (error.code === 'P2025') {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Record not found',
        });
      }
    }

    // Fastify built-in errors (rate limit, bad JSON, etc.)
    if ('statusCode' in error && typeof error.statusCode === 'number') {
      return reply.status(error.statusCode).send({
        error: error.code || 'ERROR',
        message: error.message,
      });
    }

    // Unexpected errors - log and return 500
    request.log.error(error, 'Unhandled error');
    return reply.status(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    });
  });
}

export default fp(errorHandlerPlugin, { name: 'error-handler' });
