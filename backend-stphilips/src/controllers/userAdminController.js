const User = require("../models/User");
const bcrypt = require("bcrypt");

const ALLOWED_ROLES = [
  "admin",
  "reception",
  "doctor",
  "lab",
  "billing",
  "pharmacist",
  "staff",
];

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// GET /api/admin/users
exports.listUsers = async (req, res) => {
  try {
    const users = await User.find()
      .sort({ createdAt: -1 })
      .select("-password");

    return res.json({
      total: users.length,
      users,
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
};

// POST /api/admin/users
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const cleanName = String(name || "").trim();
    const cleanEmail = normalizeEmail(email);
    const cleanRole = String(role || "").trim();

    if (!cleanName) {
      return res.status(400).json({
        error: "Name is required",
      });
    }

    if (!cleanEmail) {
      return res.status(400).json({
        error: "Email is required",
      });
    }

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({
        error: "Email is invalid",
      });
    }

    if (!password) {
      return res.status(400).json({
        error: "Password is required",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters",
      });
    }

    if (!cleanRole) {
      return res.status(400).json({
        error: "Role is required",
      });
    }

    if (!ALLOWED_ROLES.includes(cleanRole)) {
      return res.status(400).json({
        error: "Invalid role",
        allowedRoles: ALLOWED_ROLES,
      });
    }

    const existingUser = await User.findOne({
      email: cleanEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        error: "A user with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      role: cleanRole,
    });

    return res.status(201).json({
      message: "User created successfully",
      user: user.toJSON(),
    });
  } catch (err) {
    return res.status(400).json({
      error: err.message,
    });
  }
};

// PUT /api/admin/users/:id
exports.updateUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    const hasUpdates =
      name !== undefined ||
      email !== undefined ||
      password !== undefined ||
      role !== undefined;

    if (!hasUpdates) {
      return res.status(400).json({
        error: "Provide at least one field to update",
      });
    }

    if (role !== undefined) {
      const cleanRole = String(role || "").trim();

      if (!ALLOWED_ROLES.includes(cleanRole)) {
        return res.status(400).json({
          error: "Invalid role",
          allowedRoles: ALLOWED_ROLES,
        });
      }

      if (cleanRole !== user.role) {
        if (req.user.id === user._id.toString()) {
          return res.status(403).json({
            error: "You cannot change your own role",
          });
        }

        if (user.role === "admin" && cleanRole !== "admin") {
          const adminCount = await User.countDocuments({
            role: "admin",
          });

          if (adminCount <= 1) {
            return res.status(400).json({
              error: "Cannot remove the last administrator",
            });
          }
        }

        user.role = cleanRole;
      }
    }

    if (name !== undefined) {
      const cleanName = String(name || "").trim();

      if (!cleanName) {
        return res.status(400).json({
          error: "Name cannot be empty",
        });
      }

      user.name = cleanName;
    }

    if (email !== undefined) {
      const cleanEmail = normalizeEmail(email);

      if (!cleanEmail) {
        return res.status(400).json({
          error: "Email cannot be empty",
        });
      }

      if (!isValidEmail(cleanEmail)) {
        return res.status(400).json({
          error: "Email is invalid",
        });
      }

      const emailExists = await User.exists({
        email: cleanEmail,
        _id: { $ne: user._id },
      });

      if (emailExists) {
        return res.status(409).json({
          error: "A user with this email already exists",
        });
      }

      user.email = cleanEmail;
    }

    if (password !== undefined) {
      if (!password || String(password).length < 6) {
        return res.status(400).json({
          error: "Password must be at least 6 characters",
        });
      }

      user.password = await bcrypt.hash(String(password), 10);
    }

    await user.save();

    return res.json({
      message: "User updated successfully",
      user: user.toJSON(),
    });
  } catch (err) {
    return res.status(400).json({
      error: err.message,
    });
  }
};