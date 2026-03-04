import React from "react";
import { HashRouter, Routes, Route, NavLink } from "react-router-dom";
import "./App.css";

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
  const [blogText, setBlogText] = React.useState("");
  const [twitter, setTwitter] = React.useState("");
  const [facebook, setFacebook] = React.useState("");
  const [linkedin, setLinkedin] = React.useState("");

  function generatePosts() {
    if (!blogText) return;

    const summary = blogText.slice(0, 220);

    setTwitter(summary + " #blog #insight");

    setFacebook(
      "I just shared a new article and wanted to highlight one thought:\n\n" +
      summary +
      "\n\nWhat do you think?"
    );

    setLinkedin(
      "New article reflection:\n\n" +
      summary +
      "\n\nCurious how others approach this."
    );
  }

  return (
    <div>

      <h2>Blog → Social Media Generator</h2>

      <textarea
        rows="10"
        style={{ width: "100%", marginBottom: "15px" }}
        placeholder="Paste your blog article or newsletter text here..."
        value={blogText}
        onChange={(e) => setBlogText(e.target.value)}
      />

      <button onClick={generatePosts}>
        Generate Social Posts
      </button>

      <hr style={{ margin: "30px 0" }} />

      <h3>Twitter / X</h3>
      <textarea
        rows="4"
        style={{ width: "100%", marginBottom: "15px" }}
        value={twitter}
        readOnly
      />

      <h3>Facebook</h3>
      <textarea
        rows="4"
        style={{ width: "100%", marginBottom: "15px" }}
        value={facebook}
        readOnly
      />

      <h3>LinkedIn</h3>
      <textarea
        rows="4"
        style={{ width: "100%" }}
        value={linkedin}
        readOnly
      />

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
