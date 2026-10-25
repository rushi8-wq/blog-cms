import { useState } from "react";
import { formatDate } from "./BlogCard.jsx";

const nameLimit = 80;
const textLimit = 1000;

export default function CommentSection({ comments = [], onAddComment }) {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);
  const orderedComments = [...comments].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!name.trim() || !text.trim()) {
      setError("Please enter your name and a comment.");
      return;
    }
    if (name.trim().length > nameLimit) {
      setError(`Your name must be ${nameLimit} characters or fewer.`);
      return;
    }
    if (text.trim().length > textLimit) {
      setError(`Comments must be ${textLimit} characters or fewer.`);
      return;
    }

    setPending(true);
    try {
      const message = await onAddComment({ name: name.trim(), text: text.trim() });
      setName("");
      setText("");
      setSuccess(message || "Your comment has been added.");
    } catch (requestError) {
      setError(requestError.message || "Could not add your comment. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="comments-section" aria-labelledby="comments-heading">
      <div className="section-heading-row">
        <h2 id="comments-heading">Conversation</h2>
        <span className="comment-total">{orderedComments.length} {orderedComments.length === 1 ? "response" : "responses"}</span>
      </div>
      {orderedComments.length > 0 ? (
        <ol className="comment-list">
          {orderedComments.map((comment) => (
            <li className="comment" key={comment._id}>
              <div className="comment-avatar" aria-hidden="true">{comment.name.trim().charAt(0).toUpperCase()}</div>
              <div className="comment-body">
                <div className="comment-byline"><strong>{comment.name}</strong><time dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time></div>
                <p>{comment.text}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="empty-comments">No responses yet. Start the conversation.</p>
      )}
      <form className="comment-form" onSubmit={handleSubmit} noValidate>
        <h3>Leave a response</h3>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        {success && <div className="alert alert-success" role="status">{success}</div>}
        <div className="field">
          <label htmlFor="comment-name">Your name</label>
          <input id="comment-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={nameLimit} autoComplete="name" />
        </div>
        <div className="field">
          <label htmlFor="comment-text">Comment</label>
          <textarea id="comment-text" value={text} onChange={(event) => setText(event.target.value)} maxLength={textLimit} rows="4" placeholder="Add something thoughtful to the conversation..." />
          <span className="character-count">{text.length}/{textLimit}</span>
        </div>
        <button className="button button-secondary" type="submit" disabled={pending}>{pending ? "Posting..." : "Post response"}</button>
      </form>
    </section>
  );
}
