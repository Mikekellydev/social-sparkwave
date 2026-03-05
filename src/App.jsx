import React, { useEffect, useMemo, useState } from "react";

/**
 * SparkSocial: Blog -> Platform-ready posts
 * Limits:
 * - X: 280
 * - Facebook: 2000
 * - LinkedIn: 2000
 */

const LIMITS = {
  x: 280,
  facebook: 2000,
  linkedin: 2000,
};

function clampText(text, max) {
  const s = (text ?? "").toString();

  if (s.length <= max) return s;

  // Prefer trimming at a word boundary if possible.
  const slice = s.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");

  // If there's a reasonable word boundary, use it.
  if (lastSpace > Math.floor(max * 0.7)) {
    return slice.slice(0, lastSpace).trimEnd();
  }

  return slice.trimEnd();
}

function safeCopy(text) {
  if (!text) return Promise.resolve(false);
  if (!navigator?.clipboard?.writeText) return Promise.resolve(false);

  return navigator.clipboard
    .writeText(text)
    .then(() => true)
    .catch(() => false);
}

/**
 * Simple generator:
 * - Creates a short hook line for X
 * - Creates a slightly longer post for Facebook
 * - Creates a LinkedIn-style post with a "New article" lead-in
 *
 * IMPORTANT: We clamp outputs to strict character limits.
 */
function generatePosts(blogText, tone) {
  const raw = (blogText ?? "").trim();

  if (!raw) {
    return { x: "", facebook: "", linkedin: "" };
  }

  // Create a "core idea" by taking first 2-3 sentences-ish.
  const normalized = raw.replace(/\s+/g, " ").trim();

  // Grab a compact summary base (helps keep within limits)
  const base = normalized.length > 900 ? normalized.slice(0, 900).trim() : normalized;

  // A lightweight tone modifier (kept subtle)
  const toneLead =
    tone === "Casual"
      ? "Quick thought: "
      : tone === "Direct"
      ? "Bottom line: "
      : tone === "Encouraging"
      ? "Encouragement: "
      : ""; // Professional default

  // Platform drafts (we clamp later)
  const xDraft =
    `${toneLead}${base}`.trim() +
    (base.endsWith(".") ? "" : ".") +
    " #ITLeadership";

  const fbDraft =
    `${toneLead}${base}`.trim() +
    (base.endsWith(".") ? "" : ".") +
    " What’s your perspective on this?";

  const liDraft =
    `New article reflection: ${toneLead}${base}`.trim() +
    (base.endsWith(".") ? "" : ".") +
    "\n\nI’d value input from others who have worked through similar challenges.";

  // Clamp hard to limits (guaranteed)
  return {
    x: clampText(xDraft, LIMITS.x),
    facebook: clampText(fbDraft, LIMITS.facebook),
    linkedin: clampText(liDraft, LIMITS.linkedin),
  };
}

