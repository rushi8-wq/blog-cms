import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler.js";
import { createBlogController } from "../controllers/blogController.js";

export function createBlogRouter(Blog) {
  const router = Router();
  const controller = createBlogController(Blog);

  router.get("/health", controller.health);
  router.get("/blogs", asyncHandler(controller.listBlogs));
  router.get("/blogs/:id", asyncHandler(controller.getBlog));
  router.post("/blogs", asyncHandler(controller.createBlog));
  router.put("/blogs/:id", asyncHandler(controller.updateBlog));
  router.delete("/blogs/:id", asyncHandler(controller.deleteBlog));
  router.post("/blogs/:id/like", asyncHandler(controller.toggleLike));
  router.post("/blogs/:id/comments", asyncHandler(controller.addComment));

  return router;
}
