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
  return <div>Inbox (incoming blog posts will appear here)</div>;
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
