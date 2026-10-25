import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { createApp } from "../src/app.js";

function clone(value) {
  return structuredClone(value);
}

function createTestBlogModel() {
  const blogs = new Map();
  let nextId = 1;
  let failNextFind = false;

  function nextObjectId() {
    return String(nextId++).padStart(24, "0");
  }

  function get(id) {
    const blog = blogs.get(String(id));
    return blog ? clone(blog) : null;
  }

  class TestBlog {}

  TestBlog.create = async (input) => {
    const now = new Date(Date.now() + nextId);
    const blog = {
      ...clone(input),
      _id: nextObjectId(),
      likes: [],
      comments: [],
      createdAt: now,
      updatedAt: now,
    };
    blogs.set(blog._id, blog);
    return clone(blog);
  };

  TestBlog.find = () => ({
    sort: async ({ createdAt }) => {
      if (failNextFind) {
        failNextFind = false;
        throw new Error("private database failure detail");
      }
      return [...blogs.values()]
        .map(clone)
        .sort((left, right) => (createdAt < 0 ? right.createdAt - left.createdAt : left.createdAt - right.createdAt));
    },
  });

  TestBlog.findById = async (id) => get(id);

  TestBlog.findByIdAndUpdate = async (id, changes) => {
    const blog = blogs.get(String(id));
    if (!blog) return null;
    Object.assign(blog, clone(changes), { updatedAt: new Date() });
    return clone(blog);
  };

  TestBlog.findByIdAndDelete = async (id) => {
    const blog = blogs.get(String(id));
    if (!blog) return null;
    blogs.delete(String(id));
    return clone(blog);
  };

  TestBlog.findOneAndUpdate = async (filter, update) => {
    const blog = blogs.get(String(filter._id));
    if (!blog) return null;
    if (update.$push?.comments) {
      blog.comments.push({
        ...clone(update.$push.comments),
        _id: `comment-${nextObjectId()}`,
        createdAt: new Date(),
      });
      blog.updatedAt = new Date();
      return clone(blog);
    }
    return null;
  };

  TestBlog.collection = {
    findOneAndUpdate: async (filter, pipeline, options) => {
      const blog = blogs.get(String(filter._id));
      if (!blog) return { value: null };

      const toggle = pipeline[0].$set.likes.$cond;
      const userId = toggle[0].$in[0];
      assert.deepEqual(toggle[0], {
        $in: [userId, { $ifNull: ["$likes", []] }],
      });
      assert.deepEqual(toggle[1], {
        $filter: {
          input: { $ifNull: ["$likes", []] },
          as: "like",
          cond: { $ne: ["$$like", userId] },
        },
      });
      assert.deepEqual(toggle[2], {
        $concatArrays: [{ $ifNull: ["$likes", []] }, [userId]],
      });
      assert.equal(options.returnDocument, "after");
      const index = blog.likes.indexOf(userId);
      if (index >= 0) {
        blog.likes = blog.likes.filter((like) => like !== userId);
      } else {
        blog.likes.push(userId);
      }
      return { value: clone(blog) };
    },
  };

  TestBlog.get = get;
  TestBlog.reset = () => {
    blogs.clear();
    nextId = 1;
    failNextFind = false;
  };
  TestBlog.failNextFind = () => {
    failNextFind = true;
  };
  return TestBlog;
}

const Blog = createTestBlogModel();
const server = createApp(Blog).listen(0);
let baseUrl;

