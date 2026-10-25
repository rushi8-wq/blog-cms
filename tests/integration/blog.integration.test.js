import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { mongoose } from '../../database/runtime.js';
import { isolatedTarget, dropIsolated } from '../helpers.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const entry = process.env.API_TEST_ENTRY && resolve(root, process.env.API_TEST_ENTRY);
const skip = !process.env.TEST_MONGODB_URI ? 'Set TEST_MONGODB_URI for real API integration.'
  : !entry || !existsSync(entry) ? 'Backend unavailable: set API_TEST_ENTRY to Member 2\'s server entry file.' : false;

function blogContract(blog) {
  assert.match(blog._id, /^[a-f\d]{24}$/i);
  for (const key of ['title', 'content', 'author']) assert.equal(typeof blog[key], 'string');
  for (const key of ['tags', 'likes', 'comments']) assert.ok(Array.isArray(blog[key]));
  assert.equal(blog.likesCount, blog.likes.length);
  assert.equal(new Set(blog.likes).size, blog.likes.length);
  for (const key of ['createdAt', 'updatedAt']) assert.ok(Number.isFinite(Date.parse(blog[key])));
}

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

test('actual backend HTTP contract with an isolated MongoDB database', { skip, timeout: 60000 }, async t => {
  const target = isolatedTarget(process.env.TEST_MONGODB_URI);
  const connection = await mongoose.createConnection(target.uri, { serverSelectionTimeoutMS: 5000 }).asPromise();
  let child;
  t.after(async () => {
    try {
      if (child?.pid && child.exitCode === null && child.signalCode === null) {
        const exited = new Promise(resolve => child.once('exit', resolve));
        child.kill('SIGTERM');
        const stopped = await Promise.race([exited.then(() => true), delay(3000).then(() => false)]);
        if (!stopped) { child.kill('SIGKILL'); await exited; }
      }
      await dropIsolated(connection, target.name);
    } finally { await connection.close(); }
  });
  const port = await freePort();
  child = spawn(process.execPath, [entry], {
    cwd: resolve(root, 'server'),
    env: { ...process.env, NODE_ENV: 'test', PORT: String(port), MONGODB_URI: target.uri,
      MONGODB_DB_NAME: target.name, DOTENV_CONFIG_PATH: resolve(root, 'tests/absent-test-env') },
    // Backend logs may contain a URI. Never echo them from the test runner.
    stdio: 'ignore',
  });
  let spawnError;
  child.once('error', error => { spawnError = error; });
  const base = `http://127.0.0.1:${port}/api`;
  const healthPath = process.env.API_TEST_HEALTH_PATH || '/api/health';
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (spawnError || child.exitCode !== null) throw new Error('Backend failed to start. Run the backend separately against an isolated database to diagnose startup.');
    try {
      const response = await fetch(`http://127.0.0.1:${port}${healthPath}`, { signal: AbortSignal.timeout(300) });
      if (response.ok) { ready = true; break; }
    } catch { /* startup can take a moment */ }
    await delay(100);
  }
  assert.ok(ready, 'Health endpoint did not become ready. Confirm API_TEST_HEALTH_PATH with Member 2.');

  async function request(method, path, body, status = 200, code) {
    const response = await fetch(`${base}${path}`, {
      method, signal: AbortSignal.timeout(5000),
      ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    });
    assert.match(response.headers.get('content-type') || '', /application\/json/);
    const payload = await response.json();
    // Include exact endpoint and observed JSON in assertion failures for Member 2.
    const context = `${method} ${path}; body=${JSON.stringify(body)}; observed=${JSON.stringify(payload)}`;
    assert.equal(response.status, status, context);
    assert.equal(payload.success, !code, context);
    if (code) {
      assert.equal(payload.error?.code, code, context);
      assert.equal(typeof payload.error.message, 'string', context);
      assert.ok(Array.isArray(payload.error.details), context);
    } else assert.ok(Object.hasOwn(payload, 'data'), context);
    return payload.data;
  }
  await t.test('health returns the shared JSON envelope', async () => {
    const response = await fetch(`http://127.0.0.1:${port}${healthPath}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /application\/json/);
    const payload = await response.json();
    assert.equal(payload.success, true);
    assert.ok(Object.hasOwn(payload, 'data'));
  });

  const input = { title: 'Integration test blog', content: 'A full blog post used by the independent integration tests.', author: 'Test Author', tags: ['testing'] };
  let first;
  let second;
  await t.test('create persists complete blog representation', async () => {
    first = await request('POST', '/blogs', input, 201);
    blogContract(first);
    const saved = await connection.collection('blogs').findOne({ _id: new mongoose.Types.ObjectId(first._id) });
    assert.ok(saved, 'Created blog must persist in the generated test database.');
    assert.equal(saved.title, input.title);
    assert.equal(Object.hasOwn(saved, 'likesCount'), false);
  });
  assert.ok(first?._id, 'Creation failed; dependent API tests cannot proceed.');

  await t.test('list is newest first and retrieval returns persisted fields', async () => {
    await delay(20);
    second = await request('POST', '/blogs', { ...input, title: 'A newer test blog' }, 201);
    const list = await request('GET', '/blogs');
    assert.ok(Array.isArray(list));
    list.forEach(blogContract);
    assert.equal(list.length, 2);
    assert.equal(list[0]._id, second._id);
    for (let i = 1; i < list.length; i++) assert.ok(Date.parse(list[i - 1].createdAt) >= Date.parse(list[i].createdAt));
    const retrieved = await request('GET', `/blogs/${first._id}`);
    blogContract(retrieved);
    assert.equal(retrieved.content, input.content);
  });
  await t.test('update persists allowed fields', async () => {
    const updated = await request('PUT', `/blogs/${first._id}`, { ...input, title: 'Updated integration blog' });
    blogContract(updated);
    assert.equal(updated.title, 'Updated integration blog');
    assert.equal((await request('GET', `/blogs/${first._id}`)).title, updated.title);
    assert.equal((await connection.collection('blogs').findOne({ _id: new mongoose.Types.ObjectId(first._id) })).title, updated.title);
  });
  await t.test('invalid IDs and missing resources use documented errors on all routes', async () => {
    for (const [id, code, status] of [['invalid-id', 'INVALID_ID', 400], ['ffffffffffffffffffffffff', 'NOT_FOUND', 404]]) {
      for (const [method, suffix, body] of [['GET', '', undefined], ['PUT', '', input], ['DELETE', '', undefined],
        ['POST', '/like', { userId: 'visitor' }], ['POST', '/comments', { name: 'Jo', text: 'Hi' }]]) {
        await request(method, `/blogs/${id}${suffix}`, body, status, code);
      }
    }
  });
  await t.test('like toggles and repeated requests never duplicate a visitor', async () => {
    for (const [index, userId] of ['visitor-a', 'visitor-a', 'visitor-a', 'visitor-b'].entries()) {
      const result = await request('POST', `/blogs/${first._id}/like`, { userId });
      assert.deepEqual(result, { blogId: first._id, likesCount: [1, 0, 1, 2][index], liked: index !== 1 });
      const blog = await request('GET', `/blogs/${first._id}`);
      blogContract(blog);
      const saved = await connection.collection('blogs').findOne({ _id: new mongoose.Types.ObjectId(first._id) });
      assert.equal(new Set(saved.likes).size, saved.likes.length);
      assert.equal(saved.likes.length, result.likesCount);
    }
  });
  await t.test('comment persists and returns generated fields', async () => {
    const comment = await request('POST', `/blogs/${first._id}/comments`, { name: ' Jo ', text: ' Useful post! ' }, 201);
    assert.match(comment._id, /^[a-f\d]{24}$/i);
    assert.equal(comment.name, 'Jo');
    assert.equal(comment.text, 'Useful post!');
    assert.ok(Number.isFinite(Date.parse(comment.createdAt)));
    const blog = await request('GET', `/blogs/${first._id}`);
    assert.equal(blog.comments[0]._id, comment._id);
    const saved = await connection.collection('blogs').findOne({ _id: new mongoose.Types.ObjectId(first._id) });
    assert.equal(String(saved.comments[0]._id), comment._id);
  });
  await t.test('invalid comments, blogs and visitor IDs are rejected', async () => {
    for (const comment of [{}, { name: 'x', text: 'Hi' }, { name: 'Jo', text: ' ' }, { name: 'Jo', text: 'x'.repeat(1001) }]) {
      await request('POST', `/blogs/${first._id}/comments`, comment, 400, 'VALIDATION_ERROR');
    }
    assert.equal((await request('GET', `/blogs/${first._id}`)).comments.length, 1);
    for (const body of [{}, { ...input, title: 'x' }, { ...input, tags: Array(11).fill('tag') }]) {
      await request('POST', '/blogs', body, 400, 'VALIDATION_ERROR');
    }
    await request('PUT', `/blogs/${first._id}`, { ...input, content: 'short' }, 400, 'VALIDATION_ERROR');
    await request('POST', `/blogs/${first._id}/like`, { userId: '' }, 400, 'VALIDATION_ERROR');
  });
  await t.test('delete returns the deleted blog and removes persistence', async () => {
    const deleted = await request('DELETE', `/blogs/${first._id}`);
    blogContract(deleted);
    assert.equal(deleted._id, first._id);
    assert.equal(await connection.collection('blogs').findOne({ _id: new mongoose.Types.ObjectId(first._id) }), null);
    await request('GET', `/blogs/${first._id}`, undefined, 404, 'NOT_FOUND');
  });
});
