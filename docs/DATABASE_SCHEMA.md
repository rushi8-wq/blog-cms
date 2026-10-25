# Database schema

The shared default Mongoose connection stores `Blog` in the `blogs` collection.
Import `database/models/Blog.js` as a default export. Importing it never connects.

| Field | Storage and validation |
| --- | --- |
| `_id` | Generated ObjectId |
| `title` | Required String; trim; 3–150 characters |
| `content` | Required String; trim; minimum 10 characters |
| `author` | Required String; trim; 2–80 characters |
| `tags` | Array of trimmed Strings; default `[]`; maximum 10 |
| `likes` | Array of nonempty visitor ID Strings; default `[]`; unique within each blog |
| `comments` | Embedded comment array; default `[]` |
| `createdAt` / `updatedAt` | Dates maintained by Mongoose timestamps on persistence |
| `__v` | Mongoose's internal version key |

Each embedded comment has a generated ObjectId `_id`, required trimmed `name`
(2–50 characters), required trimmed `text` (1–1000 characters), and `createdAt`
(Date, defaults to the current time). Comments are stored with their parent so a
blog read needs no join and deletion removes its comments. There is no users
collection, authentication relationship or separate comments collection.

`likesCount` is never persisted or provided as a schema virtual. Member 2 must
compute it from `likes.length` when serializing API responses, including `.lean()`
results. Storage JSON includes dates/IDs that become ISO/string values when JSON
encoded; schema serialization and API serialization have different responsibilities.

Duplicate visitor IDs fail document validation rather than being silently
discarded. A unique MongoDB multikey index would not enforce uniqueness within
one document, so no such index is added. Only MongoDB's default `_id` index is
needed initially. Backend like toggles need atomic updates/concurrency handling;
document validators alone do not make read/modify/save concurrency safe.

Mongoose validates `save()` and `create()`. For query updates Member 2 must use
`runValidators: true`, whitelist editable fields and account for update-validator
limitations (for example `$push` does not apply array-level length validation to
the resulting whole array). Direct driver writes bypass Mongoose rules. These
are application schema rules, not a MongoDB collection validator.

Mongoose casts some values (for example numbers to strings and scalars to arrays).
The backend must reject wrong HTTP input types before casting. Tags have no
agreed per-tag length or uniqueness rule. Visitor IDs are compared exactly and
case-sensitively; blank IDs are rejected. No author/visitor identity is verified.

No unbounded arrays should be assumed scalable for production; pagination,
moderation, authentication and separate collections are future design work.
