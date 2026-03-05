import React from "react";
import { HashRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import "./App.css";
import { openDB } from "idb";

const DB_NAME = "sparksocial";
const STORE = "drafts";

async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        // keyPath lets us store multiple drafts with an id
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    },
  });
}

async function upsertDraft(draft) {
  const db = await getDb();
  await db.put(STORE, draft);
}

async function getAllDrafts() {
  const db = await getDb();
  return db.getAll(STORE);
}

async function getDraftById(id) {
  const db = await getDb();
  return db.get(STORE, id);
}

async function deleteDraftById(id) {
  const db = await getDb();
  await db.delete(STORE, id);
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

function clampText(text, max) {
  const cleaned = (text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (cleaned.length <= max) return cleaned;
  return cleaned.slice(0, max - 1) + "…";
}

function buildOutputs(blogText, tone) {
  const summary = clampText(blogText, 240);
  const baseHashtag = "#ITLeadership";

  const professional = {
    twitter: `${clampText(blogText, 240)} ${baseHashtag}`.trim(),
    facebook: `I published a new article and wanted to share one takeaway:\n\n${summary}\n\nWhat’s your perspective on this?`,
    linkedin: `New article reflection:\n\n${summary}\n\nI’d value input from others who have worked through similar challenges.`,
  };

  const conversational = {
    twitter: `${clampText(blogText, 240)} What do you think?`.trim(),
    facebook: `Quick thought from something I wrote recently:\n\n${summary}\n\nIf you’ve been there too, I’d love to hear what you learned.`,
    linkedin: `Something I’ve been thinking about lately:\n\n${summary}\n\nWhat would you add from your experience?`,
  };

  const promotional = {
    twitter: `New post: ${clampText(blogText, 200)} Read more soon.`,
    facebook: `New post is live.\n\n${summary}\n\nIf you want the full context, I’ll share the link next.`,
    linkedin: `New post published.\n\n${summary}\n\nIf you’d like to read it, I’m happy to share the link.`,
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

function PlatformBlock({ title, value, setValue, rightSlot, previewVariant, maxLen }) {
  const len = value.length;
  const over = maxLen ? len > maxLen : false;

  return (
    <div className="platformBlock">
      <div className="platformHeader">
        <h3>{title}</h3>
        <div className="platformActions">
          {maxLen ? (
            <span className={over ? "count over" : "count"}>
              {len}/{maxLen}
            </span>
          ) : null}
          {rightSlot}
        </div>
      </div>

      <textarea rows={4} value={value} onChange={(e) => setValue(e.target.value)} />

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

  // limits
  const LIMIT_X = 280;
  const LIMIT_FB = 1200;
  const LIMIT_LI = 2000;

  // draft status + autosave debounce
  const [draftStatus, setDraftStatus] = React.useState("Draft: not saved");
  const autosaveTimer = React.useRef(null);

  async function copy(text) {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    alert("Copied to clipboard");
  }

  function generatePosts() {
    if (!blogText.trim()) return;
    const out = buildOutputs(blogText, tone);
    setTwitter(out.twitter);
    setFacebook(out.facebook);
    setLinkedin(out.linkedin);
  }

  function makeDraftPayload(overrides = {}) {
    return {
      id: "current", // this is your "working" draft
      updatedAt: new Date().toISOString(),
      tone,
      blogText,
      twitter,
      facebook,
      linkedin,
      ...overrides,
    };
  }

  async function saveNow() {
    try {
      setDraftStatus("Draft: saving...");
      await upsertDraft(makeDraftPayload());
      setDraftStatus("Draft: saved");
    } catch (e) {
      console.error("Draft save failed:", e);
      setDraftStatus("Draft: save failed");
    }
  }

  async function saveAsNewDraft() {
    try {
      setDraftStatus("Draft: saving...");
      const id = crypto?.randomUUID ? crypto.randomUUID() : String(Date.now());
      await upsertDraft(makeDraftPayload({ id }));
      setDraftStatus("Draft: saved to Drafts");
    } catch (e) {
      console.error("Save to Drafts failed:", e);
      setDraftStatus("Draft: save failed");
    }
  }

  // Load working draft once
  React.useEffect(() => {
    (async () => {
      try {
        const saved = await getDraftById("current");
        if (!saved) return;
        setTone(saved.tone || "professional");
        setBlogText(saved.blogText || "");
        setTwitter(saved.twitter || "");
        setFacebook(saved.facebook || "");
        setLinkedin(saved.linkedin || "");
        setDraftStatus("Draft: loaded");
      } catch (e) {
        console.error("Draft load failed:", e);
        setDraftStatus("Draft: load failed");
      }
    })();
  }, []);

  // Autosave (debounced)
  React.useEffect(() => {
    // clear any pending save
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);

    autosaveTimer.current = setTimeout(() => {
      saveNow();
    }, 600);

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          {/* Restored buttons */}
          <button type="button" onClick={saveAsNewDraft}>
            Save to Drafts
          </button>
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
          previewVariant="x"
          maxLen={LIMIT_X}
          rightSlot={<button onClick={() => copy(twitter)}>Copy</button>}
        />

        <PlatformBlock
          title="Facebook"
          value={facebook}
          setValue={setFacebook}
          previewVariant="fb"
          maxLen={LIMIT_FB}
          rightSlot={<button onClick={() => copy(facebook)}>Copy</button>}
        />

        <PlatformBlock
          title="LinkedIn"
          value={linkedin}
          setValue={setLinkedin}
          previewVariant="li"
          maxLen={LIMIT_LI}
          rightSlot={<button onClick={() => copy(linkedin)}>Copy</button>}
        />
      </div>
    </div>
  );
}

function Drafts() {
  const [items, setItems] = React.useState([]);

  React.useEffect(() => {
    (async () => {
      try {
        const all = await getAllDrafts();
        // hide the working draft from this list
        const filtered = (all || [])
          .filter((d) => d.id !== "current")
          .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
        setItems(filtered);
      } catch (e) {
        console.error("Failed to load drafts:", e);
      }
    })();
  }, []);

  async function remove(id) {
    await deleteDraftById(id);
    setItems((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <div>
      <h2>Drafts</h2>

      {items.length === 0 ? (
        <p style={{ opacity: 0.8 }}>No saved drafts yet. Use “Save to Drafts” from Inbox.</p>
      ) : (
        <div className="draftList">
          {items.map((d) => (
            <div className="draftItem" key={d.id}>
              <div className="draftMeta">
                <div className="draftTitle">{clampText(d.blogText, 70) || "Untitled draft"}</div>
                <div className="draftSub">
                  {new Date(d.updatedAt).toLocaleString()} · {d.tone}
                </div>
              </div>
              <div className="draftActions">
                <button onClick={() => remove(d.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
