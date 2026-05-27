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

function formatWatchCount(count: any): string {
  if (!count) return '';
  const n = Number(count);
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

function formatDuration(seconds: any): string {
  if (!seconds) return '';
  const s = Number(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

const app = express();
app.use(express.json());

function renderListPage(title: string, pageNum: number, videos: any[], pagination?: any) {
  const items = (videos || [])
    .map((v: any) => {
      const videoTitle = escapeHtml(v.title || v.videoId || 'Untitled');
      const videoUrl = escapeHtml(v.url || (v.videoId ? `https://www.xvideos.com/${v.videoId}` : '#'));
      const thumbnail = escapeHtml(v.thumbnailUrl || '');
      const watchCount = v.watchCount ? formatWatchCount(v.watchCount) : '';
      const duration = v.duration || (v.durationSeconds ? formatDuration(v.durationSeconds) : '');
      const profile = escapeHtml(v.profile || '');
      
      return `
        <div style="border:1px solid #ddd;border-radius:6px;padding:12px;margin-bottom:12px;display:flex;gap:12px;background:#f9f9f9">
          ${thumbnail ? `<div style="flex-shrink:0"><img src="${thumbnail}" alt="thumb" style="height:100px;width:auto;border-radius:4px;object-fit:cover"/></div>` : ''}
          <div style="flex:1;display:flex;flex-direction:column;gap:6px">
            <a href="${videoUrl}" target="_blank" style="font-weight:bold;color:#0066cc;text-decoration:none;font-size:16px">${videoTitle}</a>
            <div style="display:flex;gap:16px;font-size:13px;color:#666">
              ${duration ? `<span>⏱️ ${escapeHtml(duration)}</span>` : ''}
              ${watchCount ? `<span>👁️ ${watchCount} views</span>` : ''}
              ${profile ? `<span>👤 ${profile}</span>` : ''}
            </div>
          </div>
        </div>`;
    })
    .join('\n');

  const paginationHtml = pagination && pagination.pages && pagination.pages.length > 0
    ? `<div style="margin-top:20px;padding:12px;background:#f0f0f0;border-radius:6px">
         <strong>Pages:</strong> ${(pagination.pages || []).slice(0, 10).map((p: any) => p === pageNum ? `<strong>${p}</strong>` : `<a href="?page=${p}">${p}</a>`).join(' | ')}
         ${pagination.pages.length > 10 ? ' ... and more' : ''}
       </div>` : '';

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; background: #fff; }
      h1 { color: #333; margin-bottom: 20px; }
      a { color: #0066cc; text-decoration: none; }
      a:hover { text-decoration: underline; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)} — page ${pageNum}</h1>
    <div style="display:flex;flex-direction:column;gap:12px">${items}</div>
    ${paginationHtml}
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
    
    const thumbsHtml = (details.thumbnailUrls || [])
      .map((t: string) => `<img src="${escapeHtml(t)}" alt="thumb" style="height:150px;border-radius:4px;margin:8px 8px 0 0"/>`)
      .join('');
    
    const tagsHtml = (details.tags || []).length > 0 
      ? `<div style="margin-top:12px"><strong>Tags:</strong> ${(details.tags || []).map((t: string) => `<span style="display:inline-block;background:#e0e0e0;padding:4px 8px;margin:4px;border-radius:3px">${escapeHtml(t)}</span>`).join('')}</div>`
      : '';
    
    const categoriesHtml = (details.categories || []).length > 0
      ? `<div style="margin-top:12px"><strong>Categories:</strong> ${(details.categories || []).map((c: string) => `<span style="display:inline-block;background:#d4edda;padding:4px 8px;margin:4px;border-radius:3px">${escapeHtml(c)}</span>`).join('')}</div>`
      : '';

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(details.title || 'Video Details')}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
      h1 { color: #333; margin-bottom: 20px; }
      .detail { background: #fff; padding: 20px; border-radius: 6px; margin-bottom: 12px; }
      .label { font-weight: bold; color: #666; margin-top: 12px; }
      .value { color: #333; margin-top: 4px; }
      a { color: #0066cc; text-decoration: none; }
      a:hover { text-decoration: underline; }
      .stat { display: inline-block; margin-right: 20px; }
    </style>
  </head>
  <body>
    <div class="detail">
      <h1>${escapeHtml(details.title || 'Video Details')}</h1>
      
      <div class="stat">
        <span style="font-size:24px">👁️</span>
        <div style="font-size:13px;color:#666">Views</div>
        <div style="font-size:18px;font-weight:bold">${formatWatchCount(details.watchCount)}</div>
      </div>
      
      ${details.durationSeconds ? `<div class="stat">
        <span style="font-size:24px">⏱️</span>
        <div style="font-size:13px;color:#666">Duration</div>
        <div style="font-size:18px;font-weight:bold">${escapeHtml(formatDuration(details.durationSeconds))}</div>
      </div>` : ''}
      
      ${details.uploadDate ? `<div class="stat">
        <span style="font-size:24px">📅</span>
        <div style="font-size:13px;color:#666">Uploaded</div>
        <div style="font-size:14px;font-weight:bold">${escapeHtml(details.uploadDate)}</div>
      </div>` : ''}
      
      ${details.ratingPercent !== undefined ? `<div class="stat">
        <span style="font-size:24px">⭐</span>
        <div style="font-size:13px;color:#666">Rating</div>
        <div style="font-size:18px;font-weight:bold">${Math.round(details.ratingPercent)}%</div>
      </div>` : ''}

      ${details.thumbnailUrls && details.thumbnailUrls.length > 0 ? `
      <div class="label">Thumbnails:</div>
      <div style="display:flex;flex-wrap:wrap;margin-top:12px">${thumbsHtml}</div>` : ''}

      ${details.description ? `
      <div class="label">Description:</div>
      <div class="value" style="margin-top:8px;padding:12px;background:#f9f9f9;border-radius:4px;border-left:3px solid #0066cc">${escapeHtml(details.description)}</div>` : ''}

      ${tagsHtml}
      ${categoriesHtml}

      ${details.url ? `
      <div class="label">Full Video:</div>
      <div class="value"><a href="${escapeHtml(details.url)}" target="_blank">Open on xvideos.com →</a></div>` : ''}
      
      <div class="label" style="margin-top:20px">Raw Metadata (JSON):</div>
      <pre style="background:#f5f5f5;padding:12px;border-radius:4px;overflow-x:auto;font-size:12px">${escapeHtml(JSON.stringify(details, null, 2))}</pre>
    </div>
  </body>
</html>`;
    
    res.set('content-type', 'text/html').send(html);
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
    
    const successesHtml = (batch.successes || [])
      .map((d: any, i: number) => `
        <div style="border:1px solid #d4edda;border-radius:6px;padding:12px;margin-bottom:12px;background:#f1f9f6">
          <div style="font-weight:bold;color:#155724;margin-bottom:8px">[${i + 1}] ${escapeHtml(d.title || d.videoId || 'Untitled')}</div>
          <div style="display:flex;gap:16px;font-size:13px;color:#666">
            ${d.durationSeconds ? `<span>⏱️ ${formatDuration(d.durationSeconds)}</span>` : ''}
            ${d.watchCount ? `<span>👁️ ${formatWatchCount(d.watchCount)} views</span>` : ''}
            ${d.uploadDate ? `<span>📅 ${escapeHtml(d.uploadDate)}</span>` : ''}
          </div>
          <div style="margin-top:8px;font-size:12px"><a href="${escapeHtml(d.url || '')}" target="_blank" style="color:#0066cc">View video →</a></div>
        </div>
      `).join('');
    
    const failuresHtml = (batch.failures || [])
      .map((f: any, i: number) => `
        <div style="border:1px solid #f5c6cb;border-radius:6px;padding:12px;margin-bottom:12px;background:#f8d7da">
          <div style="font-weight:bold;color:#721c24;margin-bottom:4px">[${i + 1}] Error</div>
          <div style="font-size:12px;color:#721c24">${escapeHtml(f.error?.message || String(f.error) || 'Unknown error')}</div>
          <div style="font-size:11px;color:#999;margin-top:4px">URL: ${escapeHtml(f.input?.url || 'N/A')}</div>
        </div>
      `).join('');

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Batch Details Results</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
      h1 { color: #333; margin-bottom: 12px; }
      .summary { background: #fff; padding: 12px; border-radius: 6px; margin-bottom: 20px; font-size: 14px; }
      .section { margin-bottom: 20px; }
      .section h2 { color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 8px; margin-bottom: 12px; }
      a { color: #0066cc; text-decoration: none; }
      a:hover { text-decoration: underline; }
    </style>
  </head>
  <body>
    <h1>📦 Batch Details Results</h1>
    <div class="summary">
      <div><strong>Total:</strong> ${urls.length} URLs</div>
      <div><strong>Successes:</strong> <span style="color:#28a745;font-weight:bold">${(batch.successes || []).length}</span></div>
      <div><strong>Failures:</strong> <span style="color:#dc3545;font-weight:bold">${(batch.failures || []).length}</span></div>
    </div>

    ${batch.successes && batch.successes.length > 0 ? `
    <div class="section">
      <h2>✅ Successful Fetches (${batch.successes.length})</h2>
      ${successesHtml}
    </div>` : ''}

    ${batch.failures && batch.failures.length > 0 ? `
    <div class="section">
      <h2>❌ Failed Fetches (${batch.failures.length})</h2>
      ${failuresHtml}
    </div>` : ''}

    <div style="margin-top:20px;padding:12px;background:#f9f9f9;border-radius:6px;border-left:3px solid #999">
      <div style="font-size:12px;color:#666;font-family:monospace"><strong>Raw JSON:</strong></div>
      <pre style="background:#fff;padding:12px;border-radius:4px;overflow-x:auto;font-size:11px;margin-top:8px">${escapeHtml(JSON.stringify(batch, null, 2))}</pre>
    </div>
  </body>
</html>`;
    
    res.set('content-type', 'text/html').send(html);
  } catch (err: any) {
    res.status(500).send(`<pre>${escapeHtml(err?.message || String(err))}</pre>`);
  }
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
