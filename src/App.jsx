import React from "react";
import { HashRouter, Routes, Route, NavLink } from "react-router-dom";
import "./App.css";

# Save and Load Draft
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

function Layout({ children }) {
  return (
    <div className="app">
      <aside className="sidebar">
        <h2>SparkSocial</h2>

        <nav>
          <NavLink to="/inbox" end>Inbox</NavLink>
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
    alert("Copied to clipboard");
  }

  function summarize(text, max) {
    const cleaned = text.replace(/\s+/g, " ").trim();
    return cleaned.length > max ? cleaned.slice(0, max - 1) + "…" : cleaned;
  }

  function generatePosts() {
    if (!blogText.trim()) return;

    const summary = summarize(blogText, 240);

    if (tone === "professional") {
      setTwitter(summary + " #leadership");
      setFacebook(
        "I published a new article and wanted to share one takeaway:\n\n" +
          summary +
          "\n\nWhat’s your perspective on this?"
      );
      setLinkedin(
        "New article reflection:\n\n" +
          summary +
          "\n\nI’d value input from others who have worked through similar challenges."
      );
    }

    if (tone === "conversational") {
      setTwitter(summary + " What do you think?");
      setFacebook(
        "Quick thought from something I wrote recently:\n\n" +
          summary +
          "\n\nIf you’ve been there too, I’d love to hear what you learned."
      );
      setLinkedin(
        "Something I’ve been thinking about lately:\n\n" +
          summary +
          "\n\nWhat would you add from your experience?"
      );
    }

    if (tone === "promotional") {
      setTwitter("New post: " + summarize(blogText, 200) + " Read more soon.");
      setFacebook(
        "New post is live.\n\n" +
          summary +
          "\n\nIf you want the full context, I’ll share the link next."
      );
      setLinkedin(
        "New post published.\n\n" +
          summary +
          "\n\nIf you’d like to read it, I’m happy to share the link."
      );
    }
  }

  React.useEffect(() => {
    // load saved draft on first render
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
    // autosave whenever something changes
    (async () => {
      await saveDraft({ tone, blogText, twitter, facebook, linkedin });
    })();
  }, [tone, blogText, twitter, facebook, linkedin]);

  return (
    <div>
      <h2>Blog → Social Media Generator</h2>

      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "12px" }}>
        <label style={{ fontWeight: 600 }}>Tone</label>
        <select value={tone} onChange={(e) => setTone(e.target.value)}>
          <option value="professional">Professional</option>
          <option value="conversational">Conversational</option>
          <option value="promotional">Promotional</option>
        </select>

        <button onClick={generatePosts}>Generate</button>
      </div>

      <textarea
        rows="10"
        style={{ width: "100%", marginBottom: "18px" }}
        placeholder="Paste your blog article or newsletter text here..."
        value={blogText}
        onChange={(e) => setBlogText(e.target.value)}
      />

      <div className="platformBlock">
        <div className="platformHeader">
          <h3>Twitter / X</h3>
          <div className="platformActions">
            <span className={twitterOver ? "count over" : "count"}>
              {twitterCount}/280
            </span>
            <button onClick={() => copy(twitter)}>Copy</button>
          </div>
        </div>
        <textarea
          rows="4"
          style={{ width: "100%" }}
          value={twitter}
          onChange={(e) => setTwitter(e.target.value)}
        />
      </div>

      <div className="platformBlock">
        <div className="platformHeader">
          <h3>Facebook</h3>
          <div className="platformActions">
            <button onClick={() => copy(facebook)}>Copy</button>
          </div>
        </div>
        <textarea
          rows="4"
          style={{ width: "100%" }}
          value={facebook}
          onChange={(e) => setFacebook(e.target.value)}
        />
      </div>

      <div className="platformBlock">
        <div className="platformHeader">
          <h3>LinkedIn</h3>
          <div className="platformActions">
            <button onClick={() => copy(linkedin)}>Copy</button>
          </div>
        </div>
        <textarea
          rows="4"
          style={{ width: "100%" }}
          value={linkedin}
          onChange={(e) => setLinkedin(e.target.value)}
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
          <Route path="/" element={<Inbox />} />
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
