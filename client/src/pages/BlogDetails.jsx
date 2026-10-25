import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import BlogCard, { formatDate } from "../components/BlogCard.jsx";
import CommentSection from "../components/CommentSection.jsx";
import LikeButton from "../components/LikeButton.jsx";
import Loading from "../components/Loading.jsx";
import { api } from "../services/api.js";

export default function BlogDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [blog, setBlog] = useState(null);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([api.getBlog(id), Promise.resolve().then(() => api.getVisitorId())])
      .then(([result, visitorId]) => {
        if (!active) return;
        setBlog(result);
        setLiked(Array.isArray(result.likes) && result.likes.includes(visitorId));
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  async function handleLike() {
    const result = await api.toggleLike(id);
    setLiked(result.liked);
    setBlog((current) => current ? { ...current, likesCount: result.likesCount } : current);
  }

  async function handleAddComment(input) {
    const comment = await api.addComment(id, input);
    try {
      const refreshedBlog = await api.getBlog(id);
      setBlog(refreshedBlog);
      return "";
    } catch {
      setBlog((current) => current ? {
        ...current,
        comments: [...current.comments, comment].sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
        ),
      } : current);
      return "Your response was posted, but the conversation could not be refreshed. Please reload the page.";
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this story? This action cannot be undone.")) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await api.deleteBlog(id);
      navigate("/", { replace: true });
    } catch (requestError) {
      setDeleteError(requestError.message || "Could not delete this story.");
      setDeleting(false);
    }
  }

  if (loading) return <main className="page-shell"><Loading label="Opening story..." /></main>;
  if (error) {
    return (
      <main className="page-shell content-width">
        <Link className="back-link" to="/">← All stories</Link>
        <div className="alert alert-error page-alert" role="alert"><strong>We couldn't open this story.</strong> {error}</div>
      </main>
    );
  }
  if (!blog) return null;

  return (
    <main className="page-shell content-width">
      <Link className="back-link" to="/">← All stories</Link>
      <article className="article">
        <header className="article-header">
          <div className="tag-list">{blog.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
          <h1>{blog.title}</h1>
          <div className="article-meta">
            <span>By <strong>{blog.author}</strong></span><span aria-hidden="true">·</span>
            <time dateTime={blog.createdAt}>{formatDate(blog.createdAt)}</time>
          </div>
          <div className="article-actions">
            <LikeButton blogId={id} liked={liked} likesCount={blog.likesCount} onLike={handleLike} />
            <div className="demo-controls">
              <span className="demo-note">Demo controls · no authentication</span>
              <Link className="button button-small button-outline" to={`/blogs/${id}/edit`}>Edit</Link>
              <button className="button button-small button-danger-outline" type="button" onClick={handleDelete} disabled={deleting}>{deleting ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
          {deleteError && <div className="alert alert-error" role="alert">{deleteError}</div>}
        </header>
        <div className="article-content">{blog.content.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
        <div className="article-end-mark" aria-hidden="true">✳</div>
      </article>
      <div className="article-divider" />
      <CommentSection comments={blog.comments} onAddComment={handleAddComment} />
      <div className="more-stories"><Link className="text-link" to="/">Discover more stories <span aria-hidden="true">→</span></Link></div>
    </main>
  );
}
