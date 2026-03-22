const axios   = require('axios');
const cheerio = require('cheerio');

// Detect platform from URL
function detectPlatform(url) {
  if (url.includes('reddit.com'))  return 'reddit';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  if (url.includes('thehindu.com'))    return 'thehindu';
  if (url.includes('ndtv.com'))        return 'ndtv';
  if (url.includes('thewire.in'))      return 'thewire';
  if (url.includes('indianexpress'))   return 'indianexpress';
  if (url.includes('scroll.in'))       return 'scroll';
  if (url.includes('newslaundry'))     return 'newslaundry';
  return 'news';
}

// Reddit — use JSON API
async function scrapeReddit(url) {
  const jsonUrl = url.replace(/\/$/, '') + '.json?limit=100';
  const res = await axios.get(jsonUrl, {
    headers: { 'User-Agent': 'EchoChamberBot/1.0' },
    timeout: 10000,
  });

  const post     = res.data[0]?.data?.children?.[0]?.data;
  const comments = res.data[1]?.data?.children || [];

  const title = post?.title || '';
  const texts = comments
    .map(c => c?.data?.body)
    .filter(Boolean)
    .slice(0, 80);

  return { title, comments: texts.join('\n\n'), platform: 'Reddit' };
}

// Generic news article — scrape article body + comments section
async function scrapeGeneric(url, platform) {
  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    timeout: 10000,
  });

  const $ = cheerio.load(res.data);

  // Title
  const title = $('h1').first().text().trim()
    || $('title').text().trim()
    || 'Unknown';

  // Article body paragraphs
  const paragraphs = [];
$('article p, .article-body p, .story-element p, .content p, .full-details p, [class*="story"] p, [class*="article"] p, p').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 40) paragraphs.push(text);
  });

  // Comment sections (Disqus, native, etc.)
  const commentTexts = [];
  $('.comment-text, .comment-body, .disqus-comment, [class*="comment"] p').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20) commentTexts.push(text);
  });

  const combined = [
    ...paragraphs.slice(0, 20),
    '--- COMMENTS ---',
    ...commentTexts.slice(0, 50),
  ].join('\n\n');

  return {
    title,
    comments: combined || paragraphs.slice(0, 30).join('\n\n'),
    platform: platform.charAt(0).toUpperCase() + platform.slice(1),
  };
}

async function scrapeUrl(url) {
  const platform = detectPlatform(url);

  try {
    if (platform === 'reddit') return await scrapeReddit(url);
    return await scrapeGeneric(url, platform);
  } catch (err) {
    throw new Error(`Failed to scrape URL: ${err.message}`);
  }
}

module.exports = { scrapeUrl, detectPlatform };
