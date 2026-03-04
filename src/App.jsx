import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import React from "react"

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
  const [blogText, setBlogText] = React.useState("")
  const [twitter, setTwitter] = React.useState("")
  const [facebook, setFacebook] = React.useState("")
  const [linkedin, setLinkedin] = React.useState("")

  function generatePosts() {
    if (!blogText) return

    const short = blogText.slice(0, 200)

    setTwitter(short + " #blog #insight")

    setFacebook(
      "I just published a new article and wanted to share a quick thought from it:\n\n" +
      short +
      "\n\nWhat do you think?"
    )

    setLinkedin(
      "New article reflection:\n\n" +
      short +
      "\n\nCurious how others approach this."
    )
  }

  return (
    <div>

      <h2>Blog Post → Social Media Generator</h2>

      <textarea
        rows="10"
        style={{width:"100%", marginBottom:"10px"}}
        placeholder="Paste your blog post here..."
        value={blogText}
        onChange={(e)=>setBlogText(e.target.value)}
      />

      <button onClick={generatePosts}>
        Generate Posts
      </button>

      <h3>Twitter / X</h3>
      <textarea rows="4" style={{width:"100%"}} value={twitter} readOnly />

      <h3>Facebook</h3>
      <textarea rows="4" style={{width:"100%"}} value={facebook} readOnly />

      <h3>LinkedIn</h3>
      <textarea rows="4" style={{width:"100%"}} value={linkedin} readOnly />

    </div>
  )
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
