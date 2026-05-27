# xvideos

[![CI](https://github.com/rodrigogs/xvideos/actions/workflows/node.js.yml/badge.svg)](https://github.com/rodrigogs/xvideos/actions/workflows/node.js.yml)
[![codecov](https://codecov.io/gh/rodrigogs/xvideos/graph/badge.svg)](https://codecov.io/gh/rodrigogs/xvideos)
[![CodeQL](https://github.com/rodrigogs/xvideos/actions/workflows/codeql.yml/badge.svg)](https://github.com/rodrigogs/xvideos/actions/workflows/codeql.yml)

A [Node.js](https://nodejs.org) library for the [xvideos.com](https://www.xvideos.com) API.

Requires Node.js 20+.

## Installation

```bash
$ npm install @rodrigogs/xvideos
```

## Usage

```javascript
import xvideos from '@rodrigogs/xvideos';
```

```javascript
const xvideos = require('@rodrigogs/xvideos');

(async () => {
  // Retrieve fresh videos from the first page
  const fresh = await xvideos.videos.fresh({ page: 1 });
  // Log details of the retrieved videos
  console.log(fresh.videos); // Array of video objects with properties like url, videoId, title, duration, durationSeconds, thumbnailUrl, profile, watchCount
  console.log(fresh.pagination.page); // Current page number
  console.log(fresh.pagination.pages); // Array of available page numbers
  console.log(fresh.hasNext()); // Check if there is a next page
  console.log(fresh.hasPrevious()); // Check if there is a previous page

  // Retrieve the next page of fresh videos
  const nextPage = await fresh.next();
  // Log details of the next page
  console.log(nextPage.pagination.page); // Updated current page number
  console.log(nextPage.hasNext()); // Check if the next page exists
  console.log(nextPage.hasPrevious()); // Check if the previous page exists

  // Retrieve the previous page of fresh videos
  const previousPage = await fresh.previous();
  // Log details of the previous page
  console.log(previousPage.pagination.page); // Updated current page number
  console.log(previousPage.hasNext()); // Check if the next page exists
  console.log(previousPage.hasPrevious()); // Check if the previous page exists

  // Retrieve detailed information about a specific video
  const detail = await xvideos.videos.details(fresh.videos[0]);
  // Log details of the specific video
  console.log(detail); // Detailed video object with properties like title, videoId, duration, durationSeconds, thumbnailUrls, watchCount, videoType, files, uploadDate, tags, categories

  // Retrieve many detail pages with explicit crawl controls
  const batch = await xvideos.videos.detailsMany(fresh.videos.slice(0, 3), {
    concurrency: 2,
    retries: 1,
    minDelayMs: 250,
  });
  console.log(batch.successes); // Successful detail payloads in input order
  console.log(batch.failures); // Failed inputs with their error
})();
```

## Development

```bash
npm run build
npm run lint
npm run format
npm run test:unit
npm run test:integration
npm run coverage
npm test
```

## Migration Notes

### Version 3.1 → Current: Richer list results and batch crawl ergonomics

**Status:** ✅ Additive release (backward compatible)

**What changed:**
- List endpoints (`fresh`, `dashboard`, `best`, `verified`, `search`) now include additional fields per item
- New `videos.detailsMany()` method for batch detail fetching with concurrency control

**New fields in list items:**
- `durationSeconds` (number) - Video duration in seconds
- `thumbnailUrl` (string) - Primary thumbnail URL

**New batch details method:**
```javascript
const batch = await xvideos.videos.detailsMany(
  [{ url: '...' }, { url: '...' }],
  {
    concurrency: 3,        // Parallel requests
    retries: 1,            // Retry failed requests
    retryDelayMs: 250,     // Delay between retries
    minDelayMs: 500,       // Minimum delay between requests
  }
);

console.log(batch.successes); // Array of successful detail objects
console.log(batch.failures);  // Array of failures with error details
```

**Migration:** No action required. Your existing code continues to work; new fields are optional bonuses.

---

### Version 3.0 → 3.1: Field normalization and data cleanup

**Status:** ⚠️ Breaking changes (requires code updates)

**What changed:**
Several fields were renamed and restructured for consistency, performance, and clarity. All information remains available—just in different field names.

**Field renaming:**

| Previous field | New field | Migration Notes |
|---|---|---|
| `videos[].path` | `videos[].videoId` | Use `video.url` for full link, or `/${video.videoId}` to rebuild. |
| `videos[].views` | `videos[].watchCount` | Numeric value; use for sorting/filtering. |
| `details.image` | `details.thumbnailUrls[0]` | Primary thumbnail is now first item in array. |
| `details.views` | `details.watchCount` | Numeric value for analytics/ranking. |

**How to upgrade:**

Before (v2.x):
```javascript
const video = await xvideos.videos.fresh({ page: 1 });
console.log(video.videos[0].path);      // ❌ No longer available
console.log(video.videos[0].views);     // ❌ No longer available
```

After (v3.0+):
```javascript
const video = await xvideos.videos.fresh({ page: 1 });
console.log(video.videos[0].videoId);      // ✅ Use this
console.log(video.videos[0].watchCount);   // ✅ Use this
console.log(video.videos[0].url);          // ✅ Full URL available
```

**New fields added in v3.0+:**

List item fields:
- `durationSeconds` (number) - Duration in seconds for easy sorting
- `thumbnailUrl` (string) - Primary thumbnail URL

Details object fields:
- `videoId` (string) - Unique video identifier
- `durationSeconds` (number) - Duration in seconds
- `thumbnailUrls` (string[]) - Array of thumbnail URLs
- `watchCount` (number) - Total views/watches
- `voteCount` (number) - Number of votes/ratings
- `ratingPercent` (number) - Rating percentage (0-100)
- `uploadDate` (string) - Upload date/timestamp
- `description` (string) - Video description text
- `contentUrl` (string) - Direct content URL (if available)
- `tags` (string[]) - Array of tags
- `categories` (string[]) - Array of categories

**Benefits of v3.0+ normalization:**
- ✅ Consistent field naming across all endpoints
- ✅ More robust data extraction from structured HTML
- ✅ Numeric `watchCount` enables easy sorting/filtering
- ✅ `durationSeconds` for precise time-based queries
- ✅ Rich metadata (`tags`, `categories`, `description`) for better content discovery

## API

### Retrieve [Dashboard Videos](https://www.xvideos.com)

```javascript
// Retrieve dashboard videos from the first page
const dashboardList = await xvideos.videos.dashboard({ page: 1 });

// Check if there is a next page of results
console.log(dashboardList.hasNext()); // Outputs: true or false

// Check if there is a previous page of results
console.log(dashboardList.hasPrevious()); // Outputs: true or false

// Refresh the current page of results to get updated data
const refreshedVideos = await dashboardList.refresh();

// Retrieve the next page of dashboard videos if available
const nextVideos = await dashboardList.next();

// Retrieve the previous page of dashboard videos if available
const previousVideos = await dashboardList.previous();
```

### Retrieve [Fresh Videos](https://www.xvideos.com/new/1)

```javascript
// Retrieve fresh videos from the first page
const freshList = await xvideos.videos.fresh({ page: 1 });

// Check if there is a next page of results
console.log(freshList.hasNext()); // Outputs: true or false

// Check if there is a previous page of results
console.log(freshList.hasPrevious()); // Outputs: true or false

// Refresh the current page of results to get updated data
const refreshedVideos = await freshList.refresh();

// Retrieve the next page of fresh videos if available
const nextVideos = await freshList.next();

// Retrieve the previous page of fresh videos if available
const previousVideos = await freshList.previous();
```

### Retrieve [Best Videos](https://www.xvideos.com/best)

```javascript
// Retrieve best videos for a specific year and month, starting from the first page
const bestList = await xvideos.videos.best({ year: '2018', month: '02', page: 1 });

// Check if there is a next page of results
console.log(bestList.hasNext()); // Outputs: true or false

// Check if there is a previous page of results
console.log(bestList.hasPrevious()); // Outputs: true or false

// Refresh the current page of results to get updated data
const refreshedVideos = await bestList.refresh();

// Retrieve the next page of best videos if available
const nextVideos = await bestList.next();

// Retrieve the previous page of best videos if available
const previousVideos = await bestList.previous();
```

### Retrieve [Verified Videos](https://www.xvideos.com/verified/videos)

```javascript
// Retrieve verified videos from the first page
const verifiedList = await xvideos.videos.verified({ page: 1 });

// Check if there is a next page of results
console.log(verifiedList.hasNext()); // Outputs: true or false

// Check if there is a previous page of results
console.log(verifiedList.hasPrevious()); // Outputs: true or false

// Refresh the current page of results to get updated data
const refreshedVideos = await verifiedList.refresh();

// Retrieve the next page of verified videos if available
const nextVideos = await verifiedList.next();

// Retrieve the previous page of verified videos if available
const previousVideos = await verifiedList.previous();
```

### Retrieve [Video Details](https://www.xvideos.com/video36638661/chaturbate_lulacum69_30-05-2018)

```javascript
// Retrieve detailed information about a specific video using its URL
const details = await xvideos.videos.details({ url: 'https://www.xvideos.com/video36638661/chaturbate_lulacum69_30-05-2018' });

// Log detailed information about the video
console.log(details); // Detailed video object with properties like title, videoId, duration, durationSeconds, thumbnailUrls, watchCount, videoType, files, uploadDate, description, contentUrl, tags, categories, voteCount, ratingPercent
```

### Retrieve Many Video Details

```javascript
const batch = await xvideos.videos.detailsMany(
  [
    { url: 'https://www.xvideos.com/video123/example' },
    { url: 'https://www.xvideos.com/video456/example' },
  ],
  {
    concurrency: 3,
    retries: 1,
    retryDelayMs: 250,
    minDelayMs: 500,
  },
);

console.log(batch.items); // One entry per input, preserving order
console.log(batch.successes); // Successful detail payloads only
console.log(batch.failures); // Failed requests with input + error
```

`detailsMany()` is intended for enrichment and crawling flows where you want explicit control over throughput and retry behavior without making list methods heavy by default.

### Filter [Videos](https://www.xvideos.com/?k=threesome)

```javascript
// Search for videos using a keyword, and optionally specify a page number
const videos = await xvideos.videos.search({ k: 'threesome' });
// Example with a specific page number
// const videos = await xvideos.videos.search({ k: 'public', page: 5 });

// Check if there is a next page of results
console.log(videos.hasNext()); // Outputs: true or false

// Check if there is a previous page of results
console.log(videos.hasPrevious()); // Outputs: true or false

// Refresh the current page of results to get updated data
const refreshedVideos = await videos.refresh();

// Retrieve the next page of videos if available
const nextVideos = await videos.next();

// Retrieve the previous page of videos if available
const previousVideos = await videos.previous();

// Search for videos with specific parameters
const videos = await xvideos.videos.search({
  page: 2,
  k: 'threesome',
  sort: 'rating',
  datef: 'week',
  durf: '3-10min',
  quality: 'hd'
});

// Log the search results
console.log(videos); // Array of video objects with properties based on the search parameters
```

#### Params explanation

| Parameter | Default        | Options                                                                                  |
|-----------|----------------|------------------------------------------------------------------------------------------|
| `page`    | `1`            | (any positive integer)                                                                   |
| `k`       | `""`           | (any search keyword)                                                                     |
| `sort`    | `"relevance"`  | `"uploaddate"`, `"rating"`, `"length"`, `"views"`, `"random"`                            |
| `datef`   | `"all"`        | `"today"`, `"week"`, `"month"`, `"3month"`, `"6month"`, `"all"`                         |
| `durf`    | `"allduration"`| `"1-3min"`, `"3-10min"`, `"10min_more"`, `"10-20min"`, `"20min_more"`, `"allduration"` |
| `quality` | `"all"`        | `"hd"`, `"1080P"`, `"all"`                                                                |

## Local Demo Server (Express)

A local Express server is included to demonstrate the library with a web interface. You can browse and interact with all API endpoints via HTTP.

### Setup & Run

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start the server (runs on http://localhost:3000)
node dist/esm/server.js
```

The server will start and print: `Server running at http://localhost:3000`

### Available Endpoints

All endpoints render HTML responses by default. The server scrapes live data from xvideos.com, so results depend on network availability and may be subject to rate-limiting.

#### GET /videos/dashboard
Retrieve dashboard videos (homepage).

```bash
curl http://localhost:3000/videos/dashboard?page=1
```

**Query parameters:**
- `page` (optional, default: `1`) - Page number

---

#### GET /videos/fresh
Retrieve the latest/fresh videos.

```bash
curl http://localhost:3000/videos/fresh?page=1
```

**Query parameters:**
- `page` (optional, default: `1`) - Page number

---

#### GET /videos/best
Retrieve best-rated videos for a specific month.

```bash
curl http://localhost:3000/videos/best?year=2024&month=05&page=1
```

**Query parameters:**
- `year` (optional) - Year (e.g., `2024`)
- `month` (optional) - Month (e.g., `01` to `12`)
- `page` (optional, default: `1`) - Page number

---

#### GET /videos/verified
Retrieve videos from verified creators.

```bash
curl http://localhost:3000/videos/verified?page=1
```

**Query parameters:**
- `page` (optional, default: `1`) - Page number

---

#### GET /videos/search
Search for videos by keyword with optional filters.

```bash
curl "http://localhost:3000/videos/search?k=test&sort=relevance&datef=all&durf=allduration&quality=all&page=1"
```

**Query parameters:**
- `k` (optional, default: `""`) - Search keyword
- `page` (optional, default: `1`) - Page number
- `sort` (optional, default: `"relevance"`) - Sort by: `"relevance"`, `"uploaddate"`, `"rating"`, `"length"`, `"views"`, `"random"`
- `datef` (optional, default: `"all"`) - Date filter: `"today"`, `"week"`, `"month"`, `"3month"`, `"6month"`, `"all"`
- `durf` (optional, default: `"allduration"`) - Duration filter: `"1-3min"`, `"3-10min"`, `"10min_more"`, `"10-20min"`, `"20min_more"`, `"allduration"`
- `quality` (optional, default: `"all"`) - Quality filter: `"hd"`, `"1080P"`, `"all"`

---

#### GET /videos/details
Retrieve detailed information about a specific video.

```bash
curl "http://localhost:3000/videos/details?url=https://www.xvideos.com/video36638661/chaturbate_lulacum69_30-05-2018"
```

**Query parameters:**
- `url` (required) - Full URL of the video (e.g., from a search result)

**Response:** HTML page with detailed video metadata (title, duration, thumbnails, watch count, tags, categories, etc.)

---

#### POST /videos/detailsMany
Retrieve detailed information for multiple videos in batch.

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://www.xvideos.com/video123/...",
      "https://www.xvideos.com/video456/..."
    ]
  }' \
  http://localhost:3000/videos/detailsMany
```

**Request body (JSON):**
```json
{
  "urls": [
    "https://www.xvideos.com/videoId1/...",
    "https://www.xvideos.com/videoId2/..."
  ]
}
```

**Response:** HTML page displaying:
- `Successes` - Array of successfully fetched video details in input order
- `Failures` - Array of failed requests with error details

---

### Example Workflows

**1. Browse fresh videos:**
```bash
# Page 1 of fresh videos
http://localhost:3000/videos/fresh?page=1

# Page 2 of fresh videos
http://localhost:3000/videos/fresh?page=2
```

**2. Search with filters:**
```bash
# Search for "threesome" rated highly this week in HD
http://localhost:3000/videos/search?k=threesome&sort=rating&datef=week&quality=hd&page=1
```

**3. Get video details:**
```bash
# After finding a video URL from search results, get full details
http://localhost:3000/videos/details?url=https://www.xvideos.com/video36638661/chaturbate_lulacum69_30-05-2018
```

**4. Batch fetch details (via curl):**
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"urls":["https://www.xvideos.com/video123/...","https://www.xvideos.com/video456/..."]}' \
  http://localhost:3000/videos/detailsMany
```

### Rate Limiting & Troubleshooting

- **HTTP 429 (Too Many Requests):** The target site is rate-limiting requests. Wait a moment and retry.
- **Network Errors:** Ensure you have internet connectivity; scraping requires access to xvideos.com.
- **Port Already in Use:** If port 3000 is occupied, set `PORT` environment variable:
  ```bash
  PORT=8080 node dist/esm/server.js
  ```

### Development

The server code is in [src/server.ts](src/server.ts). To modify endpoints or styling, edit the file and rebuild:

```bash
npm run build
node dist/esm/server.js
```

---

### License
[Licence](https://github.com/rodrigogs/xvideos/blob/master/LICENSE) © Rodrigo Gomes da Silva
