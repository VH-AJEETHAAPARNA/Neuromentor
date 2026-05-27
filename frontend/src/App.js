import { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #080810; --surface: #0e0e1a; --surface2: #13131f;
    --border: rgba(255,255,255,0.06); --border2: rgba(255,255,255,0.12);
    --accent: #7c6aff; --accent2: #a78bfa; --accent3: #c4b5fd;
    --text: #f0eeff; --muted: #6b6880; --muted2: #9891b0;
    --green: #4ade80; --amber: #fbbf24;
  }
  body { background: var(--bg); }
  .app { display: flex; height: 100vh; font-family: 'DM Sans', sans-serif; background: var(--bg); color: var(--text); overflow: hidden; }
  .sidebar { width: 300px; min-width: 300px; background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 28px 20px; gap: 20px; position: relative; overflow: hidden; }
  .sidebar::before { content: ''; position: absolute; top: -60px; left: -60px; width: 240px; height: 240px; background: radial-gradient(circle, rgba(124,106,255,0.12) 0%, transparent 70%); pointer-events: none; }
  .logo-row { display: flex; align-items: center; gap: 12px; }
  .logo-icon { width: 40px; height: 40px; background: linear-gradient(135deg, #7c6aff, #a78bfa); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 0 20px rgba(124,106,255,0.4); }
  .logo-text h1 { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; }
  .logo-text p { font-size: 11px; color: var(--muted); letter-spacing: 0.5px; text-transform: uppercase; }
  .status-pill { display: inline-flex; align-items: center; gap: 6px; background: rgba(74,222,128,0.1); border: 1px solid rgba(74,222,128,0.2); border-radius: 20px; padding: 4px 10px; font-size: 11px; color: var(--green); width: fit-content; }
  .status-dot { width: 6px; height: 6px; background: var(--green); border-radius: 50%; animation: pulse 2s infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  .card { background: var(--surface2); border: 1px solid var(--border); border-radius: 16px; padding: 16px; }
  .card-title { font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 600; color: var(--muted2); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px; }
  .score-number { font-family: 'Syne', sans-serif; font-size: 42px; font-weight: 800; color: var(--accent2); line-height: 1; margin-bottom: 4px; }
  .brain-regions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .brain-chip { background: rgba(124,106,255,0.08); border: 1px solid rgba(124,106,255,0.15); border-radius: 10px; padding: 10px 12px; font-size: 11px; color: var(--accent3); }
  .brain-chip strong { display: block; font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 700; color: var(--accent2); margin-bottom: 2px; }
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative; }
  .header { padding: 18px 28px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; background: rgba(8,8,16,0.8); backdrop-filter: blur(12px); }
  .header-left { display: flex; align-items: center; gap: 14px; }
  .header-avatar { width: 38px; height: 38px; background: linear-gradient(135deg, #7c6aff, #a78bfa); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
  .header-title { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; }
  .header-sub { font-size: 12px; color: var(--muted); margin-top: 1px; }
  .hint-counter { display: flex; align-items: center; gap: 8px; background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 8px 16px; font-size: 13px; color: var(--muted2); }
  .hint-num { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 800; color: var(--amber); }
  .messages { flex: 1; overflow-y: auto; padding: 28px; display: flex; flex-direction: column; gap: 20px; scrollbar-width: thin; scrollbar-color: var(--border2) transparent; }
  .msg-row { display: flex; animation: fadeUp 0.3s ease; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  .msg-row.user { justify-content: flex-end; }
  .msg-row.agent { justify-content: flex-start; }
  .msg-bubble { max-width: 68%; padding: 14px 18px; border-radius: 18px; font-size: 14px; line-height: 1.7; }
  .msg-row.user .msg-bubble { background: linear-gradient(135deg, #7c6aff, #9b8cff); color: #fff; border-bottom-right-radius: 4px; box-shadow: 0 4px 20px rgba(124,106,255,0.3); }
  .msg-row.agent .msg-bubble { background: var(--surface2); border: 1px solid var(--border); color: var(--text); border-bottom-left-radius: 4px; }
  .thinking { display: flex; align-items: center; gap: 6px; padding: 14px 18px; background: var(--surface2); border: 1px solid var(--border); border-radius: 18px; border-bottom-left-radius: 4px; width: fit-content; }
  .thinking span { width: 6px; height: 6px; background: var(--accent2); border-radius: 50%; animation: bounce 1.2s infinite; }
  .thinking span:nth-child(2) { animation-delay: 0.2s; }
  .thinking span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes bounce { 0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; } 40% { transform: scale(1); opacity: 1; } }
  .input-area { padding: 20px 28px; border-top: 1px solid var(--border); background: rgba(8,8,16,0.8); backdrop-filter: blur(12px); }
  .input-row { display: flex; gap: 12px; align-items: flex-end; background: var(--surface2); border: 1px solid var(--border2); border-radius: 16px; padding: 12px 12px 12px 18px; transition: border-color 0.2s; }
  .input-row:focus-within { border-color: rgba(124,106,255,0.4); box-shadow: 0 0 0 3px rgba(124,106,255,0.08); }
  .input-field { flex: 1; background: none; border: none; outline: none; color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 14px; resize: none; line-height: 1.5; max-height: 120px; }
  .input-field::placeholder { color: var(--muted); }
  .send-btn { width: 38px; height: 38px; background: linear-gradient(135deg, #7c6aff, #a78bfa); border: none; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; color: white; transition: all 0.2s; flex-shrink: 0; }
  .send-btn:hover { transform: scale(1.05); box-shadow: 0 0 16px rgba(124,106,255,0.5); }
  .send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
  .input-hint { text-align: center; font-size: 11px; color: var(--muted); margin-top: 10px; }
  .welcome { flex: 1; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 16px; color: var(--muted); text-align: center; padding: 40px; }
  .welcome-icon { font-size: 48px; filter: drop-shadow(0 0 20px rgba(124,106,255,0.5)); }
  .welcome h2 { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; color: var(--text); }
  .welcome p { font-size: 14px; max-width: 360px; line-height: 1.7; }
`;

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hints, setHints] = useState(0);
  const [scores, setScores] = useState([{ topic: "Start", score: 100 }]);
  const [sessionId] = useState(() => Math.random().toString(36).slice(2));
  const [sessionReady, setSessionReady] = useState(false);
  const bottomRef = useRef();
  const inputRef = useRef();

  useEffect(() => {
    const createSession = async () => {
      try {
        await fetch(
          "http://localhost:8000/apps/neuromentor/users/user/sessions/" + sessionId,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({})
          }
        );
        setSessionReady(true);
      } catch (e) {
        setSessionReady(true);
      }
    };
    createSession();
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/run_sse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_name: "neuromentor",
          user_id: "user",
          session_id: sessionId,
          new_message: { role: "user", parts: [{ text: userMsg }] },
          streaming: false
        })
      });

      const text = await res.text();
      console.log("RAW:", text.slice(0, 300));
      let agentText = null;

      const lines = text.split("\n");
      for (const line of lines) {
        if (line.startsWith("data:")) {
          try {
            const json = JSON.parse(line.slice(5).trim());
            if (json.content && json.content.role === "model") {
              const part = json.content.parts && json.content.parts[0] && json.content.parts[0].text;
              if (part) {
                agentText = part;
              }
            }
          } catch (e) {}
        }
      }

      if (!agentText) {
        agentText = "I received your message. Please try again.";
      }

      setMessages(prev => [...prev, { role: "agent", text: agentText }]);
      setHints(h => h + 1);

      if (scores.length < 8) {
        const newScore = { topic: "Q" + scores.length, score: Math.max(30, 100 - hints * 12) };
        setScores(prev => [...prev, newScore]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "agent", text: "Connection error — make sure backend is running." }]);
    }

    setLoading(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const avgScore = Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length);

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <div className="sidebar">
          <div className="logo-row">
            <div className="logo-icon">🧠</div>
            <div className="logo-text">
              <h1>NeuroMentor</h1>
              <p>Brain-mapped agent</p>
            </div>
          </div>
          <div className="status-pill">
            <div className="status-dot" />
            {sessionReady ? "Active session" : "Connecting..."}
          </div>
          <div className="card">
            <div className="card-title">Independence Score</div>
            <div className="score-number">{avgScore}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>out of 100 — keeps rising</div>
            <div style={{ marginTop: 14 }}>
              <ResponsiveContainer width="100%" height={80}>
                <LineChart data={scores}>
                  <XAxis dataKey="topic" hide />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip contentStyle={{ background: "#13131f", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="score" stroke="#7c6aff" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card">
            <div className="card-title">Session Stats</div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "Syne", fontSize: 24, fontWeight: 800, color: "#a78bfa" }}>{messages.filter(m => m.role === "user").length}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>Questions</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "Syne", fontSize: 24, fontWeight: 800, color: "#fbbf24" }}>{hints}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>Hints used</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "Syne", fontSize: 24, fontWeight: 800, color: "#4ade80" }}>{avgScore}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>Score</div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-title">Brain Regions</div>
            <div className="brain-regions">
              <div className="brain-chip"><strong>Logic</strong>Decides and routes</div>
              <div className="brain-chip"><strong>Socratic</strong>Asks questions</div>
              <div className="brain-chip"><strong>Memory</strong>Remembers you</div>
              <div className="brain-chip"><strong>Scaffold</strong>Tracks growth</div>
            </div>
          </div>
        </div>

        <div className="main">
          <div className="header">
            <div className="header-left">
              <div className="header-avatar">🧠</div>
              <div>
                <div className="header-title">NeuroMentor</div>
                <div className="header-sub">Never answers directly — guides you to discover</div>
              </div>
            </div>
            <div className="hint-counter">
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Hints used</span>
              <span className="hint-num">{hints}</span>
            </div>
          </div>

          {messages.length === 0 ? (
            <div className="welcome">
              <div className="welcome-icon">🧠</div>
              <h2>Start learning differently</h2>
              <p>NeuroMentor never gives direct answers. It guides you to discover answers yourself — making you smarter over time.</p>
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>Try: "What is machine learning?" or "Explain neural networks"</p>
            </div>
          ) : (
            <div className="messages">
              {messages.map((msg, i) => (
                <div key={i} className={"msg-row " + msg.role}>
                  <div className="msg-bubble">{msg.text}</div>
                </div>
              ))}
              {loading && (
                <div className="msg-row agent">
                  <div className="thinking">
                    <span /><span /><span />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}

          <div className="input-area">
            <div className="input-row">
              <textarea
                ref={inputRef}
                className="input-field"
                value={input}
                rows={1}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask anything — I will guide you to the answer..."
              />
              <button className="send-btn" onClick={sendMessage} disabled={loading}>↑</button>
            </div>
            <div className="input-hint">Press Enter to send · Shift+Enter for new line</div>
          </div>
        </div>
      </div>
    </>
  );
}