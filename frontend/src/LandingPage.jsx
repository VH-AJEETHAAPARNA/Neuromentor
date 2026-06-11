import { useState, useEffect, useRef } from "react";

// ─── AMBIENT PULSE ─────────────────────────────────────────────────────────────
function AmbientPulse() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          position: "absolute",
          width: `${i * 300}px`, height: `${i * 300}px`,
          borderRadius: "50%",
          border: "1px solid rgba(96,165,250,0.06)",
          animation: `pulse-ring ${3 + i}s ease-in-out ${i * 0.5}s infinite`
        }} />
      ))}
      <style>{`
        @keyframes pulse-ring {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.08); opacity: 0.1; }
        }
      `}</style>
    </div>
  );
}

// ─── BLOBS ─────────────────────────────────────────────────────────────────────
function Blobs() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "-20%", left: "-10%", width: 700, height: 700, borderRadius: "50%", background: "rgba(96,165,250,0.06)", filter: "blur(100px)", animation: "floatBlob1 18s ease-in-out infinite alternate" }} />
      <div style={{ position: "absolute", bottom: "-20%", right: "-10%", width: 600, height: 600, borderRadius: "50%", background: "rgba(167,139,250,0.06)", filter: "blur(100px)", animation: "floatBlob2 22s ease-in-out infinite alternate" }} />
      <div style={{ position: "absolute", top: "40%", left: "40%", width: 500, height: 500, borderRadius: "50%", background: "rgba(59,130,246,0.04)", filter: "blur(80px)", animation: "floatBlob3 16s ease-in-out 2s infinite alternate" }} />
      <style>{`
        @keyframes floatBlob1 { from { transform: translate(0,0) scale(1); } to { transform: translate(80px,-60px) scale(1.1); } }
        @keyframes floatBlob2 { from { transform: translate(0,0) scale(1.1); } to { transform: translate(-70px,80px) scale(0.95); } }
        @keyframes floatBlob3 { from { transform: translate(0,0) scale(1); } to { transform: translate(60px,70px) scale(1.15); } }
      `}</style>
    </div>
  );
}

// ─── PARTICLE NETWORK ──────────────────────────────────────────────────────────
function ParticleNetwork({ mouseRef }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const pts = useRef([]);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d");
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    pts.current = Array.from({ length: 80 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
      ox: 0, oy: 0
    }));
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      const mx = mouseRef?.current?.x || -999;
      const my = mouseRef?.current?.y || -999;
      pts.current.forEach(p => {
        const dx = p.x - mx, dy = p.y - my;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 120 && d > 0) { const f = (120 - d) / 120 * 2; p.ox += dx / d * f; p.oy += dy / d * f; }
        p.ox *= 0.85; p.oy *= 0.85;
        p.x += p.vx + p.ox; p.y += p.vy + p.oy;
        if (p.x < 0 || p.x > c.width) p.vx *= -1;
        if (p.y < 0 || p.y > c.height) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(99,179,237,0.35)"; ctx.fill();
      });
      for (let i = 0; i < pts.current.length; i++) {
        for (let j = i + 1; j < pts.current.length; j++) {
          const dx = pts.current[i].x - pts.current[j].x;
          const dy = pts.current[i].y - pts.current[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120) {
            ctx.beginPath();
            ctx.moveTo(pts.current[i].x, pts.current[i].y);
            ctx.lineTo(pts.current[j].x, pts.current[j].y);
            ctx.strokeStyle = `rgba(99,179,237,${(1 - d / 120) * 0.12})`;
            ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }} />;
}

