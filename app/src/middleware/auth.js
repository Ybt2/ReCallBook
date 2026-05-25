const jwt = require("jsonwebtoken");

if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is not set. Aborting.");
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  let token = null;

  if (header && header.startsWith("Bearer ")) {
    token = header.slice(7);
  }

  if (!token) {
    return res.status(401).json({ error: "Authentication required.", code: "AUTH_REQUIRED", status: 401 });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired.", code: "TOKEN_EXPIRED", status: 401 });
    }
    return res.status(401).json({ error: "Invalid token.", code: "TOKEN_INVALID", status: 401 });
  }
}

module.exports = { signToken, requireAuth, JWT_SECRET };
