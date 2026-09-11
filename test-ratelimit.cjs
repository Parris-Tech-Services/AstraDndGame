'use strict';
const assert = require('node:assert/strict');
const { isRateLimited, _resetForTests } = require('./server/ratelimit.cjs');

function makeReq(ip) {
  return { headers: { 'x-forwarded-for': ip }, socket: { remoteAddress: ip } };
}

(async () => {
  _resetForTests();
  
  const reqA = makeReq('10.0.0.1');
  const reqB = makeReq('10.0.0.2');

  // Test 1: independent buckets
  for (let i = 0; i < 12; i++) {
    assert.equal(isRateLimited(reqA, { bucket: 'turn', maxRequests: 12, windowMs: 60000 }), false, `Turn req ${i} should pass`);
  }
  // 13th request should be limited
  assert.equal(isRateLimited(reqA, { bucket: 'turn', maxRequests: 12, windowMs: 60000 }), true, '13th turn req should be limited');

  // Test 2: Tactical bucket should still be fresh for reqA
  assert.equal(isRateLimited(reqA, { bucket: 'tactical', maxRequests: 60, windowMs: 60000 }), false, 'Tactical bucket should be independent');
  
  // Test 3: Turn requests do not consume tactical bucket
  for (let i = 0; i < 58; i++) {
    assert.equal(isRateLimited(reqA, { bucket: 'tactical', maxRequests: 60, windowMs: 60000 }), false, `Tactical req ${i} should pass`);
  }
  assert.equal(isRateLimited(reqA, { bucket: 'tactical', maxRequests: 60, windowMs: 60000 }), false, `Tactical req 59 should pass`);
  assert.equal(isRateLimited(reqA, { bucket: 'tactical', maxRequests: 60, windowMs: 60000 }), true, `Tactical req 60 should be limited`);

  // Test 4: Two different IPs receive independent limits
  assert.equal(isRateLimited(reqB, { bucket: 'turn', maxRequests: 12, windowMs: 60000 }), false, 'Different IP should have fresh limit');

  // Test 5: Expired windows reset correctly
  const originalDateNow = Date.now;
  try {
    Date.now = () => originalDateNow() + 60001; // Advance time by 60.001 seconds
    assert.equal(isRateLimited(reqA, { bucket: 'turn', maxRequests: 12, windowMs: 60000 }), false, 'Expired window should reset count');
    assert.equal(isRateLimited(reqA, { bucket: 'tactical', maxRequests: 60, windowMs: 60000 }), false, 'Expired window should reset count');
  } finally {
    Date.now = originalDateNow;
  }

  // Test 6: Memory cleanup prevents unbounded growth
  _resetForTests();
  for (let i = 0; i < 5005; i++) {
    isRateLimited(makeReq(`192.168.0.${i}`), { bucket: 'turn', maxRequests: 1, windowMs: 60000 });
  }
  // Since we clear after 5000, adding 5005 should clear at 5000, leaving ~5 entries
  // Check the size implicitly: if we query 192.168.0.1 it should be cleared (thus allowed again)
  assert.equal(isRateLimited(makeReq('192.168.0.1'), { bucket: 'turn', maxRequests: 1, windowMs: 60000 }), false, 'Memory cleanup should have wiped early entries');

  console.log('Rate limiter tests passed.');
})().catch(error => { console.error(error); process.exit(1); });
