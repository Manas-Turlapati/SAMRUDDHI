const axios = require("axios");
const crypto = require("crypto");

/** Send a signed expert-review notification when a webhook is configured. */
const notifyExperts = async (payload) => {
  const webhookUrl = process.env.EXPERT_REVIEW_WEBHOOK_URL;
  const secret = process.env.EXPERT_REVIEW_WEBHOOK_SECRET;
  if (!webhookUrl || !secret) return { sent: false, reason: "not_configured" };

  const url = new URL(webhookUrl);
  if (url.protocol !== "https:") throw new Error("Expert review webhook must use HTTPS.");

  const body = JSON.stringify(payload);
  const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");
  await axios.post(webhookUrl, body, {
    headers: { "Content-Type": "application/json", "X-LDFRS-Signature": `sha256=${signature}` },
    timeout: 8000,
  });
  return { sent: true };
};

module.exports = { notifyExperts };
