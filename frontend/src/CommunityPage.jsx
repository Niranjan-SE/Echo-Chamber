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

function timeAgo(dateStr) {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days  > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
}

function getScoreCfg(score) {
  if (score >= 70) return { color: "#f87171", bg: "#3f0f0f", label: "High Echo" };
  if (score >= 40) return { color: "#fbbf24", bg: "#3f2a0a", label: "Moderate"  };
  return                  { color: "#4ade80", bg: "#052e16", label: "Diverse"   };
}

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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2"
      style={{ animation: "spin 0.8s linear infinite" }}>
      <path d="M21 12a9 9 0 11-6.219-8.56" />
    </svg>
  );
}

function CommunityCard({ item, sessionId }) {
  const [votes,   setVotes]   = useState({ toxic: item.toxic_votes || 0, healthy: item.healthy_votes || 0 });
  const [voted,   setVoted]   = useState(null);
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();
  const src = SOURCES[item.platform] || { color: "#888", bg: "#222", short: "??" };
  const cfg = item.echo_score !== null ? getScoreCfg(item.echo_score) : null;
  const total = votes.toxic + votes.healthy;

  const handleVote = async (e, type) => {
    e.stopPropagation();
    if (voted) return;
    setVoted(type);
    setVotes(prev => ({ ...prev, [type]: prev[type] + 1 }));
    try {
      await axios.post(`${API}/submissions/${item.id}/vote`, { session_id: sessionId, vote_type: type });
    } catch {}
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => navigate(`/analysis/${item.rss_article_id || item.id}`)}
      style={{
        background: hovered ? "#141414" : "#111",
        border: `1px solid ${hovered ? "#2e2e2e" : "#1e1e1e"}`,
        borderRadius: 14, padding: "20px 22px",
        cursor: "pointer", transition: "all 0.18s ease",
        transform: hovered ? "translateY(-1px)" : "none",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 4,
            background: src.bg, border: `1px solid ${src.color}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 8, fontWeight: 700, color: src.color,
          }}>{src.short}</div>
          <span style={{ fontSize: 12, fontWeight: 600, color: src.color, letterSpacing: "0.04em" }}>
            {item.platform?.toUpperCase()}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {cfg && (
            <div style={{
              background: cfg.bg, color: cfg.color,
              fontSize: 11, fontWeight: 600,
              padding: "3px 9px", borderRadius: 99,
              display: "flex", alignItems: "center", gap: 4,
            }}>
              <ScoreArc score={Math.round(item.echo_score)} color={cfg.color} />
              {Math.round(item.echo_score)} · {cfg.label}
            </div>
          )}
          <span style={{ fontSize: 11, color: "#3a3a3a" }}>{timeAgo(item.created_at)}</span>
        </div>
      </div>

      {/* Title */}
      <h3 style={{ fontSize: 15, fontWeight: 500, color: "#e8e8e8", lineHeight: 1.5, marginBottom: 8 }}>
        {item.title || item.url}
      </h3>

      {/* AI Summary */}
      {item.summary && (
        <p style={{ fontSize: 12, color: "#4a4a4a", lineHeight: 1.6, marginBottom: 14 }}>
          {item.summary.slice(0, 160)}{item.summary.length > 160 ? "..." : ""}
        </p>
      )}

      {/* Vote row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={e => e.stopPropagation()}>
        <button onClick={e => handleVote(e, "toxic")} disabled={!!voted} style={{
          display: "flex", alignItems: "center", gap: 5,
          fontSize: 12, padding: "5px 12px", borderRadius: 7,
          border: voted === "toxic" ? "1px solid #f8717155" : "1px solid #252525",
          background: voted === "toxic" ? "#3f0f0f" : "#181818",
          color: voted === "toxic" ? "#f87171" : "#555",
          cursor: voted ? "not-allowed" : "pointer", fontFamily: "inherit",
          transition: "all 0.15s",
        }}>
          🔥 Toxic · {votes.toxic}
        </button>
        <button onClick={e => handleVote(e, "healthy")} disabled={!!voted} style={{
          display: "flex", alignItems: "center", gap: 5,
          fontSize: 12, padding: "5px 12px", borderRadius: 7,
          border: voted === "healthy" ? "1px solid #4ade8055" : "1px solid #252525",
          background: voted === "healthy" ? "#052e16" : "#181818",
          color: voted === "healthy" ? "#4ade80" : "#555",
          cursor: voted ? "not-allowed" : "pointer", fontFamily: "inherit",
          transition: "all 0.15s",
        }}>
          🌱 Healthy · {votes.healthy}
        </button>

        {total > 0 && (
          <div style={{ flex: 1, height: 4, background: "#1a1a1a", borderRadius: 99, overflow: "hidden", marginLeft: 4 }}>
            <div style={{
              height: "100%",
              width: `${Math.round((votes.toxic / total) * 100)}%`,
              background: "linear-gradient(90deg, #f87171, #4ade80)",
              backgroundSize: `${total * 100}% 100%`,
            }} />
            <div style={{ display: "flex", marginTop: 2 }} />
          </div>
        )}

        <span style={{ fontSize: 11, color: "#3a3a3a", marginLeft: "auto" }}>
          View analysis →
        </span>
      </div>
    </div>
  );
}

export default function CommunityPage() {
  const [feed,      setFeed]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [sortBy,    setSortBy]    = useState("Recent");
  const [filterBy,  setFilterBy]  = useState("All");
  const sessionId = "anon-" + Math.random().toString(36).slice(2, 9);
  const navigate  = useNavigate();

  useEffect(() => {
    axios.get(`${API}/submissions/feed`)
      .then(res => setFeed(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sorted = [...feed]
    .filter(item => {
      if (filterBy === "High Echo") return (item.echo_score ?? 0) >= 70;
      if (filterBy === "Diverse")   return (item.echo_score ?? 100) < 40;
      if (filterBy === "Voted")     return (item.vote_count ?? 0) > 0;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "Most Votes")   return (b.vote_count ?? 0) - (a.vote_count ?? 0);
      if (sortBy === "Highest Echo") return (b.echo_score ?? -1) - (a.echo_score ?? -1);
      if (sortBy === "Lowest Echo")  return (a.echo_score ?? 999) - (b.echo_score ?? 999);
      return new Date(b.created_at) - new Date(a.created_at);
    });

  const totalAnalyzed = feed.length;
  const avgEcho = feed.length
    ? Math.round(feed.filter(f => f.echo_score).reduce((s, f) => s + f.echo_score, 0) / feed.filter(f => f.echo_score).length)
    : 0;
  const highEcho = feed.filter(f => (f.echo_score ?? 0) >= 70).length;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse  { 0%,100% { opacity: 0.4; } 50% { opacity: 0.9; } }
        input::placeholder { color: #383838; }
      `}</style>

      {/* NAVBAR */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "#0c0c0cf0", backdropFilter: "blur(16px)",
        borderBottom: "1px solid #1a1a1a",
        padding: "0 28px", height: 62,
        display: "flex", alignItems: "center", gap: 16,
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
              fontWeight: window.location.pathname === path ? 500 : 400,
              color: window.location.pathname === path ? "#f1f1f1" : "#555",
              background: window.location.pathname === path ? "#1c1c1c" : "none",
              border: window.location.pathname === path ? "1px solid #2a2a2a" : "1px solid transparent",
              borderRadius: 8, padding: "8px 15px",
              cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit",
            }}>{label}</button>
          ))}
        </div>
      </nav>

      <main style={{ padding: "26px 28px 60px", maxWidth: 900, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, color: "#f1f1f1", letterSpacing: "-0.025em", lineHeight: 1 }}>
            Community
          </h1>
          <p style={{ fontSize: 14, color: "#474747", marginTop: 7 }}>
            All analyzed articles — vote on how healthy the discourse is
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
          {[
            { label: "Total Analyzed", value: totalAnalyzed, color: "#3b82f6" },
            { label: "High Echo",      value: highEcho,      color: "#dc2626" },
            { label: "Avg Score",      value: avgEcho,       color: "#f59e0b" },
          ].map(s => (
            <div key={s.label} style={{
              background: "#0f0f0f", border: "1px solid #1a1a1a",
              borderRadius: 10, padding: "14px 20px",
              display: "flex", flexDirection: "column", gap: 5,
              width: 160, flexShrink: 0,
            }}>
              <span style={{ fontSize: 10, color: "#383838", fontWeight: 600, letterSpacing: "0.07em" }}>
                {s.label.toUpperCase()}
              </span>
              <span style={{ fontSize: 30, fontWeight: 600, color: s.color, letterSpacing: "-0.03em", lineHeight: 1 }}>
                {loading ? "—" : s.value}
              </span>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div style={{
          background: "#0f0f0f", border: "1px solid #1a1a1a",
          borderRadius: 12, padding: "12px 18px", marginBottom: 20,
          display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#383838", fontWeight: 600, letterSpacing: "0.06em" }}>FILTER</span>
            {["All", "High Echo", "Diverse", "Voted"].map(f => (
              <button key={f} onClick={() => setFilterBy(f)} style={{
                fontSize: 12, padding: "4px 13px", borderRadius: 99,
                border: filterBy === f ? "1px solid #dc2626" : "1px solid #222",
                background: filterBy === f ? "#dc262614" : "#141414",
                color: filterBy === f ? "#dc2626" : "#555",
                cursor: "pointer", fontWeight: filterBy === f ? 600 : 400,
                transition: "all 0.15s", fontFamily: "inherit",
              }}>{f}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
            {["Recent", "Most Votes", "Highest Echo", "Lowest Echo"].map(opt => (
              <button key={opt} onClick={() => setSortBy(opt)} style={{
                fontSize: 12, padding: "4px 12px", borderRadius: 7,
                border: sortBy === opt ? "1px solid #2a2a2a" : "1px solid transparent",
                background: sortBy === opt ? "#1a1a1a" : "none",
                color: sortBy === opt ? "#bbb" : "#444",
                cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit",
              }}>{opt}</button>
            ))}
          </div>
        </div>

        {/* Feed */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{
                background: "#111", border: "1px solid #1e1e1e",
                borderRadius: 14, height: 140,
                animation: "pulse 1.5s ease infinite",
              }} />
            ))}
          </div>
        ) : sorted.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, animation: "fadeIn 0.3s ease" }}>
            {sorted.map(item => (
              <CommunityCard key={item.id} item={item} sessionId={sessionId} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "64px 0" }}>
            <p style={{ fontSize: 15, color: "#333", marginBottom: 8 }}>No analyzed articles yet</p>
            <p style={{ fontSize: 13, color: "#2a2a2a" }}>Go to the feed and analyze some articles first</p>
            <button onClick={() => navigate("/")} style={{
              marginTop: 16, fontSize: 13, color: "#dc2626",
              background: "none", border: "1px solid #dc262633",
              borderRadius: 8, padding: "8px 18px",
              cursor: "pointer", fontFamily: "inherit",
            }}>Go to Feed</button>
          </div>
        )}
      </main>
    </div>
  );
}
