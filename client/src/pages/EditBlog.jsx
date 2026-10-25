import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import BlogForm from "../components/BlogForm.jsx";
import Loading from "../components/Loading.jsx";
import { api } from "../services/api.js";

export default function EditBlog() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.getBlog(id)
      .then((result) => { if (active) setBlog(result); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  async function handleUpdate(input) {
    const updated = await api.updateBlog(id, input);
    navigate(`/blogs/${updated._id}`);
  }

  return (
    <main className="page-shell content-width editor-page">
      <Link className="back-link" to={blog ? `/blogs/${id}` : "/"}>← {blog ? "Back to story" : "All stories"}</Link>
      {loading && <Loading label="Loading your story..." />}
      {!loading && error && <div className="alert alert-error page-alert" role="alert"><strong>We couldn't load this story for editing.</strong> {error}</div>}
      {!loading && blog && (
        <>
          <div className="editor-heading">
            <p className="eyebrow">Make it yours</p>
            <h1>Edit your story</h1>
            <p>Update the details below and save your changes.</p>
          </div>
          <BlogForm
            key={blog._id}
            initialValues={{ title: blog.title, content: blog.content, author: blog.author, tags: blog.tags.join(", ") }}
            submitLabel="Save changes"
            onSubmit={handleUpdate}
          />
        </>
      )}
    </main>
  );
}
