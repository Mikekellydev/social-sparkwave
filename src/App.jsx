import React from "react";
import { HashRouter, Routes, Route, NavLink, Navigate, useNavigate } from "react-router-dom";
import "./App.css";
import { openDB } from "idb";

/**
 * Character limits
 */
const LIMIT_X = 280;
const LIMIT_FB = 2000;
const LIMIT_LI = 2000;

/**
 * IndexedDB
 * IMPORTANT: bump version to avoid "requested version is less than existing version" errors
 */
const DB_NAME = "sparksocial";
const DB_VERSION = 3;
const STORE_CURRENT = "current";
const STORE_DRAFTS = "drafts";
const KEY_CURRENT = "current";

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // v1/v2 might exist in the wild; make upgrades additive + safe
      if (!db.objectStoreNames.contains(STORE_CURRENT)) {
        db.createObjectStore(STORE_CURRENT);
      }
      if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
        db.createObjectStore(STORE_DRAFTS, { keyPath: "id", autoIncrement: true });
      }
    },
  });
}

async function saveCurrent(value) {
  const db = await getDb();
  await db.put(STORE_CURRENT, value, KEY_CURRENT);
}

async function loadCurrent() {
  const db = await getDb();
  return db.get(STORE_CURRENT, KEY_CURRENT);
}

async function createDraft(value) {
  const db = await getDb();
  const now = Date.now();
  const record = {
    ...value,
    createdAt: now,
    updatedAt: now,
  };
  const id = await db.add(STORE_DRAFTS, record);
  return id;
}

