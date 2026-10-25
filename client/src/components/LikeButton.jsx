import { useState } from "react";

export default function LikeButton({ blogId, liked, likesCount, onLike }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setPending(true);
    setError("");
    try {
      await onLike(blogId);
    } catch (requestError) {
      setError(requestError.message || "Could not update your like.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="like-control">
      <button className={`like-button${liked ? " is-liked" : ""}`} type="button" onClick={handleClick} disabled={pending} aria-pressed={liked}>
        <span aria-hidden="true">{liked ? "♥" : "♡"}</span>
        {pending ? "Updating..." : liked ? "Unlike" : "Like"}
        <span className="like-count">{likesCount}</span>
      </button>
      {error && <span className="inline-error" role="alert">{error}</span>}
    </div>
  );
}
