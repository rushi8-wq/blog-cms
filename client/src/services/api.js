import { initialBlogs } from "../mocks/blogs.js";

const useMockApi = import.meta.env.VITE_USE_MOCK_API === "true";
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(
  /\/+$/,
  "",
);
let mockBlogs = structuredClone(initialBlogs);

function createApiError(message, code = "REQUEST_FAILED", details = []) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

function getVisitorId() {
  const storageKey = "blog-cms-demo-user-id";
  let visitorId;

  try {
    visitorId = window.localStorage.getItem(storageKey);
    if (!visitorId) {
      const randomId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      visitorId = `demo-user-${randomId}`;
      window.localStorage.setItem(storageKey, visitorId);
    }
  } catch {
    throw createApiError(
      "Your browser could not save a demo visitor ID. Enable local storage to use likes.",
      "LOCAL_STORAGE_UNAVAILABLE",
    );
  }

  return visitorId;
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw createApiError("Could not reach the blog API. Check that the server is running.");
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw createApiError("The API returned an invalid JSON response.", "INVALID_RESPONSE");
  }

  if (!response.ok || payload?.success !== true) {
    throw createApiError(
      payload?.error?.message || `The request failed (${response.status}).`,
      payload?.error?.code || "REQUEST_FAILED",
      payload?.error?.details || [],
    );
  }

  if (!Object.hasOwn(payload, "data")) {
    throw createApiError("The API response is missing its data.", "INVALID_RESPONSE");
  }
  return payload.data;
}

function cloneBlog(blog) {
  return structuredClone(blog);
}

function requireMockBlog(id) {
  const blog = mockBlogs.find((item) => item._id === id);
  if (!blog) throw createApiError("Blog not found.", "NOT_FOUND");
  return blog;
}

function toBlogPayload(input) {
  return {
    title: input.title.trim(),
    content: input.content.trim(),
    author: input.author.trim(),
    tags: input.tags,
  };
}

export const api = {
  isMockMode: useMockApi,
  getVisitorId,

  async getBlogs() {
    if (!useMockApi) return request("/blogs");
    return mockBlogs.map(cloneBlog).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async getBlog(id) {
    if (!useMockApi) return request(`/blogs/${encodeURIComponent(id)}`);
    return cloneBlog(requireMockBlog(id));
  },

  async createBlog(input) {
    if (!useMockApi) {
      return request("/blogs", {
        method: "POST",
        body: JSON.stringify(toBlogPayload(input)),
      });
    }
    const now = new Date().toISOString();
    const blog = {
      ...toBlogPayload(input),
      _id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      likes: [],
      likesCount: 0,
      comments: [],
      createdAt: now,
      updatedAt: now,
    };
    mockBlogs = [blog, ...mockBlogs];
    return cloneBlog(blog);
  },

  async updateBlog(id, input) {
    if (!useMockApi) {
      return request(`/blogs/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(toBlogPayload(input)),
      });
    }
    const blog = requireMockBlog(id);
    Object.assign(blog, toBlogPayload(input), { updatedAt: new Date().toISOString() });
    return cloneBlog(blog);
  },

  async deleteBlog(id) {
    if (!useMockApi) {
      return request(`/blogs/${encodeURIComponent(id)}`, { method: "DELETE" });
    }
    const blog = requireMockBlog(id);
    mockBlogs = mockBlogs.filter((item) => item._id !== id);
    return cloneBlog(blog);
  },

  async toggleLike(id) {
    const userId = getVisitorId();
    if (!useMockApi) {
      return request(`/blogs/${encodeURIComponent(id)}/like`, {
        method: "POST",
        body: JSON.stringify({ userId }),
      });
    }
    const blog = requireMockBlog(id);
    const existingIndex = blog.likes.indexOf(userId);
    if (existingIndex >= 0) {
      blog.likes.splice(existingIndex, 1);
    } else {
      blog.likes.push(userId);
    }
    blog.likesCount = blog.likes.length;
    return { blogId: blog._id, likesCount: blog.likesCount, liked: existingIndex < 0 };
  },

  async addComment(id, input) {
    if (!useMockApi) {
      return request(`/blogs/${encodeURIComponent(id)}/comments`, {
        method: "POST",
        body: JSON.stringify({ name: input.name.trim(), text: input.text.trim() }),
      });
    }
    const blog = requireMockBlog(id);
    const comment = {
      _id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      blogId: id,
      name: input.name.trim(),
      text: input.text.trim(),
      createdAt: new Date().toISOString(),
    };
    blog.comments.push(comment);
    blog.comments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    return structuredClone(comment);
  },
};
