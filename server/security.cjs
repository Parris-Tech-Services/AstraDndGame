'use strict';

exports.checkOrigin = function(req) {
  if (req.method !== 'POST') return true;
  const origin = req.headers.origin;
  
  // Non-browser / server requests (like curl or our test suite) may lack an Origin.
  // Cross-origin browser requests will always send an Origin (or "null").
  // So we allow absent Origin if intentionally supported.
  if (!origin) return true; 
  
  try {
    const originHost = new URL(origin).host;
    return originHost === req.headers.host;
  } catch {
    return false;
  }
};