// ─── CUSTOM CURSOR ─────────────────────────────────────────────────────────────
function CustomCursor({ mouseRef }) {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const [hovering, setHovering] = useState(false);
  const [hoverRect, setHoverRect] = useState(null);
  const [clicking, setClicking] = useState(false);
  const ripples = useRef([]);
  const rippleContainerRef = useRef(null);

  useEffect(() => {
    let tx = 0, ty = 0, rx = 0, ry = 0;
    const move = (e) => {
      tx = e.clientX; ty = e.clientY;
      if (mouseRef) mouseRef.current = { x: tx, y: ty };
      if (dotRef.current) { dotRef.current.style.left = tx + "px"; dotRef.current.style.top = ty + "px"; }
    };
    const over = (e) => {
      const el = e.target.closest("button,a,[data-cursor-hover]");
      if (el) { setHovering(true); const r = el.getBoundingClientRect(); setHoverRect(r); }
      else { setHovering(false); setHoverRect(null); }
    };
    const down = () => setClicking(true);
    const up = () => setClicking(false);
    const click = (e) => {
      const id = Date.now();
      const el = document.createElement("div");
      el.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;pointer-events:none;z-index:9999;`;
      [1, 2, 3].forEach((n, i) => {
        const ring = document.createElement("div");
        ring.style.cssText = `position:absolute;transform:translate(-50%,-50%);border-radius:50%;border:1px solid rgba(96,165,250,${0.8 - i * 0.2});width:0;height:0;animation:ripple${n} ${0.5 + i * 0.2}s ease-out ${i * 0.08}s forwards;`;
        el.appendChild(ring);
      });
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1000);
    };
    const trail = () => {
      rx += (tx - rx) * 0.1; ry += (ty - ry) * 0.1;
      if (ringRef.current && !hoverRect) { ringRef.current.style.left = rx + "px"; ringRef.current.style.top = ry + "px"; }
      requestAnimationFrame(trail);
    };
    trail();
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseover", over);
    window.addEventListener("mousedown", down);
    window.addEventListener("mouseup", up);
    window.addEventListener("click", click);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseover", over); window.removeEventListener("mousedown", down); window.removeEventListener("mouseup", up); window.removeEventListener("click", click); };
  }, [hoverRect]);

  return (
    <>
      <style>{`
        @keyframes ripple1{from{width:0;height:0;opacity:0.8}to{width:100px;height:100px;opacity:0}}
        @keyframes ripple2{from{width:0;height:0;opacity:0.6}to{width:160px;height:160px;opacity:0}}
        @keyframes ripple3{from{width:0;height:0;opacity:0.4}to{width:220px;height:220px;opacity:0}}
      `}</style>
      <div ref={dotRef} style={{ position: "fixed", width: clicking ? 6 : 8, height: clicking ? 6 : 8, borderRadius: "50%", background: clicking ? "#fbbf24" : hovering ? "#4ade80" : "#60a5fa", pointerEvents: "none", zIndex: 9999, transform: "translate(-50%,-50%)", transition: "width 0.15s,height 0.15s,background 0.15s", mixBlendMode: "screen" }} />
      {hoverRect
        ? <div style={{ position: "fixed", left: hoverRect.left - 4, top: hoverRect.top - 4, width: hoverRect.width + 8, height: hoverRect.height + 8, borderRadius: 12, border: "1.5px solid #4ade80", pointerEvents: "none", zIndex: 9998, boxShadow: "0 0 14px rgba(74,222,128,0.35)", transition: "all 0.18s ease-out" }} />
        : <div ref={ringRef} style={{ position: "fixed", width: 36, height: 36, borderRadius: "50%", border: `1.5px solid ${clicking ? "#fbbf24" : "#60a5fa"}`, pointerEvents: "none", zIndex: 9998, transform: "translate(-50%,-50%)", opacity: 0.6 }} />
      }
    </>
  );
}

// ─── MAGNETIC BUTTON ───────────────────────────────────────────────────────────
function MagBtn({ children, onClick, variant = "primary", style = {} }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) * 0.3;
    const dy = (e.clientY - (r.top + r.height / 2)) * 0.3;
    setPos({ x: dx, y: dy });
  };
  const onLeave = () => setPos({ x: 0, y: 0 });
  const base = { fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, borderRadius: 12, padding: "12px 28px", cursor: "none", transition: "box-shadow 0.2s", border: "none", transform: `translate(${pos.x}px,${pos.y}px)` };
  const styles = variant === "primary"
    ? { ...base, background: "linear-gradient(135deg,#60a5fa,#a78bfa)", color: "#020409", boxShadow: "0 4px 20px rgba(96,165,250,0.35)" }
    : { ...base, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.14)" };
  return (
    <button ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} onClick={onClick} data-cursor-hover style={{ ...styles, ...style }}>{children}</button>
  );
}

// ─── COUNT UP ──────────────────────────────────────────────────────────────────
function CountUp({ value, suffix = "", duration = 2000 }) {
  const [current, setCurrent] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let start = 0;
        const step = (timestamp) => {
          if (!start) start = timestamp;
          const progress = Math.min((timestamp - start) / duration, 1);
          setCurrent(Math.floor(progress * value));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        obs.disconnect();
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [value, duration]);
  return <span ref={ref}>{current.toLocaleString()}{suffix}</span>;
}

// ─── HERO REVEAL ──────────────────────────────────────────────────────────────
function HeroReveal() {
  const words = ["The", "AI", "that", "makes", "itself", "unnecessary."];
  return (
    <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: "clamp(36px,5.5vw,72px)", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-2px", color: "#fff", display: "flex", flexWrap: "wrap", gap: "0.3em", justifyContent: "center" }}>
      {words.map((w, i) => {
        const isGrad = w === "unnecessary.";
        return (
          <span key={i} style={{
            display: "inline-block",
            opacity: 0,
            transform: "translateY(20px) blur(8px)",
            animation: `wordReveal 0.7s cubic-bezier(0.16,1,0.3,1) ${i * 0.1}s forwards`,
            background: isGrad ? "linear-gradient(135deg,#60a5fa,#a78bfa)" : "none",
            WebkitBackgroundClip: isGrad ? "text" : "none",
            WebkitTextFillColor: isGrad ? "transparent" : "inherit"
          }}>{w}</span>
        );
      })}
      <style>{`@keyframes wordReveal{to{opacity:1;transform:translateY(0) blur(0)}}`}</style>
    </h1>
  );
}

// ─── HOW IT WORKS DEMO ────────────────────────────────────────────────────────
function HowItWorksDemo() {
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(72);
  useEffect(() => {
    const t = setInterval(() => {
      setStep(s => (s + 1) % 4);
      setScore(s => Math.min(100, s + 3));
    }, 2200);
    return () => clearInterval(t);
  }, []);
  const exchanges = [
    { user: "How does recursion work?", ai: "What happens when a function calls... itself?" },
    { user: "Like it loops somehow?", ai: "What's the difference between a loop and a function call?" },
    { user: "A function call has its own stack frame?", ai: "Exactly. So what does the stack look like after 3 recursive calls?" },
    { user: "Each call waits for the next to return!", ai: "Now you understand it. What's the base case for?" },
  ];
  const current = exchanges[step % exchanges.length];
  return (
    <div style={{ maxWidth: 560, margin: "0 auto", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: 20, padding: 28, backdropFilter: "blur(20px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: "rgba(96,165,250,0.6)", letterSpacing: "2px" }}>LIVE DEMO</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 20, padding: "4px 12px" }}>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: "#4ade80" }}>Independence Score</span>
          <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, color: "#4ade80" }}>{score}</span>
          <span style={{ fontSize: 9, color: "#4ade80" }}>↑</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div key={`u${step}`} style={{ display: "flex", justifyContent: "flex-end", animation: "fadeUp 0.4s ease" }}>
          <div style={{ background: "linear-gradient(135deg,rgba(59,130,246,0.25),rgba(96,165,250,0.15))", border: "1px solid rgba(96,165,250,0.3)", borderRadius: "16px 16px 4px 16px", padding: "10px 14px", maxWidth: "75%", fontSize: 13, color: "rgba(186,230,255,0.94)", lineHeight: 1.6 }}>{current.user}</div>
        </div>
        <div key={`a${step}`} style={{ display: "flex", justifyContent: "flex-start", animation: "fadeUp 0.4s ease 0.3s both" }}>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px 16px 16px 4px", padding: "10px 14px", maxWidth: "75%", fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.6 }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, color: "rgba(96,165,250,0.5)", letterSpacing: "2px", marginBottom: 5 }}>NEUROMENTOR</div>
            {current.ai}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 18 }}>
        {[0, 1, 2, 3].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: i === step % 4 ? "#60a5fa" : "rgba(255,255,255,0.12)", transition: "all 0.3s" }} />)}
      </div>
    </div>
  );
}

// ─── MAIN LANDING PAGE ─────────────────────────────────────────────────────────
export default function LandingPage({ onGetStarted }) {
  const mouseRef = useRef({ x: -999, y: -999 });
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const pills = ["Socratic Method", "Independence Score", "Locked Rewards", "VS Code Workspace", "Voice Learning", "Multilingual", "Handwriting OCR", "Real Mastery XP"];
  const brains = [
    { icon: "🧠", name: "Logic Brain", desc: "Decodes what you actually need to learn" },
    { icon: "❓", name: "Socratic Brain", desc: "Never gives answers — only better questions" },
    { icon: "🏗️", name: "Scaffold Brain", desc: "Tracks hints, scores independence, adjusts difficulty" },
    { icon: "💾", name: "Memory Brain", desc: "Remembers everything across sessions via MongoDB" },
  ];
  const features = [
    { icon: "🧠", title: "4-Brain Agent Architecture", desc: "Logic + Socratic + Scaffold + Memory agents working together" },
    { icon: "📊", title: "Independence Score", desc: "Tracks how little you need help. Score rises as you truly learn" },
    { icon: "🔒", title: "Locked Rewards", desc: "XP and badges only unlock through real learning — no cheating" },
    { icon: "💻", title: "VS Code Workspace", desc: "Full Monaco editor + terminal + AI-guided roadmap per project" },
    { icon: "🎙️", title: "Voice & Multilingual", desc: "Speak your questions, hear answers in English, Tamil or Hindi" },
    { icon: "👨‍👩‍👧", title: "Parental Co-sign", desc: "Under-18 users require parent verification for safety" },
  ];
  const stats = [
    { value: 12000, suffix: "+", label: "Learners guided" },
    { value: 87, suffix: "%", label: "Avg. independence after 30 days" },
    { value: 4, suffix: "", label: "Brain regions" },
    { value: 16, suffix: "", label: "Google Cloud services" },
  ];

  const sec = { padding: "96px 0", position: "relative", zIndex: 10 };
  const container = { maxWidth: 1100, margin: "0 auto", padding: "0 24px" };
  const sectionLabel = { fontFamily: "'DM Mono',monospace", fontSize: 9, color: "rgba(96,165,250,0.65)", letterSpacing: "4px", textTransform: "uppercase", marginBottom: 16 };
  const sectionTitle = { fontFamily: "'Syne',sans-serif", fontSize: "clamp(28px,3.5vw,44px)", fontWeight: 800, color: "#fff", letterSpacing: "-1.5px", marginBottom: 16, lineHeight: 1.2 };

  return (
    <div style={{ background: "#020409", color: "rgba(255,255,255,0.88)", minHeight: "100vh", fontFamily: "'Outfit',sans-serif", cursor: "none", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Syne:wght@700;800&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(96,165,250,0.2);border-radius:4px}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes spinSlow{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes pillFlyIn{from{opacity:0;transform:translateY(24px) scale(0.9)}to{opacity:1;transform:translateY(0) scale(1)}}
        .nm-gradient-text{background:linear-gradient(135deg,#60a5fa,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .glass-card{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:20px;backdrop-filter:blur(20px);transition:all 0.3s}
        .glass-card:hover{border-color:rgba(96,165,250,0.3);background:rgba(96,165,250,0.04);box-shadow:0 0 40px rgba(96,165,250,0.08)}
        .tilt-card{transition:transform 0.3s}
        .tilt-card:hover{transform:perspective(800px) rotateX(4deg) rotateY(-4deg) scale(1.02)}
      `}</style>

      <AmbientPulse />
      <Blobs />
      <ParticleNetwork mouseRef={mouseRef} />
      <CustomCursor mouseRef={mouseRef} />

      {/* NAV */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", background: scrolled ? "rgba(2,4,9,0.85)" : "transparent", backdropFilter: scrolled ? "blur(20px)" : "none", borderBottom: scrolled ? "1px solid rgba(255,255,255,0.05)" : "none", transition: "all 0.3s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#60a5fa,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🧠</div>
          <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, letterSpacing: "-0.5px" }}>NeuroMentor</span>
        </div>
        <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
          {["How it works", "Features", "Stack", "Pricing"].map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(/ /g, "-")}`} data-cursor-hover style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "rgba(255,255,255,0.5)", textDecoration: "none", transition: "color 0.2s", letterSpacing: "0.5px" }}
              onMouseEnter={e => e.target.style.color = "#fff"} onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.5)"}>{l}</a>
          ))}
        </div>
        <MagBtn variant="ghost" onClick={onGetStarted}>Sign in</MagBtn>
      </nav>

      {/* HERO */}
      <section style={{ ...sec, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", paddingTop: 120 }}>
        <div style={container}>
          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)", borderRadius: 20, marginBottom: 40, animation: "fadeUp 0.6s ease" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", animation: "pulse-ring 2s infinite", boxShadow: "0 0 8px rgba(74,222,128,0.8)" }} />
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: "rgba(96,165,250,0.8)", letterSpacing: "0.5px" }}>Built for Google Cloud Rapid Agent Hackathon 2026</span>
          </div>

          <HeroReveal />

          <p style={{ fontSize: 18, color: "rgba(255,255,255,0.45)", lineHeight: 1.75, maxWidth: 580, margin: "28px auto 48px", animation: "fadeUp 0.7s ease 0.6s both" }}>
            A Socratic AI that refuses to answer for you. It tracks your Independence Score and only unlocks rewards when you've truly learned. <strong style={{ color: "rgba(255,255,255,0.7)" }}>The opposite of every other AI tool.</strong>
          </p>

          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 64, animation: "fadeUp 0.7s ease 0.8s both" }}>
            <MagBtn variant="primary" onClick={onGetStarted}>Start learning →</MagBtn>
            <MagBtn variant="ghost" onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}>See how it works</MagBtn>
          </div>

          {/* Orbital pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", maxWidth: 640, margin: "0 auto" }}>
            {pills.map((p, i) => (
              <div key={p} style={{ padding: "6px 16px", background: "rgba(96,165,250,0.07)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: 20, fontFamily: "'DM Mono',monospace", fontSize: 9, color: "rgba(96,165,250,0.7)", letterSpacing: "0.5px", animation: `pillFlyIn 0.6s cubic-bezier(0.16,1,0.3,1) ${0.9 + i * 0.07}s both` }}>{p}</div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ ...sec, paddingTop: 0 }}>
        <div style={container}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20 }}>
            {stats.map((s, i) => (
              <div key={i} className="glass-card tilt-card" style={{ padding: 28, textAlign: "center" }}>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 36, fontWeight: 800, marginBottom: 6 }} className="nm-gradient-text">
                  <CountUp value={s.value} suffix={s.suffix} />
                </div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: "0.5px" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={sec}>
        <div style={{ ...container, textAlign: "center" }}>
          <p style={sectionLabel}>Architecture</p>
          <h2 style={sectionTitle}>Four brains. One purpose: <span className="nm-gradient-text">your independence.</span></h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20, marginTop: 48 }}>
            {brains.map((b, i) => (
              <div key={i} className="glass-card" style={{ padding: 28, textAlign: "center", animation: `fadeUp 0.6s ease ${i * 0.12}s both` }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>{b.icon}</div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{b.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>{b.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={sec}>
        <div style={{ ...container, textAlign: "center" }}>
          <p style={sectionLabel}>What makes it different</p>
          <h2 style={sectionTitle}>No other AI platform has <span className="nm-gradient-text">all of this.</span></h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, marginTop: 48 }}>
            {features.map((f, i) => (
              <div key={i} className="glass-card" style={{ padding: 28, textAlign: "left", animation: `fadeUp 0.6s ease ${i * 0.1}s both`, position: "relative", overflow: "hidden" }}>
                <div style={{ fontSize: 28, marginBottom: 14 }}>{f.icon}</div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO */}
      <section id="how-it-works" style={sec}>
        <div style={{ ...container, textAlign: "center" }}>
          <p style={sectionLabel}>Live Demo</p>
          <h2 style={sectionTitle}>See it work in <span className="nm-gradient-text">10 seconds.</span></h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", marginBottom: 48 }}>Ask a question. Watch NeuroMentor refuse to answer — and watch your Independence Score rise.</p>
          <HowItWorksDemo />
        </div>
      </section>

      {/* STACK */}
      <section id="stack" style={sec}>
        <div style={{ ...container, textAlign: "center" }}>
          <p style={sectionLabel}>Tech Stack</p>
          <h2 style={sectionTitle}>Built on <span className="nm-gradient-text">Google Cloud</span></h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginTop: 40 }}>
            {["Google ADK v2.0", "Gemini 2.5 Flash", "Cloud Run", "Firebase Auth", "Firebase Hosting", "MongoDB Atlas", "React 18", "FastAPI", "Monaco Editor", "Xterm.js", "Cloud Build", "Secret Manager", "Vector Search", "Cloud Logging", "Artifact Registry", "WebSocket Terminal"].map((t, i) => (
              <div key={t} style={{ padding: "8px 18px", background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.14)", borderRadius: 20, fontFamily: "'DM Mono',monospace", fontSize: 10, color: "rgba(96,165,250,0.7)", animation: `fadeUp 0.5s ease ${i * 0.04}s both` }}>{t}</div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={sec}>
        <div style={{ ...container, textAlign: "center" }}>
          <p style={sectionLabel}>Plans</p>
          <h2 style={sectionTitle}>Start free. <span className="nm-gradient-text">Grow independent.</span></h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24, marginTop: 48, maxWidth: 900, margin: "48px auto 0" }}>
            {[
              { name: "Free", price: "₹0", period: "", features: ["5 sessions/day", "Basic Socratic method", "Progress tracking", "Knowledge graph"], highlight: false },
              { name: "Student", price: "₹99", period: "/mo", features: ["Unlimited sessions", "All 4 brain agents", "VS Code workspace", "Voice + multilingual", "Priority memory"], highlight: true },
              { name: "Pro", price: "₹299", period: "/mo", features: ["Everything in Student", "API access", "Team workspace", "Analytics export", "White-label option"], highlight: false },
            ].map((plan, i) => (
              <div key={i} className="glass-card" style={{ padding: 32, border: plan.highlight ? "1px solid rgba(96,165,250,0.4)" : undefined, background: plan.highlight ? "rgba(96,165,250,0.06)" : undefined, position: "relative" }}>
                {plan.highlight && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(135deg,#60a5fa,#a78bfa)", borderRadius: 20, padding: "3px 14px", fontFamily: "'DM Mono',monospace", fontSize: 9, color: "#020409", fontWeight: 700 }}>MOST POPULAR</div>}
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, marginBottom: 8, color: plan.highlight ? "#60a5fa" : "#fff" }}>{plan.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, justifyContent: "center", marginBottom: 24 }}>
                  <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 36, fontWeight: 800 }}>{plan.price}</span>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>{plan.period}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "rgba(255,255,255,0.65)", textAlign: "left" }}>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "#4ade80", flexShrink: 0 }}>✓</div>
                      {f}
                    </div>
                  ))}
                </div>
                <MagBtn variant={plan.highlight ? "primary" : "ghost"} onClick={onGetStarted} style={{ width: "100%" }}>Get started</MagBtn>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ ...sec }}>
        <div style={{ ...container, textAlign: "center" }}>
          <div style={{ background: "linear-gradient(135deg,rgba(96,165,250,0.08),rgba(167,139,250,0.08))", border: "1px solid rgba(96,165,250,0.2)", borderRadius: 28, padding: "72px 48px", backdropFilter: "blur(20px)" }}>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: "clamp(28px,3.5vw,48px)", fontWeight: 800, marginBottom: 16, letterSpacing: "-1.5px" }}>Stop being told. <span className="nm-gradient-text">Start discovering.</span></h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", marginBottom: 40 }}>Join the only AI platform designed to make itself unnecessary.</p>
            <MagBtn variant="primary" onClick={onGetStarted} style={{ fontSize: 16, padding: "14px 40px" }}>Begin your independence →</MagBtn>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 24, height: 24, borderRadius: 8, background: "linear-gradient(135deg,#60a5fa,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🧠</div>
          <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700 }}>NeuroMentor</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>— The AI that makes itself unnecessary</span>
        </div>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.5px" }}>
          Built for Google Cloud Rapid Agent Hackathon 2026 · © 2026 NeuroMentor
        </div>
      </footer>
    </div>
  );
}