async function listDrafts() {
  const db = await getDb();
  const all = await db.getAll(STORE_DRAFTS);
  return (all || []).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

async function getDraft(id) {
  const db = await getDb();
  return db.get(STORE_DRAFTS, Number(id));
}

async function deleteDraft(id) {
  const db = await getDb();
  return db.delete(STORE_DRAFTS, Number(id));
}

/**
 * Helpers
 */
function clampText(text, max) {
  const cleaned = (text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (cleaned.length <= max) return cleaned;
  return cleaned.slice(0, max - 1) + "…";
}

function firstNonEmptyLine(text) {
  const lines = (text || "").split("\n").map((l) => l.trim());
  return lines.find((l) => l.length > 0) || "Untitled draft";
}

function buildOutputs(blogText, tone) {
  const summary = clampText(blogText, 240);
  const baseHashtag = "#ITLeadership";

  const professional = {
    twitter: clampText(`${summary} ${baseHashtag}`.trim(), LIMIT_X),
    facebook: clampText(
      `I published a new article and wanted to share one takeaway:\n\n${summary}\n\nWhat’s your perspective on this?`,
      LIMIT_FB
    ),
    linkedin: clampText(
      `New article reflection:\n\n${summary}\n\nI’d value input from others who have worked through similar challenges.`,
      LIMIT_LI
    ),
  };

  const conversational = {
    twitter: clampText(`${summary} What do you think?`.trim(), LIMIT_X),
    facebook: clampText(
      `Quick thought from something I wrote recently:\n\n${summary}\n\nIf you’ve been there too, I’d love to hear what you learned.`,
      LIMIT_FB
    ),
    linkedin: clampText(
      `Something I’ve been thinking about lately:\n\n${summary}\n\nWhat would you add from your experience?`,
      LIMIT_LI
    ),
  };

  const promotional = {
    twitter: clampText(`New post: ${clampText(blogText, 200)} Read more soon.`, LIMIT_X),
    facebook: clampText(
      `New post is live.\n\n${summary}\n\nIf you want the full context, I’ll share the link next.`,
      LIMIT_FB
    ),
    linkedin: clampText(
      `New post published.\n\n${summary}\n\nIf you’d like to read it, I’m happy to share the link.`,
      LIMIT_LI
    ),
  };

  const map = { professional, conversational, promotional };
  return map[tone] || professional;
}

function PreviewCard({ variant, body }) {
  if (variant === "x") {
    return (
      <div className="previewCard x">
        <div className="previewTop">
          <div className="avatar">S</div>
          <div className="metaBlock">
            <div className="nameRow">
              <span className="displayName">SparkSocial</span>
              <span className="handle">@sparkwaveitservice</span>
            </div>
            <div className="metaRow">Just now</div>
          </div>
        </div>
        <div className="previewBody">{body || "Preview will appear here."}</div>
      </div>
    );
  }

  if (variant === "fb") {
    return (
      <div className="previewCard fb">
        <div className="previewTop">
          <div className="avatar">S</div>
          <div className="metaBlock">
            <div className="nameRow">
              <span className="displayName">SparkSocial</span>
              <span className="metaDot">·</span>
              <span className="metaRow">Just now</span>
            </div>
            <div className="metaRow">Public</div>
          </div>
        </div>
        <div className="previewBody">{body || "Preview will appear here."}</div>
        <div className="previewFooter">
          <span>Like</span>
          <span>Comment</span>
          <span>Share</span>
        </div>
      </div>
    );
  }

  return (
    <div className="previewCard li">
      <div className="previewTop">
        <div className="avatar">S</div>
        <div className="metaBlock">
          <div className="nameRow">
            <span className="displayName">SparkSocial</span>
          </div>
          <div className="metaRow">IT Services · Just now</div>
        </div>
      </div>
      <div className="previewBody">{body || "Preview will appear here."}</div>
      <div className="previewFooter">
        <span>Like</span>
        <span>Comment</span>
        <span>Repost</span>
        <span>Send</span>
      </div>
    </div>
  );
}

function PlatformBlock({ title, value, setValue, limit, previewVariant, rightSlot }) {
  const count = (value || "").length;
  const over = count > limit;

  return (
    <div className="platformBlock">
      <div className="platformHeader">
        <h3>{title}</h3>
        <div className="platformActions">
          <span className={over ? "count over" : "count"}>
            {count}/{limit}
          </span>
          {rightSlot}
        </div>
      </div>

      <textarea
        className="platformText"
        rows={5}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />

      <PreviewCard variant={previewVariant} body={value} />
    </div>
  );
}

function Layout({ children }) {
  const [navOpen, setNavOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="app">
      <button className="hamburger" onClick={() => setNavOpen(true)} aria-label="Open menu">
        <span />
        <span />
        <span />
      </button>

      <div className={navOpen ? "scrim show" : "scrim"} onClick={() => setNavOpen(false)} />

      <aside className={navOpen ? "sidebar open" : "sidebar"}>
        <div className="sidebarTop">
          <h2>SparkSocial</h2>
          <button className="sidebarClose" onClick={() => setNavOpen(false)} aria-label="Close menu">
            ×
          </button>
        </div>

        <nav onClick={() => setNavOpen(false)}>
          <NavLink to="/inbox" end>
            Inbox
          </NavLink>
          <NavLink to="/drafts">Drafts</NavLink>
          <NavLink to="/scheduler">Scheduler</NavLink>
          <NavLink to="/connections">Connections</NavLink>
          <NavLink to="/logs">Logs</NavLink>
        </nav>
      </aside>

      <main className="main">
        <header className="header">
          <div className="headerInner">
            <div>
              <div className="headerTitle">Social Media Management</div>
              <div className="headerSub">Draft, generate, preview, and save</div>
            </div>
            <div className="headerGlow" />
          </div>
        </header>

        <div className="content">{children}</div>
      </main>
    </div>
  );
}

function Inbox() {
  const [tone, setTone] = React.useState("professional");
  const [blogText, setBlogText] = React.useState("");
  const [twitter, setTwitter] = React.useState("");
  const [facebook, setFacebook] = React.useState("");
  const [linkedin, setLinkedin] = React.useState("");

  const [draftStatus, setDraftStatus] = React.useState("Ready");
  const [saving, setSaving] = React.useState(false);

  const saveTimer = React.useRef(null);

  async function copy(text) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setDraftStatus("Copied");
      setTimeout(() => setDraftStatus("Ready"), 900);
    } catch {
      setDraftStatus("Copy failed");
      setTimeout(() => setDraftStatus("Ready"), 1200);
    }
  }

  function generatePosts() {
    if (!blogText.trim()) {
      setDraftStatus("Paste a blog post first");
      setTimeout(() => setDraftStatus("Ready"), 1200);
      return;
    }
    const out = buildOutputs(blogText, tone);
    setTwitter(out.twitter);
    setFacebook(out.facebook);
    setLinkedin(out.linkedin);
    setDraftStatus("Generated");
    setTimeout(() => setDraftStatus("Ready"), 1200);
  }

  async function saveToDrafts() {
    if (!blogText.trim() && !twitter && !facebook && !linkedin) {
      setDraftStatus("Nothing to save");
      setTimeout(() => setDraftStatus("Ready"), 1200);
      return;
    }

    setSaving(true);
    setDraftStatus("Saving…");

    try {
      const title = firstNonEmptyLine(blogText);
      await createDraft({ title, tone, blogText, twitter, facebook, linkedin });
      setDraftStatus("Saved to Drafts");
      setTimeout(() => setDraftStatus("Ready"), 1400);
    } catch (e) {
      setDraftStatus("Save failed");
      setTimeout(() => setDraftStatus("Ready"), 1600);
      console.error("Draft save failed:", e);
    } finally {
      setSaving(false);
    }
  }

  // Load current autosave on first render
  React.useEffect(() => {
    (async () => {
      try {
        const saved = await loadCurrent();
        if (!saved) return;
        setTone(saved.tone || "professional");
        setBlogText(saved.blogText || "");
        setTwitter(saved.twitter || "");
        setFacebook(saved.facebook || "");
        setLinkedin(saved.linkedin || "");
      } catch (e) {
        console.error("Draft load failed:", e);
        setDraftStatus("Autosave unavailable");
        setTimeout(() => setDraftStatus("Ready"), 1400);
      }
    })();
  }, []);

  // Debounced autosave whenever something changes
  React.useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(() => {
      (async () => {
        try {
          setSaving(true);
          await saveCurrent({ tone, blogText, twitter, facebook, linkedin });
        } catch (e) {
          console.error("Autosave failed:", e);
          setDraftStatus("Autosave failed");
          setTimeout(() => setDraftStatus("Ready"), 1400);
        } finally {
          setSaving(false);
        }
      })();
    }, 450);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [tone, blogText, twitter, facebook, linkedin]);

  return (
    <div className="page">
      <div className="pageTop">
        <h2 className="pageTitle">Blog → Social Media Generator</h2>

        <div className="toolbar">
          <div className="toolbarLeft">
            <label className="toolbarLabel">Tone</label>
            <select value={tone} onChange={(e) => setTone(e.target.value)}>
              <option value="professional">Professional</option>
              <option value="conversational">Conversational</option>
              <option value="promotional">Promotional</option>
            </select>
            <span className="statusPill">
              {saving ? "Saving…" : draftStatus}
            </span>
          </div>

          <div className="toolbarRight">
            <button className="btnGhost" onClick={saveToDrafts} disabled={saving}>
              Save to Drafts
            </button>
            <button className="btnPrimary" onClick={generatePosts}>
              Generate
            </button>
          </div>
        </div>
      </div>

      <textarea
        className="blogInput"
        rows={10}
        placeholder="Paste your blog article or newsletter text here…"
        value={blogText}
        onChange={(e) => setBlogText(e.target.value)}
      />

      <div className="platformGrid">
        <PlatformBlock
          title="Twitter / X"
          value={twitter}
          setValue={(v) => setTwitter(clampText(v, LIMIT_X))}
          limit={LIMIT_X}
          previewVariant="x"
          rightSlot={<button className="btnSmall" onClick={() => copy(twitter)}>Copy</button>}
        />

        <PlatformBlock
          title="Facebook"
          value={facebook}
          setValue={(v) => setFacebook(clampText(v, LIMIT_FB))}
          limit={LIMIT_FB}
          previewVariant="fb"
          rightSlot={<button className="btnSmall" onClick={() => copy(facebook)}>Copy</button>}
        />

        <PlatformBlock
          title="LinkedIn"
          value={linkedin}
          setValue={(v) => setLinkedin(clampText(v, LIMIT_LI))}
          limit={LIMIT_LI}
          previewVariant="li"
          rightSlot={<button className="btnSmall" onClick={() => copy(linkedin)}>Copy</button>}
        />
      </div>
    </div>
  );
}

