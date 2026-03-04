import React from "react";
import { HashRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import "./App.css";
import { openDB } from "idb";

const DB_NAME = "sparksocial";
const STORE = "drafts";
const KEY = "current";

async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    },
  });
}

async function saveDraft(value) {
  const db = await getDb();
  await db.put(STORE, value, KEY);
}

async function loadDraft() {
  const db = await getDb();
  return db.get(STORE, KEY);
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
  return map[tone] || professional;
}

function IconMenu() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 6.5c0-.55.45-1 1-1h16a1 1 0 1 1 0 2H4c-.55 0-1-.45-1-1Zm0 5.5c0-.55.45-1 1-1h16a1 1 0 1 1 0 2H4c-.55 0-1-.45-1-1Zm1 4.5a1 1 0 1 0 0 2h16a1 1 0 1 0 0-2H4Z"
      />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z"
      />
    </svg>
  );
}

function Layout({ children }) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  React.useEffect(() => {
    document.body.classList.toggle("menu-open", menuOpen);
    return () => document.body.classList.remove("menu-open");
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="app">
      <div
        className={menuOpen ? "overlay show" : "overlay"}
        onClick={closeMenu}
        aria-hidden={!menuOpen}
      />

      <aside className={menuOpen ? "sidebar open" : "sidebar"}>
        <div className="sidebarTop">
          <h2>SparkSocial</h2>
          <button
            className="iconBtn closeBtn"
            type="button"
            onClick={closeMenu}
            aria-label="Close menu"
          >
            <IconClose />
          </button>
        </div>

        <nav onClick={closeMenu}>
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
          <button
            className="iconBtn menuBtn"
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <IconMenu />
          </button>

          <div className="headerTitle">Social Media Management</div>
        </header>

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

function PlatformBlock({ title, value, setValue, rightSlot, previewVariant }) {
  return (
    <section className="platformBlock">
      <div className="platformHeader">
        <h3>{title}</h3>
        <div className="platformActions">{rightSlot}</div>
      </div>

      <textarea
        rows={4}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />

      <PreviewCard variant={previewVariant} body={value} />
    </section>
  );
}

function Inbox() {
  const [tone, setTone] = React.useState("professional");
  const [blogText, setBlogText] = React.useState("");
  const [twitter, setTwitter] = React.useState("");
  const [facebook, setFacebook] = React.useState("");
  const [linkedin, setLinkedin] = React.useState("");

  const twitterCount = twitter.length;
  const twitterOver = twitterCount > 280;

  async function copy(text) {
    if (!text) return;
    await navigator.clipboard.writeText(text);
  }

  function generatePosts() {
    if (!blogText.trim()) return;
    const out = buildOutputs(blogText, tone);
    setTwitter(out.twitter);
    setFacebook(out.facebook);
    setLinkedin(out.linkedin);
  }

  React.useEffect(() => {
    (async () => {
      const saved = await loadDraft();
      if (!saved) return;
      setTone(saved.tone || "professional");
      setBlogText(saved.blogText || "");
      setTwitter(saved.twitter || "");
      setFacebook(saved.facebook || "");
      setLinkedin(saved.linkedin || "");
    })();
  }, []);

  React.useEffect(() => {
    (async () => {
      await saveDraft({ tone, blogText, twitter, facebook, linkedin });
    })();
  }, [tone, blogText, twitter, facebook, linkedin]);

  return (
    <div>
      <h2 className="pageTitle">Blog → Social Media Generator</h2>

      <div className="toolbar">
        <div className="toolbarLeft">
          <label className="toolbarLabel">Tone</label>
          <select value={tone} onChange={(e) => setTone(e.target.value)}>
            <option value="professional">Professional</option>
            <option value="conversational">Conversational</option>
            <option value="promotional">Promotional</option>
          </select>
        </div>

        <div className="toolbarRight">
          <button onClick={generatePosts}>Generate</button>
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
          rightSlot={
            <>
              <span className={twitterOver ? "count over" : "count"}>
                {twitterCount}/280
              </span>
              <button onClick={() => copy(twitter)}>Copy</button>
            </>
          }
        />

        <PlatformBlock
          title="Facebook"
          value={facebook}
          setValue={setFacebook}
          previewVariant="fb"
          rightSlot={<button onClick={() => copy(facebook)}>Copy</button>}
        />

        <PlatformBlock
          title="LinkedIn"
          value={linkedin}
          setValue={setLinkedin}
          previewVariant="li"
          rightSlot={<button onClick={() => copy(linkedin)}>Copy</button>}
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
