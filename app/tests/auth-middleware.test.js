const { signToken, requireAuth } = require("../src/middleware/auth");

function mockReqResNext(headers = {}) {
  const req = { headers };
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
  };
  const next = jest.fn();
  return { req, res, next };
}

describe("signToken", () => {
  it("returns a JWT string", () => {
    const token = signToken({ id: 1, username: "test" });
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });
});

describe("requireAuth", () => {
  it("rejects missing Authorization header", () => {
    const { req, res, next } = mockReqResNext();
    requireAuth(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe("AUTH_REQUIRED");
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects malformed header", () => {
    const { req, res, next } = mockReqResNext({ authorization: "Basic abc" });
    requireAuth(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe("AUTH_REQUIRED");
  });

  it("rejects invalid token", () => {
    const { req, res, next } = mockReqResNext({ authorization: "Bearer invalid.token.here" });
    requireAuth(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe("TOKEN_INVALID");
  });

  it("accepts valid token and sets req.user", () => {
    const token = signToken({ id: 42, username: "tester" });
    const { req, res, next } = mockReqResNext({ authorization: `Bearer ${token}` });
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe(42);
    expect(req.user.username).toBe("tester");
  });
});
