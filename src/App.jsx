import React from "react";
import { HashRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import "./App.css";
import { openDB } from "idb";

const DB_NAME = "sparksocial";
const STORE = "drafts";
const KEY = "current";

const LIMIT_X = 280;
const LIMIT_FB = 1200;
const LIMIT_LI = 2000;

async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    },
  });
}

function clampText(text, max) {
  const cleaned = (text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (cleaned.length <= max) return cleaned;
  return cleaned.slice(0, max - 1) + "…";
}

function buildXText(baseText, hashtag = "#ITLeadership") {
  const base = (baseText || "").replace(/\s+/g, " ").trim();
  if (!base) return "";

  const suffix = hashtag ? ` ${hashtag}` : "";
  const allowed = LIMIT_X - suffix.length;

  const clippedBase = clampText(base, Math.max(0, allowed));
  const combined = `${clippedBase}${suffix}`.trim();

  // extra safety in case of weird whitespace
  return combined.length > LIMIT_X ? combined.slice(0, LIMIT_X) : combined;
}

function buildOutputs(blogText, tone) {
  const full = (blogText || "").trim();

  const fbBody = clampText(full, LIMIT_FB);
  const liBody = clampText(full, LIMIT_LI);

  if (tone === "conversational") {
    return {
      twitter: buildXText(full, "#ITLeadership"),
      facebook: `Quick thought from something I wrote recently:\n\n${fbBody}\n\nIf you’ve been there too, I’d love to hear what you learned.`,
      linkedin: `Something I’ve been thinking about lately:\n\n${liBody}\n\nWhat would you add from your experience?`,
    };
  }

  if (tone === "promotional") {
    return {
      twitter: buildXText(`New post: ${full}`, "#ITLeadership"),
      facebook: `New post is live.\n\n${fbBody}\n\nIf you'd like the full article, I’m happy to share it.`,
      linkedin: `New post published.\n\n${liBody}\n\nIf you'd like to read the full article, let me know.`,
    };
  }

  // professional default
  return {
    twitter: buildXText(full, "#ITLeadership"),
    facebook: `I published a new article and wanted to share one takeaway:\n\n${fbBody}\n\nWhat’s your perspective on this?`,
    linkedin: `New article reflection:\n\n${liBody}\n\nI’d value input from others who have worked through similar challenges.`,
  };
}

async function safeSaveDraft(value) {
  try {
    const db = await getDb();
    await db.put(STORE, value, KEY);
    return { ok: true };
  } catch (err) {
    console.error("Draft save failed:", err);
    return { ok: false, err };
  }
}

async function safeLoadDraft() {
  try {
    const db = await getDb();
    const v = await db.get(STORE, KEY);
    return { ok: true, value: v };
  } catch (err) {
    console.error("Draft load failed:", err);
    return { ok: false, err, value: null };
  }
}

function Layout({ children }) {
  return (
    <div className="app">
      <aside className="sidebar">
        <h2>SparkSocial</h2>

        <nav>
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
        <header className="header">Social Media Management</header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
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

function PlatformBlock({
  title,
  value,
  setValue,
  limit,
  previewVariant,
  onCopy,
}) {
  const count = (value || "").length;
  const over = typeof limit === "number" && count > limit;

  return (
    <div className="platformBlock">
      <div className="platformHeader">
        <h3>{title}</h3>
        <div className="platformActions">
          {typeof limit === "number" ? (
            <span className={over ? "count over" : "count"}>
              {count}/{limit}
            </span>
          ) : null}
          <button type="button" onClick={onCopy}>
            Copy
          </button>
        </div>
      </div>

      <textarea
        rows={4}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />

      <PreviewCard variant={previewVariant} body={value} />
    </div>
  );
}

function Inbox() {
  const [tone, setTone] = React.useState("professional");
  const [blogText, setBlogText] = React.useState("");
  const [twitter, setTwitter] = React.useState("");
  const [facebook, setFacebook] = React.useState("");
  const [linkedin, setLinkedin] = React.useState("");

  const [draftStatus, setDraftStatus] = React.useState("Draft: idle");

  async function copy(text) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      // optional: you can remove alert later
      alert("Copied to clipboard");
    } catch (err) {
      console.error("Clipboard copy failed:", err);
      alert("Copy failed. (Browser blocked clipboard access.)");
    }
  }

  function generatePosts() {
    if (!blogText.trim()) return;

    const out = buildOutputs(blogText, tone);
    setTwitter(out.twitter);
    setFacebook(out.facebook);
    setLinkedin(out.linkedin);
  }

  // Load saved draft once
  React.useEffect(() => {
    (async () => {
      const res = await safeLoadDraft();
      if (!res.ok || !res.value) {
        setDraftStatus(res.ok ? "Draft: none" : "Draft: load failed");
        return;
      }
      const saved = res.value;
      setTone(saved.tone || "professional");
      setBlogText(saved.blogText || "");
      setTwitter(saved.twitter || "");
      setFacebook(saved.facebook || "");
      setLinkedin(saved.linkedin || "");
      setDraftStatus("Draft: loaded");
    })();
  }, []);

  // Autosave changes (debounced)
  React.useEffect(() => {
    const t = setTimeout(async () => {
      setDraftStatus("Draft: saving…");
      const res = await safeSaveDraft({
        tone,
        blogText,
        twitter,
        facebook,
        linkedin,
        savedAt: Date.now(),
      });
      setDraftStatus(res.ok ? "Draft: saved" : "Draft: save failed");
    }, 350);

    return () => clearTimeout(t);
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

          <span className="draftStatus">{draftStatus}</span>
        </div>

        <div className="toolbarRight">
          <button type="button" onClick={generatePosts}>
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
        <PlatformBlock
          title="Twitter / X"
          value={twitter}
          setValue={setTwitter}
          limit={LIMIT_X}
          previewVariant="x"
          onCopy={() => copy(twitter)}
        />

        <PlatformBlock
          title="Facebook"
          value={facebook}
          setValue={setFacebook}
          limit={LIMIT_FB}
          previewVariant="fb"
          onCopy={() => copy(facebook)}
        />

        <PlatformBlock
          title="LinkedIn"
          value={linkedin}
          setValue={setLinkedin}
          limit={LIMIT_LI}
          previewVariant="li"
          onCopy={() => copy(linkedin)}
        />
      </div>
    </div>
  );
}

function Drafts() {
  return <div>Drafts</div>;
}
function Scheduler() {
  return <div>Scheduler</div>;
}
function Connections() {
  return <div>Connections</div>;
}
function Logs() {
  return <div>Logs</div>;
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
