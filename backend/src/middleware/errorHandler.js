class AppError extends Error {
  constructor(message, code, status = 500) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function errorHandler(err, req, res, _next) {
  console.error(`[${req.method} ${req.path}]`, err.message || err);

  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: err.message,
      code: err.code,
      status: err.status,
    });
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      error: "File too large. Maximum size is 50MB.",
      code: "FILE_TOO_LARGE",
      status: 413,
    });
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      error: "Invalid JSON in request body.",
      code: "INVALID_JSON",
      status: 400,
    });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: status >= 500 ? "Internal server error." : err.message,
    code: status >= 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR",
    status,
  });
}

module.exports = { AppError, errorHandler };
