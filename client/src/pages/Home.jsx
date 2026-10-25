import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BlogCard from "../components/BlogCard.jsx";
import Loading from "../components/Loading.jsx";
import { api } from "../services/api.js";

export default function Home() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.getBlogs()
      .then((data) => { if (active) setBlogs(data); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <main>
      <section className="home-hero">
        <div className="hero-inner">
          <p className="eyebrow">A little space for good ideas</p>
          <h1>Stories worth<br /><em>slowing down for.</em></h1>
          <p className="hero-copy">Fieldnotes is a home for thoughtful writing, everyday discoveries, and conversations that stay with you.</p>
          <Link className="button button-dark" to="/create">Share your story <span aria-hidden="true">↗</span></Link>
          <div className="hero-decoration" aria-hidden="true"><span>✳</span></div>
        </div>
      </section>

      <section className="stories-section content-width" aria-labelledby="stories-heading">
        <div className="stories-heading">
          <div>
            <p className="eyebrow">From the community</p>
            <h2 id="stories-heading">The latest stories</h2>
          </div>
          <Link className="text-link" to="/create">Write a story <span aria-hidden="true">↗</span></Link>
        </div>
        {loading && <Loading label="Gathering stories..." />}
        {!loading && error && (
          <div className="alert alert-error" role="alert">
            <strong>We couldn't load the stories.</strong> {error}
            <button className="text-button" type="button" onClick={() => window.location.reload()}>Try again</button>
          </div>
        )}
        {!loading && !error && blogs.length === 0 && (
          <div className="empty-state">
            <span className="empty-icon" aria-hidden="true">✳</span>
            <h3>A blank page, full of possibility.</h3>
            <p>There are no stories yet. Start things off with the first one.</p>
            <Link className="button button-primary" to="/create">Create the first story</Link>
          </div>
        )}
        {!loading && !error && blogs.length > 0 && (
          <div className="blog-grid">{blogs.map((blog, index) => <BlogCard blog={blog} index={index} key={blog._id} />)}</div>
        )}
      </section>
    </main>
  );
}
