# Blog CMS API contract

Base URL: `http://localhost:5000/api`. Requests and responses use JSON with
`Content-Type: application/json`. This records the supplied team agreement;
the server is not present in this checkout and has not been verified against it.

## Envelopes and blog representation

Success: `{ "success": true, "data": {} }`. Lists place an array in `data`.
Errors always include the following structure, including an empty `details`
array when there are no field details:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title must contain at least 3 characters.",
    "details": []
  }
}
```

A serialized blog has this representation:

```json
{
  "success": true,
  "data": {
    "_id": "6bc000000000000000000001",
    "title": "A useful title",
    "content": "A complete example blog post.",
    "author": "Maya Rao",
    "tags": ["technology"],
    "likes": [],
    "likesCount": 0,
    "comments": [],
    "createdAt": "2026-10-25T05:00:00.000Z",
    "updatedAt": "2026-10-25T05:00:00.000Z"
  }
}
```

`_id` values are 24 hexadecimal MongoDB ObjectId strings. Dates are ISO strings.
The server computes `likesCount` from `likes.length` on **every** blog response,
including list, create, update and delete. It is never stored. Mongoose's internal
`__v` may be omitted by the server; clients must not rely on it.

## Routes

| Method | Path | Request body | Success data |
| --- | --- | --- | --- |
| GET | `/blogs` | none | Array of blogs sorted by `createdAt` descending |
| GET | `/blogs/:id` | none | One blog |
| POST | `/blogs` | title, content, author, optional tags | Created blog |
| PUT | `/blogs/:id` | title, content, author, optional tags | Updated blog |
| DELETE | `/blogs/:id` | none | See response convention below |
| POST | `/blogs/:id/like` | `{ "userId": "demo-user-1" }` | Toggle result below |
| POST | `/blogs/:id/comments` | `{ "name": "Maya", "text": "Helpful post!" }` | See response convention below |

Create/update body:

```json
{ "title": "A useful title", "content": "A complete example blog post.", "author": "Maya Rao", "tags": ["technology"] }
```

Clients send all editable fields with PUT; partial update behavior is not agreed.
Clients must not set `_id`, timestamps, likes or comments through create/update.
Member 2 owns request validation, field whitelisting and safe writes.

Like response:

```json
{
  "success": true,
  "data": {
    "blogId": "6bc000000000000000000001",
    "likesCount": 1,
    "liked": true
  }
}
```

The same visitor ID toggles on, off, on across three requests. This endpoint is
not an idempotent "set liked" operation. Distinct visitors can each like once.
Use safe atomic operations to prevent duplicates under concurrent requests.

## Validation

| Field | Rule |
| --- | --- |
| title | Required trimmed string, 3–150 characters |
| content | Required trimmed string, at least 10 characters |
| author | Required trimmed string, 2–80 characters |
| tags | Array of trimmed strings, at most 10; defaults to empty |
| userId | Nonempty string identifying a demo visitor |
| comment.name | Required trimmed string, 2–50 characters |
| comment.text | Required trimmed string, 1–1000 characters |

Comments have generated `_id` and `createdAt`. Empty tag strings, duplicate tags,
and content maximum length have no additional agreed constraint. Schema casting
is not a substitute for strict HTTP input type validation. Schema limits use
JavaScript string length. No authentication exists; author names and visitor IDs
are unverified and can be impersonated.

## Integration conventions requiring Member 1 and Member 2 confirmation

The supplied agreement does not specify health path, status codes, exact error
codes besides `VALIDATION_ERROR`, or comment/delete success data. No previous
shared contract exists in this checkout. The following explicit proposals make
the integration suite executable without silently treating them as approved:

| Case | Proposed HTTP status / representation |
| --- | --- |
| GET `/api/health` | 200, success envelope with a `data` object |
| Successful list/get/update/delete/like | 200 |
| Successful create/comment | 201 |
| Validation or malformed JSON | 400, `VALIDATION_ERROR` |
| Malformed ObjectId | 400, `INVALID_ID` |
| Valid ObjectId with no matching blog | 404, `NOT_FOUND` |
| Unexpected server failure | 500, `INTERNAL_ERROR`; no stack/credentials in response |
| Delete success `data` | Deleted blog, consistent with the existing frontend mock |
| Comment success `data` | Created comment `{ "_id": "...", "name": "Maya", "text": "Helpful post!", "createdAt": "ISO date" }`, consistent with the existing frontend mock |

The independent tests currently assert these conventions. Confirm them with both
other members before calling the full HTTP contract approved or changing an
existing implementation to match. `API_TEST_HEALTH_PATH` can point the test at an
approved alternative health path. No messages to other members have been sent.

## Example requests

```sh
curl http://localhost:5000/api/blogs
curl -X POST http://localhost:5000/api/blogs \
  -H 'Content-Type: application/json' \
  -d '{"title":"A useful title","content":"A complete example blog post.","author":"Maya Rao","tags":["technology"]}'

# Set BLOG_ID to the _id returned by creation.
curl "http://localhost:5000/api/blogs/$BLOG_ID"
curl -X PUT "http://localhost:5000/api/blogs/$BLOG_ID" \
  -H 'Content-Type: application/json' \
  -d '{"title":"An updated title","content":"An updated complete blog post.","author":"Maya Rao","tags":[]}'
curl -X POST "http://localhost:5000/api/blogs/$BLOG_ID/like" \
  -H 'Content-Type: application/json' -d '{"userId":"demo-user-1"}'
curl -X POST "http://localhost:5000/api/blogs/$BLOG_ID/comments" \
  -H 'Content-Type: application/json' -d '{"name":"Maya","text":"Helpful post!"}'
curl -X DELETE "http://localhost:5000/api/blogs/$BLOG_ID"
```

Member 3 owns this document. Proposed changes to established fields, paths or
envelopes require approval from both other members.
