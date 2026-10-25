import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(serverDirectory, "../.env") });

const [{ connectDB }, { default: Blog }] = await Promise.all([
  import("../../database/connection.js"),
  import("../../database/models/Blog.js"),
]);

const port = Number(process.env.PORT || 5000);
await connectDB();
const app = createApp(Blog);
app.listen(port, () => {
  console.log(`Blog API listening on port ${port}.`);
});
