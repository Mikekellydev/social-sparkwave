// src/App.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { HashRouter, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import "./App.css";

/**
 * Storage (localStorage) for drafts
 * Avoids IndexedDB version issues (VersionError) entirely.
 */
const STORAGE_KEY = "sparksocial:drafts:v1";

function loadDrafts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDrafts(drafts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
}

function newId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function clampText(text, maxChars) {
  if (!text) return "";
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 1) + "…";
}

function buildPostsFromBlog(blogText, tone) {
  const base = (blogText || "").trim();

  if (!base) {
    return {
      x: "280",
      facebook: "2000",
      linkedin: "2000",
    };
  }

  // Lightweight generation that is deterministic and works offline.
  // You can replace this later with an API call if you want.
  const takeaways = base
    .replace(/\s+/g, " ")
    .split(". ")
    .map((s) => s.trim())
    .filter(Boolean);

  const first = takeaways[0] || base;
  const second = takeaways[1] || "";
  const third = takeaways[2] || "";

  const toneTag =
    tone === "Professional"
      ? "Professional"
      : tone === "Friendly"
      ? "Friendly"
      : tone === "Bold"
      ? "Bold"
      : "Professional";

  const x = clampText(
    `${first}${second ? " " + clampText(second, 80) : ""} #ITLeadership`,
    280
  );

  const facebook = clampText(
    `I published a new article and wanted to share one takeaway.\n\n${first}\n\nWhat is your perspective on this?\n\n(${toneTag})`,
    1200
  );

  const linkedin = clampText(
    `New article reflection:\n\n${first}${third ? "\n\n" + third : ""}\n\nI would value input from others who have worked through similar challenges.\n\n(${toneTag})`,
    2000
  );

  return { x, facebook, linkedin };
}

function copyToClipboard(text) {
  if (!text) return;
  navigator.clipboard?.writeText(text).catch(() => {});
}

function Pill({ state }) {
  // state: "ready" | "saved" | "failed"
  const className =
    state === "saved"
      ? "pill pillSaved"
      : state === "failed"
      ? "pill pillFailed"
      : "pill pillReady";

  const label = state === "saved" ? "Saved" : state === "failed" ? "Save failed" : "Ready";

  return <span className={className}>{label}</span>;
}

