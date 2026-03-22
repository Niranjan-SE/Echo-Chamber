import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const SOURCES = {
  "The Hindu":       { color: "#22c55e", bg: "#052e16", short: "TH" },
  "NDTV":            { color: "#3b82f6", bg: "#172554", short: "ND" },
  "Indian Express":  { color: "#f97316", bg: "#431407", short: "IE" },
  "NewsLaundry":     { color: "#ec4899", bg: "#500724", short: "NL" },
};

function getScoreConfig(score) {
  if (score >= 70) return { color: "#f87171", bg: "#3f0f0f", border: "#f8717133", label: "High Echo Chamber", desc: "This content shows strong echo chamber patterns. Diverse perspectives are largely absent." };
  if (score >= 40) return { color: "#fbbf24", bg: "#3f2a0a", border: "#fbbf2433", label: "Moderate Echo",      desc: "Some bias is present but a few different viewpoints are represented." };
  return                 { color: "#4ade80", bg: "#052e16", border: "#4ade8033", label: "Diverse",             desc: "This content shows healthy diversity of perspectives and balanced discourse." };
}

function getEmotionConfig(emotion) {
  const map = {
    anger:    { color: "#f87171", icon: "🔴", bg: "#3f0f0f" },
    fear:     { color: "#a78bfa", icon: "🟣", bg: "#2e1065" },
    joy:      { color: "#4ade80", icon: "🟢", bg: "#052e16" },
    sadness:  { color: "#60a5fa", icon: "🔵", bg: "#172554" },
    disgust:  { color: "#f97316", icon: "🟠", bg: "#431407" },
    surprise: { color: "#facc15", icon: "🟡", bg: "#3f2a0a" },
    neutral:  { color: "#888",    icon: "⚪", bg: "#1a1a1a" },
  };
  return map[(emotion || "neutral").toLowerCase()] || map.neutral;
}

// Big circular gauge for echo score
function EchoGauge({ score }) {
  const cfg  = getScoreConfig(score);
  const size = 200;
  const r    = 80;
  const cx   = size / 2;
  const cy   = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Track */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a1a1a" strokeWidth="14" />
          {/* Score arc */}
          <circle cx={cx} cy={cy} r={r} fill="none"
            stroke={cfg.color} strokeWidth="14"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: "stroke-dasharray 1s ease" }}
          />
        </svg>
        {/* Center text */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 44, fontWeight: 700, color: cfg.color, letterSpacing: "-0.04em", lineHeight: 1 }}>
            {score}
          </span>
          <span style={{ fontSize: 13, color: "#555", marginTop: 2 }}>/ 100</span>
        </div>
      </div>

      <div style={{
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        borderRadius: 99, padding: "6px 16px", textAlign: "center",
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
      </div>

      <p style={{ fontSize: 13, color: "#555", textAlign: "center", maxWidth: 240, lineHeight: 1.6 }}>
        {cfg.desc}
      </p>
    </div>
  );
}

// Mini bar for sub-scores
function ScoreBar({ label, value, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#555", fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color }}>{value}</span>
      </div>
      <div style={{ height: 5, background: "#1a1a1a", borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${value}%`,
          background: color, borderRadius: 99,
          transition: "width 1s ease",
        }} />
      </div>
    </div>
  );
}

// Bias cluster card
function ClusterCard({ cluster, index }) {
  const colors = ["#3b82f6", "#a78bfa", "#f97316", "#ec4899", "#22c55e", "#fbbf24"];
  const color  = colors[index % colors.length];

  return (
    <div style={{
      background: "#111", border: "1px solid #1e1e1e",
      borderRadius: 12, padding: "18px 20px",
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#e0e0e0" }}>{cluster.label}</span>
        <span style={{
          fontSize: 11, padding: "3px 10px", borderRadius: 99,
          background: `${color}18`, color, fontWeight: 600, border: `1px solid ${color}33`,
        }}>
          ~{cluster.count} comments
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {(cluster.sample_quotes || []).map((quote, i) => (
          <div key={i} style={{
            fontSize: 12, color: "#4a4a4a", lineHeight: 1.55,
            paddingLeft: 10, borderLeft: `2px solid #2a2a2a`,
            fontStyle: "italic",
          }}>
            "{quote}"
          </div>
        ))}
      </div>
    </div>
  );
}

// Missing perspective pill
function MissingPill({ text }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      background: "#111", border: "1px solid #1e1e1e",
      borderRadius: 10, padding: "10px 14px",
    }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#dc2626", flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: "#777" }}>{text.trim()}</span>
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2"
      style={{ animation: "spin 0.8s linear infinite" }}>
      <path d="M21 12a9 9 0 11-6.219-8.56" />
    </svg>
  );
}

