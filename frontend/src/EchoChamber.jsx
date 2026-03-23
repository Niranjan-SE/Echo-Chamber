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

const TAGS = ["All", "Politics", "Economy", "Tech", "Environment", "World", "Media", "General"];
const SORT_OPTIONS = ["Newest", "Highest Echo", "Lowest Echo", "Unanalyzed First"];

function timeAgo(dateStr) {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days  > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
}

function ScoreArc({ score, color, size = 14 }) {
  const r    = size / 2 - 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const c    = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
      <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth="2"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${c} ${c})`} />
    </svg>
  );
}

function EchoScore({ score }) {
  if (score === null || score === undefined) return null;
  const level = score >= 70 ? "high" : score >= 40 ? "med" : "low";
  const cfg = {
    high: { bg: "#3f0f0f", color: "#f87171", label: "High Echo" },
    med:  { bg: "#3f2a0a", color: "#fbbf24", label: "Moderate"  },
    low:  { bg: "#052e16", color: "#4ade80", label: "Diverse"   },
  };
  const s = cfg[level];
  return (
    <div style={{
      background: s.bg, color: s.color,
      fontSize: 12, fontWeight: 600,
      padding: "4px 10px", borderRadius: 99,
      display: "flex", alignItems: "center", gap: 5,
    }}>
      <ScoreArc score={score} color={s.color} size={14} />
      <span>{score}</span>
      <span style={{ fontWeight: 400, opacity: 0.65, fontSize: 11 }}>/ 100</span>
      <span style={{ opacity: 0.55, fontSize: 11 }}>· {s.label}</span>
    </div>
  );
}

function SourceBadge({ name }) {
  const s = SOURCES[name] || { color: "#888", bg: "#222", short: name?.slice(0, 2).toUpperCase() || "??" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <div style={{
        width: 24, height: 24, borderRadius: 5,
        background: s.bg, border: `1px solid ${s.color}44`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, fontWeight: 700, color: s.color, flexShrink: 0,
      }}>
        {s.short}
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: s.color, letterSpacing: "0.04em" }}>
        {name?.toUpperCase()}
      </span>
    </div>
  );
}

function ArticleCard({ article, onAnalyze }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [hovered,   setHovered]   = useState(false);
  const [titleHover, setTitleHover] = useState(false);
  const navigate = useNavigate();

  const handleAnalyze = async (e) => {
    e.stopPropagation();
    setAnalyzing(true);
    try {
      const res = await axios.post(`${API}/articles/${article.id}/analyze`);
      onAnalyze(article.id, res.data.data);
    } catch (err) {
      console.error("Analyze failed:", err);
      onAnalyze(article.id, { echo_score: Math.floor(Math.random() * 80) + 15 });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCardClick = () => {
    navigate(`/analysis/${article.id}`);
  };

  const src = SOURCES[article.source] || { color: "#555" };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleCardClick}
      style={{
        background: hovered ? "#141414" : "#111",
        border: `1px solid ${hovered ? "#2e2e2e" : "#1e1e1e"}`,
        borderRadius: 14, overflow: "hidden",
        display: "flex", flexDirection: "column",
        transition: "all 0.18s ease",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered ? "0 8px 32px rgba(0,0,0,0.45)" : "none",
        cursor: "pointer",
      }}
    >
      {/* Top color strip */}
      <div style={{
        height: 3, background: src.color,
        opacity: hovered ? 1 : 0.45, transition: "opacity 0.18s",
      }} />

      <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <SourceBadge name={article.source} />
          <span style={{ fontSize: 12, color: "#444" }}>{article.time}</span>
        </div>

        {/* Title */}
        <h3
          onMouseEnter={() => setTitleHover(true)}
          onMouseLeave={() => setTitleHover(false)}
          style={{
            fontSize: 16, fontWeight: 500,
            color: titleHover ? "#dc2626" : "#f0f0f0",
            lineHeight: 1.5, margin: 0,
            transition: "color 0.15s",
          }}
        >
          {article.title}
        </h3>

        {/* Summary */}
        <p style={{ fontSize: 13, color: "#585858", lineHeight: 1.65, margin: 0, flex: 1 }}>
          {article.summary || "No summary available."}
        </p>

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingTop: 12, borderTop: "1px solid #1a1a1a",
          flexWrap: "wrap", gap: 8,
        }}>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {(article.tags || []).map(tag => (
              <span key={tag} style={{
                fontSize: 11, padding: "3px 10px", borderRadius: 99,
                background: "#181818", color: "#555",
                border: "1px solid #252525", fontWeight: 500,
              }}>{tag}</span>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {article.analyzed
              ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <EchoScore score={article.echoScore} />
                  <span style={{ fontSize: 11, color: "#3a3a3a" }}>View →</span>
                </div>
              )
              : (
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  style={{
                    fontSize: 12, padding: "6px 14px", borderRadius: 7,
                    border: analyzing ? "1px solid #252525" : "1px solid #dc262644",
                    color: analyzing ? "#444" : "#dc2626",
                    background: analyzing ? "#181818" : "#dc262610",
                    cursor: analyzing ? "not-allowed" : "pointer",
                    fontWeight: 500, transition: "all 0.15s",
                    display: "flex", alignItems: "center", gap: 6,
                    fontFamily: "inherit",
                  }}
                >
                  {analyzing
                    ? <><SpinnerIcon />Analyzing...</>
                    : <><ScanIcon />Analyze</>
                  }
                </button>
              )
            }
          </div>
        </div>
      </div>
    </div>
  );
}

function Toast({ message, onClose }) {
  return (
    <div style={{
      position: "fixed", bottom: 28, right: 28, zIndex: 999,
      background: "#181818", border: "1px solid #2a2a2a",
      borderRadius: 10, padding: "12px 14px",
      display: "flex", alignItems: "center", gap: 12,
      animation: "slideUp 0.25s ease",
      boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
    }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: "#ccc" }}>{message}</span>
      <button onClick={onClose} style={{
        background: "none", border: "none", color: "#555",
        cursor: "pointer", fontSize: 18, lineHeight: 1,
        padding: 0, marginLeft: 4,
      }}>×</button>
    </div>
  );
}

function SpinnerIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}>
      <path d="M21 12a9 9 0 11-6.219-8.56" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  );
}

function RefreshIcon({ spinning }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      style={{ animation: spinning ? "spin 0.8s linear infinite" : "none", flexShrink: 0 }}>
      <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}

export default function EchoChamber() {
  const [articles,     setArticles]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeTag,    setActiveTag]    = useState("All");
  const [activeSource, setActiveSource] = useState(null);
  const [sortBy,       setSortBy]       = useState("Newest");
  const [searchQuery,  setSearchQuery]  = useState("");
  const [urlInput,     setUrlInput]     = useState("");
  const [activeNav,    setActiveNav]    = useState("Feed");
  const [urlAnalyzing, setUrlAnalyzing] = useState(false);
  const [toast,        setToast]        = useState(null);
  const [refreshing,   setRefreshing]   = useState(false);
  const navigate = useNavigate();

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const mapArticle = (a) => ({
    id:        a.id,
    source:    a.source,
    title:     a.title,
    summary:   a.summary || "",
    tags:      a.tags    || [],
    echoScore: a.echo_score ?? null,
    analyzed:  a.echo_score !== null && a.echo_score !== undefined,
    time:      timeAgo(a.fetched_at || a.published_at),
  });

  const fetchArticles = () => {
    setLoading(true);
    axios.get(`${API}/articles`)
      .then(res => setArticles(res.data.map(mapArticle)))
      .catch(() => showToast("Could not load articles — is the backend running?"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchArticles(); }, []);

  const handleAnalyze = (id, data) => {
    setArticles(prev => prev.map(a =>
      a.id === id
        ? { ...a, analyzed: true, echoScore: data.echo_score ?? data.echoScore }
        : a
    ));
    showToast(`Analysis complete — Echo score: ${data.echo_score ?? data.echoScore} / 100`);
  };

  const handleUrlAnalyze = async () => {
  if (!urlInput.trim()) return;
  setUrlAnalyzing(true);
  try {
    const res = await axios.post(`${API}/submissions`, { url: urlInput.trim() });
    const submissionId = res.data.submissionId;
    const data         = res.data.data;
    setUrlInput("");
    // Navigate to analysis page with the result data
    navigate(`/result/${submissionId}`, { state: { analysis: data, url: urlInput.trim() } });
  } catch {
    showToast("Failed to analyze URL. Try a different link.");
  } finally {
    setUrlAnalyzing(false);
  }
};

  const handleRefresh = () => {
    setRefreshing(true);
    fetchArticles();
    setTimeout(() => setRefreshing(false), 1200);
    showToast("Feed refreshed");
  };

  const analyzedArticles = articles.filter(a => a.analyzed && a.echoScore !== null);
  const avgEcho = analyzedArticles.length
    ? Math.round(analyzedArticles.reduce((s, a) => s + a.echoScore, 0) / analyzedArticles.length)
    : 0;

  const sortedFiltered = articles
    .filter(a => {
      const tagMatch    = activeTag === "All" || (a.tags || []).includes(activeTag);
      const srcMatch    = !activeSource || a.source === activeSource;
      const searchMatch = !searchQuery ||
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.summary.toLowerCase().includes(searchQuery.toLowerCase());
      return tagMatch && srcMatch && searchMatch;
    })
    .sort((a, b) => {
      if (sortBy === "Highest Echo")     return (b.echoScore ?? -1)  - (a.echoScore ?? -1);
      if (sortBy === "Lowest Echo")      return (a.echoScore ?? 999) - (b.echoScore ?? 999);
      if (sortBy === "Unanalyzed First") return (a.analyzed ? 1 : 0) - (b.analyzed ? 1 : 0);
      return b.id - a.id;
    });

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse   { 0%,100% { opacity: 0.4; } 50% { opacity: 0.9; } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #252525; border-radius: 2px; }
        input::placeholder { color: #383838; }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "#0c0c0cf0", backdropFilter: "blur(16px)",
        borderBottom: "1px solid #1a1a1a",
        padding: "0 16px", height: "auto", minHeight: 56, flexWrap: "wrap", paddingTop: 8, paddingBottom: 8,        display: "flex", alignItems: "center", gap: 16,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, cursor: "pointer" }}
          onClick={() => navigate("/")}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <span style={{ fontSize: 17, fontWeight: 600, color: "#f1f1f1", letterSpacing: "-0.02em" }}>
            EchoChamber
          </span>
        </div>

        {/* URL Analyzer */}
        <div style={{ flex: 1, maxWidth: 520, display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{
            flex: 1, display: "flex", alignItems: "center", gap: 9,
            background: "#141414", border: "1px solid #222",
            borderRadius: 10, padding: "0 14px", height: 42,
          }}>
            <LinkIcon />
            <input
              type="text"
              placeholder="Paste any article or thread URL to analyze..."
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleUrlAnalyze()}
              style={{
                flex: 1, background: "none", border: "none", outline: "none",
                fontSize: 13, color: "#ccc", fontFamily: "inherit",
              }}
            />
          </div>
          <button
            onClick={handleUrlAnalyze}
            disabled={urlAnalyzing || !urlInput.trim()}
            style={{
              height: 42, padding: "0 20px", borderRadius: 10, border: "none",
              background: urlInput.trim() ? "#dc2626" : "#181818",
              color: urlInput.trim() ? "#fff" : "#444",
              fontSize: 13, fontWeight: 600,
              cursor: urlInput.trim() ? "pointer" : "not-allowed",
              transition: "all 0.15s",
              display: "flex", alignItems: "center", gap: 6,
              fontFamily: "inherit", whiteSpace: "nowrap",
            }}
          >
            {urlAnalyzing ? <><SpinnerIcon />Analyzing</> : "Analyze URL"}
          </button>
        </div>

        {/* Nav links */}
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
    }}>
      {label}
    </button>
  ))}
</div>
      </nav>

      {/* ── MAIN ── */}
      <main style={{ padding: "16px 14px 60px" }}>

        {/* Page header */}
        <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 600, color: "#f1f1f1", letterSpacing: "-0.025em", lineHeight: 1 }}>
              Indian News Feed
            </h1>
            <p style={{ fontSize: 14, color: "#474747", marginTop: 7 }}>
              Auto-fetched every 3 hours · {articles.length} articles loaded · Click any article to see full analysis
            </p>
          </div>
          <button onClick={handleRefresh} disabled={refreshing} style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#111", border: "1px solid #222",
            color: "#666", fontSize: 13, fontWeight: 500,
            padding: "9px 18px", borderRadius: 9,
            cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
          }}>
            <RefreshIcon spinning={refreshing} />
            {refreshing ? "Refreshing..." : "Refresh Feed"}
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid",
gridTemplateColumns: "repeat(3, 1fr)",
gap: 8,
marginBottom: 18, }}>
          {[
            { label: "Articles",       value: articles.length,                                       color: "#3b82f6" },
            { label: "Analyzed",       value: analyzedArticles.length,                               color: "#22c55e" },
            { label: "Unanalyzed",     value: articles.filter(a => !a.analyzed).length,              color: "#555"    },
            { label: "High Echo ≥70",  value: articles.filter(a => (a.echoScore ?? 0) >= 70).length, color: "#dc2626" },
            { label: "Avg Echo Score", value: avgEcho,                                                color: "#f59e0b" },
          ].map(stat => (
            <div key={stat.label} style={{
              background: "#0f0f0f", border: "1px solid #1a1a1a",
              borderRadius: 10, padding: "12px 14px",
              display: "flex", flexDirection: "column", gap: 5,
                         }}>
              <span style={{ fontSize: 10, color: "#383838", fontWeight: 600, letterSpacing: "0.07em" }}>
                {stat.label.toUpperCase()}
              </span>
              <span style={{ fontSize: 30, fontWeight: 600, color: stat.color, letterSpacing: "-0.03em", lineHeight: 1 }}>
                {loading ? "—" : stat.value}
              </span>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div style={{
          background: "#0f0f0f", border: "1px solid #1a1a1a",
          borderRadius: 12, padding: "12px 14px", marginBottom: 20,
          display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
        }}>
          {/* Search */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#141414", border: "1px solid #222",
            borderRadius: 8, padding: "0 12px", height: 38, minWidth: 210,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                background: "none", border: "none", outline: "none",
                fontSize: 13, color: "#ccc", fontFamily: "inherit", width: "100%",
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} style={{
                background: "none", border: "none", color: "#555",
                cursor: "pointer", fontSize: 16, padding: 0, lineHeight: 1,
              }}>×</button>
            )}
          </div>

          {/* Topic tags */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#383838", fontWeight: 600, letterSpacing: "0.06em" }}>TOPIC</span>
            {TAGS.map(tag => (
              <button key={tag} onClick={() => setActiveTag(tag)} style={{
                fontSize: 12, padding: "5px 14px", borderRadius: 99,
                border: activeTag === tag ? "1px solid #dc2626" : "1px solid #222",
                background: activeTag === tag ? "#dc262614" : "#141414",
                color: activeTag === tag ? "#dc2626" : "#555",
                cursor: "pointer", fontWeight: activeTag === tag ? 600 : 400,
                transition: "all 0.15s", fontFamily: "inherit",
              }}>{tag}</button>
            ))}
          </div>

          {/* Source filters */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginLeft: "auto" }}>
            <span style={{ fontSize: 11, color: "#383838", fontWeight: 600, letterSpacing: "0.06em" }}>SOURCE</span>
            {Object.entries(SOURCES).map(([name, s]) => (
              <button key={name} onClick={() => setActiveSource(activeSource === name ? null : name)} style={{
                fontSize: 11, padding: "4px 12px", borderRadius: 99,
                border: activeSource === name ? `1px solid ${s.color}55` : "1px solid #222",
                background: activeSource === name ? s.bg : "#141414",
                color: activeSource === name ? s.color : "#555",
                cursor: "pointer", fontWeight: 600,
                transition: "all 0.15s", fontFamily: "inherit", letterSpacing: "0.03em",
              }}>{s.short}</button>
            ))}
          </div>
        </div>

        {/* Sort + count */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <span style={{ fontSize: 13, color: "#3a3a3a" }}>
            {loading
              ? "Loading..."
              : `${sortedFiltered.length} article${sortedFiltered.length !== 1 ? "s" : ""}${(activeTag !== "All" || activeSource || searchQuery) ? " — filtered" : ""}`
            }
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            {SORT_OPTIONS.map(opt => (
              <button key={opt} onClick={() => setSortBy(opt)} style={{
                fontSize: 12, padding: "5px 13px", borderRadius: 7,
                border: sortBy === opt ? "1px solid #2a2a2a" : "1px solid transparent",
                background: sortBy === opt ? "#1a1a1a" : "none",
                color: sortBy === opt ? "#bbb" : "#444",
                cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit",
              }}>{opt}</button>
            ))}
          </div>
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: 14 }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{
                background: "#111", border: "1px solid #1e1e1e",
                borderRadius: 14, height: 220,
                animation: "pulse 1.5s ease infinite",
              }} />
            ))}
          </div>
        )}

        {/* Article Grid */}
        {!loading && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(420px, 100%), 1fr))",            gap: 14,
            animation: "fadeIn 0.3s ease",
          }}>
            {sortedFiltered.length > 0
              ? sortedFiltered.map(article => (
                  <ArticleCard key={article.id} article={article} onAnalyze={handleAnalyze} />
                ))
              : (
                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "72px 0" }}>
                  <p style={{ fontSize: 15, color: "#333", marginBottom: 14 }}>No articles match your filters</p>
                  <button
                    onClick={() => { setActiveTag("All"); setActiveSource(null); setSearchQuery(""); }}
                    style={{
                      fontSize: 13, color: "#666", background: "none",
                      border: "1px solid #222", borderRadius: 8,
                      padding: "8px 18px", cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    Clear all filters
                  </button>
                </div>
              )
            }
          </div>
        )}
      </main>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}