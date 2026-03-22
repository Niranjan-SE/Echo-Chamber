const Parser   = require('rss-parser');
const cron     = require('node-cron');
const db       = require('../db');

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'EchoChamberBot/1.0' },
});

const RSS_FEEDS = [
  { name: 'The Hindu',      url: 'https://www.thehindu.com/feeder/default.rss' },
  { name: 'NDTV',           url: 'https://feeds.feedburner.com/ndtvnews-top-stories' },
  { name: 'Indian Express', url: 'https://indianexpress.com/feed/' },
  { name: 'NewsLaundry',    url: 'https://www.newslaundry.com/feed' },
];

// Simple keyword → tag mapper
function inferTags(title = '', summary = '') {
  const text = (title + ' ' + summary).toLowerCase();
  const tags = [];
  if (/politic|bjp|congress|modi|parliament|election|govt|government/.test(text)) tags.push('Politics');
  if (/economy|gdp|rbi|rupee|inflation|market|startup|fund/.test(text)) tags.push('Economy');
  if (/tech|ai|software|startup|app|data|cyber|internet/.test(text)) tags.push('Tech');
  if (/climate|environment|pollution|forest|carbon|solar|energy/.test(text)) tags.push('Environment');
  if (/world|global|china|us|russia|pakistan|un|nato/.test(text)) tags.push('World');
  if (/media|journalist|news|press|fact.check/.test(text)) tags.push('Media');
  return tags.length ? tags : ['General'];
}

async function fetchFeed(feed) {
  try {
    const parsed = await parser.parseURL(feed.url);
    let saved = 0;

    for (const item of parsed.items.slice(0, 15)) {
      const url     = item.link?.trim();
      const title   = item.title?.trim();
      const summary = item.contentSnippet?.trim()
  || item.summary?.trim()
  || item.content?.trim()
  || item['content:encoded']?.replace(/<[^>]+>/g, '').trim()
  || item.description?.trim()
  || '';
      const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
      const tags    = inferTags(title, summary);

      if (!url || !title) continue;

      try {
        await db.query(
          `INSERT INTO rss_articles (source, title, url, summary, tags, published_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (url) DO NOTHING`,
          [feed.name, title, url, summary, tags, pubDate]
        );
        saved++;
      } catch (e) {
        // Silently skip duplicates
      }
    }

    console.log(`📰 ${feed.name}: saved ${saved} new articles`);
  } catch (err) {
    console.error(`❌ RSS fetch failed for ${feed.name}:`, err.message);
  }
}

async function fetchAllFeeds() {
  console.log('🔄 Fetching all RSS feeds...');
  await Promise.all(RSS_FEEDS.map(fetchFeed));
  console.log('✅ RSS fetch complete');
}

function startRssFetcher() {
  // Fetch immediately on startup
  fetchAllFeeds();

  // Then every 3 hours
  cron.schedule('0 */3 * * *', fetchAllFeeds);
  console.log('⏰ RSS fetcher scheduled every 3 hours');
}

module.exports = { startRssFetcher, fetchAllFeeds };