function Layout({ children, onToggleSidebar, sidebarOpen, setSidebarOpen }) {
  const location = useLocation();

  useEffect(() => {
    // Close sidebar after navigation on mobile
    setSidebarOpen(false);
  }, [location.pathname, setSidebarOpen]);

  return (
    <div className="app">
      {sidebarOpen ? <div className="backdrop" onClick={() => setSidebarOpen(false)} /> : null}

      <aside className={`sidebar ${sidebarOpen ? "isOpen" : ""}`}>
        <div className="sidebarInner">
          <div className="brand">
            <div className="brandMark">S</div>
            <div>
              <h1>SparkSocial</h1>
              <div className="tag">Social Media Management</div>
            </div>
          </div>

          <nav className="nav">
            <NavLink to="/inbox" className={({ isActive }) => (isActive ? "active" : undefined)}>
              Inbox
            </NavLink>
            <NavLink to="/drafts" className={({ isActive }) => (isActive ? "active" : undefined)}>
              Drafts
            </NavLink>
            <NavLink to="/scheduler" className={({ isActive }) => (isActive ? "active" : undefined)}>
              Scheduler
            </NavLink>
            <NavLink
              to="/connections"
              className={({ isActive }) => (isActive ? "active" : undefined)}
            >
              Connections
            </NavLink>
            <NavLink to="/logs" className={({ isActive }) => (isActive ? "active" : undefined)}>
              Logs
            </NavLink>
          </nav>
        </div>
      </aside>

      <main className="content">
        <header className="header">
          <div className="headerInner">
            <button className="btn hamburger" onClick={onToggleSidebar} aria-label="Open menu">
              ☰
            </button>

            <div style={{ display: "flex", alignItems: "baseline", gap: 10, minWidth: 0 }}>
              <div style={{ fontWeight: 950, fontSize: 18, letterSpacing: 0.2, whiteSpace: "nowrap" }}>
                Social Media Management
              </div>
              <div className="muted" style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis" }}>
                Blog to Social Media Generator
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <a className="btn btnGlow" href="#/inbox">
                Generator
              </a>
            </div>
          </div>

          <div className="hero">
            <div>
              <h2 className="heroTitle">Turn one blog into platform ready posts</h2>
              <p className="heroSub">
                Paste your article once, generate posts for X, Facebook, and LinkedIn. Save drafts locally so
                nothing breaks on refresh.
              </p>
              <div className="heroCtas">
                <a className="btn btnPrimary" href="#/inbox">
                  Open Generator
                </a>
                <a className="btn" href="#/drafts">
                  View Drafts
                </a>
              </div>
            </div>

            <div className="heroPanel">
              <div className="heroStat">
                <div className="k">Character limits</div>
                <div className="v">280 · 1200 · 2000</div>
                <div className="hint">X, Facebook, LinkedIn</div>
              </div>
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}

function InboxPage({ drafts, setDrafts }) {
  const [tone, setTone] = useState("Professional");
  const [pillState, setPillState] = useState("ready"); // ready | saved | failed

  const [blogText, setBlogText] = useState("");
  const [xText, setXText] = useState("");
  const [fbText, setFbText] = useState("");
  const [liText, setLiText] = useState("");

  const xLimit = 280;
  const fbLimit = 1200;
  const liLimit = 2000;

  const generate = () => {
    const { x, facebook, linkedin } = buildPostsFromBlog(blogText, tone);
    setXText(x);
    setFbText(facebook);
    setLiText(linkedin);
    setPillState("ready");
  };

  const saveToDrafts = () => {
    try {
      const now = new Date().toISOString();
      const item = {
        id: newId(),
        createdAt: now,
        updatedAt: now,
        tone,
        blogText,
        xText,
        fbText,
        liText,
        title: deriveTitle(blogText, tone),
      };

      const next = [item, ...drafts];
      setDrafts(next);
      saveDrafts(next);
      setPillState("saved");
    } catch {
      setPillState("failed");
    }
  };

  useEffect(() => {
    // Keep pill sane when typing
    setPillState("ready");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tone, blogText, xText, fbText, liText]);

  return (
    <div className="page">
      <section className="section">
        <div className="sectionHeader">
          <div>
            <h2 className="sectionTitle">Blog to Social Media Generator</h2>
            <p className="sectionDesc">
              Paste your blog article or newsletter text, then generate platform posts. Save to Drafts stores it
              on this device.
            </p>
          </div>
        </div>

        <div className="card">
          <div className="cardInner">
            <div className="generatorTopRow">
              <div className="generatorControls">
                <div style={{ fontWeight: 900 }}>Tone</div>
                <select value={tone} onChange={(e) => setTone(e.target.value)}>
                  <option>Professional</option>
                  <option>Friendly</option>
                  <option>Bold</option>
                </select>

                <Pill state={pillState} />
              </div>

              <div className="actions">
                <button className="btn" onClick={saveToDrafts}>
                  Save to Drafts
                </button>
                <button className="btn btnPrimary" onClick={generate}>
                  Generate
                </button>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <textarea
                value={blogText}
                onChange={(e) => setBlogText(e.target.value)}
                placeholder="Paste your blog article or newsletter text here…"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ marginTop: 4 }}>
        <div className="platformGrid">
          {/* X */}
          <div className="card cardHover platformCard platformX">
            <div className="cardInner">
              <div className="platformHeader">
                <h3>Twitter / X</h3>
                <div className="counter">
                  {(xText || "").length}/{xLimit}
                </div>
                <button className="btn copyBtn" onClick={() => copyToClipboard(xText)}>
                  Copy
                </button>
              </div>

              <textarea
                value={xText}
                onChange={(e) => setXText(clampText(e.target.value, xLimit))}
                placeholder="X post output…"
              />

              <div className="previewWrap">
                <div className="previewCard">
                  <div className="previewMeta">
                    <div className="avatar">S</div>
                    <div>
                      <div style={{ fontWeight: 900 }}>SparkSocial</div>
                      <div className="muted">@sparkwaveitservice · Just now</div>
                    </div>
                  </div>
                  <p className="previewText">{xText || "Preview will show here."}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Facebook */}
          <div className="card cardHover platformCard platformFB">
            <div className="cardInner">
              <div className="platformHeader">
                <h3>Facebook</h3>
                <div className="counter">
                  {(fbText || "").length}/{fbLimit}
                </div>
                <button className="btn copyBtn" onClick={() => copyToClipboard(fbText)}>
                  Copy
                </button>
              </div>

              <textarea
                value={fbText}
                onChange={(e) => setFbText(clampText(e.target.value, fbLimit))}
                placeholder="Facebook post output…"
              />

              <div className="previewWrap">
                <div className="previewCard">
                  <div className="previewMeta">
                    <div className="avatar">S</div>
                    <div>
                      <div style={{ fontWeight: 900 }}>SparkSocial</div>
                      <div className="muted">Public · Just now</div>
                    </div>
                  </div>
                  <p className="previewText">{fbText || "Preview will show here."}</p>
                  <div className="muted" style={{ marginTop: 10, fontWeight: 850 }}>
                    Like · Comment · Share
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* LinkedIn full width */}
          <div className="card cardHover platformCard platformLI">
            <div className="cardInner">
              <div className="platformHeader">
                <h3>LinkedIn</h3>
                <div className="counter">
                  {(liText || "").length}/{liLimit}
                </div>
                <button className="btn copyBtn" onClick={() => copyToClipboard(liText)}>
                  Copy
                </button>
              </div>

              <textarea
                value={liText}
                onChange={(e) => setLiText(clampText(e.target.value, liLimit))}
                placeholder="LinkedIn post output…"
              />

              <div className="previewWrap">
                <div className="previewCard">
                  <div className="previewMeta">
                    <div className="avatar">S</div>
                    <div>
                      <div style={{ fontWeight: 900 }}>SparkSocial</div>
                      <div className="muted">IT Services · Just now</div>
                    </div>
                  </div>
                  <p className="previewText">{liText || "Preview will show here."}</p>
                  <div className="muted" style={{ marginTop: 10, fontWeight: 850 }}>
                    Like · Comment · Repost · Send
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function DraftsPage({ drafts, setDrafts, onLoadDraft }) {
  return (
    <div className="page">
      <section className="section">
        <div className="sectionHeader">
          <div>
            <h2 className="sectionTitle">Drafts</h2>
            <p className="sectionDesc">
              Saved locally in your browser. Click one to load it back into the generator.
            </p>
          </div>
        </div>

        {drafts.length === 0 ? (
          <div className="card">
            <div className="cardInner">
              <p className="muted" style={{ margin: 0 }}>
                No drafts yet. Save one from the Generator.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {drafts.map((d) => (
              <div key={d.id} className="card cardHover">
                <div className="cardInner" style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 950, fontSize: 18 }}>{d.title || "Untitled draft"}</div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      Tone: {d.tone || "Professional"} · Saved: {formatWhen(d.updatedAt || d.createdAt)}
                    </div>
                  </div>

                  <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
                    {clampText((d.blogText || "").replace(/\s+/g, " ").trim(), 220) || "No blog text stored."}
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="btn btnPrimary" onClick={() => onLoadDraft(d)}>
                      Load into Generator
                    </button>
                    <button
                      className="btn"
                      onClick={() => {
                        const next = drafts.filter((x) => x.id !== d.id);
                        setDrafts(next);
                        saveDrafts(next);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PlaceholderPage({ title, desc }) {
  return (
    <div className="page">
      <section className="section">
        <div className="card">
          <div className="cardInner">
            <h2 className="sectionTitle" style={{ marginTop: 0 }}>
              {title}
            </h2>
            <p className="sectionDesc" style={{ marginBottom: 0 }}>
              {desc}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function deriveTitle(blogText, tone) {
  const raw = (blogText || "").trim();
  if (!raw) return `Draft (${tone})`;
  const firstLine = raw.split("\n").map((s) => s.trim()).filter(Boolean)[0] || raw;
  const cleaned = firstLine.replace(/^#+\s*/, "");
  return clampText(cleaned, 60);
}

function formatWhen(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return "";
  }
}

function AppInner() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [drafts, setDrafts] = useState(() => loadDrafts());

  const navigate = useNavigate();

  // Inbox state lifting: we load a draft by navigating to inbox and passing it via sessionStorage
  const loadDraftIntoGenerator = (draft) => {
    try {
      sessionStorage.setItem("sparksocial:loadDraft", JSON.stringify(draft));
    } catch {}
    navigate("/inbox");
  };

  const inboxKeyRef = useRef(0);

  return (
    <Layout
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      onToggleSidebar={() => setSidebarOpen((v) => !v)}
    >
      <Routes>
        <Route
          path="/inbox"
          element={
            <InboxWithDraftLoader
              key={`inbox_${inboxKeyRef.current}`}
              drafts={drafts}
              setDrafts={setDrafts}
              onResetKey={() => {
                inboxKeyRef.current += 1;
              }}
            />
          }
        />
        <Route
          path="/drafts"
          element={<DraftsPage drafts={drafts} setDrafts={setDrafts} onLoadDraft={loadDraftIntoGenerator} />}
        />
        <Route
          path="/scheduler"
          element={
            <PlaceholderPage
              title="Scheduler"
              desc="Next: add a simple calendar queue with planned publish dates for each platform."
            />
          }
        />
        <Route
          path="/connections"
          element={
            <PlaceholderPage
              title="Connections"
              desc="Next: connect accounts. For now this stays local and offline."
            />
          }
        />
        <Route
          path="/logs"
          element={
            <PlaceholderPage
              title="Logs"
              desc="Next: show actions like generated, copied, saved, and deleted."
            />
          }
        />
        <Route path="*" element={<InboxWithDraftLoader drafts={drafts} setDrafts={setDrafts} />} />
      </Routes>
    </Layout>
  );
}

/**
 * Loads a draft from sessionStorage when navigating from Drafts page.
 * This lets us keep InboxPage clean, and avoids global stores.
 */
function InboxWithDraftLoader({ drafts, setDrafts }) {
  const [seed, setSeed] = useState(0);
  const [prefill, setPrefill] = useState(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("sparksocial:loadDraft");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      sessionStorage.removeItem("sparksocial:loadDraft");
      setPrefill(parsed);
      setSeed((s) => s + 1);
    } catch {
      // ignore
    }
  }, []);

  return <InboxPageWithPrefill key={`inbox_seed_${seed}`} drafts={drafts} setDrafts={setDrafts} prefill={prefill} />;
}

function InboxPageWithPrefill({ drafts, setDrafts, prefill }) {
  const [tone, setTone] = useState("Professional");
  const [pillState, setPillState] = useState("ready");

  const [blogText, setBlogText] = useState("");
  const [xText, setXText] = useState("");
  const [fbText, setFbText] = useState("");
  const [liText, setLiText] = useState("");

  const xLimit = 280;
  const fbLimit = 1200;
  const liLimit = 2000;

  useEffect(() => {
    if (!prefill) return;

    setTone(prefill.tone || "Professional");
    setBlogText(prefill.blogText || "");
    setXText(prefill.xText || "");
    setFbText(prefill.fbText || "");
    setLiText(prefill.liText || "");
    setPillState("ready");
  }, [prefill]);

  const generate = () => {
    const { x, facebook, linkedin } = buildPostsFromBlog(blogText, tone);
    setXText(x);
    setFbText(facebook);
    setLiText(linkedin);
    setPillState("ready");
  };

  const saveToDrafts = () => {
    try {
      const now = new Date().toISOString();
      const item = {
        id: newId(),
        createdAt: now,
        updatedAt: now,
        tone,
        blogText,
        xText,
        fbText,
        liText,
        title: deriveTitle(blogText, tone),
      };

      const next = [item, ...drafts];
      setDrafts(next);
      saveDrafts(next);
      setPillState("saved");
    } catch {
      setPillState("failed");
    }
  };

  return (
    <div className="page">
      <section className="section">
        <div className="sectionHeader">
          <div>
            <h2 className="sectionTitle">Blog to Social Media Generator</h2>
            <p className="sectionDesc">
              Paste your blog article or newsletter text, then generate platform posts. Save to Drafts stores it
              on this device.
            </p>
          </div>
        </div>

        <div className="card">
          <div className="cardInner">
            <div className="generatorTopRow">
              <div className="generatorControls">
                <div style={{ fontWeight: 900 }}>Tone</div>
                <select value={tone} onChange={(e) => setTone(e.target.value)}>
                  <option>Professional</option>
                  <option>Friendly</option>
                  <option>Bold</option>
                </select>

                <Pill state={pillState} />
              </div>

              <div className="actions">
                <button className="btn" onClick={saveToDrafts}>
                  Save to Drafts
                </button>
                <button className="btn btnPrimary" onClick={generate}>
                  Generate
                </button>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <textarea
                value={blogText}
                onChange={(e) => setBlogText(e.target.value)}
                placeholder="Paste your blog article or newsletter text here…"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ marginTop: 4 }}>
        <div className="platformGrid">
          <div className="card cardHover platformCard platformX">
            <div className="cardInner">
              <div className="platformHeader">
                <h3>Twitter / X</h3>
                <div className="counter">
                  {(xText || "").length}/{xLimit}
                </div>
                <button className="btn copyBtn" onClick={() => copyToClipboard(xText)}>
                  Copy
                </button>
              </div>

              <textarea
                value={xText}
                onChange={(e) => setXText(clampText(e.target.value, xLimit))}
                placeholder="X post output…"
              />

              <div className="previewWrap">
                <div className="previewCard">
                  <div className="previewMeta">
                    <div className="avatar">S</div>
                    <div>
                      <div style={{ fontWeight: 900 }}>SparkSocial</div>
                      <div className="muted">@sparkwaveitservice · Just now</div>
                    </div>
                  </div>
                  <p className="previewText">{xText || "Preview will show here."}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card cardHover platformCard platformFB">
            <div className="cardInner">
              <div className="platformHeader">
                <h3>Facebook</h3>
                <div className="counter">
                  {(fbText || "").length}/{fbLimit}
                </div>
                <button className="btn copyBtn" onClick={() => copyToClipboard(fbText)}>
                  Copy
                </button>
              </div>

              <textarea
                value={fbText}
                onChange={(e) => setFbText(clampText(e.target.value, fbLimit))}
                placeholder="Facebook post output…"
              />

              <div className="previewWrap">
                <div className="previewCard">
                  <div className="previewMeta">
                    <div className="avatar">S</div>
                    <div>
                      <div style={{ fontWeight: 900 }}>SparkSocial</div>
                      <div className="muted">Public · Just now</div>
                    </div>
                  </div>
                  <p className="previewText">{fbText || "Preview will show here."}</p>
                  <div className="muted" style={{ marginTop: 10, fontWeight: 850 }}>
                    Like · Comment · Share
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card cardHover platformCard platformLI">
            <div className="cardInner">
              <div className="platformHeader">
                <h3>LinkedIn</h3>
                <div className="counter">
                  {(liText || "").length}/{liLimit}
                </div>
                <button className="btn copyBtn" onClick={() => copyToClipboard(liText)}>
                  Copy
                </button>
              </div>

              <textarea
                value={liText}
                onChange={(e) => setLiText(clampText(e.target.value, liLimit))}
                placeholder="LinkedIn post output…"
              />

              <div className="previewWrap">
                <div className="previewCard">
                  <div className="previewMeta">
                    <div className="avatar">S</div>
                    <div>
                      <div style={{ fontWeight: 900 }}>SparkSocial</div>
                      <div className="muted">IT Services · Just now</div>
                    </div>
                  </div>
                  <p className="previewText">{liText || "Preview will show here."}</p>
                  <div className="muted" style={{ marginTop: 10, fontWeight: 850 }}>
                    Like · Comment · Repost · Send
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppInner />
    </HashRouter>
  );
}
