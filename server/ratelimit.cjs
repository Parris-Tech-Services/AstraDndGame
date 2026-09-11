'use strict';

/**
 * Rate limiting abstraction.
 * 
 * LIMITATION: Currently uses an in-memory Map. In a serverless environment (like Vercel),
 * this map is not shared across concurrent function instances and resets on cold starts.
 * For strict, distributed global rate limiting, an external store (e.g. Vercel KV, Redis)
 * is required. This central adapter makes that swap straight-forward when needed.
 */
const visitors = new Map();

function getClientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
}

/**
 * Check if the client has exceeded the rate limit.
 * @param {Object} req - The incoming request
 * @param {Object} options - Configuration for the rate limit
 * @param {string} options.bucket - The namespace for this limit (e.g., 'turn', 'tactical')
 * @param {number} [options.maxRequests=12] - Maximum requests allowed per window
 * @param {number} [options.windowMs=60000] - Window duration in milliseconds
 * @returns {boolean} True if limited, False if permitted
 */
exports.isRateLimited = function(req, { bucket, maxRequests = 12, windowMs = 60000 }) {
  const ip = getClientIp(req);
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  
  // Cleanup expired entries
  for (const [k, v] of visitors) {
    if (v.reset <= now) visitors.delete(k);
  }
  
  // Prevent unbounded memory growth
  if (visitors.size > 5000) visitors.clear();
  
  const v = visitors.get(key) || { count: 0, reset: now + windowMs };
  if (v.count >= maxRequests) {
    return true; // Rate limited
  }
  
  v.count++;
  visitors.set(key, v);
  return false;
};

// Exposed for testing purposes only
exports._resetForTests = function() {
  visitors.clear();
};
