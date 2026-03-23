import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const SOURCES = {
  "The Hindu":       { color: "#22c55e", bg: "#052e16", short: "TH" },
  "NDTV":            { color: "#3b82f6", bg: "#172554", short: "ND" },
  "Indian Express":  { color: "#f97316", bg: "#431407", short: "IE" },
  "NewsLaundry":     { color: "#ec4899", bg: "#500724", short: "NL" },
};

function ScoreArc({ score, color, size = 13 }) {
  const r = size / 2 - 2, c = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
      <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth="2"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${c} ${c})`} />
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

function RankRow({ item, rank, type }) {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();
  const src      = SOURCES[item.platform] || { color: "#888", bg: "#222", short: "??" };
  const score    = type === "toxic" ? item.echo_score : item.diversity_score;
  const color    = type === "toxic" ? "#f87171" : "#4ade80";
  const rankColors = ["#f59e0b", "#9ca3af", "#cd7c2f"];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => navigate(`/analysis/${item.rss_article_id || item.id}`)}
      style={{
        display: "flex", alignItems: "center", gap: 16,
        background: hovered ? "#141414" : "#111",
        border: `1px solid ${hovered ? "#2e2e2e" : "#1e1e1e"}`,
        borderRadius: 12, padding: "16px 20px",
        cursor: "pointer", transition: "all 0.15s",
      }}
    >
      {/* Rank number */}
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: rank <= 3 ? `${rankColors[rank - 1]}18` : "#181818",
        border: `1px solid ${rank <= 3 ? rankColors[rank - 1] + "44" : "#252525"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, fontWeight: 700,
        color: rank <= 3 ? rankColors[rank - 1] : "#3a3a3a",
      }}>
        {rank <= 3 ? ["🥇","🥈","🥉"][rank - 1] : `#${rank}`}
      </div>

      {/* Source badge */}
      <div style={{ flexShrink: 0 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 4,
          background: src.bg, border: `1px solid ${src.color}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 8, fontWeight: 700, color: src.color,
        }}>{src.short}</div>
      </div>

      {/* Title */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 14, fontWeight: 500, color: "#e0e0e0",
          lineHeight: 1.4, margin: 0,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {item.title || item.url}
        </p>
        <p style={{ fontSize: 11, color: "#3a3a3a", marginTop: 3 }}>
          {item.platform}
        </p>
      </div>

      {/* Score */}
      <div style={{
        display: "flex", alignItems: "center", gap: 5,
        background: type === "toxic" ? "#3f0f0f" : "#052e16",
        border: `1px solid ${color}33`,
        padding: "5px 12px", borderRadius: 99, flexShrink: 0,
      }}>
        <ScoreArc score={Math.round(score || 0)} color={color} size={13} />
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{Math.round(score || 0)}</span>
        <span style={{ fontSize: 10, color: `${color}88` }}>/ 100</span>
      </div>

      <span style={{ fontSize: 11, color: "#2a2a2a", flexShrink: 0 }}>View →</span>
    </div>
  );
}

function EmptyState({ label }) {
  const navigate = useNavigate();
  return (
    <div style={{
      background: "#0f0f0f", border: "1px solid #1a1a1a",
      borderRadius: 12, padding: "48px 28px",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center",
    }}>
      <p style={{ fontSize: 14, color: "#333" }}>No {label} yet</p>
      <p style={{ fontSize: 12, color: "#2a2a2a" }}>Analyze articles from the feed to populate the leaderboard</p>
      <button onClick={() => navigate("/")} style={{
        marginTop: 8, fontSize: 13, color: "#dc2626",
        background: "none", border: "1px solid #dc262633",
        borderRadius: 8, padding: "7px 16px",
        cursor: "pointer", fontFamily: "inherit",
      }}>Go to Feed</button>
    </div>
  );
}

export default function LeaderboardPage() {
  const [data,    setData]    = useState({ mostToxic: [], mostHealthy: [] });
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState("toxic");
  const navigate  = useNavigate();

  useEffect(() => {
    axios.get(`${API}/submissions/leaderboard`)
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const topToxic   = data.mostToxic   || [];
  const topHealthy = data.mostHealthy || [];
  const topScore   = tab === "toxic"
    ? (topToxic[0]?.echo_score     ?? 0)
    : (topHealthy[0]?.diversity_score ?? 0);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse  { 0%,100% { opacity: 0.4; } 50% { opacity: 0.9; } }
      `}</style>

      {/* NAVBAR */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "#0c0c0cf0", backdropFilter: "blur(16px)",
        borderBottom: "1px solid #1a1a1a",
        padding: "0 16px", height: "auto", minHeight: 56, flexWrap: "wrap", paddingTop: 8, paddingBottom: 8,        display: "flex", alignItems: "center", gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => navigate("/")}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <span style={{ fontSize: 17, fontWeight: 600, color: "#f1f1f1", letterSpacing: "-0.02em" }}>EchoChamber</span>
        </div>
        <div style={{ display: "flex", gap: 3, marginLeft: "auto" }}>
          {[["Feed", "/"], ["Community", "/community"], ["Leaderboard", "/leaderboard"]].map(([label, path]) => (
            <button key={label} onClick={() => navigate(path)} style={{
              fontSize: 14,
              fontWeight: path === "/leaderboard" ? 500 : 400,
              color: path === "/leaderboard" ? "#f1f1f1" : "#555",
              background: path === "/leaderboard" ? "#1c1c1c" : "none",
              border: path === "/leaderboard" ? "1px solid #2a2a2a" : "1px solid transparent",
              borderRadius: 8, padding: "8px 15px",
              cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit",
            }}>{label}</button>
          ))}
        </div>
      </nav>

      <main style={{ padding: "16px 14px 60px", maxWidth: 860, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, color: "#f1f1f1", letterSpacing: "-0.025em", lineHeight: 1 }}>
            Leaderboard
          </h1>
          <p style={{ fontSize: 14, color: "#474747", marginTop: 7 }}>
            Most toxic and most diverse discussions analyzed on EchoChamber
          </p>
        </div>

        {/* Top stat banner */}
        {!loading && (topToxic.length > 0 || topHealthy.length > 0) && (
          <div style={{
            background: tab === "toxic" ? "#3f0f0f" : "#052e16",
            border: `1px solid ${tab === "toxic" ? "#f8717133" : "#4ade8033"}`,
            borderRadius: 14, padding: "20px 28px", marginBottom: 24,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <p style={{ fontSize: 12, color: tab === "toxic" ? "#f87171aa" : "#4ade80aa", fontWeight: 600, letterSpacing: "0.06em", marginBottom: 4 }}>
                {tab === "toxic" ? "🔥 MOST TOXIC DISCUSSION" : "🌱 MOST DIVERSE DISCUSSION"}
              </p>
              <p style={{ fontSize: 16, fontWeight: 500, color: "#e0e0e0", lineHeight: 1.4, maxWidth: 560 }}>
                {tab === "toxic"
                  ? (topToxic[0]?.title   || "No data yet")
                  : (topHealthy[0]?.title || "No data yet")
                }
              </p>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{ fontSize: 11, color: tab === "toxic" ? "#f87171aa" : "#4ade80aa", marginBottom: 2 }}>
                {tab === "toxic" ? "ECHO SCORE" : "DIVERSITY SCORE"}
              </p>
              <p style={{ fontSize: 40, fontWeight: 700, color: tab === "toxic" ? "#f87171" : "#4ade80", letterSpacing: "-0.04em", lineHeight: 1 }}>
                {Math.round(topScore)}
              </p>
            </div>
          </div>
        )}

        {/* Tab switcher */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          <button onClick={() => setTab("toxic")} style={{
            flex: 1, padding: "12px", borderRadius: 10,
            border: tab === "toxic" ? "1px solid #f8717144" : "1px solid #1e1e1e",
            background: tab === "toxic" ? "#3f0f0f" : "#111",
            color: tab === "toxic" ? "#f87171" : "#555",
            fontSize: 14, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            🔥 Most Toxic
            <span style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 99,
              background: tab === "toxic" ? "#f8717122" : "#1a1a1a",
              color: tab === "toxic" ? "#f87171" : "#444",
            }}>{topToxic.length}</span>
          </button>
          <button onClick={() => setTab("healthy")} style={{
            flex: 1, padding: "12px", borderRadius: 10,
            border: tab === "healthy" ? "1px solid #4ade8044" : "1px solid #1e1e1e",
            background: tab === "healthy" ? "#052e16" : "#111",
            color: tab === "healthy" ? "#4ade80" : "#555",
            fontSize: 14, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            🌱 Most Diverse
            <span style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 99,
              background: tab === "healthy" ? "#4ade8022" : "#1a1a1a",
              color: tab === "healthy" ? "#4ade80" : "#444",
            }}>{topHealthy.length}</span>
          </button>
        </div>

        {/* Rankings */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{
                background: "#111", border: "1px solid #1e1e1e",
                borderRadius: 12, height: 72,
                animation: "pulse 1.5s ease infinite",
              }} />
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, animation: "fadeIn 0.3s ease" }}>
            {tab === "toxic" ? (
              topToxic.length > 0
                ? topToxic.map((item, i) => <RankRow key={item.id} item={item} rank={i + 1} type="toxic" />)
                : <EmptyState label="toxic discussions" />
            ) : (
              topHealthy.length > 0
                ? topHealthy.map((item, i) => <RankRow key={item.id} item={item} rank={i + 1} type="healthy" />)
                : <EmptyState label="diverse discussions" />
            )}
          </div>
        )}

        {/* Source breakdown */}
        {!loading && (topToxic.length > 0 || topHealthy.length > 0) && (
          <div style={{
            marginTop: 28, background: "#0f0f0f", border: "1px solid #1a1a1a",
            borderRadius: 14, padding: "22px 24px",
          }}>
            <p style={{ fontSize: 11, color: "#383838", fontWeight: 600, letterSpacing: "0.07em", marginBottom: 16 }}>
              SOURCE BREAKDOWN
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {Object.entries(
                [...topToxic, ...topHealthy].reduce((acc, item) => {
                  acc[item.platform] = (acc[item.platform] || 0) + 1;
                  return acc;
                }, {})
              ).map(([src, count]) => {
                const s = SOURCES[src] || { color: "#888", bg: "#222" };
                return (
                  <div key={src} style={{
                    background: s.bg, border: `1px solid ${s.color}33`,
                    borderRadius: 8, padding: "8px 14px",
                    display: "flex", flexDirection: "column", gap: 3,
                  }}>
                    <span style={{ fontSize: 10, color: s.color, fontWeight: 600, letterSpacing: "0.05em" }}>
                      {src.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 20, fontWeight: 700, color: s.color, lineHeight: 1 }}>
                      {count}
                    </span>
                    <span style={{ fontSize: 10, color: `${s.color}88` }}>articles</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
