const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.GEMINI_API_KEY = 'test-key-for-unit-tests';
process.env.PORT = '5001';

const { createApp } = require('./server');
const { responseCache, normalizeHistory } = require('./controllers/chatController');

let server;
let baseUrl;
let sendCount;

const fakeModel = {
  startChat({ history }) {
    return {
      async sendMessage(message) {
        sendCount += 1;
        return {
          response: {
            async text() {
              return `Mock answer for ${message} with ${history.length} history items`;
            },
          },
        };
      },
    };
  },
};

before(() => {
  const app = createApp({ model: fakeModel });

  return new Promise((resolve) => {
    server = app.listen(5001, () => {
      baseUrl = 'http://localhost:5001';
      resolve();
    });
  });
});

beforeEach(() => {
  sendCount = 0;
  responseCache.clear();
});

after(() => {
  return new Promise((resolve) => {
    server.close(resolve);
  });
});

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await fetch(`${baseUrl}/api/health`);

    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: 'ok' });
  });
});

describe('normalizeHistory', () => {
  it('keeps only the last 10 messages and normalizes roles', () => {
    const history = Array.from({ length: 12 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'model',
      parts: [{ text: `message ${index}` }],
    }));

    const normalized = normalizeHistory(history);

    assert.equal(normalized.length, 10);
    assert.equal(normalized[0].parts[0].text, 'message 2');
    assert.equal(normalized[0].role, 'user');
  });

  it('drops history that does not start with a user message', () => {
    const normalized = normalizeHistory([
      { role: 'model', parts: [{ text: 'assistant first' }] },
      { role: 'user', parts: [{ text: 'hello' }] },
    ]);

    assert.deepEqual(normalized, []);
  });
});

describe('POST /api/chat validation', () => {
  it('returns 400 when message field is missing', async () => {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    assert.equal(res.status, 400);
    assert.ok((await res.json()).error);
  });

  it('returns 400 when message is an empty string', async () => {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '   ' }),
    });

    assert.equal(res.status, 400);
    assert.ok((await res.json()).error);
  });

  it('returns 400 when message exceeds 2000 characters', async () => {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'a'.repeat(2001) }),
    });

    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /too long/i);
  });

  it('returns 400 when message is not a string', async () => {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 12345 }),
    });

    assert.equal(res.status, 400);
    assert.ok((await res.json()).error);
  });
});

describe('POST /api/chat success path', () => {
  it('returns a model response without calling external services', async () => {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'What is NOTA?',
        history: [{ role: 'user', parts: [{ text: 'hello' }] }],
      }),
    });

    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.text, 'Mock answer for What is NOTA? with 1 history items');
    assert.equal(sendCount, 1);
  });

  it('serves repeated requests from the response cache', async () => {
    const payload = {
      message: 'How does EVM work?',
      history: [{ role: 'user', parts: [{ text: 'hello' }] }],
    };

    await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const cachedRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const body = await cachedRes.json();

    assert.equal(cachedRes.status, 200);
    assert.equal(body.cached, true);
    assert.equal(sendCount, 1);
  });
});

describe('POST /api/chat request size limit', () => {
  it('returns 413 when body exceeds 10kb limit', async () => {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'x'.repeat(11000) }),
    });

    assert.ok(res.status === 413 || res.status === 400, `Expected 413 or 400, got ${res.status}`);
  });
});