before(async () => {
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

beforeEach(() => Blog.reset());

async function request(path, { method = "GET", body, rawBody } = {}) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: body !== undefined || rawBody !== undefined ? { "content-type": "application/json" } : {},
    body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
}

async function createBlog(overrides = {}) {
  const response = await request("/blogs", {
    method: "POST",
    body: {
      title: "A thoughtful title",
      content: "This is a sufficiently long story.",
      author: "A Reader",
      tags: ["news"],
      ...overrides,
    },
  });
  return response.json();
}

test("health responds with the success envelope and Vite CORS origin", async () => {
  const response = await request("/health");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:5173");
  assert.deepEqual(await response.json(), { success: true, data: { status: "ok" } });
});

test("creates a trimmed blog with public fields and empty engagement data", async () => {
  const response = await request("/blogs", {
    method: "POST",
    body: {
      title: "  A thoughtful title ",
      content: "  This is a sufficiently long story.  ",
      author: " A Reader ",
      tags: [" news ", " learning "],
    },
  });
  const result = await response.json();
  assert.equal(response.status, 201);
  assert.equal(result.success, true);
  assert.equal(result.data.title, "A thoughtful title");
  assert.equal(result.data.content, "This is a sufficiently long story.");
  assert.equal(result.data.author, "A Reader");
  assert.deepEqual(result.data.tags, ["news", "learning"]);
  assert.equal(result.data.likesCount, 0);
  assert.deepEqual(result.data.comments, []);
  assert.equal(Object.hasOwn(result.data, "likes"), false);
});

test("rejects missing or invalid blog fields, types, and unknown fields", async () => {
  const invalidInputs = [
    [{}, "title"],
    [{ title: "ab", content: "long enough content", author: "Jo" }, "title"],
    [{ title: "Good title", content: "short", author: "Jo" }, "content"],
    [{ title: "Good title", content: "long enough content", author: "J" }, "author"],
    [{ title: 7, content: "long enough content", author: "Jo" }, "title"],
    [{ title: "Good title", content: "long enough content", author: "Jo", tags: "tag" }, "tags"],
    [{ title: "Good title", content: "long enough content", author: "Jo", extra: true }, "extra"],
    [{ title: "Good title", content: "long enough content", author: "Jo", tags: Array(11).fill("tag") }, "tags"],
  ];

  for (const [body, expectedField] of invalidInputs) {
    const response = await request("/blogs", { method: "POST", body });
    const result = await response.json();
    assert.equal(response.status, 400);
    assert.equal(result.success, false);
    assert.equal(result.error.code, "VALIDATION_ERROR");
    assert.ok(result.error.details.some((item) => item.field === expectedField));
  }
});

test("lists blogs newest first with computed counts and without internal arrays", async () => {
  await createBlog({ title: "Older blog" });
  await createBlog({ title: "Newer blog" });
  const response = await request("/blogs");
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(result.data.map((blog) => blog.title), ["Newer blog", "Older blog"]);
  assert.equal(result.data[0].likesCount, 0);
  assert.equal(Object.hasOwn(result.data[0], "likes"), false);
  assert.equal(Object.hasOwn(result.data[0], "comments"), false);
});

test("retrieves an existing blog with comments and computed likes count", async () => {
  const created = await createBlog();
  const id = created.data._id;
  await request(`/blogs/${id}/like`, { method: "POST", body: { userId: "reader-1" } });
  await request(`/blogs/${id}/comments`, {
    method: "POST",
    body: { name: "Reader", text: "Useful article!" },
  });
  const response = await request(`/blogs/${id}`);
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.data.likesCount, 1);
  assert.equal(result.data.comments.length, 1);
  assert.equal(result.data.comments[0].blogId, id);
});

test("returns not found for missing blogs and invalid ID for malformed ObjectIds", async () => {
  const missing = await request(`/blogs/${"a".repeat(24)}`);
  const malformed = await request("/blogs/not-an-object-id");
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error.code, "NOT_FOUND");
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error.code, "INVALID_ID");
});

test("updates allowed blog fields and rejects protected or invalid updates", async () => {
  const created = await createBlog();
  const id = created.data._id;
  const updated = await request(`/blogs/${id}`, {
    method: "PUT",
    body: { title: "An updated title", tags: ["updated"] },
  });
  const result = await updated.json();
  assert.equal(updated.status, 200);
  assert.equal(result.data.title, "An updated title");
  assert.deepEqual(result.data.tags, ["updated"]);

  for (const body of [
    { likes: [] },
    { comments: [] },
    { _id: "changed" },
    { createdAt: "2020-01-01" },
    { updatedAt: "2020-01-01" },
    { content: "too short" },
    { unknown: "value" },
    {},
  ]) {
    const response = await request(`/blogs/${id}`, { method: "PUT", body });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, "VALIDATION_ERROR");
  }
});

test("deletes existing blogs only after confirming they exist", async () => {
  const created = await createBlog();
  const id = created.data._id;
  const deleted = await request(`/blogs/${id}`, { method: "DELETE" });
  assert.equal(deleted.status, 200);
  assert.equal((await deleted.json()).data._id, id);
  const missing = await request(`/blogs/${id}`, { method: "DELETE" });
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error.code, "NOT_FOUND");
});

test("toggles likes, reports authoritative state, and prevents duplicate visitor IDs", async () => {
  const created = await createBlog();
  const id = created.data._id;
  const toggle = () => request(`/blogs/${id}/like`, {
    method: "POST",
    body: { userId: "demo-user-1" },
  });

  const first = await toggle();
  assert.deepEqual((await first.json()).data, { blogId: id, likesCount: 1, liked: true });
  const second = await toggle();
  assert.deepEqual((await second.json()).data, { blogId: id, likesCount: 0, liked: false });
  await toggle();
  await toggle();
  assert.deepEqual(Blog.get(id).likes, []);
});

