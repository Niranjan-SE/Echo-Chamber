const db              = require('../db');
const { scrapeUrl }   = require('../services/scraperService');
const { analyzeContent } = require('../services/geminiService');

// POST /api/submissions — submit a URL for analysis
async function submitUrl(req, res) {
  const { url, session_id } = req.body;

  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    // Check if already analyzed
    const existing = await db.query(
      `SELECT s.id, s.status, a.echo_score, a.diversity_score, a.toxicity_score,
              a.dominant_emotion, a.summary, a.missing_perspectives, a.bias_clusters
       FROM submissions s
       LEFT JOIN analyses a ON a.submission_id = s.id
       WHERE s.url = $1 AND s.status = 'done'
       LIMIT 1`,
      [url]
    );

    if (existing.rows.length > 0) {
      return res.json({ cached: true, data: existing.rows[0] });
    }

    // Create submission record
    const sub = await db.query(
      `INSERT INTO submissions (url, session_id, source_type, status)
       VALUES ($1, $2, 'manual', 'pending') RETURNING id`,
      [url, session_id || null]
    );
    const submissionId = sub.rows[0].id;

    // Scrape
    let scraped;
    try {
      scraped = await scrapeUrl(url);
    } catch (err) {
      await db.query(`UPDATE submissions SET status = 'failed' WHERE id = $1`, [submissionId]);
      return res.status(422).json({ error: 'Could not scrape this URL', detail: err.message });
    }

    // Update submission with title/platform
    await db.query(
      `UPDATE submissions SET title = $1, platform = $2 WHERE id = $3`,
      [scraped.title, scraped.platform, submissionId]
    );

    // Analyze with Gemini
    const analysis = await analyzeContent({
      comments: scraped.comments,
      platform: scraped.platform,
      title:    scraped.title,
    });

    if (!analysis.success) {
      await db.query(`UPDATE submissions SET status = 'failed' WHERE id = $1`, [submissionId]);
      return res.status(500).json({ error: 'AI analysis failed', detail: analysis.error });
    }

    const d = analysis.data;

    // Save analysis
    const saved = await db.query(
      `INSERT INTO analyses
         (submission_id, echo_score, diversity_score, toxicity_score,
          dominant_emotion, summary, missing_perspectives, bias_clusters)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
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

    // Mark submission done
    await db.query(`UPDATE submissions SET status = 'done' WHERE id = $1`, [submissionId]);

    return res.json({ cached: false, submissionId, data: saved.rows[0] });

  } catch (err) {
    console.error('submitUrl error:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
}

// POST /api/submissions/:id/vote
async function castVote(req, res) {
  const { id }                    = req.params;
  const { session_id, vote_type } = req.body;

  if (!['toxic', 'healthy'].includes(vote_type)) {
    return res.status(400).json({ error: 'vote_type must be toxic or healthy' });
  }

  try {
    await db.query(
      `INSERT INTO votes (submission_id, session_id, vote_type)
       VALUES ($1, $2, $3)
       ON CONFLICT (submission_id, session_id)
       DO UPDATE SET vote_type = $3`,
      [id, session_id, vote_type]
    );

    const counts = await db.query(
      `SELECT vote_type, COUNT(*) FROM votes WHERE submission_id = $1 GROUP BY vote_type`,
      [id]
    );

    res.json({ votes: counts.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/submissions/feed — community feed
async function getCommunityFeed(req, res) {
  try {
    const rows = await db.query(
      `SELECT s.id, s.url, s.title, s.platform, s.created_at,
              a.echo_score, a.toxicity_score, a.dominant_emotion, a.summary,
              COUNT(v.id) AS vote_count
       FROM submissions s
       LEFT JOIN analyses a ON a.submission_id = s.id
       LEFT JOIN votes    v ON v.submission_id = s.id
       WHERE s.status = 'done'
       GROUP BY s.id, a.echo_score, a.toxicity_score, a.dominant_emotion, a.summary
       ORDER BY s.created_at DESC
       LIMIT 50`
    );
    res.json(rows.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/submissions/leaderboard
async function getLeaderboard(req, res) {
  try {
    const toxic = await db.query(
      `SELECT s.id, s.url, s.title, s.platform, a.echo_score, a.toxicity_score
       FROM submissions s JOIN analyses a ON a.submission_id = s.id
       WHERE s.status = 'done'
       ORDER BY a.echo_score DESC LIMIT 10`
    );
    const healthy = await db.query(
      `SELECT s.id, s.url, s.title, s.platform, a.echo_score, a.diversity_score
       FROM submissions s JOIN analyses a ON a.submission_id = s.id
       WHERE s.status = 'done'
       ORDER BY a.diversity_score DESC LIMIT 10`
    );
    res.json({ mostToxic: toxic.rows, mostHealthy: healthy.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { submitUrl, castVote, getCommunityFeed, getLeaderboard };
