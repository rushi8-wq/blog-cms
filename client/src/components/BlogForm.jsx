import { useState } from "react";

const limits = { title: 120, content: 20000, author: 80, tags: 12 };

export function validateBlog(values) {
  const errors = {};
  if (!values.title.trim()) errors.title = "Add a title for your story.";
  else if (values.title.trim().length > limits.title) errors.title = `Keep the title under ${limits.title} characters.`;
  if (!values.content.trim()) errors.content = "Write some content before publishing.";
  else if (values.content.trim().length > limits.content) errors.content = `Keep the content under ${limits.content} characters.`;
  if (!values.author.trim()) errors.author = "Add your name as the author.";
  else if (values.author.trim().length > limits.author) errors.author = `Keep the author name under ${limits.author} characters.`;
  const tags = values.tags.split(",").map((tag) => tag.trim()).filter(Boolean);
  if (tags.some((tag) => tag.length > 30)) errors.tags = "Each tag must be 30 characters or fewer.";
  if (tags.length > limits.tags) errors.tags = `Use no more than ${limits.tags} tags.`;
  return errors;
}

export function toBlogInput(values) {
  return {
    title: values.title.trim(),
    content: values.content.trim(),
    author: values.author.trim(),
    tags: values.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
  };
}

export default function BlogForm({ initialValues, submitLabel, onSubmit }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setFormError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = validateBlog(values);
    setErrors(validationErrors);
    setFormError("");
    if (Object.keys(validationErrors).length) return;

    setSubmitting(true);
    try {
      await onSubmit(toBlogInput(values));
    } catch (error) {
      setFormError(error.message || "Could not save your story. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="editor-form" onSubmit={handleSubmit} noValidate>
      {formError && <div className="alert alert-error" role="alert">{formError}</div>}
      <div className="field">
        <label htmlFor="title">Story title</label>
        <input id="title" name="title" value={values.title} onChange={updateField} maxLength={limits.title} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? "title-error" : undefined} placeholder="Give your story a thoughtful title" />
        {errors.title && <span className="field-error" id="title-error">{errors.title}</span>}
      </div>
      <div className="field">
        <label htmlFor="author">Author name</label>
        <input id="author" name="author" value={values.author} onChange={updateField} maxLength={limits.author} aria-invalid={Boolean(errors.author)} aria-describedby={errors.author ? "author-error" : undefined} placeholder="How should readers know you?" />
        {errors.author && <span className="field-error" id="author-error">{errors.author}</span>}
      </div>
      <div className="field">
        <label htmlFor="tags">Tags <span className="label-hint">Optional · comma separated</span></label>
        <input id="tags" name="tags" value={values.tags} onChange={updateField} aria-invalid={Boolean(errors.tags)} aria-describedby={errors.tags ? "tags-error" : undefined} placeholder="design, daily life, ideas" />
        {errors.tags && <span className="field-error" id="tags-error">{errors.tags}</span>}
      </div>
      <div className="field">
        <label htmlFor="content">Your story</label>
        <textarea id="content" name="content" value={values.content} onChange={updateField} maxLength={limits.content} rows="12" aria-invalid={Boolean(errors.content)} aria-describedby={errors.content ? "content-error" : undefined} placeholder="Start writing..." />
        <div className="field-bottom">
          {errors.content ? <span className="field-error" id="content-error">{errors.content}</span> : <span className="label-hint">A little whitespace makes longer stories easier to read.</span>}
          <span className="character-count">{values.content.length}/{limits.content}</span>
        </div>
      </div>
      <div className="form-actions">
        <button className="button button-primary" type="submit" disabled={submitting}>
          {submitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
