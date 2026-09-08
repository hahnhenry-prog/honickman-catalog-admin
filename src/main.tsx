import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const ADMIN_PASSWORD = import.meta.env.VITE_SITE_PASSWORD as string | undefined;

function Root() {
  const stored = sessionStorage.getItem("admin_auth");
  const [authed, setAuthed] = useState(stored === "1");
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  if (!ADMIN_PASSWORD || authed) return <App />;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (input === ADMIN_PASSWORD) {
      sessionStorage.setItem("admin_auth", "1");
      setAuthed(true);
    } else {
      setError(true);
      setInput("");
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f5f5f4", fontFamily: "system-ui, sans-serif" }}>
      <form onSubmit={submit} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "40px 36px", width: 320, boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: "#111" }}>Honickman Catalog Admin</div>
        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 24 }}>Enter the admin password to continue.</div>
        <input
          autoFocus
          type="password"
          value={input}
          onChange={e => { setInput(e.target.value); setError(false); }}
          placeholder="Password"
          style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", fontSize: 14, border: `1px solid ${error ? "#ef4444" : "#d1d5db"}`, borderRadius: 6, outline: "none", marginBottom: 8 }}
        />
        {error && <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 8 }}>Incorrect password.</div>}
        <button type="submit" style={{ width: "100%", padding: "9px 0", fontSize: 14, fontWeight: 500, background: "#111", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
          Sign in
        </button>
      </form>
    </div>
  );
}

const container = document.getElementById('root')!;
const w = window as any;
if (!w.__reactRoot) w.__reactRoot = ReactDOM.createRoot(container);
w.__reactRoot.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
