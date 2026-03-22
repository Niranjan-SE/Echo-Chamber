const db                 = require('../db');
const { scrapeUrl }      = require('../services/scraperService');
const { analyzeContent } = require('../services/geminiService');

// GET /api/articles — paginated RSS feed
async function getArticles(req, res) {
  const { tag, source, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  try {
    let query = `
      SELECT
        a.id, a.source, a.title, a.url, a.summary,
        a.tags, a.published_at, a.fetched_at, a.analysis_id,
        an.echo_score, an.toxicity_score, an.dominant_emotion, an.diversity_score,
an.summary AS ai_summary, an.missing_perspectives, an.bias_clusters
      FROM rss_articles a
      LEFT JOIN analyses an ON an.id = a.analysis_id
      WHERE 1=1
    `;
    const params = [];
    let i = 1;

    if (source) { query += ` AND a.source = $${i++}`;         params.push(source); }
    if (tag)    { query += ` AND $${i++} = ANY(a.tags)`;      params.push(tag);    }

    query += ` ORDER BY a.fetched_at DESC LIMIT $${i++} OFFSET $${i++}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('getArticles error:', err);
    res.status(500).json({ error: err.message });
  }
}

// POST /api/articles/:id/analyze — analyze an RSS article
async function analyzeArticle(req, res) {
  const { id } = req.params;

  try {
    // 1. Fetch the article
    const articleRes = await db.query(
      `SELECT * FROM rss_articles WHERE id = $1`, [id]
    );
    if (!articleRes.rows.length) {
      return res.status(404).json({ error: 'Article not found' });
    }
    const art = articleRes.rows[0];

    // 2. Return cached result if analysis already exists
    if (art.analysis_id) {
      const existing = await db.query(
        `SELECT * FROM analyses WHERE id = $1`, [art.analysis_id]
      );
      if (existing.rows.length) {
        return res.json({ cached: true, data: existing.rows[0] });
      }
    }

    // 3. Check if already analyzed via submissions table (double safety)
    const prevSub = await db.query(
      `SELECT a.* FROM analyses a
       JOIN submissions s ON s.id = a.submission_id
       WHERE s.url = $1 AND s.status = 'done'
       ORDER BY a.created_at DESC
       LIMIT 1`,
      [art.url]
    );
    if (prevSub.rows.length) {
      // Link it back so we don't check again next time
      await db.query(
        `UPDATE rss_articles SET analysis_id = $1 WHERE id = $2`,
        [prevSub.rows[0].id, id]
      );
      return res.json({ cached: true, data: prevSub.rows[0] });
    }

    // 4. Create a submission record for this RSS article
    const subRes = await db.query(
      `INSERT INTO submissions (url, title, platform, source_type, rss_article_id, status)
       VALUES ($1, $2, $3, 'rss', $4, 'pending')
       RETURNING id`,
      [art.url, art.title, art.source, art.id]
    );
    const submissionId = subRes.rows[0].id;

    // 5. Scrape the article content
    let scraped;
    try {
      scraped = await scrapeUrl(art.url);
    } catch {
      // Fall back to using the summary if scraping fails
      scraped = {
  comments: art.summary
    ? `Article title: ${art.title}\n\nSummary: ${art.summary}`
    : `Analyze this news headline and predict likely discourse patterns: "${art.title}" published by ${art.source}`,
  platform: art.source,
  title:    art.title,
};
    }

    // 6. Send to Gemini for analysis
    const analysis = await analyzeContent({
      comments: scraped.comments,
      platform: art.source,
      title:    art.title,
    });

    if (!analysis.success) {
      await db.query(
        `UPDATE submissions SET status = 'failed' WHERE id = $1`, [submissionId]
      );
      return res.status(500).json({ error: 'AI analysis failed', detail: analysis.error });
    }

    const d = analysis.data;

    // 7. Save the analysis result
    const saved = await db.query(
      `INSERT INTO analyses
         (submission_id, echo_score, diversity_score, toxicity_score,
          dominant_emotion, summary, missing_perspectives, bias_clusters)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        submissionId,
        d.echo_score,
        d.diversity_score,
        d.toxicity_score,
        d.dominant_emotion,
        d.summary,
        d.missing_perspectives,
        JSON.stringify(d.bias_clusters),
      ]
    );

    const analysisId = saved.rows[0].id;

    // 8. Link analysis back to the RSS article (this is what prevents re-analysis)
    await db.query(
      `UPDATE rss_articles SET analysis_id = $1 WHERE id = $2`,
      [analysisId, id]
    );

    // 9. Mark submission as done
    await db.query(
      `UPDATE submissions SET status = 'done' WHERE id = $1`, [submissionId]
    );

    return res.json({ cached: false, data: saved.rows[0] });

  } catch (err) {
    console.error('analyzeArticle error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getArticles, analyzeArticle };