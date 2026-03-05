import React from "react";
import { HashRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import "./App.css";
import { openDB } from "idb";

/**
 * SparkSocial
 * Inbox: generate platform drafts from blog text
 * Drafts: save multiple drafts, view, load into Inbox, delete
 *
 * Persistence:
 * - IndexedDB primary
 * - localStorage fallback (so Save never "just fails")
 */

/* ----------------------------- Storage Layer ----------------------------- */

const DB_NAME = "sparksocial";
const DB_VERSION = 3; // bump when schema changes to avoid VersionError
const STORE_CURRENT = "current"; // single autosave slot
const STORE_DRAFTS = "drafts"; // multiple saved drafts
const KEY_CURRENT = "current";

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // current autosave store
      if (!db.objectStoreNames.contains(STORE_CURRENT)) {
        db.createObjectStore(STORE_CURRENT);
      }
      // drafts store with keyPath
      if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
        db.createObjectStore(STORE_DRAFTS, { keyPath: "id" });
      }
    },
  });
}

function safeJsonParse(v) {
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

function lsKeyCurrent() {
  return `${DB_NAME}:${STORE_CURRENT}:${KEY_CURRENT}`;
}

function lsKeyDrafts() {
  return `${DB_NAME}:${STORE_DRAFTS}`;
}

async function saveCurrent(payload) {
  try {
    const db = await getDb();
    await db.put(STORE_CURRENT, payload, KEY_CURRENT);
    return { ok: true };
  } catch (e) {
    // fallback
    try {
      localStorage.setItem(lsKeyCurrent(), JSON.stringify(payload));
      return { ok: true, fallback: true };
    } catch (e2) {
      return { ok: false, error: e2 || e };
    }
  }
}

async function loadCurrent() {
  try {
    const db = await getDb();
    const v = await db.get(STORE_CURRENT, KEY_CURRENT);
    if (v) return { ok: true, value: v };
  } catch {
    // ignore and fallback
  }
  const ls = localStorage.getItem(lsKeyCurrent());
  const parsed = ls ? safeJsonParse(ls) : null;
  return { ok: true, value: parsed || null, fallback: !!parsed };
}

async function listDrafts() {
  try {
    const db = await getDb();
    const all = await db.getAll(STORE_DRAFTS);
    // newest first
    all.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return { ok: true, value: all };
  } catch (e) {
    // fallback to localStorage
    const ls = localStorage.getItem(lsKeyDrafts());
    const parsed = ls ? safeJsonParse(ls) : [];
    if (Array.isArray(parsed)) {
      parsed.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return { ok: true, value: parsed, fallback: true };
    }
    return { ok: false, error: e };
  }
}

async function upsertDraft(draft) {
  try {
    const db = await getDb();
    await db.put(STORE_DRAFTS, draft);
    return { ok: true };
  } catch (e) {
    // localStorage fallback: keep array
    try {
      const ls = localStorage.getItem(lsKeyDrafts());
      const parsed = ls ? safeJsonParse(ls) : [];
      const arr = Array.isArray(parsed) ? parsed : [];
      const idx = arr.findIndex((x) => x.id === draft.id);
      if (idx >= 0) arr[idx] = draft;
      else arr.unshift(draft);
      localStorage.setItem(lsKeyDrafts(), JSON.stringify(arr));
      return { ok: true, fallback: true };
    } catch (e2) {
      return { ok: false, error: e2 || e };
    }
  }
}

async function deleteDraft(id) {
  try {
    const db = await getDb();
    await db.delete(STORE_DRAFTS, id);
    return { ok: true };
  } catch (e) {
    // localStorage fallback
    try {
      const ls = localStorage.getItem(lsKeyDrafts());
      const parsed = ls ? safeJsonParse(ls) : [];
      const arr = Array.isArray(parsed) ? parsed : [];
      const next = arr.filter((x) => x.id !== id);
      localStorage.setItem(lsKeyDrafts(), JSON.stringify(next));
      return { ok: true, fallback: true };
    } catch (e2) {
      return { ok: false, error: e2 || e };
    }
  }
}

async function wipeAllStorage() {
  // optional utility if you ever want a "Reset Storage" later
  try {
    const db = await getDb();
    const tx = db.transaction([STORE_CURRENT, STORE_DRAFTS], "readwrite");
    await tx.objectStore(STORE_CURRENT).clear();
    await tx.objectStore(STORE_DRAFTS).clear();
    await tx.done;
  } catch {
    // ignore
  }
  try {
    localStorage.removeItem(lsKeyCurrent());
    localStorage.removeItem(lsKeyDrafts());
  } catch {
    // ignore
  }
}

/* ----------------------------- Text Utilities ---------------------------- */

function clampText(text, max) {
  const cleaned = (text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (cleaned.length <= max) return cleaned;
  return cleaned.slice(0, max - 1) + "…";
}

const LIMITS = {
  x: 280,
  facebook: 2000,
  linkedin: 2000,
};

function buildOutputs(blogText, tone) {
  const firstLine = (blogText || "").split("\n")[0] || "";
  const titleGuess = clampText(firstLine, 80);
  const summary = clampText(blogText, 240);
  const baseHashtag = "#ITLeadership";

  const professional = {
    twitter: `${summary} ${baseHashtag}`.trim(),
    facebook: `I published a new article and wanted to share one takeaway:\n\n${summary}\n\nWhat’s your perspective on this?`,
    linkedin: `New article reflection:\n\n${summary}\n\nI’d value input from others who have worked through similar challenges.`,
  };

  const conversational = {
    twitter: `${summary} What do you think?`.trim(),
    facebook: `Quick thought from something I wrote recently:\n\n${summary}\n\nIf you’ve been there too, I’d love to hear what you learned.`,
    linkedin: `Something I’ve been thinking about lately:\n\n${summary}\n\nWhat would you add from your experience?`,
  };

  const promotional = {
    twitter: `New post: ${clampText(blogText, 200)} Read more soon.`,
    facebook: `New post is live.\n\n${summary}\n\nIf you want the full context, I’ll share the link next.`,
    linkedin: `New post published.\n\n${summary}\n\nIf you’d like to read it, I’m happy to share the link.`,
  };

  const map = { professional, conversational, promotional };
  const chosen = map[tone] || professional;

  return {
    ...chosen,
    meta: { titleGuess },
  };
}

async function copyToClipboard(text) {
  if (!text) return;
  // clipboard API requires https (GitHub Pages is fine)
  await navigator.clipboard.writeText(text);
}

/* ------------------------------- UI Pieces ------------------------------- */

function Layout({ children }) {
  const [navOpen, setNavOpen] = React.useState(false);

  // close drawer on route clicks (mobile)
  function onNavClick() {
    setNavOpen(false);
  }

  return (
    <div className={`app ${navOpen ? "navOpen" : ""}`}>
      {/* Mobile top bar */}
      <div className="mobileTopbar">
        <button
          className="iconButton"
          aria-label="Open menu"
          onClick={() => setNavOpen(true)}
        >
          ☰
        </button>
        <div className="mobileTitle">Social Media Management</div>
      </div>

      {/* Backdrop for mobile drawer */}
      <button
        className="navBackdrop"
        aria-label="Close menu"
        onClick={() => setNavOpen(false)}
      />

      <aside className="sidebar">
        <div className="sidebarTop">
          <h2>SparkSocial</h2>
          <button
            className="iconButton closeButton"
            aria-label="Close menu"
            onClick={() => setNavOpen(false)}
          >
            ✕
          </button>
        </div>

        <nav>
          <NavLink to="/inbox" end onClick={onNavClick}>
            Inbox
          </NavLink>
          <NavLink to="/drafts" onClick={onNavClick}>
            Drafts
          </NavLink>
          <NavLink to="/scheduler" onClick={onNavClick}>
            Scheduler
          </NavLink>
          <NavLink to="/connections" onClick={onNavClick}>
            Connections
          </NavLink>
          <NavLink to="/logs" onClick={onNavClick}>
            Logs
          </NavLink>
        </nav>
      </aside>

      <main className="main">
        <header className="header">
          <div className="headerTitle">Social Media Management</div>
          <div className="headerGlow" aria-hidden="true" />
        </header>

        <div className="content">{children}</div>
      </main>
    </div>
  );
}

function PreviewCard({ variant, body }) {
  // Show the whole post in preview (no truncation)
  const safe = body || "Preview will appear here.";

  if (variant === "x") {
    return (
      <div className="previewCard x">
        <div className="previewTop">
          <div className="avatar">S</div>
          <div>
            <div className="nameRow">
              <span className="displayName">SparkSocial</span>
              <span className="handle">@sparkwaveitservice</span>
            </div>
            <div className="metaRow">Just now</div>
          </div>
        </div>
        <div className="previewBody">{safe}</div>
      </div>
    );
  }

  if (variant === "fb") {
    return (
      <div className="previewCard fb">
        <div className="previewTop">
          <div className="avatar">S</div>
          <div>
            <div className="nameRow">
              <span className="displayName">SparkSocial</span>
              <span className="metaDot">·</span>
              <span className="metaRow">Just now</span>
            </div>
            <div className="metaRow">Public</div>
          </div>
        </div>
        <div className="previewBody">{safe}</div>
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
        <div>
          <div className="nameRow">
            <span className="displayName">SparkSocial</span>
          </div>
          <div className="metaRow">IT Services · Just now</div>
        </div>
      </div>
      <div className="previewBody">{safe}</div>
      <div className="previewFooter">
        <span>Like</span>
        <span>Comment</span>
        <span>Repost</span>
        <span>Send</span>
      </div>
    </div>
  );
}

function CounterPill({ value, limit }) {
  const count = (value || "").length;
  const over = count > limit;
  return (
    <span className={`countPill ${over ? "over" : ""}`}>
      {count}/{limit}
    </span>
  );
}

function PlatformCard({
  title,
  value,
  setValue,
  limit,
  previewVariant,
  onCopy,
}) {
  return (
    <section className="platformCard">
      <div className="platformHeader">
        <h3>{title}</h3>
        <div className="platformActions">
          <CounterPill value={value} limit={limit} />
          <button className="btnSecondary" onClick={onCopy}>
            Copy
          </button>
        </div>
      </div>

      <textarea
        className="platformTextarea"
        rows={5}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />

      <PreviewCard variant={previewVariant} body={value} />
    </section>
  );
}

/* --------------------------------- Pages -------------------------------- */

function Inbox() {
  const [tone, setTone] = React.useState("professional");
  const [blogText, setBlogText] = React.useState("");
  const [twitter, setTwitter] = React.useState("");
  const [facebook, setFacebook] = React.useState("");
  const [linkedin, setLinkedin] = React.useState("");

  const [draftStatus, setDraftStatus] = React.useState("Ready");
  const [toast, setToast] = React.useState("");

  function showToast(msg) {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(""), 1600);
  }

  function generatePosts() {
    if (!blogText.trim()) {
      showToast("Paste blog text first");
      return;
    }
    const out = buildOutputs(blogText, tone);
    setTwitter(out.twitter);
    setFacebook(out.facebook);
    setLinkedin(out.linkedin);
    showToast("Generated");
  }

  async function saveToDrafts() {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `draft_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    const firstLine = (blogText || "").split("\n")[0] || "";
    const title = clampText(firstLine.trim() || "Untitled draft", 80);

    const draft = {
      id,
      title,
      tone,
      blogText,
      twitter,
      facebook,
      linkedin,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setDraftStatus("Saving…");
    const res = await upsertDraft(draft);
    if (res.ok) {
      setDraftStatus("Saved");
      showToast(res.fallback ? "Saved (fallback)" : "Saved to Drafts");
      window.setTimeout(() => setDraftStatus("Ready"), 1400);
    } else {
      console.error("Draft save failed:", res.error);
      setDraftStatus("Save failed");
      showToast("Save failed");
      window.setTimeout(() => setDraftStatus("Ready"), 1600);
    }
  }

  async function onCopy(text) {
    try {
      await copyToClipboard(text);
      showToast("Copied");
    } catch (e) {
      console.error(e);
      showToast("Copy failed");
    }
  }

  // load saved current draft on first render
  React.useEffect(() => {
    (async () => {
      const res = await loadCurrent();
      const saved = res.value;
      if (!saved) return;
      setTone(saved.tone || "professional");
      setBlogText(saved.blogText || "");
      setTwitter(saved.twitter || "");
      setFacebook(saved.facebook || "");
      setLinkedin(saved.linkedin || "");
    })();
  }, []);

  // autosave "current" (not the Drafts list) whenever things change
  React.useEffect(() => {
    (async () => {
      const payload = { tone, blogText, twitter, facebook, linkedin };
      const res = await saveCurrent(payload);
      if (!res.ok) {
        console.error("Autosave failed:", res.error);
        setDraftStatus("Autosave failed");
        window.setTimeout(() => setDraftStatus("Ready"), 1800);
      }
    })();
  }, [tone, blogText, twitter, facebook, linkedin]);

  return (
    <div>
      <h2>Blog → Social Media Generator</h2>

      <div className="toolbar">
        <div className="toolbarLeft">
          <label className="toolbarLabel">Tone</label>
          <select value={tone} onChange={(e) => setTone(e.target.value)}>
            <option value="professional">Professional</option>
            <option value="conversational">Conversational</option>
            <option value="promotional">Promotional</option>
          </select>

          <span className="statusPill" title="Draft status">
            {draftStatus}
          </span>
        </div>

        <div className="toolbarRight">
          <button className="btnSecondary" onClick={saveToDrafts}>
            Save to Drafts
          </button>
          <button className="btnPrimary" onClick={generatePosts}>
            Generate
          </button>
        </div>
      </div>

      <textarea
        className="blogInput"
        rows={10}
        placeholder="Paste your blog article or newsletter text here..."
        value={blogText}
        onChange={(e) => setBlogText(e.target.value)}
      />

      <div className="platformGrid">
        <PlatformCard
          title="Twitter / X"
          value={twitter}
          setValue={setTwitter}
          limit={LIMITS.x}
          previewVariant="x"
          onCopy={() => onCopy(twitter)}
        />

        <PlatformCard
          title="Facebook"
          value={facebook}
          setValue={setFacebook}
          limit={LIMITS.facebook}
          previewVariant="fb"
          onCopy={() => onCopy(facebook)}
        />

        <PlatformCard
          title="LinkedIn"
          value={linkedin}
          setValue={setLinkedin}
          limit={LIMITS.linkedin}
          previewVariant="li"
          onCopy={() => onCopy(linkedin)}
        />
      </div>

      {/* small toast */}
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}

function Drafts() {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [toast, setToast] = React.useState("");

  function showToast(msg) {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(""), 1600);
  }

  async function refresh() {
    setLoading(true);
    const res = await listDrafts();
    if (res.ok) setItems(res.value || []);
    else console.error(res.error);
    setLoading(false);
  }

  React.useEffect(() => {
    refresh();
  }, []);

  function formatDate(ts) {
    if (!ts) return "";
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return "";
    }
  }

  async function onDelete(id) {
    const res = await deleteDraft(id);
    if (res.ok) {
      showToast("Deleted");
      refresh();
    } else {
      console.error(res.error);
      showToast("Delete failed");
    }
  }

  async function onLoadToInbox(draft) {
    // set current and let Inbox load it on next visit
    const payload = {
      tone: draft.tone || "professional",
      blogText: draft.blogText || "",
      twitter: draft.twitter || "",
      facebook: draft.facebook || "",
      linkedin: draft.linkedin || "",
    };
    const res = await saveCurrent(payload);
    if (res.ok) {
      showToast("Loaded into Inbox");
      // optional: also scroll to top
      window.location.hash = "#/inbox";
    } else {
      console.error(res.error);
      showToast("Load failed");
    }
  }

  async function onDuplicate(draft) {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `draft_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    const copy = {
      ...draft,
      id,
      title: `${draft.title || "Untitled"} (copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const res = await upsertDraft(copy);
    if (res.ok) {
      showToast("Duplicated");
      refresh();
    } else {
      console.error(res.error);
      showToast("Duplicate failed");
    }
  }

  return (
    <div>
      <div className="pageHeaderRow">
        <h2>Drafts</h2>
        <button className="btnSecondary" onClick={refresh}>
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="muted">Loading drafts…</div>
      ) : items.length === 0 ? (
        <div className="muted">
          No drafts yet. Go to Inbox and click “Save to Drafts”.
        </div>
      ) : (
        <div className="draftList">
          {items.map((d) => (
            <div className="draftRow" key={d.id}>
              <div className="draftInfo">
                <div className="draftTitle">{d.title || "Untitled draft"}</div>
                <div className="draftMeta">
                  <span className="chip">{d.tone || "professional"}</span>
                  <span className="muted">
                    {formatDate(d.updatedAt || d.createdAt)}
                  </span>
                </div>
              </div>

              <div className="draftActions">
                <button className="btnSecondary" onClick={() => onLoadToInbox(d)}>
                  Load to Inbox
                </button>
                <button className="btnSecondary" onClick={() => onDuplicate(d)}>
                  Duplicate
                </button>
                <button className="btnDanger" onClick={() => onDelete(d.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}

function Scheduler() {
  return (
    <div>
      <h2>Scheduler</h2>
      <div className="muted">Coming next.</div>
    </div>
  );
}

function Connections() {
  return (
    <div>
      <h2>Connections</h2>
      <div className="muted">Coming next.</div>
    </div>
  );
}

function Logs() {
  return (
    <div>
      <h2>Logs</h2>
      <div className="muted">Coming next.</div>
    </div>
  );
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
