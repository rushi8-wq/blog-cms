import { Types } from "mongoose";
import { ApiError } from "../middleware/errorHandler.js";
import {
  validateComment,
  validateCreateBlog,
  validateLike,
  validateObjectId,
  validateUpdateBlog,
} from "../validators/blogValidators.js";

function success(res, data, status = 200) {
  res.status(status).json({ success: true, data });
}

function serializeComment(comment, blogId) {
  return {
    _id: String(comment._id),
    blogId: String(blogId),
    name: comment.name,
    text: comment.text,
    createdAt: comment.createdAt,
  };
}

function serializeBlog(blog, { includeComments = true } = {}) {
  const value = typeof blog.toObject === "function" ? blog.toObject() : blog;
  const serialized = {
    _id: String(value._id),
    title: value.title,
    content: value.content,
    author: value.author,
    tags: value.tags || [],
    likesCount: Array.isArray(value.likes) ? value.likes.length : 0,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
  if (includeComments) {
    serialized.comments = (value.comments || []).map((comment) =>
      serializeComment(comment, value._id),
    );
  }
  return serialized;
}

function requireBlog(blog) {
  if (!blog) throw new ApiError(404, "NOT_FOUND", "Blog not found.");
  return blog;
}

export function createBlogController(Blog) {
  return {
    health(req, res) {
      success(res, { status: "ok" });
    },

    async listBlogs(req, res) {
      const blogs = await Blog.find().sort({ createdAt: -1 });
      success(res, blogs.map((blog) => serializeBlog(blog, { includeComments: false })));
    },

    async getBlog(req, res) {
      validateObjectId(req.params.id);
      const blog = requireBlog(await Blog.findById(req.params.id));
      success(res, serializeBlog(blog));
    },

    async createBlog(req, res) {
      const payload = validateCreateBlog(req.body);
      const blog = await Blog.create(payload);
      success(res, serializeBlog(blog), 201);
    },

    async updateBlog(req, res) {
      validateObjectId(req.params.id);
      const payload = validateUpdateBlog(req.body);
      const blog = await Blog.findByIdAndUpdate(req.params.id, payload, {
        new: true,
        runValidators: true,
      });
      success(res, serializeBlog(requireBlog(blog)));
    },

    async deleteBlog(req, res) {
      validateObjectId(req.params.id);
      const blog = requireBlog(await Blog.findByIdAndDelete(req.params.id));
      success(res, serializeBlog(blog));
    },

    async toggleLike(req, res) {
      validateObjectId(req.params.id);
      const userId = validateLike(req.body);

      // This demo visitor ID is a toggle key, not secure authentication.
      const result = await Blog.collection.findOneAndUpdate(
        { _id: new Types.ObjectId(req.params.id) },
        [
          {
            $set: {
              likes: {
                $cond: [
                  { $in: [userId, { $ifNull: ["$likes", []] }] },
                  {
                    $filter: {
                      input: { $ifNull: ["$likes", []] },
                      as: "like",
                      cond: { $ne: ["$$like", userId] },
                    },
                  },
                  { $concatArrays: [{ $ifNull: ["$likes", []] }, [userId]] },
                ],
              },
            },
          },
        ],
        { returnDocument: "after" },
      );
      const blog =
        result && Object.hasOwn(result, "value")
          ? result.value
          : result;
      requireBlog(blog);
      const likes = Array.isArray(blog.likes) ? blog.likes : [];
      success(res, {
        blogId: String(blog._id),
        likesCount: likes.length,
        liked: likes.includes(userId),
      });
    },

    async addComment(req, res) {
      validateObjectId(req.params.id);
      const commentInput = validateComment(req.body);
      const blog = requireBlog(
        await Blog.findOneAndUpdate(
          { _id: req.params.id },
          { $push: { comments: commentInput } },
          { new: true, runValidators: true },
        ),
      );
      const comment = blog.comments[blog.comments.length - 1];
      success(res, serializeComment(comment, blog._id), 201);
    },
  };
}
