import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="not-found">
      <span className="empty-icon" aria-hidden="true">✳</span>
      <p className="eyebrow">404 · page not found</p>
      <h1>This page took<br /><em>a different turn.</em></h1>
      <p>We couldn't find what you were looking for. It may have moved, or it may never have been here.</p>
      <Link className="button button-primary" to="/">Back to the stories</Link>
    </main>
  );
}