export default function App() {
  const [tone, setTone] = useState("Professional");
  const [blogText, setBlogText] = useState("");
  const [posts, setPosts] = useState({ x: "", facebook: "", linkedin: "" });

  const [status, setStatus] = useState("Ready"); // Ready | Saved | Save failed
  const [copyStatus, setCopyStatus] = useState({ x: "", facebook: "", linkedin: "" });

  // Mobile sidebar toggle
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Draft storage (local-only)
  const DRAFT_KEY = "sparksocial:drafts:v1";

  const draftObject = useMemo(() => {
    return {
      tone,
      blogText,
      posts,
      updatedAt: new Date().toISOString(),
    };
  }, [tone, blogText, posts]);

  function onGenerate() {
    const next = generatePosts(blogText, tone);
    setPosts(next);
    setStatus("Ready");
  }

  function saveDraft() {
    try {
      // Simple localStorage save (no IndexedDB versioning issues)
      const existing = JSON.parse(localStorage.getItem(DRAFT_KEY) || "[]");
      const safeExisting = Array.isArray(existing) ? existing : [];

      const newDraft = {
        id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
        ...draftObject,
      };

      localStorage.setItem(DRAFT_KEY, JSON.stringify([newDraft, ...safeExisting].slice(0, 50)));
      setStatus("Saved");
    } catch (e) {
      console.error("Draft save failed:", e);
      setStatus("Save failed");
    }
  }

  async function onCopy(platformKey) {
    const text = posts[platformKey] || "";
    const ok = await safeCopy(text);

    setCopyStatus((p) => ({ ...p, [platformKey]: ok ? "Copied" : "Copy failed" }));
    setTimeout(() => setCopyStatus((p) => ({ ...p, [platformKey]: "" })), 1200);
  }

  // Close sidebar when resizing to desktop
  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 980) setSidebarOpen(false);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const pillClass =
    status === "Saved"
      ? "pill pillSaved"
      : status === "Save failed"
      ? "pill pillFailed"
      : "pill pillReady";

  return (
    <div className="app">
      {/* Backdrop for mobile */}
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

          <nav className="nav" onClick={() => setSidebarOpen(false)}>
            <a className="active" href="#/inbox">
              Inbox
            </a>
            <a href="#/drafts">Drafts</a>
            <a href="#/scheduler">Scheduler</a>
            <a href="#/connections">Connections</a>
            <a href="#/logs">Logs</a>
          </nav>
        </div>
      </aside>

      <main className="content">
        {/* HEADER (simple, no hero, no fake button) */}
        <div className="header">
          <div className="headerInner">
            <button className="btn hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              ☰
            </button>

            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 1000, fontSize: 18, lineHeight: 1.1 }}>
                Social Media Management
              </div>
              <div className="muted" style={{ fontWeight: 750, fontSize: 12, marginTop: 4 }}>
                Blog to Social Media Generator
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span className={pillClass}>{status}</span>
            </div>
          </div>
        </div>

        <div className="page">
          {/* Generator */}
          <div className="section">
            <div className="sectionHeader">
              <div>
                <h2 className="sectionTitle">Blog → Social Media Generator</h2>
                <p className="sectionDesc">
                  Paste your blog or newsletter once, then generate posts for X, Facebook, and LinkedIn.
                </p>
              </div>
            </div>

            <div className="card cardHover">
              <div className="cardInner">
                <div className="generatorTopRow">
                  <div className="generatorControls">
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ fontWeight: 950 }}>Tone</span>
                      <select value={tone} onChange={(e) => setTone(e.target.value)}>
                        <option>Professional</option>
                        <option>Encouraging</option>
                        <option>Direct</option>
                        <option>Casual</option>
                      </select>
                    </div>
                  </div>

                  <div className="actions">
                    <button className="btn btnGlow" onClick={saveDraft}>
                      Save to Drafts
                    </button>
                    <button className="btn btnPrimary btnGlow" onClick={onGenerate}>
                      Generate
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <textarea
                    value={blogText}
                    onChange={(e) => setBlogText(e.target.value)}
                    placeholder="Paste your blog article or newsletter text here..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Outputs */}
          <div className="section">
            <div className="sectionHeader">
              <div>
                <h2 className="sectionTitle">Platform Posts</h2>
                <p className="sectionDesc">Each output is automatically capped at the platform limit.</p>
              </div>
            </div>

            <div className="platformGrid">
              {/* X */}
              <div className="card cardHover platformCard platformX">
                <div className="cardInner">
                  <div className="platformHeader">
                    <h3>Twitter / X</h3>
                    <div className="counter">
                      {(posts.x || "").length}/{LIMITS.x}
                    </div>
                    <button className="btn copyBtn btnGlow" onClick={() => onCopy("x")}>
                      {copyStatus.x ? copyStatus.x : "Copy"}
                    </button>
                  </div>

                  <div className="previewWrap">
                    <div className="previewCard">
                      <div className="previewMeta">
                        <div className="avatar">S</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 950 }}>SparkSocial</div>
                          <div className="muted" style={{ fontSize: 12, fontWeight: 750 }}>
                            Just now
                          </div>
                        </div>
                      </div>
                      <p className="previewText">{posts.x || ""}</p>
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
                      {(posts.facebook || "").length}/{LIMITS.facebook}
                    </div>
                    <button className="btn copyBtn btnGlow" onClick={() => onCopy("facebook")}>
                      {copyStatus.facebook ? copyStatus.facebook : "Copy"}
                    </button>
                  </div>

                  <div className="previewWrap">
                    <div className="previewCard">
                      <div className="previewMeta">
                        <div className="avatar">S</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 950 }}>SparkSocial</div>
                          <div className="muted" style={{ fontSize: 12, fontWeight: 750 }}>
                            Public · Just now
                          </div>
                        </div>
                      </div>
                      <p className="previewText">{posts.facebook || ""}</p>
                      <div className="muted" style={{ marginTop: 10, fontWeight: 800 }}>
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
                      {(posts.linkedin || "").length}/{LIMITS.linkedin}
                    </div>
                    <button className="btn copyBtn btnGlow" onClick={() => onCopy("linkedin")}>
                      {copyStatus.linkedin ? copyStatus.linkedin : "Copy"}
                    </button>
                  </div>

                  <div className="previewWrap">
                    <div className="previewCard">
                      <div className="previewMeta">
                        <div className="avatar">S</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 950 }}>SparkSocial</div>
                          <div className="muted" style={{ fontSize: 12, fontWeight: 750 }}>
                            IT Services · Just now
                          </div>
                        </div>
                      </div>

                      <p className="previewText">{posts.linkedin || ""}</p>

                      <div className="muted" style={{ marginTop: 10, fontWeight: 800 }}>
                        Like · Comment · Repost · Send
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
