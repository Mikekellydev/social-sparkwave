import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";

function Layout({ children }) {
  return (
    <div className="app">
      <aside className="sidebar">
        <h2>SparkSocial</h2>

        <nav>
          <a href="#">Inbox</a>
          <a href="#">Drafts</a>
          <a href="#">Scheduler</a>
          <a href="#">Connections</a>
          <a href="#">Logs</a>
        </nav>
      </aside>

      <main className="main">
        <header className="header">
          Social Media Management
        </header>

        <div className="content">
          {children}
        </div>
      </main>
    </div>
  );
}

function Inbox() {
  return <div>Inbox (incoming blog posts will appear here)</div>;
}

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Inbox />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
