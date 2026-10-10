const twilio = require("twilio");
const smsService = require("../utils/smsService");
const client = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Send SMS to admin
 */
exports.sendSMS = async (message, phone = process.env.ADMIN_PHONE) => {
  try {
    const res = await client.messages.create({
      body: `🚨 MedTrack Alert: ${message}`,
      from: process.env.TWILIO_PHONE,
      to: phone
    });

    console.log("SMS sent:", res.sid);
    return res;
  } catch (err) {
    console.error("SMS ERROR:", err.message);
  }
};