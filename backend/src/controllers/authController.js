const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Attendance = require("../models/Attendance");


exports.register = async (req, res) => {
  try {
    const hash = await bcrypt.hash(req.body.password, 10);

    const user = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: hash
    });

    res.json(user);
  } catch (err) {
    res.status(500).json(err.message);
  }
};

exports.login = async (req, res) => {
  try {

    // find user
    const user = await User.findOne({
      email: req.body.email
    });

    // user not found
    if (!user)
      return res.status(404).json("User not found");

    // ===============================
    // ✅ PASSWORD VERIFICATION
    // ===============================
    const match = await bcrypt.compare(
      req.body.password,
      user.password
    );

    // wrong password
    if (!match)
      return res.status(400).json("Wrong password");

    // ===============================
    // ✅ AUTO ATTENDANCE
    // ===============================

    // today start
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    // check attendance
    const alreadyMarked =
      await Attendance.findOne({
        staff: user._id,

        date: {
          $gte: today,
        },
      });

    // create if absent
    if (!alreadyMarked) {
      await Attendance.create({
        staff: user._id,

        status: "present",
      });
    }

    // ===============================
    // ✅ CREATE TOKEN
    // ===============================
    const token = jwt.sign(
      { id: user._id },

      process.env.JWT_SECRET
    );

    // success response
    res.json({
      token,
      user,
    });

  } catch (err) {

    console.log(err);

    res.status(500).json(err.message);
  }
};