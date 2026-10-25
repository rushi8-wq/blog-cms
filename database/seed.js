import { pathToFileURL } from 'node:url';
import { connectDB } from './connection.js';
import Blog from './models/Blog.js';
import { mongoose } from './runtime.js';

// Stable IDs reserve only these demonstration records; no broad deletion occurs.
export const examples = [
  { _id: '6bc000000000000000000001', title: 'A practical guide to your first vegetable garden', content: 'Start with a sunny spot and a few easy crops such as beans, spinach and tomatoes. Water consistently, add compost and keep notes about what grows well each season.', author: 'Maya Rao', tags: ['gardening', 'beginners'] },
  { _id: '6bc000000000000000000002', title: 'What I learned building a reading habit', content: 'Ten quiet minutes after breakfast helped me read more than ambitious monthly targets. Choose books you enjoy, keep one nearby and share a favorite passage with a friend.', author: 'Arjun Shah', tags: ['books', 'habits'] },
  { _id: '6bc000000000000000000003', title: 'Making a small website easier to navigate', content: 'Clear page names and consistent navigation help readers find what they need. Test your site with a keyboard and a small screen before adding more features.', author: 'Leena Das', tags: ['design', 'web'] },
  { _id: '6bc000000000000000000004', title: 'A weekend walk through the city market', content: 'The morning market offers seasonal fruit, fresh flowers and conversations with local makers. Bring a reusable bag, arrive early and leave time for a cup of tea.', author: 'Kabir Sen', tags: ['travel', 'community'] },
  { _id: '6bc000000000000000000005', title: 'Learning JavaScript by keeping a project journal', content: 'Write down one problem you solved after each coding session. Small examples, useful error messages and notes about your decisions make future debugging much easier.', author: 'Nisha Patel', tags: ['javascript', 'learning'] },
];

export async function seed() {
  await connectDB();
  let inserted = 0;
  for (const example of examples) {
    const document = new Blog(example);
    await document.validate();
    // Do not refresh timestamps or overwrite edits when the seed is rerun.
    const result = await Blog.updateOne({ _id: document._id }, {
      $setOnInsert: { ...document.toObject(), createdAt: new Date(), updatedAt: new Date() },
    }, { upsert: true, timestamps: false, runValidators: true });
    inserted += result.upsertedCount;
  }
  return inserted;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log(`Seed complete: ${await seed()} blogs inserted; existing records preserved.`);
  } catch {
    console.error('Seeding failed. Check dependencies, configuration and database access.');
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
