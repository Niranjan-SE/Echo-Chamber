import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";

function getScoreConfig(score) {
  if (score >= 70) return { color: "#f87171", bg: "#3f0f0f", border: "#f8717133", label: "High Echo Chamber", desc: "This content shows strong echo chamber patterns. Diverse perspectives are largely absent." };
  if (score >= 40) return { color: "#fbbf24", bg: "#3f2a0a", border: "#fbbf2433", label: "Moderate Echo",      desc: "Some bias is present but a few different viewpoints are represented." };
  return                  { color: "#4ade80", bg: "#052e16", border: "#4ade8033", label: "Diverse",             desc: "This content shows healthy diversity of perspectives and balanced discourse." };
}

function getEmotionConfig(emotion) {
  const map = {
    anger:   { color: "#f87171", icon: "🔴", bg: "#3f0f0f" },
    fear:    { color: "#a78bfa", icon: "🟣", bg: "#2e1065" },
    joy:     { color: "#4ade80", icon: "🟢", bg: "#052e16" },
    sadness: { color: "#60a5fa", icon: "🔵", bg: "#172554" },
    disgust: { color: "#f97316", icon: "🟠", bg: "#431407" },
    surprise:{ color: "#facc15", icon: "🟡", bg: "#3f2a0a" },
    neutral: { color: "#888",    icon: "⚪", bg: "#1a1a1a" },
  };
  return map[(emotion || "neutral").toLowerCase()] || map.neutral;
}

function EchoGauge({ score }) {
  const cfg  = getScoreConfig(score);
  const size = 200, r = 80, cx = 100, cy = 100;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a1a1a" strokeWidth="14" />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={cfg.color} strokeWidth="14"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: "stroke-dasharray 1s ease" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 44, fontWeight: 700, color: cfg.color, letterSpacing: "-0.04em", lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: 13, color: "#555", marginTop: 2 }}>/ 100</span>
        </div>
      </div>
      <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 99, padding: "6px 16px" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
      </div>
      <p style={{ fontSize: 13, color: "#555", textAlign: "center", maxWidth: 240, lineHeight: 1.6 }}>{cfg.desc}</p>
    </div>
  );
}

function ScoreBar({ label, value, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: "#555", fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color }}>{value}</span>
      </div>
      <div style={{ height: 5, background: "#1a1a1a", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, background: color, borderRadius: 99, transition: "width 1s ease" }} />
      </div>
    </div>
  );
}

