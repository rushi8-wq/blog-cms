import { Link } from "react-router-dom";

export function formatDate(date) {
  return new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(
    new Date(date),
  );
}

export default function BlogCard({ blog, index = 0 }) {
  return (
    <article className="blog-card" style={{ "--card-order": index }}>
      <div className="card-meta">
        <span>{formatDate(blog.createdAt)}</span>
        <span className="meta-dot" aria-hidden="true">·</span>
        <span>{blog.author}</span>
      </div>
      <h2><Link to={`/blogs/${blog._id}`}>{blog.title}</Link></h2>
      <p className="card-excerpt">{blog.content}</p>
      <div className="card-footer">
        <div className="tag-list" aria-label="Tags">
          {blog.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
        </div>
        <span className="card-likes" aria-label={`${blog.likesCount} likes`}>
          <span aria-hidden="true">♡</span> {blog.likesCount}
        </span>
      </div>
      <Link className="card-read-link" to={`/blogs/${blog._id}`}>
        Read story <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}