function Drafts() {
  const nav = useNavigate();
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [msg, setMsg] = React.useState("Ready");

  async function refresh() {
    setLoading(true);
    try {
      const all = await listDrafts();
      setItems(all);
    } catch (e) {
      console.error(e);
      setMsg("Failed to load drafts");
      setTimeout(() => setMsg("Ready"), 1500);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    refresh();
  }, []);

  async function onLoad(id) {
    try {
      const d = await getDraft(id);
      if (!d) return;
      await saveCurrent({
        tone: d.tone || "professional",
        blogText: d.blogText || "",
        twitter: d.twitter || "",
        facebook: d.facebook || "",
        linkedin: d.linkedin || "",
      });
      setMsg("Loaded into Inbox");
      setTimeout(() => setMsg("Ready"), 1200);
      nav("/inbox");
    } catch (e) {
      console.error(e);
      setMsg("Load failed");
      setTimeout(() => setMsg("Ready"), 1500);
    }
  }

  async function onDelete(id) {
    if (!confirm("Delete this draft?")) return;
    try {
      await deleteDraft(id);
      setMsg("Deleted");
      setTimeout(() => setMsg("Ready"), 1200);
      refresh();
    } catch (e) {
      console.error(e);
      setMsg("Delete failed");
      setTimeout(() => setMsg("Ready"), 1500);
    }
  }

  return (
    <div className="page">
      <div className="draftsTop">
        <h2 className="pageTitle">Drafts</h2>
        <span className="statusPill">{loading ? "Loading…" : msg}</span>
      </div>

      {items.length === 0 && !loading ? (
        <div className="emptyState">
          <div className="emptyTitle">No drafts yet</div>
          <div className="emptySub">Use “Save to Drafts” in Inbox to store snapshots.</div>
        </div>
      ) : (
        <div className="draftList">
          {items.map((d) => (
            <div className="draftCard" key={d.id}>
              <div className="draftMeta">
                <div className="draftTitle">{d.title || "Untitled draft"}</div>
                <div className="draftSub">
                  {new Date(d.updatedAt || d.createdAt || Date.now()).toLocaleString()}
                  {" · "}
                  {d.tone || "professional"}
                </div>
              </div>

              <div className="draftActions">
                <button className="btnSmall" onClick={() => onLoad(d.id)}>Load</button>
                <button className="btnSmall danger" onClick={() => onDelete(d.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Scheduler() {
  return <div className="page"><h2 className="pageTitle">Scheduler</h2><div className="muted">Coming next.</div></div>;
}
function Connections() {
  return <div className="page"><h2 className="pageTitle">Connections</h2><div className="muted">Coming next.</div></div>;
}
function Logs() {
  return <div className="page"><h2 className="pageTitle">Logs</h2><div className="muted">Coming next.</div></div>;
}

export default function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/inbox" replace />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/drafts" element={<Drafts />} />
          <Route path="/scheduler" element={<Scheduler />} />
          <Route path="/connections" element={<Connections />} />
          <Route path="/logs" element={<Logs />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}
