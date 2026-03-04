import React from "react";
import { HashRouter, Routes, Route, NavLink, Navigate, useNavigate } from "react-router-dom";
import "./App.css";
import { openDB } from "idb";

/**
 * IndexedDB schema
 * - kv: key value store for current in progress draft
 * - drafts: saved drafts library
 */
const DB_NAME = "sparksocial";
const DB_VERSION = 2;

const STORE_KV = "kv";
const STORE_DRAFTS = "drafts";
const KV_CURRENT = "current";

function nowISO() {
  return new Date().toISOString();
}

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `draft_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // v1 had STORE_DRAFTS = "drafts" as a simple object store used for "current"
      // We migrate to:
      // - kv store for current
      // - drafts store (keyPath: id) for the library
      if (oldVersion < 2) {
        // Ensure kv exists
        if (!db.objectStoreNames.contains(STORE_KV)) {
          db.createObjectStore(STORE_KV);
        }

        // If an old store named "drafts" exists, we will replace it
        // because we now need it to store multiple records with keyPath "id"
        if (db.objectStoreNames.contains(STORE_DRAFTS)) {
          db.deleteObjectStore(STORE_DRAFTS);
        }
        db.createObjectStore(STORE_DRAFTS, { keyPath: "id" });
      }
    },
  });
}

async function kvGet(key) {
  const db = await getDb();
  return db.get(STORE_KV, key);
}

async function kvSet(key, value) {
  const db = await getDb();
  await db.put(STORE_KV, value, key);
}

async function listDrafts() {
  const db = await getDb();
  const all = await db.getAll(STORE_DRAFTS);
  // newest first
  return all.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

async function getDraft(id) {
  const db = await getDb();
  return db.get(STORE_DRAFTS, id);
}

async function saveDraftRecord(record) {
  const db = await getDb();
  await db.put(STORE_DRAFTS, record);
}

async function deleteDraft(id) {
  const db = await getDb();
  await db.delete(STORE_DRAFTS, id);
}

function Layout({ children }) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <div className="appShell">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="brandRow">
          <div className="brand">SparkSocial</div>
          <button
            className="iconBtn closeBtn"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            title="Close"
          >
            ✕
          </button>
        </div>

        <nav className="nav">
          <NavLink to="/inbox" end onClick={() => setMenuOpen(false)}>
            Inbox
          </NavLink>
          <NavLink to="/drafts" onClick={() => setMenuOpen(false)}>
            Drafts
          </NavLink>
          <NavLink to="/scheduler" onClick={() => setMenuOpen(false)}>
            Scheduler
          </NavLink>
          <NavLink to="/connections" onClick={() => setMenuOpen(false)}>
            Connections
          </NavLink>
          <NavLink to="/logs" onClick={() => setMenuOpen(false)}>
            Logs
          </NavLink>
        </nav>
      </aside>

      <div
        className={`backdrop ${menuOpen ? "show" : ""}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden={!menuOpen}
      />

      <main className="main">
        <header className="header">
          <button
            className="iconBtn burger"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Open menu"
            title="Menu"
          >
            ☰
          </button>

          <div className="headerTitle">Social Media Management</div>
          <div className="headerGlow" />
        </header>

        <div className="content">{children}</div>
      </main>
    </div>
  );
}

