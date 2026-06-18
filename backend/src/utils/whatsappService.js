const axios = require("axios");
const whatsappService = require("../utils/whatsappService");
/**
 * Send WhatsApp message via Meta Cloud API
 */
exports.sendWhatsApp = async (message) => {
  try {
    const url = `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`;

    const res = await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        to: process.env.ADMIN_PHONE,
        type: "text",
        text: {
          body: `🚨 MedTrack Alert:\n\n${message}`
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("WhatsApp sent:", res.data);
    return res.data;
  } catch (err) {
    console.error("WhatsApp error:", err.response?.data || err.message);
  }
};