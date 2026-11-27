const jwt = require("jsonwebtoken");

// Platform admins may ONLY access these route prefixes.
// They must never read patient or clinical data.
const PLATFORM_ADMIN_ALLOWED_PREFIXES = [
  "/api/auth",
  "/api/onboarding",
  "/api/facilities/my",
];

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: "No token provided",
    });
  }

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Invalid token format",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
      facilityId: decoded.facilityId || null,
    };

    if (req.user.role === "platform_admin") {
      const url = String(req.originalUrl || req.url || "");

      const isAllowed = PLATFORM_ADMIN_ALLOWED_PREFIXES.some((prefix) =>
        url.startsWith(prefix)
      );

      if (!isAllowed) {
        return res.status(403).json({
          error:
            "Platform administrators cannot access facility clinical data.",
        });
      }
    }

    next();
  } catch (err) {
    return res.status(401).json({
      error: "Invalid or expired token",
    });
  }
};