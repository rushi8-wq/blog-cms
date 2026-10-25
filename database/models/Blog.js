import { mongoose } from '../runtime.js';

const { Schema } = mongoose;
const commentSchema = new Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
  text: { type: String, required: true, trim: true, minlength: 1, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now },
});

const blogSchema = new Schema({
  title: { type: String, required: true, trim: true, minlength: 3, maxlength: 150 },
  content: { type: String, required: true, trim: true, minlength: 10 },
  author: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  tags: {
    type: [{ type: String, trim: true }],
    default: [],
    validate: { validator: value => Array.isArray(value) && value.length <= 10, message: 'At most 10 tags are allowed.' },
  },
  likes: {
    type: [String],
    default: [],
    validate: {
      validator: value => Array.isArray(value) && value.every(id => typeof id === 'string' && id.trim().length > 0) && new Set(value).size === value.length,
      message: 'Likes must contain unique, nonempty visitor IDs.',
    },
  },
  comments: { type: [commentSchema], default: [] },
}, { timestamps: true });

// Importing the model never opens a connection. likesCount belongs to the API.
export default mongoose.models.Blog || mongoose.model('Blog', blogSchema);
