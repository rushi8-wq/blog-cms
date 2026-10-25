import test from 'node:test';
import assert from 'node:assert/strict';
import { isolatedTarget, dropIsolated } from '../helpers.js';

test('test target replaces the database while preserving authentication options', () => {
  for (const uri of ['mongodb://127.0.0.1:27017', 'mongodb://127.0.0.1:27017/developer_db',
    'mongodb://host/?authSource=admin', 'mongodb://host?authSource=admin',
    'mongodb+srv://example.invalid/developer_db?retryWrites=true',
    'mongodb://host-a:27017,host-b:27017/developer_db?replicaSet=rs0']) {
    const target = isolatedTarget(uri);
    assert.match(target.name, /^blog_cms_test_[a-f0-9]{32}$/);
    assert.ok(target.uri.includes(`/${target.name}`));
    assert.equal(target.uri.includes('developer_db'), false);
    assert.equal(target.uri.split('?')[1], uri.split('?')[1]);
    assert.notEqual(isolatedTarget(uri).name, target.name);
  }
  assert.throws(() => isolatedTarget('https://example.invalid'), /explicit MongoDB URI/);
});

test('cleanup refuses regular or mismatched database names before issuing any drop', async () => {
  let dropped = false;
  const connection = { name: 'developer_db', dropDatabase: async () => { dropped = true; } };
  await assert.rejects(dropIsolated(connection, 'developer_db'), /Refusing/);
  await assert.rejects(dropIsolated(connection, `blog_cms_test_${'a'.repeat(32)}`), /Refusing/);
  assert.equal(dropped, false);
});