test("serializes concurrent likes atomically without duplicate IDs", async () => {
  const created = await createBlog();
  const id = created.data._id;
  const responses = await Promise.all(
    Array.from({ length: 11 }, () =>
      request(`/blogs/${id}/like`, {
        method: "POST",
        body: { userId: "same-visitor" },
      }),
    ),
  );
  const payloads = await Promise.all(responses.map((response) => response.json()));
  assert.ok(responses.every((response) => response.status === 200));
  assert.ok(
    payloads.every(
      (payload) =>
        payload.success &&
        payload.data.likesCount >= 0 &&
        payload.data.liked === (payload.data.likesCount === 1),
    ),
  );
  assert.deepEqual(Blog.get(id).likes, ["same-visitor"]);
});

test("rejects invalid likes and returns not found for a missing blog", async () => {
  const created = await createBlog();
  const invalid = await request(`/blogs/${created.data._id}/like`, {
    method: "POST",
    body: { userId: "   " },
  });
  const tooLong = await request(`/blogs/${created.data._id}/like`, {
    method: "POST",
    body: { userId: "u".repeat(129) },
  });
  const missing = await request(`/blogs/${"a".repeat(24)}/like`, {
    method: "POST",
    body: { userId: "reader" },
  });
  assert.equal(invalid.status, 400);
  assert.equal(tooLong.status, 400);
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error.code, "NOT_FOUND");
});

test("adds a trimmed comment with blogId and rejects invalid comments without mutation", async () => {
  const created = await createBlog();
  const id = created.data._id;
  const response = await request(`/blogs/${id}/comments`, {
    method: "POST",
    body: { name: " Reader ", text: " Useful article! " },
  });
  const result = await response.json();
  assert.equal(response.status, 201);
  assert.equal(result.data.blogId, id);
  assert.equal(result.data.name, "Reader");
  assert.equal(result.data.text, "Useful article!");

  for (const body of [
    { name: " ", text: "Comment" },
    { name: "R", text: "Comment" },
    { name: "Reader", text: " " },
    { name: 7, text: "Comment" },
    { name: "Reader", text: "x".repeat(1001) },
    { name: "Reader", text: "Comment", extra: true },
  ]) {
    const invalid = await request(`/blogs/${id}/comments`, { method: "POST", body });
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).error.code, "VALIDATION_ERROR");
  }
  assert.equal(Blog.get(id).comments.length, 1);
});

test("returns not found for comments on missing blogs", async () => {
  const response = await request(`/blogs/${"a".repeat(24)}/comments`, {
    method: "POST",
    body: { name: "Reader", text: "Useful article!" },
  });
  assert.equal(response.status, 404);
  assert.equal((await response.json()).error.code, "NOT_FOUND");
});

test("returns consistent error envelopes for malformed JSON and unknown routes", async () => {
  const malformed = await request("/blogs", { method: "POST", rawBody: "{" });
  const validScalar = await request("/blogs", { method: "POST", rawBody: '"valid JSON scalar"' });
  const unknown = await request("/does-not-exist");
  const malformedResult = await malformed.json();
  const scalarResult = await validScalar.json();
  const unknownResult = await unknown.json();
  for (const result of [malformedResult, scalarResult, unknownResult]) {
    assert.equal(result.success, false);
    assert.equal(typeof result.error.code, "string");
    assert.equal(typeof result.error.message, "string");
  }
  assert.deepEqual(malformedResult.error.details, []);
  assert.deepEqual(scalarResult.error.details, [
    { field: "body", message: "Must be a JSON object." },
  ]);
  assert.deepEqual(unknownResult.error.details, []);
  assert.equal(malformed.status, 400);
  assert.equal(malformedResult.error.code, "INVALID_JSON");
  assert.equal(validScalar.status, 400);
  assert.equal(scalarResult.error.code, "VALIDATION_ERROR");
  assert.equal(unknown.status, 404);
  assert.equal(unknownResult.error.code, "ROUTE_NOT_FOUND");
});

test("does not expose internal errors in unexpected-error responses", async () => {
  Blog.failNextFind();
  const originalError = console.error;
  console.error = () => {};
  try {
    const response = await request("/blogs");
    const result = await response.json();
    assert.equal(response.status, 500);
    assert.equal(result.error.code, "INTERNAL_ERROR");
    assert.equal(result.error.message.includes("private database failure detail"), false);
    assert.deepEqual(result.error.details, []);
  } finally {
    console.error = originalError;
  }
});
