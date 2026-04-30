/**
 * Backend API Tests — Election Assistant
 * Uses the built-in Node.js test runner (node:test) — no extra deps required.
 * Run with: npm test
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

// Set a dummy API key so the server doesn't crash on startup during tests
process.env.GEMINI_API_KEY = 'test-key-for-unit-tests';
process.env.PORT = '5001'; // Use a separate port to avoid conflicts

const app = require('./server');

let server;
let baseUrl;

before(() => {
  return new Promise((resolve) => {
    server = app.listen(5001, () => {
      baseUrl = 'http://localhost:5001';
      resolve();
    });
  });
});

after(() => {
  return new Promise((resolve) => {
    server.close(resolve);
  });
});

// ── Health Check ─────────────────────────────────────────────────────────────
describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
  });
});

// ── POST /api/chat — Input Validation ────────────────────────────────────────
describe('POST /api/chat — input validation', () => {
  it('returns 400 when message field is missing', async () => {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.error, 'Should return an error message');
  });

  it('returns 400 when message is an empty string', async () => {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '   ' }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.error, 'Should return an error message');
  });

  it('returns 400 when message exceeds 2000 characters', async () => {
    const longMessage = 'a'.repeat(2001);
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: longMessage }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /too long/i);
  });

  it('returns 400 when message is not a string', async () => {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 12345 }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.error, 'Should return an error message');
  });

  it('returns 400 when message is null', async () => {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: null }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.error, 'Should return an error message');
  });
});

// ── POST /api/chat — Request Body Size ────────────────────────────────────────
describe('POST /api/chat — request size limit', () => {
  it('returns 413 when body exceeds 10kb limit', async () => {
    const hugePayload = JSON.stringify({ message: 'x'.repeat(11000) });
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: hugePayload,
    });
    // Express returns 413 for body too large
    assert.ok(res.status === 413 || res.status === 400, `Expected 413 or 400, got ${res.status}`);
  });
});