function clampText(text, max) {
  const cleaned = (text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (cleaned.length <= max) return cleaned;
  return cleaned.slice(0, max - 1) + "…";
}

function buildOutputs(blogText, tone) {
  const titleGuess = clampText((blogText || "").split("\n")[0] || "", 80);
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

  return { ...chosen, meta: { titleGuess } };
}

function PreviewCard({ variant, body }) {
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
        <div className="previewBody">{body || "Preview will appear here."}</div>
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
        <div>
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

function PlatformBlock({ title, value, setValue, rightSlot, previewVariant }) {
  return (
    <div className="platformCard">
      <div className="platformHeader">
        <h3>{title}</h3>
        <div className="platformActions">{rightSlot}</div>
      </div>

      <textarea rows={4} value={value} onChange={(e) => setValue(e.target.value)} />

      <PreviewCard variant={previewVariant} body={value} />
    </div>
  );
}

function Inbox({ state, setState }) {
  const { tone, blogText, twitter, facebook, linkedin } = state;

  const twitterCount = twitter.length;
  const twitterOver = twitterCount > 280;

  async function copy(text) {
    if (!text) return;
    await navigator.clipboard.writeText(text);
  }

  function generatePosts() {
    if (!blogText.trim()) return;
    const out = buildOutputs(blogText, tone);
    setState((s) => ({
      ...s,
      twitter: out.twitter,
      facebook: out.facebook,
      linkedin: out.linkedin,
    }));
  }

  async function saveToDrafts() {
    const title = clampText((blogText || "").split("\n")[0] || "Untitled", 80) || "Untitled";
    const record = {
      id: makeId(),
      title,
      tone,
      blogText,
      twitter,
      facebook,
      linkedin,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    await saveDraftRecord(record);
    // small UX touch: you can replace this later with a toast
    alert("Saved to Drafts");
  }

  // Load current draft on first render
  React.useEffect(() => {
    (async () => {
      const saved = await kvGet(KV_CURRENT);
      if (!saved) return;
      setState((s) => ({
        ...s,
        tone: saved.tone || "professional",
        blogText: saved.blogText || "",
        twitter: saved.twitter || "",
        facebook: saved.facebook || "",
        linkedin: saved.linkedin || "",
      }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave current draft whenever state changes
  React.useEffect(() => {
    (async () => {
      await kvSet(KV_CURRENT, { tone, blogText, twitter, facebook, linkedin, updatedAt: nowISO() });
    })();
  }, [tone, blogText, twitter, facebook, linkedin]);

  return (
    <div className="page">
      <div className="pageHead">
        <div>
          <h2 className="pageTitle">Blog → Social Media Generator</h2>
          <div className="pageSub">Generate clean drafts with previews for each platform.</div>
        </div>

        <div className="pageActions">
          <button className="btnSecondary" onClick={saveToDrafts}>
            Save to Drafts
          </button>
          <button className="btnPrimary" onClick={generatePosts}>
            Generate
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbarLeft">
          <label className="toolbarLabel">Tone</label>
          <select value={tone} onChange={(e) => setState((s) => ({ ...s, tone: e.target.value }))}>
            <option value="professional">Professional</option>
            <option value="conversational">Conversational</option>
            <option value="promotional">Promotional</option>
          </select>
        </div>
      </div>

      <textarea
        className="blogInput"
        rows={10}
        placeholder="Paste your blog article or newsletter text here..."
        value={blogText}
        onChange={(e) => setState((s) => ({ ...s, blogText: e.target.value }))}
      />

      <div className="platformGrid">
        <PlatformBlock
          title="Twitter / X"
          value={twitter}
          setValue={(v) => setState((s) => ({ ...s, twitter: v }))}
          previewVariant="x"
          rightSlot={
            <>
              <span className={twitterOver ? "count over" : "count"}>{twitterCount}/280</span>
              <button className="btnSmall" onClick={() => copy(twitter)}>
                Copy
              </button>
            </>
          }
        />

        <PlatformBlock
          title="Facebook"
          value={facebook}
          setValue={(v) => setState((s) => ({ ...s, facebook: v }))}
          previewVariant="fb"
          rightSlot={
            <button className="btnSmall" onClick={() => copy(facebook)}>
              Copy
            </button>
          }
        />

        <PlatformBlock
          title="LinkedIn"
          value={linkedin}
          setValue={(v) => setState((s) => ({ ...s, linkedin: v }))}
          previewVariant="li"
          rightSlot={
            <button className="btnSmall" onClick={() => copy(linkedin)}>
              Copy
            </button>
          }
        />
      </div>
    </div>
  );
}

function Drafts({ setState }) {
  const [drafts, setDrafts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const navigate = useNavigate();

  async function refresh() {
    setLoading(true);
    const all = await listDrafts();
    setDrafts(all);
    setLoading(false);
  }

  React.useEffect(() => {
    refresh();
  }, []);

  async function onLoad(id) {
    const d = await getDraft(id);
    if (!d) return;

    setState({
      tone: d.tone || "professional",
      blogText: d.blogText || "",
      twitter: d.twitter || "",
      facebook: d.facebook || "",
      linkedin: d.linkedin || "",
    });

    // also set as current so refresh is consistent
    await kvSet(KV_CURRENT, {
      tone: d.tone || "professional",
      blogText: d.blogText || "",
      twitter: d.twitter || "",
      facebook: d.facebook || "",
      linkedin: d.linkedin || "",
      updatedAt: nowISO(),
    });

    navigate("/inbox");
  }

  async function onDelete(id) {
    if (!confirm("Delete this draft?")) return;
    await deleteDraft(id);
    await refresh();
  }

  return (
    <div className="page">
      <div className="pageHead">
        <div>
          <h2 className="pageTitle">Drafts</h2>
          <div className="pageSub">Saved posts you can reload into Inbox.</div>
        </div>

        <div className="pageActions">
          <button className="btnSecondary" onClick={refresh}>
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="emptyState">Loading drafts…</div>
      ) : drafts.length === 0 ? (
        <div className="emptyState">
          No drafts yet. Go to Inbox and click <strong>Save to Drafts</strong>.
        </div>
      ) : (
        <div className="draftGrid">
          {drafts.map((d) => (
            <div key={d.id} className="draftCard">
              <div className="draftTop">
                <div className="draftTitle">{d.title || "Untitled"}</div>
                <div className="draftMeta">{(d.tone || "professional").toUpperCase()}</div>
              </div>

              <div className="draftSnippet">
                {clampText(d.blogText || d.linkedin || d.facebook || d.twitter || "", 220) || "No content"}
              </div>

              <div className="draftBottom">
                <div className="draftTime">
                  {d.updatedAt ? new Date(d.updatedAt).toLocaleString() : ""}
                </div>
                <div className="draftActions">
                  <button className="btnSmall" onClick={() => onLoad(d.id)}>
                    Load
                  </button>
                  <button className="btnSmallDanger" onClick={() => onDelete(d.id)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Scheduler() {
  return <div className="page"><h2 className="pageTitle">Scheduler</h2><div className="pageSub">Coming soon.</div></div>;
}
function Connections() {
  return <div className="page"><h2 className="pageTitle">Connections</h2><div className="pageSub">Coming soon.</div></div>;
}
function Logs() {
  return <div className="page"><h2 className="pageTitle">Logs</h2><div className="pageSub">Coming soon.</div></div>;
}

export default function App() {
  const [state, setState] = React.useState({
    tone: "professional",
    blogText: "",
    twitter: "",
    facebook: "",
    linkedin: "",
  });

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/inbox" replace />} />
          <Route path="/inbox" element={<Inbox state={state} setState={setState} />} />
          <Route path="/drafts" element={<Drafts setState={setState} />} />
          <Route path="/scheduler" element={<Scheduler />} />
          <Route path="/connections" element={<Connections />} />
          <Route path="/logs" element={<Logs />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}
