import {
  createError,
  createRequestLogger,
  initLogger,
  type RequestLogger,
} from "evlog";

let loggerInitialized = false;

const ensureLoggerInitialized = () => {
  if (loggerInitialized) {
    return;
  }

  initLogger({
    env: {
      service: "nanoconnect-node-functions",
      environment: process.env.NODE_ENV ?? "development",
    },
  });
  loggerInitialized = true;
};

export const createNodeFunctionLogger = (request: Request): RequestLogger => {
  ensureLoggerInitialized();
  const url = new URL(request.url);

  return createRequestLogger({
    method: request.method,
    path: url.pathname,
    requestId: request.headers.get("x-request-id") ?? undefined,
  });
};

export const emitAndReturn = <TResponse extends Response>(
  log: RequestLogger,
  response: TResponse
): TResponse => {
  log.emit({ status: response.status });
  return response;
};

export const createInternalServerError = (
  error: unknown,
  message: string,
  fix: string
) =>
  createError({
    message,
    status: 500,
    why: error instanceof Error ? error.message : "Unknown internal error.",
    fix,
    cause: error instanceof Error ? error : undefined,
  });
