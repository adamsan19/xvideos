import express from 'express';
import xvideos from './index.js';

function escapeHtml(s: any) {
  if (!s) return '';
  return String(s).replace(/[&<>\"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c] || c));
}

const app = express();
app.use(express.json());

function renderListPage(title: string, pageNum: number, videos: any[], pagination?: any) {
  const items = (videos || [])
    .map((v: any) => {
      const t = escapeHtml(v.title || v.videoId || 'Untitled');
      const url = escapeHtml(v.url || (v.videoId ? `https://www.xvideos.com/${v.videoId}` : '#'));
      const thumb = escapeHtml(v.thumbnailUrl || '');
      return `<li style="margin:8px 0"><a href="${url}" target="_blank">${t}</a> ${v.duration ? `<small>(${escapeHtml(v.duration)})</small>` : ''}${thumb ? `<div><img src="${thumb}" alt="thumb" style="height:80px;margin-top:6px"/></div>` : ''}</li>`;
    })
    .join('\n');

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body>
    <h1>${escapeHtml(title)} — page ${pageNum}</h1>
    <ul style="list-style:none;padding:0">${items}</ul>
    ${pagination ? `<div>Pages: ${escapeHtml(String(pagination.pages || ''))}</div>` : ''}
  </body>
</html>`;
}

app.get('/', (req, res) => res.redirect('/videos/fresh'));

// Dashboard
app.get('/videos/dashboard', async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const list = await xvideos.videos.dashboard({ page });
    res.set('content-type', 'text/html').send(renderListPage('Dashboard Videos', list.pagination?.page || page, list.videos || [], list.pagination));
  } catch (err: any) {
    res.status(500).send(`<pre>${escapeHtml(err?.message || String(err))}</pre>`);
  }
});

// Fresh
app.get('/videos/fresh', async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const list = await xvideos.videos.fresh({ page });
    res.set('content-type', 'text/html').send(renderListPage('Fresh Videos', list.pagination?.page || page, list.videos || [], list.pagination));
  } catch (err: any) {
    res.status(500).send(`<pre>${escapeHtml(err?.message || String(err))}</pre>`);
  }
});

// Best (year, month, page)
app.get('/videos/best', async (req, res) => {
  try {
    const year = String(req.query.year || '');
    const month = String(req.query.month || '');
    const page = Number(req.query.page) || 1;
    const list = await xvideos.videos.best({ year, month, page });
    res.set('content-type', 'text/html').send(renderListPage(`Best Videos ${year}-${month}`, list.pagination?.page || page, list.videos || [], list.pagination));
  } catch (err: any) {
    res.status(500).send(`<pre>${escapeHtml(err?.message || String(err))}</pre>`);
  }
});

// Verified
app.get('/videos/verified', async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const list = await xvideos.videos.verified({ page });
    res.set('content-type', 'text/html').send(renderListPage('Verified Videos', list.pagination?.page || page, list.videos || [], list.pagination));
  } catch (err: any) {
    res.status(500).send(`<pre>${escapeHtml(err?.message || String(err))}</pre>`);
  }
});

// Search
app.get('/videos/search', async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const k = String(req.query.k || '');
    const sort = String(req.query.sort || 'relevance');
    const datef = String(req.query.datef || 'all');
    const durf = String(req.query.durf || 'allduration');
    const quality = String(req.query.quality || 'all');

    const list = await xvideos.videos.search({ page, k, sort, datef, durf, quality });
    res.set('content-type', 'text/html').send(renderListPage(`Search: ${k}`, list.pagination?.page || page, list.videos || [], list.pagination));
  } catch (err: any) {
    res.status(500).send(`<pre>${escapeHtml(err?.message || String(err))}</pre>`);
  }
});

// Details (single)
app.get('/videos/details', async (req, res) => {
  try {
    const url = String(req.query.url || '');
    if (!url) return res.status(400).send('<pre>Missing `url` query parameter</pre>');
    const details = await xvideos.videos.details({ url });
    const body = `<h1>${escapeHtml(details.title || details.videoId || 'Details')}</h1><pre>${escapeHtml(JSON.stringify(details, null, 2))}</pre>`;
    res.set('content-type', 'text/html').send(`<!doctype html><html><body>${body}</body></html>`);
  } catch (err: any) {
    res.status(500).send(`<pre>${escapeHtml(err?.message || String(err))}</pre>`);
  }
});

// Details many (POST JSON { urls: [] })
app.post('/videos/detailsMany', async (req, res) => {
  try {
    const urls = Array.isArray(req.body?.urls) ? req.body.urls : [];
    if (!urls.length) return res.status(400).json({ error: 'Provide JSON body { "urls": [ ... ] }' });
    const inputs = urls.map((u: string) => ({ url: String(u) }));
    const batch = await xvideos.videos.detailsMany(inputs, { concurrency: 2, retries: 1, minDelayMs: 250 });
    const html = `<!doctype html><html><body><h1>DetailsMany</h1><h2>Successes</h2><pre>${escapeHtml(JSON.stringify(batch.successes, null, 2))}</pre><h2>Failures</h2><pre>${escapeHtml(JSON.stringify(batch.failures, null, 2))}</pre></body></html>`;
    res.set('content-type', 'text/html').send(html);
  } catch (err: any) {
    res.status(500).send(`<pre>${escapeHtml(err?.message || String(err))}</pre>`);
  }
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
