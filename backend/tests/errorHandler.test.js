const { AppError, errorHandler } = require("../src/middleware/errorHandler");

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
  };
  return res;
}

const mockReq = { method: "GET", path: "/test" };
const noop = () => {};

describe("AppError", () => {
  it("creates an error with code and status", () => {
    const err = new AppError("Not found", "NOT_FOUND", 404);
    expect(err.message).toBe("Not found");
    expect(err.code).toBe("NOT_FOUND");
    expect(err.status).toBe(404);
    expect(err instanceof Error).toBe(true);
  });
});

describe("errorHandler", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    console.error.mockRestore();
  });

  it("handles AppError with correct status and body", () => {
    const err = new AppError("Bad input", "VALIDATION_ERROR", 400);
    const res = mockRes();
    errorHandler(err, mockReq, res, noop);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "Bad input", code: "VALIDATION_ERROR", status: 400 });
  });

  it("handles LIMIT_FILE_SIZE errors", () => {
    const err = new Error("File too large");
    err.code = "LIMIT_FILE_SIZE";
    const res = mockRes();
    errorHandler(err, mockReq, res, noop);
    expect(res.statusCode).toBe(413);
    expect(res.body.code).toBe("FILE_TOO_LARGE");
  });

  it("handles entity parse errors", () => {
    const err = new Error("bad json");
    err.type = "entity.parse.failed";
    const res = mockRes();
    errorHandler(err, mockReq, res, noop);
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe("INVALID_JSON");
  });

  it("hides internal details for 500 errors", () => {
    const err = new Error("db connection failed: password=secret");
    const res = mockRes();
    errorHandler(err, mockReq, res, noop);
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Internal server error.");
    expect(res.body.code).toBe("INTERNAL_ERROR");
    expect(res.body.error).not.toContain("secret");
  });
});