export default function AnalysisPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [article,   setArticle]   = useState(null);
  const [analysis,  setAnalysis]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [voted,     setVoted]     = useState(null); // 'toxic' | 'healthy'
  const [votes,     setVotes]     = useState({ toxic: 0, healthy: 0 });
  const [error,     setError]     = useState(null);

  useEffect(() => {
    // Load article info
    axios.get(`${API}/articles`)
      .then(res => {
        const found = res.data.find(a => String(a.id) === String(id));
        if (found) {
          setArticle(found);
          // If already analyzed, set the analysis data
          if (found.echo_score !== null && found.echo_score !== undefined) {
            setAnalysis({
              echo_score:           found.echo_score,
              toxicity_score:       found.toxicity_score,
              dominant_emotion:     found.dominant_emotion,
              summary:              found.ai_summary || found.summary,
              diversity_score:      found.diversity_score,
              missing_perspectives: found.missing_perspectives,
              bias_clusters:        found.bias_clusters,
            });
          }
        } else {
          setError("Article not found");
        }
      })
      .catch(() => setError("Could not load article"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await axios.post(`${API}/articles/${id}/analyze`);
      setAnalysis(res.data.data);
    } catch (err) {
      setError("Analysis failed — " + (err.response?.data?.error || err.message));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleVote = (type) => {
    if (voted) return;
    setVoted(type);
    setVotes(prev => ({ ...prev, [type]: prev[type] + 1 }));
  };

  const totalVotes   = votes.toxic + votes.healthy;
  const toxicPct     = totalVotes ? Math.round((votes.toxic   / totalVotes) * 100) : 0;
  const healthyPct   = totalVotes ? Math.round((votes.healthy / totalVotes) * 100) : 0;
  const src          = SOURCES[article?.source] || { color: "#888", bg: "#222", short: "??" };
  const emotionCfg   = getEmotionConfig(analysis?.dominant_emotion);
  const scoreCfg     = analysis ? getScoreConfig(analysis.echo_score) : null;

  const missingList  = analysis?.missing_perspectives
    ? analysis.missing_perspectives.split(",").filter(Boolean)
    : [];

  let biasClusters = [];
  try {
    biasClusters = typeof analysis?.bias_clusters === "string"
      ? JSON.parse(analysis.bias_clusters)
      : (analysis?.bias_clusters || []);
  } catch { biasClusters = []; }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <SpinnerIcon />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <p style={{ color: "#555", fontSize: 15 }}>{error}</p>
        <button onClick={() => navigate("/")} style={{ color: "#dc2626", background: "none", border: "1px solid #dc262633", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontFamily: "inherit" }}>
          Go back
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse   { 0%,100% { opacity: 0.4; } 50% { opacity: 0.9; } }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "#0c0c0cf0", backdropFilter: "blur(16px)",
        borderBottom: "1px solid #1a1a1a",
        padding: "0 28px", height: 62,
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <button onClick={() => navigate("/")} style={{
          display: "flex", alignItems: "center", gap: 7,
          background: "none", border: "1px solid #222",
          color: "#666", fontSize: 13, fontWeight: 500,
          padding: "7px 14px", borderRadius: 8,
          cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
        }}>
          <BackIcon /> Feed
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#f1f1f1", letterSpacing: "-0.02em" }}>
            EchoChamber
          </span>
        </div>

        {article && (
          <a href={article.url} target="_blank" rel="noreferrer" style={{
            display: "flex", alignItems: "center", gap: 6,
            marginLeft: "auto", color: "#555", fontSize: 12,
            textDecoration: "none", border: "1px solid #222",
            padding: "7px 14px", borderRadius: 8, transition: "all 0.15s",
          }}>
            <LinkIcon /> View Original
          </a>
        )}
      </nav>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 28px 72px", animation: "fadeIn 0.3s ease" }}>

        {/* ── ARTICLE HEADER ── */}
        {article && (
          <div style={{
            background: "#0f0f0f", border: "1px solid #1a1a1a",
            borderRadius: 14, padding: "24px 28px", marginBottom: 28,
            borderLeft: `4px solid ${src.color}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 4,
                background: src.bg, border: `1px solid ${src.color}44`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 8, fontWeight: 700, color: src.color,
              }}>
                {src.short}
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: src.color, letterSpacing: "0.05em" }}>
                {article.source?.toUpperCase()}
              </span>
              <span style={{ fontSize: 12, color: "#3a3a3a", marginLeft: 4 }}>
                · {new Date(article.fetched_at || article.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: "#f1f1f1", lineHeight: 1.45, marginBottom: 12, letterSpacing: "-0.01em" }}>
              {article.title}
            </h1>
            {article.summary && (
              <p style={{ fontSize: 14, color: "#555", lineHeight: 1.65 }}>
                {article.summary}
              </p>
            )}
            <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
              {(article.tags || []).map(tag => (
                <span key={tag} style={{
                  fontSize: 11, padding: "3px 10px", borderRadius: 99,
                  background: "#181818", color: "#555",
                  border: "1px solid #252525", fontWeight: 500,
                }}>{tag}</span>
              ))}
            </div>
          </div>
        )}

        {/* ── NOT YET ANALYZED ── */}
        {!analysis && !analyzing && (
          <div style={{
            background: "#0f0f0f", border: "1px solid #1a1a1a",
            borderRadius: 14, padding: "48px 28px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
            textAlign: "center", marginBottom: 28,
          }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: "#dc262614", border: "1px solid #dc262633", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
                <line x1="7" y1="12" x2="17" y2="12" />
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 500, color: "#e0e0e0", marginBottom: 6 }}>Not yet analyzed</p>
              <p style={{ fontSize: 13, color: "#555" }}>Run AI analysis to see the echo chamber score, bias clusters, and missing perspectives.</p>
            </div>
            <button onClick={handleAnalyze} style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "#dc2626", color: "#fff",
              border: "none", borderRadius: 10,
              fontSize: 14, fontWeight: 600,
              padding: "12px 28px", cursor: "pointer",
              fontFamily: "inherit", transition: "all 0.15s",
            }}>
              Run Echo Chamber Analysis
            </button>
          </div>
        )}

        {/* ── ANALYZING LOADER ── */}
        {analyzing && (
          <div style={{
            background: "#0f0f0f", border: "1px solid #1a1a1a",
            borderRadius: 14, padding: "56px 28px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
            textAlign: "center", marginBottom: 28,
          }}>
            <SpinnerIcon />
            <p style={{ fontSize: 14, color: "#555" }}>Analyzing with Gemini AI — this takes 5–15 seconds...</p>
            <div style={{ display: "flex", gap: 8 }}>
              {["Scraping content", "Detecting bias clusters", "Scoring perspectives"].map((step, i) => (
                <span key={i} style={{
                  fontSize: 11, padding: "4px 12px", borderRadius: 99,
                  background: "#1a1a1a", color: "#444",
                  animation: `pulse 1.5s ease ${i * 0.3}s infinite`,
                }}>{step}</span>
              ))}
            </div>
          </div>
        )}

        {/* ── ANALYSIS RESULTS ── */}
        {analysis && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20, animation: "fadeIn 0.4s ease" }}>

            {/* Row 1: Gauge + Sub-scores + Emotion */}
            <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 180px", gap: 16 }}>

              {/* Echo Gauge */}
              <div style={{
                background: "#0f0f0f", border: "1px solid #1a1a1a",
                borderRadius: 14, padding: "28px 20px",
                display: "flex", flexDirection: "column", alignItems: "center",
              }}>
                <span style={{ fontSize: 11, color: "#383838", fontWeight: 600, letterSpacing: "0.07em", marginBottom: 20 }}>
                  ECHO SCORE
                </span>
                <EchoGauge score={Math.round(analysis.echo_score || 0)} />
              </div>

              {/* Sub-scores */}
              <div style={{
                background: "#0f0f0f", border: "1px solid #1a1a1a",
                borderRadius: 14, padding: "24px 28px",
                display: "flex", flexDirection: "column", justifyContent: "center", gap: 20,
              }}>
                <span style={{ fontSize: 11, color: "#383838", fontWeight: 600, letterSpacing: "0.07em" }}>
                  BREAKDOWN
                </span>
                <ScoreBar label="Echo Chamber Score"  value={Math.round(analysis.echo_score     || 0)} color={scoreCfg.color} />
                <ScoreBar label="Toxicity Score"       value={Math.round(analysis.toxicity_score || 0)} color="#f87171" />
                <ScoreBar label="Diversity Score"      value={Math.round(analysis.diversity_score || 0)} color="#4ade80" />
              </div>

              {/* Dominant Emotion */}
              <div style={{
                background: "#0f0f0f", border: "1px solid #1a1a1a",
                borderRadius: 14, padding: "24px 20px",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
              }}>
                <span style={{ fontSize: 11, color: "#383838", fontWeight: 600, letterSpacing: "0.07em" }}>
                  DOMINANT EMOTION
                </span>
                <div style={{
                  width: 64, height: 64, borderRadius: 16,
                  background: emotionCfg.bg,
                  border: `1px solid ${emotionCfg.color}33`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 28,
                }}>
                  {emotionCfg.icon}
                </div>
                <span style={{ fontSize: 15, fontWeight: 600, color: emotionCfg.color, textTransform: "capitalize" }}>
                  {analysis.dominant_emotion || "Neutral"}
                </span>
              </div>
            </div>

            {/* Row 2: AI Summary */}
            {analysis.summary && (
              <div style={{
                background: "#0f0f0f", border: "1px solid #1a1a1a",
                borderRadius: 14, padding: "24px 28px",
              }}>
                <span style={{ fontSize: 11, color: "#383838", fontWeight: 600, letterSpacing: "0.07em", display: "block", marginBottom: 14 }}>
                  AI SUMMARY
                </span>
                <p style={{ fontSize: 15, color: "#aaa", lineHeight: 1.75 }}>
                  {analysis.summary}
                </p>
              </div>
            )}

            {/* Row 3: Bias Clusters */}
            {biasClusters.length > 0 && (
              <div style={{
                background: "#0f0f0f", border: "1px solid #1a1a1a",
                borderRadius: 14, padding: "24px 28px",
              }}>
                <span style={{ fontSize: 11, color: "#383838", fontWeight: 600, letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>
                  BIAS CLUSTERS
                </span>
                <p style={{ fontSize: 12, color: "#3a3a3a", marginBottom: 18 }}>
                  Opinion groups detected in the discourse
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                  {biasClusters.map((cluster, i) => (
                    <ClusterCard key={i} cluster={cluster} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Row 4: Missing Perspectives */}
            {missingList.length > 0 && (
              <div style={{
                background: "#0f0f0f", border: "1px solid #1a1a1a",
                borderRadius: 14, padding: "24px 28px",
              }}>
                <span style={{ fontSize: 11, color: "#383838", fontWeight: 600, letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>
                  MISSING VOICES
                </span>
                <p style={{ fontSize: 12, color: "#3a3a3a", marginBottom: 18 }}>
                  Perspectives not present in this discussion
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {missingList.map((text, i) => (
                    <MissingPill key={i} text={text} />
                  ))}
                </div>
              </div>
            )}

            {/* Row 5: Community Vote */}
            <div style={{
              background: "#0f0f0f", border: "1px solid #1a1a1a",
              borderRadius: 14, padding: "24px 28px",
            }}>
              <span style={{ fontSize: 11, color: "#383838", fontWeight: 600, letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>
                COMMUNITY VERDICT
              </span>
              <p style={{ fontSize: 12, color: "#3a3a3a", marginBottom: 20 }}>
                How does the community rate this discourse?
              </p>

              <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                <button
                  onClick={() => handleVote("toxic")}
                  disabled={!!voted}
                  style={{
                    flex: 1, padding: "14px", borderRadius: 10,
                    border: voted === "toxic" ? "1px solid #f8717166" : "1px solid #2a2a2a",
                    background: voted === "toxic" ? "#3f0f0f" : "#141414",
                    color: voted === "toxic" ? "#f87171" : "#555",
                    fontSize: 14, fontWeight: 600,
                    cursor: voted ? "not-allowed" : "pointer",
                    transition: "all 0.15s", fontFamily: "inherit",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  <span style={{ fontSize: 18 }}>🔥</span>
                  Toxic · {votes.toxic}
                </button>

                <button
                  onClick={() => handleVote("healthy")}
                  disabled={!!voted}
                  style={{
                    flex: 1, padding: "14px", borderRadius: 10,
                    border: voted === "healthy" ? "1px solid #4ade8066" : "1px solid #2a2a2a",
                    background: voted === "healthy" ? "#052e16" : "#141414",
                    color: voted === "healthy" ? "#4ade80" : "#555",
                    fontSize: 14, fontWeight: 600,
                    cursor: voted ? "not-allowed" : "pointer",
                    transition: "all 0.15s", fontFamily: "inherit",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  <span style={{ fontSize: 18 }}>🌱</span>
                  Healthy · {votes.healthy}
                </button>
              </div>

              {totalVotes > 0 && (
                <div>
                  <div style={{ display: "flex", height: 6, borderRadius: 99, overflow: "hidden", background: "#1a1a1a" }}>
                    <div style={{ width: `${toxicPct}%`, background: "#f87171", transition: "width 0.5s ease" }} />
                    <div style={{ width: `${healthyPct}%`, background: "#4ade80", transition: "width 0.5s ease" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                    <span style={{ fontSize: 11, color: "#f87171" }}>{toxicPct}% toxic</span>
                    <span style={{ fontSize: 11, color: "#4ade80" }}>{healthyPct}% healthy</span>
                  </div>
                </div>
              )}

              {voted && (
                <p style={{ fontSize: 12, color: "#3a3a3a", marginTop: 12, textAlign: "center" }}>
                  Thanks for your vote!
                </p>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
