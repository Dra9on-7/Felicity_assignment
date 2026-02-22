/**
 * Simple Math CAPTCHA utility
 * Generates a math challenge and validates answers
 * Stores challenges in memory with TTL
 */

const crypto = require('crypto');

// In-memory store for CAPTCHA challenges (with TTL)
const captchaStore = new Map();

// Clean expired captchas every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of captchaStore.entries()) {
    if (now > val.expiresAt) {
      captchaStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Generate a new CAPTCHA challenge
 * Returns { captchaId, question } to send to client
 */
function generateCaptcha() {
  const ops = ['+', '-', '×'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a, b, answer;

  switch (op) {
    case '+':
      a = Math.floor(Math.random() * 50) + 1;
      b = Math.floor(Math.random() * 50) + 1;
      answer = a + b;
      break;
    case '-':
      a = Math.floor(Math.random() * 50) + 10;
      b = Math.floor(Math.random() * a);
      answer = a - b;
      break;
    case '×':
      a = Math.floor(Math.random() * 12) + 1;
      b = Math.floor(Math.random() * 12) + 1;
      answer = a * b;
      break;
  }

  const captchaId = crypto.randomBytes(16).toString('hex');
  const question = `What is ${a} ${op} ${b}?`;

  captchaStore.set(captchaId, {
    answer,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minute TTL
  });

  return { captchaId, question };
}

/**
 * Verify a CAPTCHA answer
 * Returns true if correct, false otherwise
 * Each captcha can only be used once
 */
function verifyCaptcha(captchaId, userAnswer) {
  if (!captchaId || userAnswer === undefined || userAnswer === null) {
    return false;
  }

  const challenge = captchaStore.get(captchaId);
  if (!challenge) {
    return false; // Expired or doesn't exist
  }

  // Delete after use (one-time use)
  captchaStore.delete(captchaId);

  if (Date.now() > challenge.expiresAt) {
    return false; // Expired
  }

  return parseInt(userAnswer) === challenge.answer;
}

module.exports = { generateCaptcha, verifyCaptcha };
