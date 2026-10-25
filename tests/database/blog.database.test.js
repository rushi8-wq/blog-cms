import test from 'node:test';
import assert from 'node:assert/strict';
import { connectDB } from '../../database/connection.js';
import Blog from '../../database/models/Blog.js';
import { mongoose } from '../../database/runtime.js';
import { seed } from '../../database/seed.js';
import { isolatedTarget, dropIsolated } from '../helpers.js';

test('real MongoDB connection, persistence, timestamps, validation and safe seeding', {
  skip: !process.env.TEST_MONGODB_URI && 'Set TEST_MONGODB_URI to run real MongoDB tests.',
}, async t => {
  const target = isolatedTarget(process.env.TEST_MONGODB_URI);
  const previous = { ...process.env };
  t.after(async () => {
    try {
      if (mongoose.connection.readyState === 1) await dropIsolated(mongoose.connection, target.name);
    } finally {
      await mongoose.disconnect();
      for (const key of ['MONGODB_URI', 'MONGODB_DB_NAME', 'MONGODB_SERVER_SELECTION_TIMEOUT_MS', 'DOTENV_CONFIG_PATH']) {
        if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
      }
    }
  });
  process.env.DOTENV_CONFIG_PATH = new URL('../absent-test-env', import.meta.url).pathname;
  delete process.env.MONGODB_URI;
  await assert.rejects(connectDB(), /MONGODB_URI is required/);
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/unreachable';
  process.env.MONGODB_DB_NAME = target.name;
  process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS = '100';
  await assert.rejects(connectDB(), error => error.code === 'DB_CONNECTION_FAILED' && !error.message.includes('127.0.0.1'));
  process.env.MONGODB_URI = target.uri;
  process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS = '5000';
  const connections = await Promise.all([connectDB(), connectDB(), connectDB()]);
  assert.equal(connections[0], connections[1]);
  assert.equal(connections[0].name, target.name);
  assert.equal(await connectDB(), connections[0]);
  process.env.MONGODB_DB_NAME = 'must_not_connect_here';
  await assert.rejects(connectDB(), /different settings/);
  process.env.MONGODB_DB_NAME = target.name;

  const blog = await Blog.create({ title: 'A saved blog', content: 'Content saved to real MongoDB.', author: 'Maya', likes: ['visitor-a'], comments: [{ name: 'Jo', text: 'Helpful!' }] });
  const stored = await Blog.findById(blog._id).lean();
  assert.ok(stored.createdAt instanceof Date);
  assert.ok(stored.updatedAt instanceof Date);
  assert.deepEqual(stored.likes, ['visitor-a']);
  assert.ok(stored.comments[0]._id);
  assert.ok(stored.comments[0].createdAt instanceof Date);
  assert.equal(Object.hasOwn(stored, 'likesCount'), false);
  blog.likes.push('visitor-a');
  await assert.rejects(blog.save(), { name: 'ValidationError' });
  await assert.rejects(Blog.create({ title: 'x' }), { name: 'ValidationError' });
  await assert.rejects(Blog.updateOne({ _id: blog._id }, { title: 'x' }, { runValidators: true }), { name: 'ValidationError' });
  const updated = await Blog.findByIdAndUpdate(blog._id, { title: 'An updated title' }, { returnDocument: 'after', runValidators: true });
  assert.ok(updated.updatedAt >= stored.updatedAt);
  assert.equal(updated.createdAt.getTime(), stored.createdAt.getTime());
  assert.equal(updated.title, 'An updated title');
  const json = JSON.parse(JSON.stringify(updated));
  assert.equal(typeof json._id, 'string');
  assert.equal(typeof json.createdAt, 'string');

  assert.equal(await seed(), 5);
  const seededId = '6bc000000000000000000001';
  await Blog.updateOne({ _id: seededId }, { title: 'Keep this demonstration edit' });
  const before = await Blog.findById(seededId).lean();
  assert.equal(await seed(), 0);
  const after = await Blog.findById(seededId).lean();
  assert.equal(after.title, before.title);
  assert.equal(after.updatedAt.getTime(), before.updatedAt.getTime());
  assert.equal(await Blog.countDocuments(), 6);
});
