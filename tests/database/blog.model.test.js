import test from 'node:test';
import assert from 'node:assert/strict';
import Blog from '../../database/models/Blog.js';
import { mongoose } from '../../database/runtime.js';

const valid = () => ({ title: 'A useful title', content: 'A useful blog post with enough content.', author: 'Maya Rao' });

test('model import does not connect; defaults and storage serialization match the schema', () => {
  assert.equal(mongoose.connection.readyState, 0);
  const blog = new Blog({ ...valid(), title: '  A useful title  ', tags: [' web '] });
  assert.equal(blog.validateSync(), undefined);
  const data = blog.toObject();
  assert.equal(data.title, 'A useful title');
  assert.deepEqual(data.tags, ['web']);
  assert.deepEqual(data.likes, []);
  assert.deepEqual(data.comments, []);
  assert.ok(data._id);
  assert.equal(Object.hasOwn(data, 'likesCount'), false);
  assert.equal(Blog.schema.options.timestamps, true);
});

for (const field of ['title', 'content', 'author']) {
  for (const value of [undefined, '', '   ']) {
    test(`${field} rejects missing or blank value ${JSON.stringify(value)}`, () => {
      const error = new Blog({ ...valid(), [field]: value }).validateSync();
      assert.ok(error?.errors[field]);
    });
  }
}
for (const [field, min, max] of [['title', 3, 150], ['content', 10, undefined], ['author', 2, 80]]) {
  test(`${field} validates minimum and maximum lengths after trimming`, () => {
    assert.ok(new Blog({ ...valid(), [field]: 'x'.repeat(min - 1) }).validateSync()?.errors[field]);
    assert.equal(new Blog({ ...valid(), [field]: ` ${'x'.repeat(min)} ` }).validateSync(), undefined);
    if (max) {
      assert.equal(new Blog({ ...valid(), [field]: 'x'.repeat(max) }).validateSync(), undefined);
      assert.ok(new Blog({ ...valid(), [field]: 'x'.repeat(max + 1) }).validateSync()?.errors[field]);
    }
  });
}

test('tags accept ten entries and reject eleven or null', () => {
  assert.equal(new Blog({ ...valid(), tags: Array(10).fill('tag') }).validateSync(), undefined);
  assert.ok(new Blog({ ...valid(), tags: Array(11).fill('tag') }).validateSync()?.errors.tags);
  assert.ok(new Blog({ ...valid(), tags: null }).validateSync()?.errors.tags);
});

test('likes reject duplicates, blank IDs and invalid cast values', () => {
  assert.equal(new Blog({ ...valid(), likes: ['visitor-a', 'visitor-b'] }).validateSync(), undefined);
  for (const likes of [['visitor-a', 'visitor-a'], [' '], [null], [{}], null]) {
    assert.ok(new Blog({ ...valid(), likes }).validateSync());
  }
  const blog = new Blog(valid());
  blog.likes.push('a', 'a');
  assert.ok(blog.validateSync()?.errors.likes);
});

test('comments have generated IDs, trimmed fields and default dates', () => {
  const blog = new Blog({ ...valid(), comments: [{ name: ' Jo ', text: ' hello ' }] });
  assert.equal(blog.validateSync(), undefined);
  const comment = blog.toJSON().comments[0];
  assert.ok(comment._id);
  assert.equal(comment.name, 'Jo');
  assert.equal(comment.text, 'hello');
  assert.ok(comment.createdAt instanceof Date);
  assert.equal(typeof JSON.parse(JSON.stringify(blog)).comments[0].createdAt, 'string');
});

for (const comment of [{ text: 'Hi' }, { name: 'Jo' }, { name: 'x', text: 'Hi' },
  { name: 'x'.repeat(51), text: 'Hi' }, { name: 'Jo', text: ' ' }, { name: 'Jo', text: 'x'.repeat(1001) }]) {
  test(`invalid comment rejected: ${JSON.stringify(comment).slice(0, 70)}`, () => {
    assert.ok(new Blog({ ...valid(), comments: [comment] }).validateSync());
  });
}

test('comment length boundaries are inclusive; invalid dates and objects fail validation', () => {
  for (const [name, text] of [['Jo', 'x'], ['x'.repeat(50), 'x'.repeat(1000)]]) {
    assert.equal(new Blog({ ...valid(), comments: [{ name, text }] }).validateSync(), undefined);
  }
  for (const change of [{ title: {} }, { createdAt: 'not-a-date' }, { comments: [{ name: 'Jo', text: {} }] }]) {
    assert.ok(new Blog({ ...valid(), ...change }).validateSync());
  }
});
