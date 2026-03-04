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
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
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
  return cleaned.length <= max ? cleaned : cleaned.slice(0, max - 1) + "…";
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

  return (tone === "conversational" && conversational) ||
    (tone === "promotional" && promotional) ||
    professional;
}

function PreviewCard({ variant, body }) {
  if (variant === "x") {
    return (
      <div className="previewCard x">
        <div className="previewTop">
          <div className="avatar">S</div>
          <div className="previewMeta">
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
          <div className="previewMeta">
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
        <div className="previewMeta">
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
        className="platformTextarea"
        rows={5}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={`Write / edit your ${title} post here...`}
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
    <div className="page">
      <div className="pageTitleRow">
        <h2 className="pageTitle">Blog → Social Media Generator</h2>
      </div>

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
          <button className="primaryBtn" onClick={generatePosts}>
            Generate
          </button>
        </div>
      </div>

      <textarea
        className="blogInput"
        rows={9}
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
              <button className="ghostBtn" onClick={() => copy(twitter)}>
                Copy
              </button>
            </>
          }
        />

        <PlatformBlock
          title="Facebook"
          value={facebook}
          setValue={setFacebook}
          previewVariant="fb"
          rightSlot={
            <button className="ghostBtn" onClick={() => copy(facebook)}>
              Copy
            </button>
          }
        />

        <PlatformBlock
          title="LinkedIn"
          value={linkedin}
          setValue={setLinkedin}
          previewVariant="li"
          rightSlot={
            <button className="ghostBtn" onClick={() => copy(linkedin)}>
              Copy
            </button>
          }
        />
      </div>
    </div>
  );
}

function Drafts() {
  return <div className="page"><h2 className="pageTitle">Drafts</h2></div>;
}
function Scheduler() {
  return <div className="page"><h2 className="pageTitle">Scheduler</h2></div>;
}
function Connections() {
  return <div className="page"><h2 className="pageTitle">Connections</h2></div>;
}
function Logs() {
  return <div className="page"><h2 className="pageTitle">Logs</h2></div>;
}

function Layout({ children }) {
  const [navOpen, setNavOpen] = React.useState(false);

  React.useEffect(() => {
    function onHashChange() {
      setNavOpen(false);
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return (
    <div className="app">
      <button
        className="hamburger"
        onClick={() => setNavOpen((v) => !v)}
        aria-label="Open navigation"
        aria-expanded={navOpen}
      >
        <span />
        <span />
        <span />
      </button>

      <div
        className={navOpen ? "navOverlay show" : "navOverlay"}
        onClick={() => setNavOpen(false)}
      />

      <aside className={navOpen ? "sidebar open" : "sidebar"}>
        <div className="brandRow">
          <div className="brandMark">S</div>
          <div>
            <div className="brandName">SparkSocial</div>
            <div className="brandTag">Social toolkit</div>
          </div>
        </div>

        <nav className="nav">
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
          <div className="headerGlow" />
          <div className="headerInner">
            <div className="headerTitle">Social Media Management</div>
          </div>
        </header>

        <div className="content">{children}</div>
      </main>
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