function ClusterCard({ cluster, index }) {
  const colors = ["#3b82f6", "#a78bfa", "#f97316", "#ec4899", "#22c55e", "#fbbf24"];
  const color  = colors[index % colors.length];
  return (
    <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: "18px 20px", borderLeft: `3px solid ${color}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#e0e0e0" }}>{cluster.label}</span>
        <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: `${color}18`, color, fontWeight: 600, border: `1px solid ${color}33` }}>
          ~{cluster.count} comments
        </span>
      </div>
      {(cluster.sample_quotes || []).map((q, i) => (
        <div key={i} style={{ fontSize: 12, color: "#4a4a4a", lineHeight: 1.55, paddingLeft: 10, borderLeft: "2px solid #2a2a2a", fontStyle: "italic", marginTop: i > 0 ? 7 : 0 }}>
          "{q}"
        </div>
      ))}
    </div>
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

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  );
}

export default function URLResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id }   = useParams();

  const analysis = location.state?.analysis;
  const url      = location.state?.url || "";
  const [voted,  setVoted]  = useState(null);
  const [votes,  setVotes]  = useState({ toxic: 0, healthy: 0 });

  if (!analysis) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, fontFamily: "inherit" }}>
        <p style={{ color: "#555", fontSize: 15 }}>No analysis data found.</p>
        <button onClick={() => navigate("/")} style={{ color: "#dc2626", background: "none", border: "1px solid #dc262633", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontFamily: "inherit" }}>
          Go back
        </button>
      </div>
    );
  }

  const scoreCfg    = getScoreConfig(Math.round(analysis.echo_score || 0));
  const emotionCfg  = getEmotionConfig(analysis.dominant_emotion);
  const totalVotes  = votes.toxic + votes.healthy;
  const toxicPct    = totalVotes ? Math.round((votes.toxic   / totalVotes) * 100) : 0;
  const healthyPct  = totalVotes ? Math.round((votes.healthy / totalVotes) * 100) : 0;

  const missingList = analysis.missing_perspectives
    ? analysis.missing_perspectives.split(",").filter(Boolean)
    : [];

  let biasClusters = [];
  try {
    biasClusters = typeof analysis.bias_clusters === "string"
      ? JSON.parse(analysis.bias_clusters)
      : (analysis.bias_clusters || []);
  } catch { biasClusters = []; }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* NAVBAR */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "#0c0c0cf0", backdropFilter: "blur(16px)",
        borderBottom: "1px solid #1a1a1a",
        padding: "0 16px", height: "auto", minHeight: 56, flexWrap: "wrap", paddingTop: 8, paddingBottom: 8,        display: "flex", alignItems: "center", gap: 14,
      }}>
        <button onClick={() => navigate("/")} style={{
          display: "flex", alignItems: "center", gap: 7,
          background: "none", border: "1px solid #222",
          color: "#666", fontSize: 13, fontWeight: 500,
          padding: "7px 14px", borderRadius: 8,
          cursor: "pointer", fontFamily: "inherit",
        }}>
          <BackIcon /> Feed
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#f1f1f1", letterSpacing: "-0.02em" }}>EchoChamber</span>
        </div>
        {url && (
          <a href={url} target="_blank" rel="noreferrer" style={{
            display: "flex", alignItems: "center", gap: 6,
            marginLeft: "auto", color: "#555", fontSize: 12,
            textDecoration: "none", border: "1px solid #222",
            padding: "7px 14px", borderRadius: 8,
          }}>
            <LinkIcon /> View Original
          </a>
        )}
      </nav>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 28px 72px", animation: "fadeIn 0.3s ease" }}>

        {/* URL header */}
        <div style={{
          background: "#0f0f0f", border: "1px solid #1a1a1a",
          borderRadius: 14, padding: "20px 24px", marginBottom: 28,
          borderLeft: "4px solid #dc2626",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600, letterSpacing: "0.05em" }}>URL ANALYSIS</span>
          </div>
          <p style={{ fontSize: 13, color: "#555", wordBreak: "break-all" }}>{url}</p>
        </div>

        {/* Row 1: Gauge + Sub-scores + Emotion */}
        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 180px", gap: 16, marginBottom: 20 }}>
          <div style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 14, padding: "28px 20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#383838", fontWeight: 600, letterSpacing: "0.07em", marginBottom: 20 }}>ECHO SCORE</span>
            <EchoGauge score={Math.round(analysis.echo_score || 0)} />
          </div>

          <div style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 14, padding: "24px 28px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 20 }}>
            <span style={{ fontSize: 11, color: "#383838", fontWeight: 600, letterSpacing: "0.07em" }}>BREAKDOWN</span>
            <ScoreBar label="Echo Chamber Score" value={Math.round(analysis.echo_score     || 0)} color={scoreCfg.color} />
            <ScoreBar label="Toxicity Score"      value={Math.round(analysis.toxicity_score || 0)} color="#f87171" />
            <ScoreBar label="Diversity Score"     value={Math.round(analysis.diversity_score || 0)} color="#4ade80" />
          </div>

          <div style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 14, padding: "24px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <span style={{ fontSize: 11, color: "#383838", fontWeight: 600, letterSpacing: "0.07em" }}>DOMINANT EMOTION</span>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: emotionCfg.bg, border: `1px solid ${emotionCfg.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
              {emotionCfg.icon}
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: emotionCfg.color, textTransform: "capitalize" }}>
              {analysis.dominant_emotion || "Neutral"}
            </span>
          </div>
        </div>

        {/* AI Summary */}
        {analysis.summary && (
          <div style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 14, padding: "24px 28px", marginBottom: 20 }}>
            <span style={{ fontSize: 11, color: "#383838", fontWeight: 600, letterSpacing: "0.07em", display: "block", marginBottom: 14 }}>AI SUMMARY</span>
            <p style={{ fontSize: 15, color: "#aaa", lineHeight: 1.75 }}>{analysis.summary}</p>
          </div>
        )}

        {/* Bias Clusters */}
        {biasClusters.length > 0 && (
          <div style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 14, padding: "24px 28px", marginBottom: 20 }}>
            <span style={{ fontSize: 11, color: "#383838", fontWeight: 600, letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>BIAS CLUSTERS</span>
            <p style={{ fontSize: 12, color: "#3a3a3a", marginBottom: 18 }}>Opinion groups detected in the discourse</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {biasClusters.map((cluster, i) => <ClusterCard key={i} cluster={cluster} index={i} />)}
            </div>
          </div>
        )}

        {/* Missing Voices */}
        {missingList.length > 0 && (
          <div style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 14, padding: "24px 28px", marginBottom: 20 }}>
            <span style={{ fontSize: 11, color: "#383838", fontWeight: 600, letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>MISSING VOICES</span>
            <p style={{ fontSize: 12, color: "#3a3a3a", marginBottom: 18 }}>Perspectives not present in this discussion</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {missingList.map((text, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "#111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#dc2626", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "#777" }}>{text.trim()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Community Vote */}
        <div style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 14, padding: "24px 28px" }}>
          <span style={{ fontSize: 11, color: "#383838", fontWeight: 600, letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>COMMUNITY VERDICT</span>
          <p style={{ fontSize: 12, color: "#3a3a3a", marginBottom: 20 }}>How does the community rate this discourse?</p>
          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            {[["toxic", "🔥", "Toxic", "#f87171", "#3f0f0f", "#f8717166"], ["healthy", "🌱", "Healthy", "#4ade80", "#052e16", "#4ade8066"]].map(([type, emoji, label, color, bg, border]) => (
              <button key={type} onClick={() => { if (!voted) { setVoted(type); setVotes(p => ({ ...p, [type]: p[type] + 1 })); } }}
                disabled={!!voted}
                style={{
                  flex: 1, padding: "14px", borderRadius: 10,
                  border: voted === type ? `1px solid ${border}` : "1px solid #2a2a2a",
                  background: voted === type ? bg : "#141414",
                  color: voted === type ? color : "#555",
                  fontSize: 14, fontWeight: 600,
                  cursor: voted ? "not-allowed" : "pointer",
                  transition: "all 0.15s", fontFamily: "inherit",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                <span style={{ fontSize: 18 }}>{emoji}</span>
                {label} · {votes[type]}
              </button>
            ))}
          </div>
          {totalVotes > 0 && (
            <div>
              <div style={{ display: "flex", height: 6, borderRadius: 99, overflow: "hidden", background: "#1a1a1a" }}>
                <div style={{ width: `${toxicPct}%`,   background: "#f87171", transition: "width 0.5s ease" }} />
                <div style={{ width: `${healthyPct}%`, background: "#4ade80", transition: "width 0.5s ease" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <span style={{ fontSize: 11, color: "#f87171" }}>{toxicPct}% toxic</span>
                <span style={{ fontSize: 11, color: "#4ade80" }}>{healthyPct}% healthy</span>
              </div>
            </div>
          )}
          {voted && <p style={{ fontSize: 12, color: "#3a3a3a", marginTop: 12, textAlign: "center" }}>Thanks for your vote!</p>}
        </div>
      </main>
    </div>
  );
}
