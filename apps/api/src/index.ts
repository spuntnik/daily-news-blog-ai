import { Hono } from 'hono';
const app = new Hono();
app.get('/', c => c.json({ ok: true, name: 'NewsFlow API' }));
// News
app.get('/api/news/ingest', c => c.json({ todo: 'news ingest' }));
// AI
app.post('/api/ai/category', c => c.json({ todo: 'category detection' }));
app.post('/api/ai/keywords', c => c.json({ todo: 'keyword intelligence' }));
app.post('/api/ai/generate', c => c.json({ todo: 'blog generation' }));
// WP Publisher
app.post('/api/wp/publish', c => c.json({ todo: 'publish to WordPress' }));
// Cron
app.get('/api/cron/daily-ingest', c => c.json({ ok: true, note: 'protected by CRON_SECRET' }));
// Admin
app.post('/api/admin/users', c => c.json({ todo: 'admin users' }));
app.post('/api/admin/keys', c => c.json({ todo: 'admin keys' }));
export default app;
