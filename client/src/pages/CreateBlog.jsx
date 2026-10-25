import { Link, useNavigate } from "react-router-dom";
import BlogForm from "../components/BlogForm.jsx";
import { api } from "../services/api.js";

const emptyBlog = { title: "", content: "", author: "", tags: "" };

export default function CreateBlog() {
  const navigate = useNavigate();
  async function handleCreate(input) {
    const created = await api.createBlog(input);
    navigate(`/blogs/${created._id}`);
  }

  return (
    <main className="page-shell content-width editor-page">
      <Link className="back-link" to="/">← All stories</Link>
      <div className="editor-heading">
        <p className="eyebrow">Your words belong here</p>
        <h1>Write a story</h1>
        <p>Share an idea, a moment, or something you've been thinking about.</p>
      </div>
      <BlogForm initialValues={emptyBlog} submitLabel="Publish story" onSubmit={handleCreate} />
    </main>
  );
}
