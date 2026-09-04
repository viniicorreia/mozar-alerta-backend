import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { AppError } from "../../shared/errors.js";

/**
 * Global error handler — plan section 31. Never leaks a stack trace to the
 * client; every error is logged with full detail server-side first.
 */
export function errorHandler(
  error: FastifyError | AppError | ZodError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof AppError) {
    request.log.warn({ err: error, code: error.code }, "handled app error");
    return reply.status(error.statusCode).send({
      success: false,
      error: { code: error.code, message: error.message, details: error.details },
    });
  }

  if (error instanceof ZodError) {
    request.log.warn({ err: error }, "validation error");
    return reply.status(422).send({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        details: error.flatten(),
      },
    });
  }

  // Postgres error codes surfaced by the `postgres` driver as `.code`.
  const pgError = error as Error & { code?: string; constraint_name?: string };
  if (pgError.code === "23505") {
    request.log.warn({ err: error }, "unique constraint violation");
    return reply.status(409).send({
      success: false,
      error: { code: "CONFLICT", message: "This record already exists" },
    });
  }
  if (pgError.code === "23503") {
    request.log.warn({ err: error }, "foreign key violation");
    return reply.status(409).send({
      success: false,
      error: {
        code: "CONFLICT",
        message: "This record is still referenced by other data and cannot be modified this way",
      },
    });
  }

  const fastifyError = error as FastifyError;
  if (fastifyError.statusCode && fastifyError.statusCode < 500) {
    request.log.warn({ err: error }, "handled fastify error");
    return reply.status(fastifyError.statusCode).send({
      success: false,
      error: { code: fastifyError.code ?? "BAD_REQUEST", message: error.message },
    });
  }

  request.log.error({ err: error }, "unhandled error");
  return reply.status(500).send({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
  });
}
