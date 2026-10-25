import { ApiError } from "../middleware/errorHandler.js";

const BLOG_FIELDS = new Set(["title", "content", "author", "tags"]);
const BLOG_RULES = {
  title: { min: 3, max: 150 },
  content: { min: 10 },
  author: { min: 2, max: 80 },
};

function invalid(details, message = "The request contains invalid values.") {
  throw new ApiError(400, "VALIDATION_ERROR", message, details);
}

function requireObject(value, field = "body") {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    invalid([{ field, message: "Must be a JSON object." }]);
  }
}

function rejectUnknownFields(body, allowedFields) {
  const unknownFields = Object.keys(body).filter((field) => !allowedFields.has(field));
  if (unknownFields.length) {
    invalid(
      unknownFields.map((field) => ({
        field,
        message: "This field is not allowed.",
      })),
    );
  }
}

function validateBlogFields(body, { requireRequiredFields }) {
  const details = [];
  const payload = {};

  for (const [field, rule] of Object.entries(BLOG_RULES)) {
    if (!Object.hasOwn(body, field)) {
      if (requireRequiredFields) {
        details.push({ field, message: "This field is required." });
      }
      continue;
    }

    if (typeof body[field] !== "string") {
      details.push({ field, message: "Must be a string." });
      continue;
    }

    const value = body[field].trim();
    if (value.length < rule.min || (rule.max && value.length > rule.max)) {
      details.push({
        field,
        message: rule.max
          ? `Must be between ${rule.min} and ${rule.max} characters after trimming.`
          : `Must be at least ${rule.min} characters after trimming.`,
      });
      continue;
    }
    payload[field] = value;
  }

  if (Object.hasOwn(body, "tags")) {
    if (!Array.isArray(body.tags)) {
      details.push({ field: "tags", message: "Must be an array of strings." });
    } else if (body.tags.length > 10) {
      details.push({ field: "tags", message: "Must contain no more than 10 tags." });
    } else {
      const tags = [];
      body.tags.forEach((tag, index) => {
        if (typeof tag !== "string" || !tag.trim()) {
          details.push({
            field: `tags[${index}]`,
            message: "Must be a non-empty string.",
          });
        } else {
          tags.push(tag.trim());
        }
      });
      payload.tags = tags;
    }
  } else if (requireRequiredFields) {
    payload.tags = [];
  }

  if (details.length) invalid(details);
  return payload;
}

export function validateObjectId(id) {
  if (typeof id !== "string" || !/^[a-f\d]{24}$/i.test(id)) {
    throw new ApiError(400, "INVALID_ID", "The blog ID must be a valid MongoDB ObjectId.");
  }
}

export function validateCreateBlog(body) {
  requireObject(body);
  rejectUnknownFields(body, BLOG_FIELDS);
  return validateBlogFields(body, { requireRequiredFields: true });
}

export function validateUpdateBlog(body) {
  requireObject(body);
  rejectUnknownFields(body, BLOG_FIELDS);
  if (Object.keys(body).length === 0) {
    invalid([{ field: "body", message: "At least one blog field must be provided." }]);
  }
  return validateBlogFields(body, { requireRequiredFields: false });
}

export function validateLike(body) {
  requireObject(body);
  rejectUnknownFields(body, new Set(["userId"]));
  if (typeof body.userId !== "string" || !body.userId.trim()) {
    invalid([{ field: "userId", message: "Must be a non-empty string." }]);
  }
  const userId = body.userId.trim();
  if (userId.length > 128) {
    invalid([{ field: "userId", message: "Must be 128 characters or fewer." }]);
  }
  return userId;
}

export function validateComment(body) {
  requireObject(body);
  rejectUnknownFields(body, new Set(["name", "text"]));
  const details = [];
  const comment = {};

  for (const [field, min, max] of [
    ["name", 2, 50],
    ["text", 1, 1000],
  ]) {
    if (typeof body[field] !== "string") {
      details.push({
        field,
        message: "Must be a string.",
      });
      continue;
    }
    const value = body[field].trim();
    if (value.length < min || value.length > max) {
      details.push({
        field,
        message: `Must be between ${min} and ${max} characters after trimming.`,
      });
      continue;
    }
    comment[field] = value;
  }

  if (details.length) invalid(details);
  return comment;
}
