const { apiLimiter, authLimiter } = require("../src/middleware/rateLimiter");

describe("Rate limiter configuration", () => {
  it("apiLimiter is a function (middleware)", () => {
    expect(typeof apiLimiter).toBe("function");
  });

  it("authLimiter is a function (middleware)", () => {
    expect(typeof authLimiter).toBe("function");
  });
});
