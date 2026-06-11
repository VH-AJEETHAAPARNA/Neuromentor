import { useState, useEffect, useRef, useCallback } from "react";
import LandingPage from "./LandingPage";
import { signInWithGoogle, signOutUser } from "./firebase";
import Editor from "@monaco-editor/react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

// ─── GLOBAL STYLES & DYNAMIC KEYFRAMES ──────────────────────────────────────────
function GlobalStyles({ theme }) {
  const bg = theme === "light" ? "#f0f4ff" : "#020409";
  const text = theme === "light" ? "#1a1a2e" : "rgba(255,255,255,0.88)";
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        background: ${bg};
        color: ${text};
        overflow: hidden;
        font-family: 'Outfit', sans-serif;
        -webkit-font-smoothing: antialiased;
        cursor: none; /* Hide default cursor to use custom 3-layer system */
      }
      ::-webkit-scrollbar { width: 4px; height: 4px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(96,165,250,0.2); border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: rgba(96,165,250,0.4); }

      /* Custom Animations */
      @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); filter: blur(8px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideUp { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes slideInRight { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
      @keyframes slideInLeft { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
      @keyframes scaleIn { from { transform: scale(0.94); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      @keyframes popIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      
      /* Breathing & Floating Blobs */
      @keyframes floatPath1 {
        0%, 100% { transform: translate(0, 0) scale(1.0); }
        50% { transform: translate(80px, -60px) scale(1.15); }
      }
      @keyframes floatPath2 {
        0%, 100% { transform: translate(0, 0) scale(1.15); }
        50% { transform: translate(-70px, 90px) scale(0.95); }
      }
      @keyframes floatPath3 {
        0%, 100% { transform: translate(0, 0) scale(0.9); }
        50% { transform: translate(90px, 80px) scale(1.1); }
      }
      @keyframes floatPath4 {
        0%, 100% { transform: translate(0, 0) scale(1.1); }
        50% { transform: translate(-80px, -90px) scale(0.95); }
      }
      @keyframes floatPath5 {
        0%, 100% { transform: translate(0, 0) scale(1.0); }
        50% { transform: translate(60px, 70px) scale(1.15); }
      }

      /* Concentric Click Ripples */
      @keyframes ripple1 {
        from { width: 0; height: 0; opacity: 0.8; }
        to { width: 100px; height: 100px; opacity: 0; }
      }
      @keyframes ripple2 {
        from { width: 0; height: 0; opacity: 0.6; }
        to { width: 160px; height: 160px; opacity: 0; }
      }
      @keyframes ripple3 {
        from { width: 0; height: 0; opacity: 0.4; }
        to { width: 220px; height: 220px; opacity: 0; }
      }

      /* Draw Underline */
      @keyframes drawLine {
        to { stroke-dashoffset: 0; }
      }

      /* Typing indicator */
      @keyframes typingBounce {
        0%, 80%, 100% { transform: translateY(0); opacity: .35; }
        40% { transform: translateY(-6px); opacity: 1; }
      }

      /* Flame Dance */
      @keyframes flameDance {
        0%, 100% { transform: rotate(-3deg) scale(1); filter: brightness(1); }
        50% { transform: rotate(3deg) scale(1.1); filter: brightness(1.2); }
      }

      /* Mic recording pulse */
      @keyframes micPulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
        50% { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); }
      }
      
      .mic-active {
        animation: micPulse 1.5s infinite;
      }

      input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.25); }
      input, textarea { cursor: text !important; }
      button { cursor: pointer !important; }
    `}</style>
  );
}


// ─── NEURAL CANVAS (300 Z-depth particles & Attraction/Repulsion system) ────────
function NeuralCanvas({ intensity = 0, theme, mousePos }) {
  const ref = useRef(null);
  const anim = useRef(null);
  const pts = useRef([]);
  const birthTime = useRef(Date.now());
  
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    
    // Initialize 300 particles with 3D projected coordinates
    pts.current = Array.from({ length: 300 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * Math.min(window.innerWidth, window.innerHeight) * 1.5;
      return {
        x3d: Math.cos(angle) * radius,
        y3d: Math.sin(angle) * radius,
        z3d: Math.random() * 200 + 100, // Z depth range
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        vz: (Math.random() - 0.5) * 0.15,
        baseRadius: Math.random() * 2.2 + 0.8,
        p: Math.random() * Math.PI * 2
      };
    });
    
    const color = theme === "light" ? "59,130,246" : "99,179,237";
    const attractionStrength = 0.0003;
    
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      const elapsed = (Date.now() - birthTime.current) / 1000;
      const birthFactor = Math.min(1, elapsed / 1.8); // 1.8s convergence stream
      
      const centerX = c.width / 2;
      const centerY = c.height / 2;
      const speedMultiplier = 1 + intensity * 4.5;
      
      // Update particles
      pts.current.forEach(p => {
        // Orbit attraction around central attractor
        const distToCenter = Math.sqrt(p.x3d * p.x3d + p.y3d * p.y3d);
        if (distToCenter > 1) {
          const fx = -p.y3d / distToCenter * attractionStrength * distToCenter;
          const fy = p.x3d / distToCenter * attractionStrength * distToCenter;
          p.vx += fx;
          p.vy += fy;
        }
        
        p.x3d += p.vx * speedMultiplier;
        p.y3d += p.vy * speedMultiplier;
        p.z3d += p.vz * speedMultiplier;
        if (p.z3d < 60) p.z3d = 300;
        if (p.z3d > 300) p.z3d = 60;
        
        // Z-depth scale factor
        const scale = 200 / p.z3d; 
        const convergence = birthFactor === 1 ? 1 : Math.max(0.05, birthFactor + (1 - birthFactor) * 0.05);
        
        let screenX = centerX + p.x3d * scale * convergence;
        let screenY = centerY + p.y3d * scale * convergence;
        
        // Cursor repulsion field (quadratic falloff: 1/dist^2)
        if (mousePos && mousePos.x && mousePos.y) {
          const dx = screenX - mousePos.x;
          const dy = screenY - mousePos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 160 && dist > 1) {
            const force = ((160 - dist) / dist) * 2.2;
            screenX += (dx / dist) * force;
            screenY += (dy / dist) * force;
          }
        }
        
        const size = p.baseRadius * scale;
        const opacity = Math.min(1, (1.2 - p.z3d / 300) * (theme === "light" ? 0.35 : 0.65));
        
        ctx.beginPath();
        ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
        
        // Particle cursor glow
        if (mousePos && mousePos.x && mousePos.y) {
          const dx = screenX - mousePos.x;
          const dy = screenY - mousePos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.shadowBlur = 10 * (1 - dist / 100);
            ctx.shadowColor = `rgba(${color}, 0.75)`;
          } else {
            ctx.shadowBlur = 0;
          }
        }
        
        ctx.fillStyle = `rgba(${color}, ${opacity})`;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
        
        p.screenX = screenX;
        p.screenY = screenY;
        p.opacity = opacity;
      });
      
      // Connections (140px threshold)
      for (let i = 0; i < pts.current.length; i += 2) {
        for (let j = i + 1; j < pts.current.length; j += 15) {
          const pi = pts.current[i];
          const pj = pts.current[j];
          if (!pi.screenX || !pj.screenX) continue;
          
          const dx = pi.screenX - pj.screenX;
          const dy = pi.screenY - pj.screenY;
          const d = Math.sqrt(dx * dx + dy * dy);
          
          if (d < 140) {
            ctx.beginPath();
            ctx.moveTo(pi.screenX, pi.screenY);
            ctx.lineTo(pj.screenX, pj.screenY);
            const fade = (1 - d / 140);
            ctx.strokeStyle = `rgba(${color}, ${fade * ((pi.opacity + pj.opacity) / 2) * 0.22})`;
            ctx.lineWidth = 0.5 * fade;
            ctx.stroke();
          }
        }
      }
      anim.current = requestAnimationFrame(draw);
    };
    draw();
    
    return () => { cancelAnimationFrame(anim.current); window.removeEventListener("resize", resize); };
  }, [intensity, theme, mousePos]);
  
  return <canvas ref={ref} style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }} />;
}

// ─── FLOATING BLOBS (5 unique hues, dual animations) ──────────────────────────
function FloatingBlobs({ theme }) {
  const isDark = theme === "dark";
  const blobs = [
    { w: 600, h: 600, left: "-15%", top: "-15%", color: isDark ? "rgba(99,102,241,0.06)" : "rgba(99,102,241,0.1)", delay: "0s", dur: "18s" }, // Indigo
    { w: 500, h: 500, right: "-10%", top: "15%", color: isDark ? "rgba(59,130,246,0.05)" : "rgba(59,130,246,0.09)", delay: "2s", dur: "22s" }, // Blue
    { w: 700, h: 700, left: "25%", bottom: "-10%", color: isDark ? "rgba(139,92,246,0.05)" : "rgba(139,92,246,0.08)", delay: "4s", dur: "24s" }, // Violet
    { w: 450, h: 450, right: "20%", bottom: "25%", color: isDark ? "rgba(20,184,166,0.04)" : "rgba(20,184,166,0.08)", delay: "1s", dur: "16s" }, // Teal
    { w: 550, h: 550, left: "-5%", top: "35%", color: isDark ? "rgba(168,85,247,0.04)" : "rgba(168,85,247,0.07)", delay: "3s", dur: "20s" } // Purple
  ];
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {blobs.map((b, i) => (
        <div key={i} style={{
          position: "absolute", width: b.w, height: b.h,
          left: b.left, right: b.right, top: b.top, bottom: b.bottom,
          background: b.color, borderRadius: "50%", filter: "blur(80px)",
          animation: `floatPath${i + 1} ${b.dur} ease-in-out ${b.delay} infinite alternate`
        }} />
      ))}
    </div>
  );
}

// ─── MAGNETIC BUTTON COMPONENT ────────────────────────────────────────────────
function MagneticButton({ children, style = {}, onClick, className, disabled }) {
  const ref = useRef(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState(false);

  const handleMouseMove = (e) => {
    if (disabled) return;
    const btn = ref.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const btnCenterX = rect.left + rect.width / 2;
    const btnCenterY = rect.top + rect.height / 2;
    const dist = Math.sqrt((e.clientX - btnCenterX) ** 2 + (e.clientY - btnCenterY) ** 2);
    
    if (dist < 80) {
      setHover(true);
      const tx = (e.clientX - btnCenterX) * 0.35; // 35% factor
      const ty = (e.clientY - btnCenterY) * 0.35;
      setCoords({ x: tx, y: ty });
    } else {
      handleMouseLeave();
    }
  };

  const handleMouseLeave = () => {
    setHover(false);
    setCoords({ x: 0, y: 0 });
  };

  const shadowGlow = hover 
    ? `0 0 30px rgba(96,165,250, ${Math.min(0.4, 0.1 + Math.abs(coords.x)/100)})` 
    : "none";

  return (
    <div 
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ display: "inline-block", padding: 12, margin: -12 }}
    >
      <button
        onClick={onClick}
        disabled={disabled}
        className={className}
        style={{
          ...style,
          transform: `translate(${coords.x}px, ${coords.y}px)`,
          boxShadow: shadowGlow,
          transition: hover ? "box-shadow 0.1s ease-out" : "transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.4s",
          position: "relative"
        }}
      >
        <span style={{
          display: "block",
          transform: `translate(${-coords.x * 0.15}px, ${-coords.y * 0.15}px)`, // Parallax text inside button
          transition: hover ? "none" : "transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)"
        }}>
          {children}
        </span>
      </button>
    </div>
  );
}

// ─── HERO WORD REVEAL (Synapse Draw Underline) ──────────────────────────────────
function HeroHeadline({ theme }) {
  const headline = "The only AI designed to make itself unnecessary";
  const words = headline.split(" ");
  const isDark = theme === "dark";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
      <h2 style={{
        fontFamily: "'Syne', sans-serif",
        fontSize: 34,
        fontWeight: 800,
        lineHeight: 1.25,
        color: isDark ? "#ffffff" : "#0f172a",
        display: "inline-flex",
        flexWrap: "wrap",
        gap: "0.25em"
      }}>
        {words.map((w, i) => {
          const isLast = i === words.length - 1;
          return (
            <span key={i} style={{ position: "relative", display: "inline-block" }}>
              <span style={{
                display: "inline-block",
                opacity: 0,
                filter: "blur(8px)",
                transform: "translateY(12px)",
                animation: `fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.09}s forwards`,
                background: isLast ? "linear-gradient(135deg,#60a5fa,#a78bfa)" : "none",
                WebkitBackgroundClip: isLast ? "text" : "none",
                WebkitTextFillColor: isLast ? "transparent" : "none"
              }}>
                {w}
              </span>
              {isLast && (
                <svg viewBox="0 0 100 10" style={{
                  position: "absolute",
                  bottom: "-4px",
                  left: 0,
                  width: "100%",
                  height: "8px",
                  pointerEvents: "none"
                }}>
                  <path d="M5,5 Q50,9 95,5" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round"
                    strokeDasharray="100" strokeDashoffset="100"
                    style={{ animation: `drawLine 0.8s ease ${words.length * 0.09 + 0.3}s forwards` }} />
                </svg>
              )}
            </span>
          );
        })}
      </h2>
    </div>
  );
}

// ─── XP PROGRESS BAR ────────────────────────────────────────────────────────────
function XPBar({ xp, level, theme }) {
  const needed = level * 100;
  const pct = Math.min((xp % needed) / needed * 100, 100);
  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: "#fbbf24", letterSpacing: "1px", fontWeight: 600 }}>LEVEL {level}</span>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: theme === "light" ? "rgba(30,30,60,0.5)" : "rgba(255,255,255,0.35)" }}>{xp % needed}/{needed} XP</span>
      </div>
      <div style={{ height: 6, background: theme === "light" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#fbbf24,#f59e0b)", borderRadius: 3, transition: "width 0.9s cubic-bezier(.4,0,.2,1)", boxShadow: "0 0 10px rgba(251,191,36,0.5)" }} />
      </div>
    </div>
  );
}

// ─── STREAK FLAME ──────────────────────────────────────────────────────────────
function StreakFlame({ streak }) {
  const active = streak > 0;
  const color = streak >= 7 ? "#f59e0b" : streak >= 3 ? "#fb923c" : "#60a5fa";
  const glow = streak >= 7 ? "rgba(245,158,11,0.55)" : streak >= 3 ? "rgba(251,146,60,0.45)" : "rgba(96,165,250,0.3)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 42, height: 42 }}>
        {active && <div style={{ position: "absolute", inset: -4, borderRadius: "50%", background: glow, animation: "pulseGlow 1.6s ease-in-out infinite" }} />}
        <svg viewBox="0 0 24 24" width="30" height="30" fill={active ? color : "rgba(255,255,255,0.12)"} style={{ filter: active ? `drop-shadow(0 0 8px ${glow})` : "none", animation: active && streak >= 3 ? "flameDance 0.9s ease-in-out infinite alternate" : "none" }}>
          <path d="M12 2C9 7 6 9 6 13a6 6 0 0012 0c0-4-3-6-6-11zm0 16c-1.7 0-3-1.3-3-3 0-2 1.5-3 3-5 1.5 2 3 3 3 5 0 1.7-1.3 3-3 3z" />
        </svg>
        <span style={{ position: "absolute", fontFamily: "'Syne',sans-serif", fontSize: 8, fontWeight: 800, color: active ? "white" : "rgba(255,255,255,0.25)" }}>{streak}</span>
      </div>
      <div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 12, fontWeight: 700, color: active ? color : "rgba(255,255,255,0.25)" }}>
          {streak === 0 ? "No streak" : `${streak} day streak`}
        </div>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: "rgba(255,255,255,0.28)", letterSpacing: "0.3px", marginTop: 1 }}>
          {streak >= 7 ? "On fire!" : streak >= 3 ? "Building momentum" : streak > 0 ? "Just started!" : "Answer daily to start"}
        </div>
      </div>
    </div>
  );
}

// ─── REWARD POPUP ──────────────────────────────────────────────────────────────
function RewardPopup({ reward, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  if (!reward) return null;
  return (
    <div style={{ position: "fixed", top: 76, right: 22, zIndex: 2000, animation: "slideInRight 0.4s cubic-bezier(.4,0,.2,1), fadeOut 0.4s ease 3.1s forwards" }}>
      <div style={{ background: "rgba(6,14,32,0.97)", border: "1px solid rgba(251,191,36,0.5)", borderRadius: 16, padding: "13px 18px", display: "flex", alignItems: "center", gap: 13, boxShadow: "0 12px 40px rgba(0,0,0,0.6), 0 0 24px rgba(251,191,36,0.18)", minWidth: 260, backdropFilter: "blur(16px)" }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(251,191,36,0.14)", border: "1.5px solid rgba(251,191,36,0.45)", display: "flex", alignItems: "center", justifyContent: "center", animation: "popIn 0.35s ease", flexShrink: 0 }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="#fbbf24">{reward.icon}</svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 12, fontWeight: 700, color: "#fbbf24" }}>{reward.title}</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{reward.desc}</div>
        </div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 800, color: "#fbbf24", flexShrink: 0 }}>+{reward.xp}</div>
      </div>
    </div>
  );
}

// ─── TYPING INDICATOR ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px 16px 16px 4px", width: "fit-content" }}>
      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
        {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(96,165,250,0.8)", animation: `typingBounce 1.4s ease ${i * 0.2}s infinite` }} />)}
      </div>
      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: "rgba(96,165,250,0.5)", letterSpacing: "1.5px" }}>NEUROMENTOR IS GUIDING</span>
    </div>
  );
}

// ─── MESSAGE CONTENT MARKDOWN PARSER ─────────────────────────────────────────────
function MessageContent({ text, theme }) {
  const renderInline = (str) => {
    const parts = str.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return parts.map((p, i) => {
      if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} style={{ color: theme === "light" ? "rgba(30,30,80,0.95)" : "rgba(255,255,255,0.95)", fontWeight: 700 }}>{p.slice(2,-2)}</strong>;
      if (p.startsWith("*") && p.endsWith("*")) return <em key={i} style={{ color: "rgba(96,165,250,0.85)" }}>{p.slice(1,-1)}</em>;
      if (p.startsWith("`") && p.endsWith("`")) return <code key={i} style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)", borderRadius: 4, padding: "1px 5px", fontFamily: "'DM Mono',monospace", fontSize: "0.9em", color: "rgba(147,197,253,0.9)" }}>{p.slice(1,-1)}</code>;
      return p;
    });
  };

  const codeBlockParts = text.split(/(```[\s\S]*?```)/g);
  return (
    <div>
      {codeBlockParts.map((part, i) => {
        if (part.startsWith("```")) {
          const lines = part.slice(3, -3).split("\n");
          const lang = lines[0].trim(); const code = lines.slice(1).join("\n");
          return (
            <div key={i} style={{ margin: "10px 0", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(96,165,250,0.18)" }}>
              <div style={{ background: "rgba(96,165,250,0.08)", padding: "6px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: "rgba(96,165,250,0.65)", letterSpacing: "1px", textTransform: "uppercase" }}>{lang || "code"}</span>
                <button onClick={() => navigator.clipboard.writeText(code)} style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.25)", borderRadius: 5, padding: "2px 9px", cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 8, color: "rgba(96,165,250,0.7)", transition: "all 0.15s" }}>COPY</button>
              </div>
              <pre style={{ margin: 0, padding: "13px 16px", background: "rgba(0,0,0,0.55)", color: "rgba(186,220,255,0.92)", fontSize: 12, fontFamily: "'DM Mono',monospace", overflowX: "auto", lineHeight: 1.65 }}>{code}</pre>
            </div>
          );
        }
        const lines = part.split("\n");
        return (
          <div key={i}>
            {lines.map((line, li) => {
              if (line.startsWith("### ")) return <div key={li} style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: theme === "light" ? "#1e3a8a" : "rgba(96,165,250,0.9)", margin: "8px 0 4px" }}>{line.slice(4)}</div>;
              if (line.startsWith("## ")) return <div key={li} style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, color: theme === "light" ? "#1e3a8a" : "rgba(147,197,253,0.95)", margin: "10px 0 5px" }}>{line.slice(3)}</div>;
              if (line.startsWith("# ")) return <div key={li} style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, color: theme === "light" ? "#1e3a8a" : "rgba(186,230,255,0.95)", margin: "12px 0 6px" }}>{line.slice(2)}</div>;
              if (line.startsWith("- ") || line.startsWith("* ")) return <div key={li} style={{ display: "flex", gap: 8, margin: "3px 0" }}><span style={{ color: "rgba(96,165,250,0.7)", marginTop: 1 }}>•</span><span>{renderInline(line.slice(2))}</span></div>;
              if (/^\d+\. /.test(line)) { const [num, ...rest] = line.split(". "); return <div key={li} style={{ display: "flex", gap: 8, margin: "3px 0" }}><span style={{ color: "rgba(96,165,250,0.7)", fontFamily: "'DM Mono',monospace", fontSize: 11, minWidth: 16 }}>{num}.</span><span>{renderInline(rest.join(". "))}</span></div>; }
              if (line === "") return <div key={li} style={{ height: 6 }} />;
              return <span key={li} style={{ display: "block", lineHeight: 1.75 }}>{renderInline(line)}</span>;
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── SCORE RING ────────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 32 }) {
  const r = size / 2 - 4;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score > 70 ? "#4ade80" : score > 40 ? "#fbbf24" : "#f87171";
  const glow = score > 70 ? "rgba(74,222,128,0.7)" : score > 40 ? "rgba(251,191,36,0.7)" : "rgba(248,113,113,0.7)";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="2.5"
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ filter: `drop-shadow(0 0 3px ${glow})`, transition: "all 1s ease" }} />
      <text x={size/2} y={size/2 + 1} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize={size * 0.22} fontFamily="'Syne',sans-serif" fontWeight="800">{score}</text>
    </svg>
  );
}

// ─── SESSION CARD ──────────────────────────────────────────────────────────────
function SessionCard({ chat, isActive, onClick, theme }) {
  const userMsgs = chat.messages?.filter(m => m.role === "user") || [];
  const score = chat.scores?.length ? Math.round(chat.scores.reduce((a, b) => a + b.score, 0) / chat.scores.length) : 100;
  const depth = Math.min(100, userMsgs.length * 14);
  const topics = chat.nodes?.slice(0, 3).map(n => n.label) || [];
  const depthColor = score > 70 ? "linear-gradient(90deg,rgba(74,222,128,0.55),rgba(74,222,128,0.05))" : score > 40 ? "linear-gradient(90deg,rgba(251,191,36,0.55),rgba(251,191,36,0.05))" : "linear-gradient(90deg,rgba(248,113,113,0.55),rgba(248,113,113,0.05))";
  const activeBg = theme === "light" ? "rgba(59,130,246,0.08)" : "rgba(96,165,250,0.07)";
  const hoverBg = theme === "light" ? "rgba(59,130,246,0.05)" : "rgba(96,165,250,0.04)";
  return (
    <div onClick={onClick} style={{ borderRadius: 11, padding: "9px 10px", marginBottom: 5, cursor: "pointer", transition: "all 0.18s", background: isActive ? activeBg : "transparent", border: `1px solid ${isActive ? "rgba(96,165,250,0.28)" : "rgba(255,255,255,0.04)"}`, boxShadow: isActive ? "0 0 18px rgba(96,165,250,0.06)" : "none" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: topics.length ? 6 : 0 }}>
        <ScoreRing score={score} size={28} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: isActive ? "rgba(96,165,250,0.9)" : theme === "light" ? "rgba(30,30,80,0.75)" : "rgba(255,255,255,0.7)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.4, marginBottom: 1 }}>{chat.title}</div>
          <div style={{ fontSize: 7, color: "rgba(155,155,185,0.6)", fontFamily: "'DM Mono',monospace" }}>{isActive ? "now" : `${userMsgs.length} q`}</div>
        </div>
        {isActive && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 7px rgba(74,222,128,0.8)", flexShrink: 0, marginTop: 4 }} />}
      </div>
      {topics.length > 0 && (
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 5 }}>
          {topics.map(t => <span key={t} style={{ padding: "1px 6px", background: "rgba(96,165,250,0.07)", border: "1px solid rgba(96,165,250,0.14)", borderRadius: 20, fontSize: 7, color: "rgba(96,165,250,0.6)", fontFamily: "'DM Mono',monospace" }}>{t}</span>)}
        </div>
      )}
      <div style={{ height: 2, background: "rgba(255,255,255,0.04)", borderRadius: 1, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${depth}%`, background: depthColor, borderRadius: 1, transition: "width 0.7s ease" }} />
      </div>
    </div>
  );
}

// ─── MIND MAP (Knowledge Graph View Sized by Semantic Embeddings) ───────────────
function MindMap({ nodes }) {
  if (!nodes.length) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "center", lineHeight: 2 }}>Start a conversation<br />to build your knowledge graph</p>
    </div>
  );
  const cx = 200, cy = 200;
  return (
    <svg viewBox="0 0 400 400" style={{ width: "100%", maxWidth: 420, height: 420 }}>
      <defs>
        <radialGradient id="cg"><stop offset="0%" stopColor="#60a5fa" stopOpacity=".9" /><stop offset="100%" stopColor="#2563eb" stopOpacity=".4" /></radialGradient>
        <filter id="gf"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <circle cx={cx} cy={cy} r={30} fill="url(#cg)" filter="url(#gf)" />
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="8" fontFamily="'DM Mono',monospace" fontWeight="600" letterSpacing="1">NEURO</text>
      {nodes.slice(0, 10).map((n, i) => {
        const a = (i / Math.min(nodes.length, 10)) * Math.PI * 2 - Math.PI / 2;
        const r = 135; const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        const nr = 18 + (n.strength || 1) * 3.5; // Node sizing based on strength / semantic similarity
        return (
          <g key={i} style={{ animation: `fadeIn 0.5s ease ${i * 0.09}s both` }}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(96,165,250,0.18)" strokeWidth="1" strokeDasharray="4 3" />
            <circle cx={x} cy={y} r={nr} fill="rgba(96,165,250,0.08)" stroke="rgba(96,165,250,0.38)" strokeWidth="1" filter="url(#gf)" />
            <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle" fill="rgba(147,197,253,0.88)" fontSize="7" fontFamily="'DM Mono',monospace">{n.label.slice(0, 9)}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── TOPICS PANEL ──────────────────────────────────────────────────────────────
function TopicsPanel({ chats }) {
  const topicMap = {};
  chats.forEach(c => { (c.nodes || []).forEach(n => { topicMap[n.label] = (topicMap[n.label] || 0) + (n.strength || 1); }); });
  const topics = Object.entries(topicMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const max = topics[0]?.[1] || 1;
  if (!topics.length) return <div style={{ padding: "24px 8px", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 8, fontFamily: "'DM Mono',monospace", lineHeight: 2 }}>Start conversations<br />to build your topic map</div>;
  return (
    <div>
      <div style={{ fontSize: 7, color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono',monospace", marginBottom: 10, letterSpacing: "0.5px" }}>Topics across all sessions</div>
      {topics.map(([label, count], i) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: 7, marginBottom: 3, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.55)", fontFamily: "'DM Mono',monospace", width: 68, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
          <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(count/max)*100}%`, background: i < 3 ? "rgba(96,165,250,0.7)" : i < 6 ? "rgba(96,165,250,0.45)" : "rgba(96,165,250,0.25)", borderRadius: 2 }} />
          </div>
          <div style={{ fontSize: 7, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono',monospace", width: 18, textAlign: "right" }}>{count}x</div>
        </div>
      ))}
    </div>
  );
}

// ─── PINNED PANEL ──────────────────────────────────────────────────────────────
function PinnedPanel({ pinnedNotes, setPinnedNotes }) {
  if (!pinnedNotes?.length) return (
    <div style={{ padding: "24px 8px", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 8, fontFamily: "'DM Mono',monospace", lineHeight: 2 }}>
      Pin key insights from<br />any agent message<br /><span style={{ color: "rgba(96,165,250,0.35)" }}>They persist across sessions</span>
    </div>
  );
  const colors = [
    { bg: "rgba(96,165,250,0.05)", border: "rgba(96,165,250,0.35)", tag: "rgba(96,165,250,0.55)", label: "insight" },
    { bg: "rgba(251,191,36,0.05)", border: "rgba(251,191,36,0.35)", tag: "rgba(251,191,36,0.55)", label: "key idea" },
    { bg: "rgba(74,222,128,0.05)", border: "rgba(74,222,128,0.3)", tag: "rgba(74,222,128,0.55)", label: "note" },
  ];
  return (
    <div>
      {pinnedNotes.map((note, i) => {
        const c = colors[i % 3];
        return (
          <div key={i} style={{ padding: "9px 11px", borderRadius: 10, marginBottom: 8, background: c.bg, borderLeft: `2px solid ${c.border}`, animation: "scaleIn 0.3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <span style={{ fontSize: 6, color: c.tag, fontFamily: "'DM Mono',monospace", letterSpacing: "1.5px", textTransform: "uppercase" }}>{c.label}</span>
              <button onClick={() => setPinnedNotes(p => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.2)", fontSize: 13, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", fontFamily: "'DM Mono',monospace", lineHeight: 1.65 }}>{note.text?.slice(0, 120)}{note.text?.length > 120 ? "…" : ""}</div>
            {note.from && <div style={{ fontSize: 7, color: "rgba(255,255,255,0.22)", fontFamily: "'DM Mono',monospace", marginTop: 5 }}>from "{note.from}"</div>}
          </div>
        );
      })}
    </div>
  );
}

// ─── INSIGHTS PANEL (4th Vault Tab powered by Gemini Embeddings & Vector Search) 
function InsightsPanel({ pinnedNotes, activeChatId, theme }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [clusters, setClusters] = useState(["Recursion", "Big O Notation", "FastAPI", "React hooks", "Socratic learning"]);

  const handleSemanticSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch("http://localhost:8000/api/insights/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery })
      });
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch {
      // Mock search client fallback
      const filtered = pinnedNotes.filter(n => 
        n.text.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered);
    }
    setSearching(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 7, color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono',monospace", letterSpacing: "0.5px" }}>Semantic Vault Vector Search</div>
      
      {/* Tag Cloud Concept Clusters */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 4 }}>
        {clusters.map(tag => (
          <span 
            key={tag} 
            onClick={() => { setSearchQuery(tag); }}
            style={{ 
              padding: "2px 7px", 
              background: "rgba(139,92,246,0.08)", 
              border: "1px solid rgba(139,92,246,0.25)", 
              borderRadius: 20, 
              fontSize: 7, 
              color: "#a78bfa", 
              fontFamily: "'DM Mono',monospace",
              cursor: "pointer"
            }}
          >
            #{tag}
          </span>
        ))}
      </div>

      <div style={{ display: "flex", gap: 5 }}>
        <input 
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)} 
          onKeyDown={e => e.key === "Enter" && handleSemanticSearch()}
          placeholder="Semantic vector query..." 
          style={{ 
            flex: 1, 
            background: "rgba(255,255,255,0.03)", 
            border: "1px solid rgba(255,255,255,0.06)", 
            borderRadius: 7, 
            padding: "5px 8px", 
            color: "white", 
            fontFamily: "'DM Mono',monospace", 
            fontSize: 9,
            outline: "none"
          }} 
        />
        <button 
          onClick={handleSemanticSearch}
          style={{ 
            background: "rgba(96,165,250,0.15)", 
            border: "1px solid rgba(96,165,250,0.3)", 
            color: "#60a5fa", 
            borderRadius: 7, 
            padding: "4px 8px", 
            fontSize: 9, 
            fontFamily: "'DM Mono',monospace" 
          }}
        >
          {searching ? "..." : "Find"}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {searchResults.map((note, i) => (
          <div key={i} style={{ padding: "8px", borderRadius: 8, background: "rgba(96,165,250,0.03)", border: "1px solid rgba(96,165,250,0.12)" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>{note.text}</div>
            <div style={{ fontSize: 7, color: "rgba(96,165,250,0.5)", fontFamily: "'DM Mono',monospace", marginTop: 4 }}>Match score: {note.score ? note.score.toFixed(3) : "semantic"}</div>
          </div>
        ))}
        {searchQuery && searchResults.length === 0 && !searching && (
          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", textAlign: "center", marginTop: 10 }}>No semantic cluster hits.</div>
        )}
      </div>
    </div>
  );
}

// ─── NEW SIDEBAR ────────────────────────────────────────────────────────────────
function NewSidebar({ user, userProfile, sessionReady, xp, level, streak, earned, chats, activeChatId, setActiveChatId, setView, newChat, globalScores, totalMessages, projects, vaultTab, setVaultTab, sidebarSearch, setSidebarSearch, pinnedNotes, setPinnedNotes, theme }) {
  const avgScore = globalScores?.length ? Math.round(globalScores.reduce((a, b) => a + b.score, 0) / globalScores.length) : 100;
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const filtered = sidebarSearch.trim() ? chats.filter(c => c.title?.toLowerCase().includes(sidebarSearch.toLowerCase()) || c.nodes?.some(n => n.label?.toLowerCase().includes(sidebarSearch.toLowerCase()))) : chats;
  const reversed = [...filtered].reverse();
  const groups = { Today: [], Yesterday: [], Older: [] };
  reversed.forEach(c => {
    const d = new Date(typeof c.id === "number" && c.id > 1e9 ? c.id : Date.now()).toDateString();
    if (d === today) groups.Today.push(c); else if (d === yesterday) groups.Yesterday.push(c); else groups.Older.push(c);
  });
  if (!groups.Today.length && !groups.Yesterday.length && groups.Older.length) { groups.Today = groups.Older; groups.Older = []; }

  const sideBg = theme === "light" ? "rgba(240,244,255,0.97)" : "rgba(2,5,14,0.98)";
  const borderColor = theme === "light" ? "rgba(59,130,246,0.12)" : "rgba(96,165,250,0.06)";

  return (
    <div style={{ width: 252, background: sideBg, borderRight: `1px solid ${borderColor}`, display: "flex", flexDirection: "column", position: "relative", zIndex: 20, overflow: "hidden" }}>
      {/* TOP */}
      <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${borderColor}`, flexShrink: 0 }}>
        {/* User */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
          {userProfile?.photo
            ? <img src={userProfile.photo} alt="" style={{ width: 36, height: 36, borderRadius: "50%", border: "1.5px solid rgba(96,165,250,0.35)", flexShrink: 0 }} />
            : <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,rgba(96,165,250,0.4),rgba(37,99,235,0.25))", border: "1.5px solid rgba(96,165,250,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, color: "rgba(96,165,250,0.9)", flexShrink: 0 }}>{user?.[0]?.toUpperCase()}</div>
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, color: theme === "light" ? "#1e1e4a" : "rgba(255,255,255,0.9)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user}</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 2, padding: "1px 7px", background: sessionReady ? "rgba(74,222,128,0.08)" : "rgba(251,191,36,0.08)", border: `1px solid ${sessionReady ? "rgba(74,222,128,0.22)" : "rgba(251,191,36,0.22)"}`, borderRadius: 20 }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: sessionReady ? "#4ade80" : "#fbbf24" }} />
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 6, color: sessionReady ? "#4ade80" : "#fbbf24", letterSpacing: "1px" }}>{sessionReady ? "ACTIVE" : "CONNECTING"}</span>
            </div>
          </div>
          <ScoreRing score={avgScore} size={34} />
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5, marginBottom: 10 }}>
          {[{ v: `LVL ${level}`, l: "Level", c: "#fbbf24" }, { v: streak, l: "🔥 Streak", c: streak >= 3 ? "#f97316" : "#60a5fa" }, { v: xp, l: "XP", c: "#3b82f6" }].map(s => (
            <div key={s.l} style={{ background: theme === "light" ? "rgba(59,130,246,0.05)" : "rgba(255,255,255,0.025)", border: `1px solid ${theme === "light" ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.05)"}`, borderRadius: 9, padding: "6px 8px", textAlign: "center" }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, color: s.c, lineHeight: 1 }}>{s.v}</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 6, color: "rgba(155,155,185,0.7)", letterSpacing: "0.4px", marginTop: 3 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, background: theme === "light" ? "rgba(59,130,246,0.05)" : "rgba(255,255,255,0.025)", border: `1px solid ${theme === "light" ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.07)"}`, borderRadius: 8, padding: "6px 10px" }}>
          <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="rgba(155,155,185,0.5)" strokeWidth="1.5"><circle cx="7" cy="7" r="4" /><path d="M10.5 10.5l2.5 2.5" strokeLinecap="round" /></svg>
          <input value={sidebarSearch} onChange={e => setSidebarSearch(e.target.value)} placeholder="Search sessions or topics..." style={{ background: "none", border: "none", outline: "none", fontFamily: "'DM Mono',monospace", fontSize: 9, color: theme === "light" ? "rgba(30,30,80,0.7)" : "rgba(255,255,255,0.65)", flex: 1 }} />
          {sidebarSearch && <button onClick={() => setSidebarSearch("")} style={{ background: "none", border: "none", color: "rgba(155,155,185,0.5)", fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>}
        </div>
      </div>

      {/* TABS (4 tabs: Timeline / Topics / Pinned / Insights) */}
      <div style={{ display: "flex", borderBottom: `1px solid ${borderColor}`, flexShrink: 0, padding: "0 10px" }}>
        {["timeline","topics","pinned","insights"].map(t => (
          <button key={t} onClick={() => setVaultTab(t)} style={{ flex: 1, padding: "8px 2px", background: "none", border: "none", borderBottom: `2px solid ${vaultTab === t ? "rgba(96,165,250,0.65)" : "transparent"}`, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 7, color: vaultTab === t ? "rgba(96,165,250,0.9)" : "rgba(155,155,185,0.45)", letterSpacing: "0.5px", textTransform: "uppercase", transition: "all 0.18s" }}>{t}</button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
        {vaultTab === "timeline" && (
          <>
            <button onClick={newChat} style={{ width: "100%", marginBottom: 10, padding: "8px", background: "rgba(96,165,250,0.06)", border: "1px dashed rgba(96,165,250,0.2)", borderRadius: 9, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 8, color: "rgba(96,165,250,0.5)", letterSpacing: "0.5px", transition: "all 0.18s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6 2v8M2 6h8" /></svg>
              Start new session
            </button>
            {sidebarSearch
              ? (<>{filtered.length === 0 && <div style={{ textAlign: "center", padding: "18px 8px", color: "rgba(155,155,185,0.4)", fontSize: 8, fontFamily: "'DM Mono',monospace" }}>No match for "{sidebarSearch}"</div>}{filtered.map(c => <SessionCard key={c.id} chat={c} isActive={c.id === activeChatId} onClick={() => { setActiveChatId(c.id); setView("chat"); }} theme={theme} />)}</>)
              : Object.entries(groups).map(([day, dc]) => dc.length > 0 && (
                <div key={day}>
                  <div style={{ fontSize: 6, color: "rgba(155,155,185,0.4)", letterSpacing: "2.5px", textTransform: "uppercase", fontFamily: "'DM Mono',monospace", margin: "8px 2px 6px", display: "flex", alignItems: "center", gap: 6 }}>
                    <span>{day}</span><div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.05)" }} /><span>{dc.length}</span>
                  </div>
                  {dc.map(c => <SessionCard key={c.id} chat={c} isActive={c.id === activeChatId} onClick={() => { setActiveChatId(c.id); setView("chat"); }} theme={theme} />)}
                </div>
              ))
            }
          </>
        )}
        {vaultTab === "topics" && <TopicsPanel chats={chats} />}
        {vaultTab === "pinned" && <PinnedPanel pinnedNotes={pinnedNotes} setPinnedNotes={setPinnedNotes} />}
        {vaultTab === "insights" && <InsightsPanel pinnedNotes={pinnedNotes} activeChatId={activeChatId} theme={theme} />}
      </div>

      {/* BOTTOM BADGES */}
      <div style={{ padding: "9px 14px", borderTop: `1px solid ${borderColor}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 5 }}>
          {[...Array(6)].map((_, i) => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i < (earned?.length || 0) ? "rgba(251,191,36,0.7)" : "rgba(255,255,255,0.07)", boxShadow: i < (earned?.length || 0) ? "0 0 6px rgba(251,191,36,0.4)" : "none", transition: "all 0.35s" }} />)}
        </div>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, color: "rgba(155,155,185,0.4)" }}>{earned?.length || 0}/6 badges</span>
      </div>
    </div>
  );
}

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────
const ACHIEVEMENTS = [
  { id: "first", label: "First Step", desc: "Send your first message", icon: <path d="M12 2l3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7z" />, condition: s => s.totalMessages >= 1, xp: 50 },
  { id: "streak3", label: "3-Day Streak", desc: "3 days in a row", icon: <path d="M12 2c-1.7 0-3 1.3-3 3 0 2 1.5 3 3 5 1.5-2 3-3 3-5 0-1.7-1.3-3-3-3zm0 16c-1.7 0-3-1.3-3-3 0-2 1.5-3 3-5 1.5 2 3 3 3 5 0 1.7-1.3 3-3 3z" />, condition: s => s.streak >= 3, xp: 100 },
  { id: "independent", label: "Independent", desc: "Score 80+ independence", icon: <path d="M12 22C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10-4.5 10-10 10zm-1-7l-3-3 1.4-1.4L11 12.2l4.6-4.6L17 9l-6 6z" />, condition: s => s.avgScore >= 80, xp: 200 },
  { id: "curious", label: "Curious Mind", desc: "Ask 10 questions", icon: <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />, condition: s => s.totalMessages >= 10, xp: 150 },
  { id: "voicelearner", label: "Voice Learner", desc: "Unlock voice learning sessions", icon: <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.42 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />, condition: s => s.totalMessages >= 3, xp: 100 },
  { id: "multilingual", label: "Multilingual", desc: "Utilize auto-translation tool", icon: <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04z" />, condition: s => s.totalMessages >= 2, xp: 80 }
];

function saveChatHistory(chats) {
  try {
    const slim = chats.map(c => ({ ...c, messages: c.messages.slice(-50) }));
    localStorage.setItem("nm_chats", JSON.stringify(slim));
  } catch {}
}

function loadChatHistory() {
  try {
    const raw = localStorage.getItem("nm_chats");
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function makeChat(id, user, sessionId) {
  return { id, title: `Session ${id}`, sessionId, messages: [{ role: "agent", text: `Welcome back, **${user}**. Your neural pathways are ready.\n\nWhat will you explore today?`, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }], hints: 0, nodes: [], codeRequests: 0, loading: false };
}

// ─── LOGIN SCREEN (Cinematic intro, word reveals, magnetic CTA) ───────────────
function LoginScreen({ onLogin, theme }) {
  const [step, setStep] = useState("google");
  const [loading, setLoading] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profession, setProfession] = useState("");
  const [profDetail, setProfDetail] = useState({ f1: "", f2: "" });
  const [dob, setDob] = useState("");
  const [parentUser, setParentUser] = useState(null);
  const [parentSigned, setParentSigned] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    import("firebase/auth").then(({ getAuth, onAuthStateChanged }) => {
      const auth = getAuth();
      onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          // 1) Try localStorage first (fastest)
          const raw = localStorage.getItem("nm_profile");
          if (raw) {
            try {
              const p = JSON.parse(raw);
              if (p?.name && p?.profession && p?.uid) {
                onLogin(p);
                return;
              }
            } catch {}
          }
          // 2) Try backend DB (cross-device / cleared cache)
          try {
            if (!fbUser?.uid) return;
            const res = await fetch(`/api/profile/${fbUser.uid}`);
            const data = await res.json();
            if (data.status === "found" && data.profile?.profession) {
              localStorage.setItem("nm_profile", JSON.stringify(data.profile));
              onLogin(data.profile);
              return;
            }
          } catch (e) {
            console.warn("Profile DB fetch failed, proceeding to onboarding:", e);
          }
          // 3) New user — show onboarding
          setFirebaseUser(fbUser);
          setStep(prev => prev === "google" ? "profession" : prev);
        }
      });
    });
  }, [onLogin]);

  const PROFESSIONS = [
    { id: "student", label: "School Student", icon: "🎒", fields: ["School Name", "Grade / Class"] },
    { id: "college", label: "College Student", icon: "🎓", fields: ["College Name", "Year / Course"] },
    { id: "professional", label: "Professional", icon: "💼", fields: ["Company", "Your Role"] },
    { id: "researcher", label: "Researcher", icon: "🔬", fields: ["Institution", "Field"] },
  ];
  const selectedProf = PROFESSIONS.find(p => p.id === profession);

  const handleGoogleSignIn = async () => {
    setLoading(true); setError("");
    try {
      const result = await signInWithGoogle();
      setFirebaseUser(result.user);
      setStep("profession");
    } catch (e) { setError("Sign in failed. Please try again."); }
    setLoading(false);
  };

  const handleProfessionNext = () => {
    try {
      if (!profession) { setError("Please select your profession."); return; }
      const field1 = profDetail.f1 || "";
      if (!field1.trim()) { setError("Please fill in the required field."); return; }
      setError("");
      setStep("age");
    } catch (err) {
      console.error("Error in handleProfessionNext:", err);
      setError("An unexpected error occurred. Please try again.");
    }
  };

  const handleAgeNext = () => {
    try {
      if (!dob) { setError("Please enter your date of birth."); return; }
      const age = Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000));
      if (isNaN(age) || age < 5 || age > 120) { setError("Please enter a valid date."); return; }
      setError("");
      if (age < 18) setStep("minor");
      else finishOnboarding(false, age);
    } catch (err) {
      console.error("Error in handleAgeNext:", err);
      setError("Please enter a valid date of birth.");
    }
  };

  const handleParentSignIn = async () => {
    setLoading(true); setError("");
    try {
      const { GoogleAuthProvider, signInWithPopup, getAuth } = await import("firebase/auth");
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(getAuth(), provider);
      if (result.user.email === firebaseUser.email) { setError("Parent must use a different Google account."); setLoading(false); return; }
      setParentUser(result.user);
      setParentSigned(true);
      setTimeout(() => finishOnboarding(true, 17), 1500);
    } catch (e) { setError("Parent verification failed."); }
    setLoading(false);
  };

  const finishOnboarding = async (isMinor, calculatedAge) => {
    const profile = {
      uid: firebaseUser.uid,
      name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Learner",
      email: firebaseUser.email,
      photo: firebaseUser.photoURL,
      profession,
      profField1: profDetail.f1,
      profField2: profDetail.f2,
      dob,
      age: calculatedAge,
      parentSigned: isMinor,
      assistantName: "NeuroMentor",
      socraticLevel: "socratic",
      trialUsed: false
    };
    localStorage.setItem("nm_profile", JSON.stringify(profile));
    // Save to MongoDB Atlas for cross-device persistence
    try {
      await fetch("https://neuromentor.onrender.com/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile)
      });
    } catch (e) { console.warn("Profile DB save failed (offline mode):", e); }
    onLogin(profile);
  };

  const isDark = theme === "dark";
  const cardBg = isDark ? "rgba(4,10,22,0.85)" : "rgba(255,255,255,0.95)";
  const cardBorder = isDark ? "rgba(96,165,250,0.18)" : "rgba(59,130,246,0.25)";
  const textMain = isDark ? "rgba(255,255,255,0.92)" : "#0f172a";
  const textSub = isDark ? "rgba(96,165,250,0.5)" : "rgba(37,99,235,0.65)";
  const inputBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
  const inputBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(59,130,246,0.15)";
  
  const steps = ["google", "profession", "age", "minor"];

  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh", position: "relative", overflow: "hidden", zIndex: 10, alignItems: "center", justifyContent: "center" }}>
      <FloatingBlobs theme={theme} />
      
      <div style={{ width: "90%", maxWidth: 1000, display: "flex", gap: 64, alignItems: "center", position: "relative", zIndex: 10 }}>
        {/* LEFT — Cinematic Intro */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24, animation: "slideInLeft 0.7s cubic-bezier(.16, 1, 0.3, 1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", border: "1px solid rgba(255,255,255,0.2)" }} />
            <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, letterSpacing: "1.5px" }}>NEUROMENTOR</span>
          </div>
          <HeroHeadline theme={theme} />
          <p style={{ fontSize: 14, color: textSub, lineHeight: 1.6, maxWidth: 420 }}>
            Most AI tools foster dependency. NeuroMentor uses the Socratic method to guide your learning, monitoring your independence and rewarding you for genuine comprehension.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["Socratic Dialogue", "Independence Tracking", "Multimodal OCR", "Interactive Shell", "Insights Vault"].map((f, i) => (
              <div key={f} style={{ padding: "5px 12px", background: isDark ? "rgba(96,165,250,0.07)" : "rgba(59,130,246,0.08)", border: `1px solid ${isDark ? "rgba(96,165,250,0.18)" : "rgba(59,130,246,0.2)"}`, borderRadius: 20, fontFamily: "'DM Mono',monospace", fontSize: 8, color: isDark ? "rgba(96,165,250,0.7)" : "rgba(37,99,235,0.8)", animation: `slideUp 0.5s ease ${0.1 + i * 0.06}s both` }}>{f}</div>
            ))}
          </div>
        </div>

        {/* RIGHT — Onboarding sliding panel */}
        <div style={{ width: 380, animation: "slideInRight 0.7s cubic-bezier(.16, 1, 0.3, 1)" }}>
          {/* Step dots */}
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 16, justifyContent: "center" }}>
            {steps.map((s, i) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: step === s ? "rgba(96,165,250,0.95)" : steps.indexOf(step) > i ? "rgba(74,222,128,0.8)" : isDark ? "rgba(255,255,255,0.1)" : "rgba(30,30,80,0.15)", transition: "all 0.35s", boxShadow: step === s ? "0 0 8px rgba(96,165,250,0.6)" : "none" }} />
                {i < 3 && <div style={{ width: 20, height: 1, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(30,30,80,0.1)" }} />}
              </div>
            ))}
          </div>

          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: 28, backdropFilter: "blur(20px)", boxShadow: isDark ? "0 24px 60px rgba(0,0,0,0.5)" : "0 24px 60px rgba(59,130,246,0.12)", display: "flex", flexDirection: "column", gap: 16, animation: "scaleIn 0.4s ease" }}>
            
            {/* STEP 1: Google Sign In */}
            {step === "google" && (<>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: textMain, marginBottom: 6 }}>Welcome to NeuroMentor</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: textSub }}>Authenticate with Google to begin</div>
              </div>
              <button onClick={handleGoogleSignIn} disabled={loading}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "14px 20px", background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.9)", border: `1px solid ${isDark ? "rgba(255,255,255,0.14)" : "rgba(59,130,246,0.25)"}`, borderRadius: 12, fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 600, color: isDark ? "rgba(255,255,255,0.88)" : "#1e1e4a", cursor: loading ? "wait" : "pointer", transition: "all 0.2s", opacity: loading ? 0.7 : 1 }}
                onMouseOver={e => { if(!loading) e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.1)" : "rgba(240,247,255,0.98)"; }}
                onMouseOut={e => e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.9)"}
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {loading ? "Connecting..." : "Continue with Google"}
              </button>
            </>)}

            {/* STEP 2: Profession selection */}
            {step === "profession" && firebaseUser && (<>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {firebaseUser.photoURL && <img src={firebaseUser.photoURL} alt="" style={{ width: 36, height: 36, borderRadius: "50%", border: "1.5px solid rgba(96,165,250,0.35)" }} />}
                <div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, color: textMain }}>Welcome, {firebaseUser.displayName?.split(" ")[0]}!</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: textSub }}>{firebaseUser.email}</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {PROFESSIONS.map(p => (
                  <button key={p.id} onClick={() => { setProfession(p.id); setProfDetail({ f1: "", f2: "" }); }}
                    style={{ padding: "11px 10px", background: profession === p.id ? (isDark ? "rgba(96,165,250,0.14)" : "rgba(59,130,246,0.1)") : inputBg, border: `1.5px solid ${profession === p.id ? "rgba(96,165,250,0.45)" : inputBorder}`, borderRadius: 10, textAlign: "left", transition: "all 0.15s" }}>
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{p.icon}</div>
                    <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 600, color: profession === p.id ? (isDark ? "rgba(96,165,250,0.95)" : "#2563eb") : textMain }}>{p.label}</div>
                  </button>
                ))}
              </div>
              {selectedProf && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {selectedProf.fields.map((field, i) => (
                    <input key={i} placeholder={field} value={i === 0 ? (profDetail.f1 || "") : (profDetail.f2 || "")}
                      onChange={e => {
                        const val = e.target.value;
                        setProfDetail(prev => i === 0 ? { ...prev, f1: val } : { ...prev, f2: val });
                      }}
                      style={{ background: inputBg, border: `1px solid ${inputBorder}`, borderRadius: 9, padding: "10px 14px", color: textMain, fontFamily: "'DM Mono',monospace", fontSize: 11, outline: "none" }} />
                  ))}
                </div>
              )}
              <button onClick={handleProfessionNext}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                  border: "none",
                  borderRadius: 10,
                  fontFamily: "'Syne',sans-serif",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#ffffff",
                  cursor: "pointer",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
                  letterSpacing: "0.5px"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 6px 16px rgba(37,99,235,0.35)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(37,99,235,0.25)";
                }}
              >
                Continue →
              </button>
            </>)}

            {/* STEP 3: Age verification */}
            {step === "age" && (<>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, color: textMain, marginBottom: 6 }}>Date of Birth</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: textSub }}>We adapt content for age verification</div>
              </div>
              <input type="date" value={dob} onChange={e => setDob(e.target.value)} max={new Date().toISOString().split("T")[0]}
                style={{ background: inputBg, border: `1px solid ${inputBorder}`, borderRadius: 10, padding: "13px 16px", color: textMain, fontFamily: "'DM Mono',monospace", fontSize: 13, outline: "none", colorScheme: isDark ? "dark" : "light", width: "100%" }} />
              <button onClick={handleAgeNext}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                  border: "none",
                  borderRadius: 10,
                  fontFamily: "'Syne',sans-serif",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#ffffff",
                  cursor: "pointer",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  boxShadow: "0 4px 12px rgba(37,99,235,0.25)"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 6px 16px rgba(37,99,235,0.35)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(37,99,235,0.25)";
                }}
              >
                Continue →
              </button>
            </>)}

            {/* STEP 4: Under 18 co-sign */}
            {step === "minor" && (
              <>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 34, marginBottom: 8 }}>👨‍👩‍👧</div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, color: textMain, marginBottom: 6 }}>Parental Consent Required</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: textSub, lineHeight: 1.8 }}>You are under 18. A parent or guardian must sign-in to activate your account.</div>
                </div>

                {!parentSigned ? (
                  <button
                    onClick={handleParentSignIn}
                    disabled={loading}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "13px", background: "rgba(251,191,36,0.09)", border: "1px solid rgba(251,191,36,0.28)", borderRadius: 10, color: "rgba(251,191,36,0.9)", cursor: loading ? "wait" : "pointer", fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700 }}
                  >
                    {loading ? "Waiting..." : "Parent: Google Verification"}
                  </button>
                ) : (
                  <div style={{ background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.22)", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="rgba(74,222,128,0.8)" strokeWidth="1.5" strokeLinecap="round"><path d="M3 8l3 3 7-7" /></svg>
                    <div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: "rgba(74,222,128,0.85)" }}>Verified! Connecting...</div>
                    </div>
                  </div>
                )}
              </>
            )}

            {error && <div style={{ background: "rgba(248,113,113,0.09)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 8, padding: "9px 13px", fontFamily: "'DM Mono',monospace", fontSize: 9, color: "rgba(248,113,113,0.85)" }}>{error}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP VIEW ─────────────────────────────────────────────────────────────
export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("nm_theme") || "dark");
  
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("nm_profile");
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (p && p.name && p.profession && p.uid) return p.name;
      return null;
    } catch { return null; }
  });
  const [userProfile, setUserProfile] = useState(() => {
    try {
      const raw = localStorage.getItem("nm_profile");
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (p && p.name && p.profession && p.uid) return p;
      return null;
    } catch { return null; }
  });

  const [showLanding, setShowLanding] = useState(true);
  
  const [view, setView] = useState("chat");
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(1);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [sessionId, setSessionId] = useState(() => Math.random().toString(36).slice(2));
  const [sessionReady, setSessionReady] = useState(false);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [earned, setEarned] = useState([]);
  const [reward, setReward] = useState(null);
  const [projects, setProjects] = useState([{ id: 1, name: "Python Socratic Script", topics: ["variables","loops"], progress: 30 }]);
  const [newProject, setNewProject] = useState("");
  const [totalMessages, setTotalMessages] = useState(0);
  const [codeRequests, setCodeRequests] = useState(0);
  const [globalScores, setGlobalScores] = useState([{ topic: "Onboarding", score: 100 }]);
  const [vaultTab, setVaultTab] = useState("timeline");
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [pinnedNotes, setPinnedNotes] = useState([]);
  
  // Profile Edit States
  const [nameEdit, setNameEdit] = useState("");
  const [assistantNameEdit, setAssistantNameEdit] = useState("NeuroMentor");
  const [profEdit, setProfEdit] = useState("");
  const [field1Edit, setField1Edit] = useState("");
  const [field2Edit, setField2Edit] = useState("");
  const [goalEdit, setGoalEdit] = useState("");
  const [socraticLevelEdit, setSocraticLevelEdit] = useState("socratic");
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setNameEdit(userProfile.name || "");
      setAssistantNameEdit(userProfile.assistantName || "NeuroMentor");
      setProfEdit(userProfile.profession || "");
      setField1Edit(userProfile.profField1 || "");
      setField2Edit(userProfile.profField2 || "");
      setGoalEdit(userProfile.goal || "");
      setSocraticLevelEdit(userProfile.socraticLevel || "socratic");
    }
  }, [userProfile]);
  
  // Custom Cursor States
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);
  const [hoverRect, setHoverRect] = useState(null);
  const [clicking, setClicking] = useState(false);
  const [ripples, setRipples] = useState([]);

  // PWA & Voice Mode States
  const [pwaPrompt, setPwaPrompt] = useState(null);
  const [showPwaBanner, setShowPwaBanner] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceInputSupported, setVoiceInputSupported] = useState(false);
  const [voiceTextOutput, setVoiceTextOutput] = useState(true);
  const [nativeVoiceOutput, setNativeVoiceOutput] = useState(true);
  const [voiceLang, setVoiceLang] = useState("en"); // en, ta, hi, etc.

  // Workspace terminal & OCR
  const [wsProject, setWsProject] = useState(null);
  const [wsStep, setWsStep] = useState(0);
  const [wsCode, setWsCode] = useState("");
  const [wsChat, setWsChat] = useState([]);
  const [wsInput, setWsInput] = useState("");
  const [wsLoading, setWsLoading] = useState(false);
  const [wsRoadmap, setWsRoadmap] = useState([]);
  const [wsRoadmapLoading, setWsRoadmapLoading] = useState(false);
  const [ocrUploading, setOcrUploading] = useState(false);
  const [projectsCompleted, setProjectsCompleted] = useState(0);

  // IDE Workspace State
  const [idePanel, setIdePanel] = useState("explorer"); // explorer | extensions | search
  const [activeFile, setActiveFile] = useState("main.py");
  const [openTabs, setOpenTabs] = useState(["main.py"]);
  const [fileContents, setFileContents] = useState({});
  const [extensions, setExtensions] = useState([
    { id: "socratic", name: "Socratic Copilot", publisher: "NeuroMentor", desc: "AI hints that guide without revealing answers", enabled: true, icon: "🧠" },
    { id: "prettier", name: "Prettier - Code Formatter", publisher: "Prettier", desc: "An opinionated code formatter", enabled: true, icon: "✨" },
    { id: "eslint", name: "ESLint", publisher: "Microsoft", desc: "Integrates ESLint into VS Code", enabled: true, icon: "🔍" },
    { id: "gitlens", name: "GitLens", publisher: "GitKraken", desc: "Supercharge Git inside VS Code", enabled: false, icon: "🔀" },
    { id: "indent", name: "Indent Rainbow", publisher: "oderwat", desc: "Makes indentation easier to read", enabled: false, icon: "🌈" },
    { id: "themes", name: "One Dark Pro", publisher: "binaryify", desc: "One of the most downloaded themes", enabled: true, icon: "🎨" },
    { id: "path", name: "Path IntelliSense", publisher: "Christian Kohler", desc: "Autocompletes filenames", enabled: false, icon: "📂" },
    { id: "copilot", name: "GitHub Copilot", publisher: "GitHub", desc: "AI pair programmer", enabled: false, icon: "🤖" },
  ]);

  const getLanguage = (name = "") => {
    const n = name.toLowerCase();
    if (n.includes("web") || n.includes("html") || n.includes("css")) return "html";
    if (n.includes("react") || n.includes("js") || n.includes("node")) return "javascript";
    if (n.includes("java") && !n.includes("script")) return "java";
    if (n.includes("c++") || n.includes("cpp")) return "cpp";
    return "python";
  };

  const termContainerRef = useRef(null);
  const terminalRef = useRef(null);
  const wsRef = useRef(null);

  const bottomRef = useRef();
  const inputRef = useRef();

  // 1. Cursor movement, click ripple, and element hover mapping
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    const handleMouseDown = () => setClicking(true);
    const handleMouseUp = () => setClicking(false);
    
    const handleMouseClick = (e) => {
      const id = Date.now() + Math.random();
      setRipples(prev => [...prev, { id, x: e.clientX, y: e.clientY }]);
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== id));
      }, 1000);
    };

    const handleMouseOver = (e) => {
      const target = e.target.closest("button, a, input, textarea, [role='button'], [data-interactive]");
      if (target) {
        setHovering(true);
        const rect = target.getBoundingClientRect();
        setHoverRect({
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          borderRadius: window.getComputedStyle(target).borderRadius || "8px"
        });
      } else {
        setHovering(false);
        setHoverRect(null);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("click", handleMouseClick);
    window.addEventListener("mouseover", handleMouseOver);

    // Check voice support
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      setVoiceInputSupported(true);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("click", handleMouseClick);
      window.removeEventListener("mouseover", handleMouseOver);
    };
  }, []);

  // 2. PWA Before Install Prompt Handler
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setPwaPrompt(e);
      setShowPwaBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const triggerPwaInstall = async () => {
    if (!pwaPrompt) return;
    pwaPrompt.prompt();
    const { outcome } = await pwaPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPwaBanner(false);
      setPwaPrompt(null);
    }
  };

  // 3. WebSocket Terminal Setup inside the React workspace
  useEffect(() => {
    if (view === "workspace" && wsProject && termContainerRef.current && !terminalRef.current) {
      // Initialize Xterm.js terminal
      const term = new Terminal({
        cursorBlink: true,
        theme: {
          background: "#020409",
          foreground: "rgba(255,255,255,0.85)",
          cursor: "#60a5fa"
        },
        fontFamily: "'DM Mono', monospace",
        fontSize: 12
      });
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(termContainerRef.current);
      fitAddon.fit();
      terminalRef.current = term;

      // Connect to WebSocket shell endpoint
      const socket = new WebSocket("ws://localhost:8000/terminal");
      wsRef.current = socket;

      socket.onopen = () => {
        term.write("\r\n\x1b[1;36m[NeuroMentor Workspace Terminal Connected]\x1b[0m\r\n");
      };

      socket.onmessage = (event) => {
        term.write(event.data);
      };

      socket.onclose = () => {
        term.write("\r\n\x1b[1;31m[Terminal Connection Lost]\x1b[0m\r\n");
      };

      term.onData((data) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(data);
        }
      });
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (terminalRef.current) {
        terminalRef.current.dispose();
        terminalRef.current = null;
      }
    };
  }, [view, wsProject]);

  const activeChat = chats.find(c => c.id === activeChatId) || chats[0];
  const avgScore = globalScores.length > 0 ? Math.round(globalScores.reduce((a, b) => a + b.score, 0) / globalScores.length) : 100;

  const giveXP = useCallback((amount, title, desc, icon) => {
    setXp(prev => { const next = prev + amount; setLevel(l => Math.max(l, Math.floor(next / 100) + 1)); return next; });
    setReward({ title, desc, xp: amount, icon });
  }, []);

  const checkAchievements = useCallback((stats) => {
    ACHIEVEMENTS.forEach(a => {
      if (!earned.includes(a.id) && a.condition(stats)) {
        setEarned(prev => [...prev, a.id]);
        giveXP(a.xp, `${a.label} unlocked!`, a.desc, a.icon);
      }
    });
  }, [earned, giveXP]);

  // Async Socratic Roadmap Task Creator (Queued as a Simulated GCP Cloud Task)
  const generateRoadmapTask = async (projectName) => {
    setWsRoadmapLoading(true);
    try {
      const currentSessionId = activeChat?.sessionId || sessionId;
      
      // Request roadmapping asynchronously
      const taskRes = await fetch("http://localhost:8000/api/roadmap-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName, sessionId: currentSessionId })
      });
      const taskData = await taskRes.json();
      const taskId = taskData.taskId;

      // Poll task status (simulate task completion callback)
      let roadmap = [];
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const checkRes = await fetch(`http://localhost:8000/api/roadmap-task/${taskId}`);
        const checkData = await checkRes.json();
        if (checkData.status === "SUCCESS") {
          roadmap = checkData.roadmap;
          break;
        }
      }

      if (!roadmap.length) {
        throw new Error("Task timed out");
      }

      setWsRoadmap(roadmap);
      setWsCode(roadmap[0]?.starter || "");
      setWsChat([{ role: "ai", text: `Async learning roadmap built for **${projectName}**. Try Step 1: ${roadmap[0]?.hint}` }]);
      setWsStep(0);
    } catch (err) {
      // Socratic Fallback Roadmap
      const mockRoadmap = [
        { title: "Project Setup", goal: "Define structure", hint: "What files do you need?", starter: "# Setup\n" },
        { title: "Core Scripts", goal: "Write main loop", hint: "Can you detail it in pseudocode?", starter: "def main():\n  pass\n" }
      ];
      setWsRoadmap(mockRoadmap);
      setWsCode(mockRoadmap[0].starter);
      setWsChat([{ role: "ai", text: "Offline Roadmap generated. Let's work Socratic!" }]);
    }
    setWsRoadmapLoading(false);
  };

  const askWorkspaceAI = async (overrideMsg) => {
    const msg = overrideMsg || wsInput.trim();
    if (!msg || wsLoading) return;
    if (!overrideMsg) setWsInput("");
    const step = wsRoadmap[wsStep];
    setWsChat(p => [...p, { role: "user", text: msg }]);
    setWsLoading(true);
    try {
      const currentSessionId = activeChat?.sessionId || sessionId;
      const wsMessage = `User is building "${wsProject?.name}" on step "${step?.title}" (Goal: "${step?.goal}"). Monaco code:\n${wsCode}\n\nQuestion: ${msg}\n\nGuide using Socratic method only.`;
      const res = await fetch("http://localhost:8000/run_sse", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          app_name: "neuromentor", user_id: "user", session_id: currentSessionId, 
          new_message: { role: "user", parts: [{ text: wsMessage }] }, 
          streaming: false 
        })
      });
      const data = await res.json();
      const reply = data.text || data.content?.parts?.[0]?.text || "What do you think the next logical step should be?";
      setWsChat(p => [...p, { role: "ai", text: reply }]);
      giveXP(10, "Workspace interaction", "Socratic growth!", <path d="M12 2l3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7z" />);
    } catch {
      setWsChat(p => [...p, { role: "ai", text: "Connection issue. What do you think is the next logical step?" }]);
    }
    setWsLoading(false);
  };

  // 4. Vision OCR Handwriting note uploader
  const handleOcrUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/api/vision-ocr", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.text) {
        // Append OCR text as a comment inside Monaco Editor
        setWsCode(prev => `# Extracted Handwritten Notes:\n# ${data.text.replace(/\n/g, "\n# ")}\n\n${prev}`);
        setWsChat(p => [...p, { role: "ai", text: "Handwritten pseudocode notes extracted and added to your workspace. How will you translate this to code?" }]);
        giveXP(20, "OCR Vision Upload", "Notes digitized", <path d="M12 22C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10-4.5 10-10 10zm-1-7l-3-3 1.4-1.4L11 12.2l4.6-4.6L17 9l-6 6z" />);
      }
    } catch {
      setWsChat(p => [...p, { role: "ai", text: "Vision OCR failed. Try uploading a clearer picture of your handwritten diagram." }]);
    }
    setOcrUploading(false);
  };

  // 5. Speech-to-Text & Text-to-Speech playback voice integrations
  const startVoiceRecognition = () => {
    if (!voiceInputSupported) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = voiceLang === "ta" ? "ta-IN" : voiceLang === "hi" ? "hi-IN" : "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsVoiceActive(true);
    };

    recognition.onresult = (e) => {
      const speechText = e.results[0][0].transcript;
      setInput(speechText);
    };

    recognition.onerror = () => {
      setIsVoiceActive(false);
    };

    recognition.onend = () => {
      setIsVoiceActive(false);
    };

    recognition.start();
  };

  const speakQuestionAloud = async (phrase) => {
    if (!voiceTextOutput) return;
    
    // Clean markdown characters out
    const cleanText = phrase.replace(/[\*\#\`\_]/g, "");
    
    // First, try backend TTS route
    try {
      const res = await fetch("http://localhost:8000/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanText, language_code: voiceLang === "ta" ? "ta-IN" : voiceLang === "hi" ? "hi-IN" : "en-US" })
      });
      const data = await res.json();
      if (data.audioContent) {
        const audio = new Audio("data:audio/mp3;base64," + data.audioContent);
        audio.play();
        return;
      }
    } catch {}

    // Native Browser Fallback (WebKit Speech Synthesis)
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = voiceLang === "ta" ? "ta-IN" : voiceLang === "hi" ? "hi-IN" : "en-US";
      window.speechSynthesis.speak(utterance);
    }
  };

  // Socratic question auto-translator ( Tamil, Hindi, English )
  const translatePhrase = async (phrase, targetLang) => {
    if (targetLang === "en") return phrase;
    try {
      const res = await fetch("http://localhost:8000/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: phrase, target_language: targetLang })
      });
      const data = await res.json();
      return data.translatedText || phrase;
    } catch {
      return phrase;
    }
  };

  // 6. User initial hooks
  useEffect(() => {
    if (!user) return;
    const saved = loadChatHistory();
    if (saved && saved.length > 0) {
      setChats(saved);
      setActiveChatId(saved[saved.length - 1].id);
    } else {
      const c = makeChat(1, user, sessionId);
      setChats([c]); setActiveChatId(1);
    }
    const create = async () => {
      try { 
        await fetch(`http://localhost:8000/apps/neuromentor/users/user/sessions/${sessionId}`, { 
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) 
        }); 
      } catch (e) { 
        console.log("Session create (non-fatal):", e.message); 
      }
      setSessionReady(true);
    };
    create();
  }, [user]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeChat?.messages]);

  useEffect(() => {
    if (chats.length > 0) saveChatHistory(chats);
  }, [chats]);

  const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const updateChat = (updates) => setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, ...updates } : c));

  const newChat = async () => {
    const id = Date.now();
    const newSessionId = Math.random().toString(36).slice(2);
    setSessionId(newSessionId); setSessionReady(false);
    setChats(prev => [...prev, makeChat(id, user, newSessionId)]);
    setActiveChatId(id); setView("chat");
    try { 
      await fetch(`http://localhost:8000/apps/neuromentor/users/user/sessions/${newSessionId}`, { 
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) 
      }); 
    } catch {} 
    setSessionReady(true);
  };

  const sendMessage = async () => {
    if (!input.trim() || activeChat?.loading) return;
    const userMsg = input.trim();
    setInput(""); setTyping(false);
    const t = now();
    const newMessages = [...(activeChat?.messages || []), { role: "user", text: userMsg, time: t }];
    const isCodeReq = /code|visuali|diagram|show|ascii|example|implement/i.test(userMsg);
    const newCodeReq = isCodeReq ? (activeChat?.codeRequests || 0) + 1 : (activeChat?.codeRequests || 0);
    const words = userMsg.split(" ").filter(w => w.length > 4);
    
    let newNodes = activeChat?.nodes || [];
    if (words.length > 0) {
      const topic = words[0];
      const exists = newNodes.find(n => n.label === topic);
      newNodes = exists 
        ? newNodes.map(n => n.label === topic ? { ...n, strength: (n.strength || 1) + 1 } : n) 
        : [...newNodes.slice(-7), { label: topic, strength: 1 }];
    }
    
    const isFirstMsg = (activeChat?.messages?.filter(m => m.role === "user").length || 0) === 0;
    updateChat({ messages: newMessages, nodes: newNodes, codeRequests: newCodeReq, loading: true, ...(isFirstMsg && { title: userMsg.length > 30 ? userMsg.slice(0, 30) + "…" : userMsg }) });
    setTotalMessages(p => p + 1);
    if (isCodeReq) setCodeRequests(p => p + 1);

    try {
      const currentSessionId = activeChat?.sessionId || sessionId;
      const res = await fetch("http://localhost:8000/run_sse", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_name: "neuromentor", user_id: "user", session_id: currentSessionId, new_message: { role: "user", parts: [{ text: userMsg }] }, streaming: false })
      });
      const data = await res.json();
      // Support both {text:...} and {content:{parts:[{text:...}]}} formats
      let agentText = data.text || data.content?.parts?.[0]?.text || null;
      if (!agentText) agentText = "I received your message. Let's analyze it Socratically.";
      
      // Auto translate if language is not English
      let displayAgentText = agentText;
      if (voiceLang !== "en") {
        displayAgentText = await translatePhrase(agentText, voiceLang);
      }

      // Voice read out if voice mode output is checked
      if (voiceTextOutput) {
        speakQuestionAloud(displayAgentText);
      }

      // Semantic Vector Sync (save insight vector in background)
      fetch("http://localhost:8000/api/insights/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: agentText, sessionId: currentSessionId })
      });

      const finalMessages = [...newMessages, { role: "agent", text: displayAgentText, time: now() }];
      const newHints = (activeChat?.hints || 0) + 1;
      setGlobalScores(prev => prev.length >= 50 ? prev : [...prev, { topic: `Q${prev.length}`, score: Math.max(20, 100 - newHints * 8) }]);
      updateChat({ messages: finalMessages, hints: newHints, codeRequests: newCodeReq, loading: false });
      
      // Streak calendar logic
      setStreak(s => s + 1);
      
      if (userMsg.length > 10) {
        giveXP(15, "Engaging response", "Socratic progress!", <path d="M12 2l3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7z" />);
      }
      checkAchievements({ totalMessages: totalMessages + 1, streak: streak + 1, avgScore, codeRequests: codeRequests + (isCodeReq ? 1 : 0), projectsCompleted });
    } catch {
      updateChat({ messages: [...newMessages, { role: "agent", text: "Socratic engine connectivity issue. Verify backend process status.", time: now() }], loading: false });
    }
  };

  // Stable login handler to prevent recreating Auth listeners
  const handleLoginFinished = useCallback((userData) => {
    setUserProfile(userData);
    setUser(userData.name);
  }, []);

  // Onboarding gate
  if (!user && showLanding) {
  return <LandingPage onGetStarted={() => setShowLanding(false)} />;
  }
  if (!user) {
    return (
      <>
        <GlobalStyles theme={theme} />
        {/* 3-Layer Custom Cursor (also rendered during onboarding for premium experience) */}
        <div style={{ position: "fixed", left: mousePos.x - 4, top: mousePos.y - 4, width: 8, height: 8, borderRadius: "50%", background: clicking ? "#fbbf24" : hovering ? "#4ade80" : "#60a5fa", pointerEvents: "none", zIndex: 2147483647, transition: "background 0.15s" }} />
        {hovering && hoverRect ? (
          <div style={{ position: "fixed", left: hoverRect.left - 4, top: hoverRect.top - 4, width: hoverRect.width + 8, height: hoverRect.height + 8, borderRadius: hoverRect.borderRadius, border: `1.5px solid ${clicking ? "#fbbf24" : "#4ade80"}`, pointerEvents: "none", zIndex: 2147483646, boxShadow: `0 0 14px ${clicking ? "rgba(251,191,36,0.35)" : "rgba(74,222,128,0.35)"}`, transition: "all 0.18s ease-out" }} />
        ) : (
          <div style={{ position: "fixed", left: mousePos.x - 20, top: mousePos.y - 20, width: 40, height: 40, borderRadius: "50%", border: `1.5px solid ${clicking ? "#fbbf24" : "#60a5fa"}`, pointerEvents: "none", zIndex: 2147483646, transform: clicking ? "scale(1.75)" : "scale(1)", transition: "transform 0.22s cubic-bezier(0.22, 0.61, 0.36, 1), border-color 0.15s, left 0.08s ease-out, top 0.08s ease-out", opacity: 0.6 }} />
        )}
        <div style={{ position: "fixed", left: mousePos.x - 60, top: mousePos.y - 60, width: 120, height: 120, borderRadius: "50%", background: clicking ? "rgba(251,191,36,0.06)" : hovering ? "rgba(74,222,128,0.06)" : "rgba(96,165,250,0.03)", pointerEvents: "none", zIndex: 2147483645, transform: "scale(1)", transition: "left 0.14s ease-out, top 0.14s ease-out", opacity: 0.85 }} />

        <LoginScreen onLogin={handleLoginFinished} theme={theme} />
      </>
    );
  }

  const isDark = theme === "dark";
  const mainBg = isDark ? "#020409" : "#f0f4ff";
  const railBg = isDark ? "rgba(4,10,22,0.95)" : "rgba(230,240,255,0.97)";
  const borderColor = isDark ? "rgba(96,165,250,0.06)" : "rgba(59,130,246,0.12)";
  const headerBg = isDark ? "rgba(2,4,9,0.88)" : "rgba(240,244,255,0.92)";
  const textMain = isDark ? "rgba(255,255,255,0.9)" : "#1e1e4a";
  const textSub = isDark ? "rgba(96,165,250,0.45)" : "rgba(37,99,235,0.55)";


  const handleLogout = async () => {
    try {
      await signOutUser();
    } catch (e) { console.error("Firebase sign out error:", e); }
    localStorage.removeItem("nm_profile");
    localStorage.removeItem("nm_chats");
    localStorage.removeItem("nm_theme");
    setUser(null);
    setUserProfile(null);
    setChats([]);
    setActiveChatId(1);
    setXp(0);
    setLevel(1);
    setStreak(0);
    setEarned([]);
    setSessionReady(false);
  };

  const NAV = [
    { id: "chat", path: "M4 6h16M4 10h12M4 14h8", label: "Chat" },
    { id: "mindmap", path: "M12 5a2 2 0 100-4 2 2 0 000 4zm-7 9a2 2 0 100-4 2 2 0 000 4zm14 0a2 2 0 100-4 2 2 0 000 4zM5 14l7-9m5 9l-7-9", label: "Graph" },
    { id: "progress", path: "M3 20v-6m4 6v-3m4 3V9m4 11V5m4 15v-4", label: "Progress" },
    { id: "workspace", path: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", label: "Workspace" },
    { id: "achievements", path: "M5 3l14 9-14 9V3z", label: "Rewards" },
    { id: "profile", path: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z", label: "Profile" },
    { id: "settings", path: "M10.5 6h3m-3 6h3m-3 6h3M6 6h.01M6 12h.01M6 18h.01", label: "Settings" },
  ];

  return (
   <>
      <GlobalStyles theme={theme} />
      {reward && <RewardPopup reward={reward} onClose={() => setReward(null)} />}
      
      {/* Concentric click ripples */}
      {ripples.map(r => (
        <div key={r.id} style={{ position: "fixed", left: r.x, top: r.y, pointerEvents: "none", zIndex: 2147483645 }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, borderRadius: "50%", border: "1px solid #60a5fa", transform: "translate(-50%, -50%)", animation: "ripple1 0.5s cubic-bezier(0.1, 0.8, 0.3, 1) forwards" }} />
          <div style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, borderRadius: "50%", border: "0.5px solid #a78bfa", transform: "translate(-50%, -50%)", animation: "ripple2 0.7s cubic-bezier(0.1, 0.8, 0.3, 1) 80ms forwards" }} />
          <div style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, borderRadius: "50%", border: "0.2px solid #f0f4ff", transform: "translate(-50%, -50%)", animation: "ripple3 0.9s cubic-bezier(0.1, 0.8, 0.3, 1) 160ms forwards" }} />
        </div>
      ))}

      {/* 3-Layer Custom Cursor */}

      <div style={{ position: "fixed", left: mousePos.x - 4, top: mousePos.y - 4, width: 8, height: 8, borderRadius: "50%", background: clicking ? "#fbbf24" : hovering ? "#4ade80" : "#60a5fa", pointerEvents: "none", zIndex: 2147483647, transition: "background 0.15s" }} />
      {hovering && hoverRect ? (
        <div style={{ position: "fixed", left: hoverRect.left - 4, top: hoverRect.top - 4, width: hoverRect.width + 8, height: hoverRect.height + 8, borderRadius: hoverRect.borderRadius, border: `1.5px solid ${clicking ? "#fbbf24" : "#4ade80"}`, pointerEvents: "none", zIndex: 2147483646, boxShadow: `0 0 14px ${clicking ? "rgba(251,191,36,0.35)" : "rgba(74,222,128,0.35)"}`, transition: "all 0.18s ease-out" }} />
      ) : (
        <div style={{ position: "fixed", left: mousePos.x - 20, top: mousePos.y - 20, width: 40, height: 40, borderRadius: "50%", border: `1.5px solid ${clicking ? "#fbbf24" : "#60a5fa"}`, pointerEvents: "none", zIndex: 2147483646, transform: clicking ? "scale(1.75)" : "scale(1)", transition: "transform 0.22s cubic-bezier(0.22, 0.61, 0.36, 1), border-color 0.15s, left 0.08s ease-out, top 0.08s ease-out", opacity: 0.6 }} />
      )}
      <div style={{ position: "fixed", left: mousePos.x - 60, top: mousePos.y - 60, width: 120, height: 120, borderRadius: "50%", background: clicking ? "rgba(251,191,36,0.06)" : hovering ? "rgba(74,222,128,0.06)" : "rgba(96,165,250,0.03)", pointerEvents: "none", zIndex: 2147483645, transform: "scale(1)", transition: "left 0.14s ease-out, top 0.14s ease-out", opacity: 0.85 }} />

      <div style={{ display: "flex", height: "100vh", background: mainBg, color: textMain, overflow: "hidden", position: "relative" }}>
        <NeuralCanvas intensity={typing ? 0.4 : 0.06} theme={theme} mousePos={mousePos} />

        {/* NAV RAIL */}
        <div style={{ width: 56, background: railBg, borderRight: `1px solid ${borderColor}`, display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 0", gap: 4, position: "relative", zIndex: 20 }}>
          <div style={{ width: 30, height: 30, border: `1px solid rgba(96,165,250,0.4)`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(96,165,250,0.08)", boxShadow: "0 0 14px rgba(96,165,250,0.2)", marginBottom: 12 }}>
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none">
              <circle cx="8" cy="5" r="1.6" fill="rgba(147,197,253,0.95)" /><circle cx="4.5" cy="12" r="1.2" fill="rgba(147,197,253,0.75)" /><circle cx="11.5" cy="12" r="1.2" fill="rgba(147,197,253,0.75)" />
              <line x1="8" y1="5" x2="4.5" y2="12" stroke="rgba(96,165,250,0.5)" strokeWidth="0.9" /><line x1="8" y1="5" x2="11.5" y2="12" stroke="rgba(96,165,250,0.5)" strokeWidth="0.9" />
            </svg>
          </div>
          {NAV.map(n => (
            <button key={n.id} title={n.label} onClick={() => setView(n.id)}
              style={{ width: 34, height: 34, border: view === n.id ? "1px solid rgba(96,165,250,0.45)" : "1px solid transparent", borderRadius: 9, background: view === n.id ? "rgba(96,165,250,0.12)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.18s", boxShadow: view === n.id ? "0 0 12px rgba(96,165,250,0.12)" : "none" }}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke={view === n.id ? "rgba(96,165,250,0.9)" : isDark ? "rgba(255,255,255,0.3)" : "rgba(30,30,80,0.4)"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={n.path} /></svg>
            </button>
          ))}
          {/* Theme toggle */}
          <button onClick={() => setTheme(p => p === "dark" ? "light" : "dark")} title={theme === "dark" ? "Light Mode" : "Dark Mode"}
            style={{ width: 34, height: 34, border: "1px solid transparent", borderRadius: 9, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 4 }}>
            {isDark
              ? <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              : <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="rgba(30,30,80,0.45)" strokeWidth="1.5" strokeLinecap="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
            }
          </button>
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 6, color: "#fbbf24", letterSpacing: "0.5px" }}>LVL {level}</div>
            {userProfile?.photo
              ? <img src={userProfile.photo} alt="" style={{ width: 26, height: 26, borderRadius: "50%", border: "1px solid rgba(96,165,250,0.35)" }} />
              : <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,rgba(96,165,250,0.4),rgba(37,99,235,0.25))", border: "1px solid rgba(96,165,250,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne',sans-serif", fontSize: 9, fontWeight: 800, color: "rgba(96,165,250,0.9)" }}>{user[0].toUpperCase()}</div>
            }
          </div>
        </div>

        {/* SIDEBAR */}
        <NewSidebar user={user} userProfile={userProfile} sessionReady={sessionReady} xp={xp} level={level} streak={streak} earned={earned} chats={chats} activeChatId={activeChatId} setActiveChatId={setActiveChatId} setView={setView} newChat={newChat} globalScores={globalScores} totalMessages={totalMessages} projects={projects} vaultTab={vaultTab} setVaultTab={setVaultTab} sidebarSearch={sidebarSearch} setSidebarSearch={setSidebarSearch} pinnedNotes={pinnedNotes} setPinnedNotes={setPinnedNotes} theme={theme} />

        {/* MAIN */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", zIndex: 10, overflow: "hidden" }}>
          
          {/* Header */}
          <div style={{ padding: "11px 22px", borderBottom: `1px solid ${borderColor}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: headerBg, backdropFilter: "blur(20px)" }}>
            <div>
              <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, margin: 0, color: textMain }}>
                {view === "chat" && (activeChat?.title || "Session")}
                {view === "mindmap" && "Knowledge Graph"}
                {view === "progress" && "Learning Trajectory"}
                {view === "workspace" && "Project Workspace"}
                {view === "achievements" && "Rewards & Badges"}
                {view === "profile" && "Developer Profile"}
                {view === "settings" && "Configuration"}
              </h1>
            </div>
            
            {/* Toolbar Buttons: Voice toggle, translation toggle, new chat */}
            <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
              {/* Socratic Translation Toggle */}
              <select 
                value={voiceLang} 
                onChange={(e) => setVoiceLang(e.target.value)}
                style={{ 
                  background: isDark ? "#0a1128" : "#ffffff", 
                  color: textMain, 
                  border: `1px solid ${borderColor}`,
                  borderRadius: "12px", 
                  fontSize: "9px",
                  padding: "4px 8px", 
                  outline: "none",
                  fontFamily: "'DM Mono',monospace"
                }}
              >
                <option value="en">🌐 English</option>
                <option value="ta">🌐 Tamil (தமிழ்)</option>
                <option value="hi">🌐 Hindi (हिन्दी)</option>
              </select>

              {/* Voice toggle */}
              {voiceInputSupported && (
                <button 
                  onClick={() => setVoiceTextOutput(p => !p)} 
                  title={voiceTextOutput ? "Mute voice read-out" : "Enable voice read-out"}
                  style={{
                    padding: "4px 8px",
                    background: voiceTextOutput ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${voiceTextOutput ? "#10b981" : borderColor}`,
                    borderRadius: "12px",
                    color: voiceTextOutput ? "#10b981" : textMain,
                    fontSize: "9px",
                    fontFamily: "'DM Mono',monospace"
                  }}
                >
                  🔊 Audio {voiceTextOutput ? "ON" : "OFF"}
                </button>
              )}

              <button onClick={newChat} style={{ padding: "5px 11px", background: isDark ? "rgba(96,165,250,0.07)" : "rgba(59,130,246,0.08)", border: `1px solid ${isDark ? "rgba(96,165,250,0.14)" : "rgba(59,130,246,0.18)"}`, borderRadius: 14, fontFamily: "'DM Mono',monospace", fontSize: 8, color: isDark ? "rgba(96,165,250,0.65)" : "rgba(37,99,235,0.7)", letterSpacing: "0.8px" }}>
                New Chat
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.16)", borderRadius: 14 }}>
                <svg viewBox="0 0 14 14" width="10" height="10" fill="rgba(251,191,36,0.75)"><path d="M7 1l1.76 3.57L13 5.27l-3 2.93.71 4.13L7 10.1l-3.71 2.23L4 8.2 1 5.27l4.24-.7z" /></svg>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: "rgba(251,191,36,0.75)" }}>{xp} XP</span>
              </div>
            </div>
          </div>

          {/* ── VIEW: CHAT ── */}
          {view === "chat" && (
            <>
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 26px", display: "flex", flexDirection: "column", gap: 14 }}>
                {(activeChat?.messages?.length || 0) <= 1 && (
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 8 }}>
                    {["What is the Socratic method?", "Explain recursion with diagram", "What is Big O notation?", "Explain async backend tasks"].map(q => (
                      <button key={q} onClick={() => { setInput(q); inputRef.current?.focus(); }}
                        style={{ padding: "6px 13px", background: isDark ? "rgba(96,165,250,0.06)" : "rgba(59,130,246,0.07)", border: `1px solid ${isDark ? "rgba(96,165,250,0.14)" : "rgba(59,130,246,0.18)"}`, borderRadius: 18, fontFamily: "'DM Mono',monospace", fontSize: 9, color: isDark ? "rgba(96,165,250,0.6)" : "rgba(37,99,235,0.7)", transition: "all 0.18s" }}>
                        {q}
                      </button>
                    ))}
                  </div>
                )}
                {activeChat?.messages?.map((msg, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", animation: "fadeUp 0.3s ease" }}>
                    <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", gap: 4, alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                      <div style={{ padding: "11px 15px", borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: msg.role === "user" ? isDark ? "linear-gradient(135deg,rgba(59,130,246,0.24),rgba(96,165,250,0.13))" : "linear-gradient(135deg,rgba(59,130,246,0.16),rgba(147,197,253,0.1))" : isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.8)", border: `1px solid ${msg.role === "user" ? "rgba(96,165,250,0.28)" : isDark ? "rgba(255,255,255,0.06)" : "rgba(59,130,246,0.1)"}`, fontSize: 13, lineHeight: 1.7, color: msg.role === "user" ? isDark ? "rgba(186,230,255,0.94)" : "#1e3a8a" : textMain, boxShadow: isDark ? "none" : msg.role === "user" ? "0 2px 12px rgba(59,130,246,0.1)" : "0 2px 12px rgba(59,130,246,0.05)" }}>
                        {msg.role === "agent" && <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, color: textSub, letterSpacing: "2px", marginBottom: 6, textTransform: "uppercase" }}>{userProfile?.assistantName || "NeuroMentor"}</div>}
                        <MessageContent text={msg.text} theme={theme} />
                        {msg.role === "agent" && (
                          <div style={{ marginTop: 9, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <button onClick={() => speakQuestionAloud(msg.text)} style={{ background: "none", border: "none", fontSize: 11, cursor: "pointer" }}>🔊</button>
                            <button onClick={() => setPinnedNotes(p => [...p, { text: msg.text, from: activeChat?.title || "", time: msg.time }])}
                              style={{ background: "none", border: `1px solid ${isDark ? "rgba(96,165,250,0.14)" : "rgba(59,130,246,0.18)"}`, color: isDark ? "rgba(96,165,250,0.6)" : "rgba(37,99,235,0.6)", padding: "3px 9px", borderRadius: 7, fontFamily: "'DM Mono',monospace", fontSize: 8 }}>
                              pin insight
                            </button>
                          </div>
                        )}
                      </div>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, color: isDark ? "rgba(255,255,255,0.18)" : "rgba(30,30,80,0.3)", letterSpacing: "0.4px" }}>{msg.time}</span>
                    </div>
                  </div>
                ))}
                {activeChat?.loading && <div style={{ display: "flex" }}><TypingIndicator /></div>}
                <div ref={bottomRef} />
              </div>

              {/* Chat Input */}
              <div style={{ padding: "11px 22px 15px", borderTop: `1px solid ${borderColor}`, background: headerBg, backdropFilter: "blur(20px)" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end", background: isDark ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.8)", border: `1px solid ${typing ? "rgba(96,165,250,0.3)" : isDark ? "rgba(255,255,255,0.08)" : "rgba(59,130,246,0.2)"}`, borderRadius: 14, padding: "9px 9px 9px 16px", transition: "all 0.25s" }}>
                  
                  {/* Mic input trigger button */}
                  {voiceInputSupported && (
                    <button 
                      onClick={startVoiceRecognition}
                      className={isVoiceActive ? "mic-active" : ""}
                      style={{
                        background: isVoiceActive ? "#ef4444" : "rgba(255,255,255,0.05)",
                        border: `1.5px solid ${isVoiceActive ? "#ef4444" : borderColor}`,
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        alignSelf: "center",
                        transition: "all 0.2s"
                      }}
                    >
                      <span style={{ fontSize: 13 }}>🎤</span>
                    </button>
                  )}

                  <textarea ref={inputRef} value={input} rows={1}
                    onChange={e => { setInput(e.target.value); setTyping(e.target.value.length > 0); }}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Describe what you are trying to understand..."
                    style={{ flex: 1, background: "none", border: "none", outline: "none", color: textMain, fontFamily: "'Outfit',sans-serif", fontSize: 13, resize: "none", lineHeight: 1.55, maxHeight: 120 }} />
                  <button onClick={sendMessage} disabled={activeChat?.loading || !input.trim()}
                    style={{ width: 32, height: 32, background: input.trim() ? "linear-gradient(135deg,rgba(59,130,246,0.4),rgba(96,165,250,0.2))" : isDark ? "rgba(255,255,255,0.04)" : "rgba(59,130,246,0.06)", border: `1px solid ${input.trim() ? "rgba(96,165,250,0.4)" : isDark ? "rgba(255,255,255,0.07)" : "rgba(59,130,246,0.14)"}`, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke={input.trim() ? "rgba(96,165,250,0.95)" : isDark ? "rgba(255,255,255,0.2)" : "rgba(59,130,246,0.35)"} strokeWidth="1.5" strokeLinecap="round"><path d="M6 10V2M2 6l4-4 4 4" /></svg>
                  </button>
                </div>
              </div>
            </>
          )}

          {view === "mindmap" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 }}>
              <MindMap nodes={activeChat?.nodes || []} />
              {(activeChat?.nodes?.length || 0) > 0 && (
                <div style={{ display: "flex", gap: 6, marginTop: 16, flexWrap: "wrap", justifyContent: "center" }}>
                  {activeChat.nodes.map(n => (
                    <div key={n.label} style={{ padding: "3px 10px", background: isDark ? "rgba(96,165,250,0.07)" : "rgba(59,130,246,0.08)", border: `1px solid ${isDark ? "rgba(96,165,250,0.16)" : "rgba(59,130,246,0.2)"}`, borderRadius: 18, fontFamily: "'DM Mono',monospace", fontSize: 8, color: isDark ? "rgba(96,165,250,0.65)" : "rgba(37,99,235,0.7)" }}>{n.label} · {n.strength}x</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── VIEW: PROGRESS ── */}
          {view === "progress" && (
            <div style={{ flex: 1, padding: 28, overflowY: "auto" }}>
              <div style={{ background: isDark ? "rgba(96,165,250,0.03)" : "rgba(255,255,255,0.7)", border: `1px solid ${borderColor}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
                <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 7, color: textSub, letterSpacing: "3px", textTransform: "uppercase", margin: "0 0 12px" }}>Independence trajectory</p>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={globalScores}>
                    <XAxis dataKey="topic" tick={{ fontFamily: "'DM Mono',monospace", fontSize: 8, fill: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.4)" }} stroke="none" />
                    <YAxis domain={[0, 100]} tick={{ fontFamily: "'DM Mono',monospace", fontSize: 8, fill: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.4)" }} stroke="none" />
                    <Tooltip contentStyle={{ background: "#020409", border: "1px solid rgba(96,165,250,0.2)", borderRadius: 8 }} labelStyle={{ color: "rgba(96,165,250,0.8)", fontSize: 8, fontFamily: "'DM Mono',monospace" }} itemStyle={{ color: "#ffffff", fontSize: 10, fontFamily: "'DM Mono',monospace" }} />
                    <Line type="monotone" dataKey="score" stroke="#60a5fa" strokeWidth="2.5" dot={{ fill: "#60a5fa", strokeWidth: 1 }} activeDot={{ r: 6, fill: "#fbbf24" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Weekly Trend Panel */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ background: isDark ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.7)", border: `1px solid ${borderColor}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>Weekly Learning Trend</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "#10b981" }}>+12%</div>
                    <div style={{ fontSize: 9, color: "rgba(155,155,185,0.6)" }}>independence growth this week</div>
                  </div>
                </div>
                <div style={{ background: isDark ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.7)", border: `1px solid ${borderColor}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>Weekly Parent Report</div>
                  <div style={{ fontSize: 9, color: "rgba(155,155,185,0.6)" }}>Auto-compiled PDF scheduled to send on Sunday at 7 PM.</div>
                </div>
              </div>
            </div>
          )}

          {/* ── VIEW: WORKSPACE (Full VS Code-style IDE) ── */}
          {view === "workspace" && (
            <div style={{ flex: 1, display: "flex", overflow: "hidden", fontFamily: "'DM Mono',monospace" }}>
              {!wsProject ? (
                /* ── Project Picker ── */
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>💻</div>
                    <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Open a Project</h2>
                    <p style={{ fontSize: 11, color: textSub, maxWidth: 340 }}>Start a new Socratic coding project. NeuroMentor will generate a step-by-step roadmap, open your IDE, and guide you without giving away answers.</p>
                  </div>
                  <div style={{ display: "flex", gap: 8, width: 380 }}>
                    <input
                      placeholder="e.g. Python Web Scraper, React To-do App..."
                      value={newProject}
                      onChange={e => setNewProject(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && newProject.trim()) {
                          const p = { id: Date.now(), name: newProject, progress: 0 };
                          const lang = getLanguage(newProject);
                          const defaultFiles = lang === "html"
                            ? ["index.html", "style.css", "script.js"]
                            : lang === "javascript"
                            ? ["index.js", "utils.js", "package.json"]
                            : ["main.py", "utils.py", "requirements.txt"];
                          const initContents = {};
                          defaultFiles.forEach(f => { initContents[f] = ""; });
                          setFileContents(initContents);
                          setOpenTabs([defaultFiles[0]]);
                          setActiveFile(defaultFiles[0]);
                          setProjects(prev => [...prev, p]);
                          setWsProject(p);
                          generateRoadmapTask(newProject);
                          setNewProject("");
                        }
                      }}
                      style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: `1px solid ${borderColor}`, borderRadius: 9, padding: "10px 14px", color: textMain, fontFamily: "'DM Mono',monospace", fontSize: 11, outline: "none" }}
                    />
                    <button
                      onClick={() => {
                        if (newProject.trim()) {
                          const p = { id: Date.now(), name: newProject, progress: 0 };
                          const lang = getLanguage(newProject);
                          const defaultFiles = lang === "html"
                            ? ["index.html", "style.css", "script.js"]
                            : lang === "javascript"
                            ? ["index.js", "utils.js", "package.json"]
                            : ["main.py", "utils.py", "requirements.txt"];
                          const initContents = {};
                          defaultFiles.forEach(f => { initContents[f] = ""; });
                          setFileContents(initContents);
                          setOpenTabs([defaultFiles[0]]);
                          setActiveFile(defaultFiles[0]);
                          setProjects(prev => [...prev, p]);
                          setWsProject(p);
                          generateRoadmapTask(newProject);
                          setNewProject("");
                        }
                      }}
                      style={{ padding: "10px 18px", background: "linear-gradient(135deg,#2563eb,#3b82f6)", border: "none", borderRadius: 9, color: "#fff", fontFamily: "'Syne',sans-serif", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                    >
                      Open IDE →
                    </button>
                  </div>
                  {/* Recent Projects */}
                  {projects.length > 0 && (
                    <div style={{ width: 380 }}>
                      <div style={{ fontSize: 9, color: "rgba(155,155,185,0.5)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "1px" }}>Recent Projects</div>
                      {projects.map(p => (
                        <div key={p.id} onClick={() => { setWsProject(p); generateRoadmapTask(p.name); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "rgba(255,255,255,0.02)", border: `1px solid ${borderColor}`, borderRadius: 8, marginBottom: 6, cursor: "pointer", transition: "all 0.15s" }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(96,165,250,0.06)"}
                          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                        >
                          <span style={{ fontSize: 14 }}>📁</span>
                          <span style={{ fontSize: 11, flex: 1 }}>{p.name}</span>
                          <span style={{ fontSize: 9, color: "rgba(155,155,185,0.4)" }}>{p.progress || 0}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* ── Full IDE Layout ── */
                <div style={{ flex: 1, display: "flex", height: "100%" }}>

                  {/* Activity Bar (far left icons — like VS Code) */}
                  <div style={{ width: 44, background: isDark ? "rgba(1,3,10,0.95)" : "#e8eaf0", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 8, gap: 2, borderRight: `1px solid ${borderColor}` }}>
                    {[
                      { id: "explorer", icon: "📄", title: "Explorer" },
                      { id: "extensions", icon: "🧩", title: "Extensions" },
                      { id: "search", icon: "🔍", title: "Search" },
                    ].map(b => (
                      <button key={b.id} title={b.title} onClick={() => setIdePanel(idePanel === b.id ? null : b.id)}
                        style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: idePanel === b.id ? "rgba(96,165,250,0.15)" : "transparent", border: idePanel === b.id ? "1px solid rgba(96,165,250,0.3)" : "1px solid transparent", borderRadius: 8, fontSize: 16, cursor: "pointer", transition: "all 0.15s" }}
                      >
                        {b.icon}
                      </button>
                    ))}
                    <div style={{ flex: 1 }} />
                    <button title="Close Project" onClick={() => { setWsProject(null); setIdePanel("explorer"); }}
                      style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "1px solid transparent", borderRadius: 8, fontSize: 14, cursor: "pointer", color: "rgba(239,68,68,0.7)", marginBottom: 8 }}
                    >✕</button>
                  </div>

                  {/* Side Panel (Explorer / Extensions / Search) */}
                  {idePanel && (
                    <div style={{ width: 220, borderRight: `1px solid ${borderColor}`, background: isDark ? "rgba(2,5,14,0.9)" : "rgba(240,244,255,0.9)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                      <div style={{ padding: "10px 12px", borderBottom: `1px solid ${borderColor}`, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "rgba(155,155,185,0.6)" }}>
                        {idePanel === "explorer" ? "EXPLORER" : idePanel === "extensions" ? "EXTENSIONS" : "SEARCH"}
                      </div>

                      {/* EXPLORER */}
                      {idePanel === "explorer" && (
                        <div style={{ flex: 1, overflowY: "auto" }}>
                          <div style={{ padding: "6px 8px", fontSize: 9, fontWeight: 700, color: "rgba(155,155,185,0.5)", textTransform: "uppercase" }}>{wsProject.name}</div>
                          {Object.keys(fileContents).length === 0
                            ? ["main.py", "utils.py", "requirements.txt"].map(f => (
                              <div key={f} onClick={() => { if (!openTabs.includes(f)) setOpenTabs(t => [...t, f]); setActiveFile(f); }}
                                style={{ padding: "5px 16px", fontSize: 11, cursor: "pointer", background: activeFile === f ? "rgba(96,165,250,0.12)" : "transparent", borderLeft: activeFile === f ? "2px solid #60a5fa" : "2px solid transparent", display: "flex", alignItems: "center", gap: 6 }}
                                onMouseEnter={e => e.currentTarget.style.background = activeFile === f ? "rgba(96,165,250,0.12)" : "rgba(255,255,255,0.03)"}
                                onMouseLeave={e => e.currentTarget.style.background = activeFile === f ? "rgba(96,165,250,0.12)" : "transparent"}
                              >
                                <span style={{ fontSize: 10 }}>{f.endsWith(".py") ? "🐍" : f.endsWith(".txt") ? "📝" : f.endsWith(".js") ? "🟨" : "📄"}</span>
                                <span>{f}</span>
                              </div>
                            ))
                            : Object.keys(fileContents).map(f => (
                              <div key={f} onClick={() => { if (!openTabs.includes(f)) setOpenTabs(t => [...t, f]); setActiveFile(f); }}
                                style={{ padding: "5px 16px", fontSize: 11, cursor: "pointer", background: activeFile === f ? "rgba(96,165,250,0.12)" : "transparent", borderLeft: activeFile === f ? "2px solid #60a5fa" : "2px solid transparent", display: "flex", alignItems: "center", gap: 6 }}
                                onMouseEnter={e => e.currentTarget.style.background = activeFile === f ? "rgba(96,165,250,0.12)" : "rgba(255,255,255,0.03)"}
                                onMouseLeave={e => e.currentTarget.style.background = activeFile === f ? "rgba(96,165,250,0.12)" : "transparent"}
                              >
                                <span style={{ fontSize: 10 }}>{f.endsWith(".py") ? "🐍" : f.endsWith(".txt") ? "📝" : f.endsWith(".js") ? "🟨" : f.endsWith(".html") ? "🌐" : f.endsWith(".css") ? "🎨" : "📄"}</span>
                                <span>{f}</span>
                              </div>
                            ))
                          }
                          {/* Roadmap steps in explorer */}
                          {wsRoadmap.length > 0 && (
                            <div style={{ marginTop: 12, borderTop: `1px solid ${borderColor}`, paddingTop: 6 }}>
                              <div style={{ padding: "6px 8px", fontSize: 9, fontWeight: 700, color: "rgba(155,155,185,0.5)", textTransform: "uppercase" }}>STEPS</div>
                              {wsRoadmap.map((step, idx) => (
                                <div key={idx} style={{ padding: "4px 16px", fontSize: 10, display: "flex", gap: 6, alignItems: "center", opacity: idx < wsStep ? 0.5 : 1 }}>
                                  <span>{idx < wsStep ? "✅" : idx === wsStep ? "▶" : "○"}</span>
                                  <span style={{ color: idx === wsStep ? "#60a5fa" : "inherit" }}>{step.title}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* EXTENSIONS */}
                      {idePanel === "extensions" && (
                        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
                          {extensions.map(ext => (
                            <div key={ext.id} style={{ padding: "10px 12px", borderBottom: `1px solid ${borderColor}`, display: "flex", gap: 10, alignItems: "flex-start" }}>
                              <span style={{ fontSize: 20, flexShrink: 0 }}>{ext.icon}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2 }}>{ext.name}</div>
                                <div style={{ fontSize: 9, color: "rgba(155,155,185,0.5)", marginBottom: 4 }}>{ext.publisher}</div>
                                <div style={{ fontSize: 9, color: "rgba(155,155,185,0.7)", lineHeight: 1.4, marginBottom: 6 }}>{ext.desc}</div>
                                <button onClick={() => setExtensions(exts => exts.map(e => e.id === ext.id ? { ...e, enabled: !e.enabled } : e))}
                                  style={{ padding: "3px 8px", fontSize: 9, background: ext.enabled ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)", border: `1px solid ${ext.enabled ? "rgba(16,185,129,0.35)" : borderColor}`, borderRadius: 4, color: ext.enabled ? "#10b981" : "rgba(155,155,185,0.6)", cursor: "pointer" }}
                                >
                                  {ext.enabled ? "✓ Enabled" : "Install"}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* SEARCH */}
                      {idePanel === "search" && (
                        <div style={{ flex: 1, padding: "10px 12px" }}>
                          <input placeholder="Search in files..." style={{ width: "100%", padding: "6px 10px", background: "rgba(255,255,255,0.04)", border: `1px solid ${borderColor}`, borderRadius: 6, color: textMain, fontSize: 11, outline: "none", boxSizing: "border-box" }} />
                          <div style={{ marginTop: 12, fontSize: 10, color: "rgba(155,155,185,0.4)" }}>Type to search across all files in this project.</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Main Editor Area */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    {/* Tab Bar */}
                    <div style={{ display: "flex", borderBottom: `1px solid ${borderColor}`, background: isDark ? "rgba(1,3,10,0.8)" : "#f0f4ff", flexShrink: 0, overflowX: "auto" }}>
                      {/* Step progress pills */}
                      {wsRoadmap.length > 0 && (
                        <div style={{ display: "flex", gap: 2, padding: "6px 8px", borderRight: `1px solid ${borderColor}`, alignItems: "center" }}>
                          {wsRoadmap.map((_, idx) => (
                            <div key={idx} style={{ width: 8, height: 8, borderRadius: "50%", background: idx < wsStep ? "#4ade80" : idx === wsStep ? "#60a5fa" : "rgba(255,255,255,0.12)" }} />
                          ))}
                        </div>
                      )}
                      {openTabs.map(tab => (
                        <div key={tab} onClick={() => setActiveFile(tab)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", fontSize: 11, cursor: "pointer", borderRight: `1px solid ${borderColor}`, background: activeFile === tab ? (isDark ? "rgba(255,255,255,0.04)" : "#ffffff") : "transparent", borderBottom: activeFile === tab ? `2px solid #60a5fa` : "2px solid transparent", flexShrink: 0 }}>
                          <span style={{ fontSize: 10 }}>{tab.endsWith(".py") ? "🐍" : tab.endsWith(".html") ? "🌐" : tab.endsWith(".css") ? "🎨" : tab.endsWith(".js") ? "🟨" : "📄"}</span>
                          <span>{tab}</span>
                          <button onClick={e => { e.stopPropagation(); setOpenTabs(t => t.filter(x => x !== tab)); if (activeFile === tab) setActiveFile(openTabs.find(x => x !== tab) || ""); }}
                            style={{ background: "none", border: "none", color: "rgba(155,155,185,0.4)", fontSize: 11, padding: 0, cursor: "pointer", lineHeight: 1 }}>✕</button>
                        </div>
                      ))}
                    </div>

                    {/* Monaco Editor */}
                    <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
                      <Editor
                        height="100%"
                        theme={isDark ? "vs-dark" : "light"}
                        language={(() => {
                          if (activeFile.endsWith(".html")) return "html";
                          if (activeFile.endsWith(".css")) return "css";
                          if (activeFile.endsWith(".js")) return "javascript";
                          if (activeFile.endsWith(".json")) return "json";
                          if (activeFile.endsWith(".md")) return "markdown";
                          if (activeFile.endsWith(".txt")) return "plaintext";
                          return getLanguage(wsProject.name);
                        })()}
                        value={fileContents[activeFile] !== undefined ? fileContents[activeFile] : wsCode}
                        onChange={v => {
                          if (fileContents[activeFile] !== undefined) {
                            setFileContents(prev => ({ ...prev, [activeFile]: v || "" }));
                          } else {
                            setWsCode(v || "");
                          }
                        }}
                        options={{ fontSize: 13, fontFamily: "'DM Mono', monospace", minimap: { enabled: true }, scrollBeyondLastLine: false, wordWrap: "on", lineNumbers: "on", renderLineHighlight: "all" }}
                      />
                      {/* Complete Step button */}
                      <button
                        onClick={() => {
                          if (wsStep < wsRoadmap.length - 1) {
                            setWsStep(p => p + 1);
                            const next = wsRoadmap[wsStep + 1];
                            setWsChat(p => [...p, { role: "ai", text: `✓ Step Complete! (+30 XP)\n\nNow, Step ${wsStep + 2}: ${next.hint}` }]);
                            giveXP(30, "Step Completed", "Workspace progress", <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />);
                          } else {
                            setWsChat(p => [...p, { role: "ai", text: "★ Congratulations! Project fully built Socratically!" }]);
                            setProjectsCompleted(p => p + 1);
                            giveXP(100, "Project Complete", "Socratic Master", <path d="M12 2l3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7z" />);
                          }
                        }}
                        style={{ position: "absolute", bottom: 12, right: 12, background: "rgba(74,222,128,0.2)", border: "1px solid #4ade80", color: "#4ade80", borderRadius: 8, padding: "6px 14px", fontSize: 10, fontFamily: "'Syne',sans-serif", fontWeight: 700, zIndex: 10, cursor: "pointer" }}
                      >
                        ✓ Complete Step
                      </button>
                    </div>

                    {/* Bottom panel: Terminal + Socratic Chat */}
                    <div style={{ height: "36%", borderTop: `1px solid ${borderColor}`, display: "flex", flexShrink: 0 }}>
                      {/* Terminal */}
                      <div style={{ flex: 1, background: "#020409", display: "flex", flexDirection: "column", borderRight: `1px solid ${borderColor}` }}>
                        <div style={{ padding: "4px 12px", borderBottom: `1px solid rgba(255,255,255,0.06)`, display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 8, fontFamily: "'DM Mono',monospace", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "1px" }}>⬛ Terminal</span>
                          <div style={{ display: "flex", gap: 3 }}>
                            {["rgba(239,68,68,0.7)", "rgba(251,191,36,0.7)", "rgba(74,222,128,0.7)"].map((c, i) => (
                              <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
                            ))}
                          </div>
                        </div>
                        <div ref={termContainerRef} style={{ flex: 1, padding: 8, overflow: "hidden" }} />
                      </div>

                      {/* Socratic Chat Panel */}
                      <div style={{ width: 260, display: "flex", flexDirection: "column", background: isDark ? "rgba(2,5,14,0.6)" : "rgba(240,244,255,0.6)" }}>
                        <div style={{ padding: "4px 10px", borderBottom: `1px solid ${borderColor}`, fontSize: 8, color: "rgba(155,155,185,0.5)", textTransform: "uppercase", letterSpacing: "1px" }}>
                          🧠 Socratic Mentor
                        </div>
                        <div style={{ flex: 1, overflowY: "auto", padding: "8px", display: "flex", flexDirection: "column", gap: 8 }}>
                          {wsRoadmapLoading ? (
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", padding: 8 }}>⏳ Generating AI roadmap via Cloud Tasks...</div>
                          ) : (
                            wsChat.map((m, idx) => (
                              <div key={idx} style={{ padding: "7px 9px", borderRadius: 8, background: m.role === "user" ? "rgba(96,165,250,0.08)" : "rgba(167,139,250,0.06)", border: `1px solid ${m.role === "user" ? "rgba(96,165,250,0.15)" : "rgba(167,139,250,0.12)"}`, fontSize: 10, lineHeight: 1.5 }}>
                                <div style={{ fontWeight: 700, fontSize: 8, textTransform: "uppercase", color: m.role === "user" ? "#60a5fa" : "#a78bfa", marginBottom: 3 }}>{m.role === "user" ? "You" : userProfile?.assistantName || "Mentor"}</div>
                                <MessageContent text={m.text} theme={theme} />
                              </div>
                            ))
                          )}
                        </div>
                        <div style={{ padding: "8px", borderTop: `1px solid ${borderColor}`, display: "flex", gap: 5 }}>
                          <input
                            value={wsInput}
                            onChange={e => setWsInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && askWorkspaceAI()}
                            placeholder="Ask hint..."
                            style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: `1px solid ${borderColor}`, borderRadius: 6, padding: "5px 8px", color: textMain, fontSize: 10, outline: "none" }}
                          />
                          <button onClick={() => askWorkspaceAI()} style={{ background: "rgba(96,165,250,0.15)", border: "1px solid rgba(96,165,250,0.35)", borderRadius: 6, color: "#60a5fa", width: 26, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, cursor: "pointer" }}>→</button>
                        </div>
                        {/* OCR Upload */}
                        <div style={{ padding: "6px 8px", borderTop: `1px solid ${borderColor}` }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", border: "1px dashed rgba(96,165,250,0.25)", borderRadius: 6, cursor: "pointer", fontSize: 9, color: "#60a5fa" }}>
                            📷 {ocrUploading ? "Extracting..." : "Upload Notes (OCR)"}
                            <input type="file" accept="image/*" onChange={handleOcrUpload} style={{ display: "none" }} />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}


          {/* ── VIEW: ACHIEVEMENTS ── */}
          {view === "achievements" && (
            <div style={{ flex: 1, padding: 28, overflowY: "auto" }}>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                {ACHIEVEMENTS.map(a => {
                  const hasEarned = earned.includes(a.id);
                  return (
                    <div key={a.id} style={{ background: isDark ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.7)", border: `1px solid ${hasEarned ? "rgba(251,191,36,0.3)" : borderColor}`, borderRadius: 12, padding: 18, opacity: hasEarned ? 1 : 0.45 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: hasEarned ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.05)", border: `1.5px solid ${hasEarned ? "#fbbf24" : "rgba(255,255,255,0.1)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill={hasEarned ? "#fbbf24" : "rgba(255,255,255,0.2)"}>{a.icon}</svg>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>{a.label}</div>
                          <div style={{ fontSize: 7, color: "rgba(155,155,185,0.6)", fontFamily: "'DM Mono',monospace" }}>+{a.xp} XP</div>
                        </div>
                      </div>
                      <p style={{ fontSize: 10, color: "rgba(155,155,185,0.8)", lineHeight: 1.4 }}>{a.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── VIEW: PROFILE ── */}
          {view === "profile" && (
            <div style={{ flex: 1, padding: 28, overflowY: "auto" }}>
              {profileSaveSuccess && (
                <div style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.35)", color: "#10b981", padding: 12, borderRadius: 8, fontSize: 11, fontWeight: 700, marginBottom: 20, fontFamily: "'DM Mono',monospace" }}>
                  ✓ Profile settings saved successfully!
                </div>
              )}
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 24 }}>
                {/* Left Card: Overview & Stats */}
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ background: isDark ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.7)", border: `1px solid ${borderColor}`, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", textCenter: "center" }}>
                    {userProfile?.photo ? (
                      <img src={userProfile.photo} alt="" style={{ width: 80, height: 80, borderRadius: "50%", border: "2px solid rgba(96,165,250,0.5)", marginBottom: 16 }} />
                    ) : (
                      <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, #2563eb, #60a5fa)", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, fontFamily: "'Syne',sans-serif", border: "2px solid rgba(96,165,250,0.3)", marginBottom: 16 }}>
                        {userProfile?.name ? userProfile.name[0].toUpperCase() : "U"}
                      </div>
                    )}
                    
                    <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, margin: "0 0 4px 0" }}>{userProfile?.name || "Developer"}</h2>
                    <p style={{ fontSize: 11, color: "rgba(155,155,185,0.6)", margin: "0 0 16px 0", fontFamily: "'DM Mono',monospace" }}>{userProfile?.email || "anonymous@neuromentor.ai"}</p>
                    
                    <div style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.25)", borderRadius: 8, padding: "6px 12px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#60a5fa" }}>
                      {userProfile?.profession || "Learner"}
                    </div>
                  </div>

                  {/* Independence Score Card */}
                  <div style={{ background: isDark ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.7)", border: `1px solid ${borderColor}`, borderRadius: 16, padding: 20 }}>
                    <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 800, margin: "0 0 6px 0" }}>Independence Score</h3>
                    <p style={{ fontSize: 9, color: "rgba(155,155,185,0.7)", lineHeight: 1.4, margin: "0 0 16px 0" }}>
                      NeuroMentor is designed to make itself unnecessary. Your independence rate increases when you answer Socratic prompts correctly without copy-pasting code directly.
                    </p>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      {/* Gauge */}
                      <div style={{ position: "relative", width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,0.03)", border: `4px solid ${borderColor}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 13, fontWeight: 800, fontFamily: "'DM Mono',monospace", color: "#60a5fa" }}>55%</span>
                        {/* Custom outer glow ring representation */}
                        <div style={{ position: "absolute", top: -4, left: -4, right: -4, bottom: -4, border: "4px solid #60a5fa", borderRadius: "50%", clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)", opacity: 0.15 }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700 }}>Level 2 Autonomy</div>
                        <div style={{ fontSize: 8, color: "rgba(155,155,185,0.6)", marginTop: 2 }}>Target: 100% self-reliance</div>
                      </div>
                    </div>
                  </div>

                  {/* Platform Stats */}
                  <div style={{ background: isDark ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.7)", border: `1px solid ${borderColor}`, borderRadius: 16, padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ padding: 12, background: "rgba(255,255,255,0.02)", border: `1px solid ${borderColor}`, borderRadius: 10 }}>
                      <div style={{ fontSize: 9, color: "rgba(155,155,185,0.5)", textTransform: "uppercase" }}>Total XP</div>
                      <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "'DM Mono',monospace", marginTop: 4 }}>{xp} XP</div>
                    </div>
                    <div style={{ padding: 12, background: "rgba(255,255,255,0.02)", border: `1px solid ${borderColor}`, borderRadius: 10 }}>
                      <div style={{ fontSize: 9, color: "rgba(155,155,185,0.5)", textTransform: "uppercase" }}>Learning Streak</div>
                      <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "'DM Mono',monospace", marginTop: 4 }}>{streak} Days</div>
                    </div>
                  </div>
                </div>

                {/* Right Form: Customized Learning DNA */}
                <div style={{ background: isDark ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.7)", border: `1px solid ${borderColor}`, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
                  <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, borderBottom: `1px solid ${borderColor}`, paddingBottom: 10, margin: 0 }}>Configure Socratic DNA</h3>
                  
                  {/* Display Name Edit */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(155,155,185,0.8)" }}>DISPLAY NAME ✏️</label>
                    <input
                      type="text"
                      value={nameEdit}
                      onChange={(e) => setNameEdit(e.target.value)}
                      placeholder="Your name..."
                      style={{ padding: 10, borderRadius: 8, background: isDark ? "rgba(255,255,255,0.03)" : "#ffffff", border: `1px solid ${borderColor}`, color: textMain, outline: "none", fontSize: 11 }}
                    />
                  </div>

                  {/* AI Assistant Name */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(155,155,185,0.8)" }}>🤖 NAME YOUR AI MENTOR</label>
                    <input
                      type="text"
                      value={assistantNameEdit}
                      onChange={(e) => setAssistantNameEdit(e.target.value)}
                      placeholder="e.g. Socrates, Athena, Nova..."
                      style={{ padding: 10, borderRadius: 8, background: isDark ? "rgba(96,165,250,0.05)" : "#f0f7ff", border: "1px solid rgba(96,165,250,0.3)", color: textMain, outline: "none", fontSize: 11 }}
                    />
                    <span style={{ fontSize: 9, color: "rgba(155,155,185,0.5)" }}>This name appears in the chat for every AI response.</span>
                  </div>

                  {/* Profession */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(155,155,185,0.8)" }}>PRIMARY PROFESSION</label>
                    <select
                      value={profEdit}
                      onChange={(e) => setProfEdit(e.target.value)}
                      style={{ padding: 10, borderRadius: 8, background: isDark ? "rgba(255,255,255,0.03)" : "#ffffff", border: `1px solid ${borderColor}`, color: textMain, outline: "none", fontSize: 11 }}
                    >
                      <option value="student">Student</option>
                      <option value="developer">Professional Developer</option>
                      <option value="designer">Designer / Creator</option>
                      <option value="researcher">Researcher</option>
                      <option value="academic">Academic / Professor</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Focus fields */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(155,155,185,0.8)" }}>PRIMARY TECH STACK</label>
                      <input
                        type="text"
                        value={field1Edit}
                        onChange={(e) => setField1Edit(e.target.value)}
                        style={{ padding: 10, borderRadius: 8, background: isDark ? "rgba(255,255,255,0.03)" : "#ffffff", border: `1px solid ${borderColor}`, color: textMain, outline: "none", fontSize: 11 }}
                      />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(155,155,185,0.8)" }}>SECONDARY TOPIC</label>
                      <input
                        type="text"
                        value={field2Edit}
                        onChange={(e) => setField2Edit(e.target.value)}
                        style={{ padding: 10, borderRadius: 8, background: isDark ? "rgba(255,255,255,0.03)" : "#ffffff", border: `1px solid ${borderColor}`, color: textMain, outline: "none", fontSize: 11 }}
                      />
                    </div>
                  </div>

                  {/* Socratic Mode */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(155,155,185,0.8)" }}>SOCRATIC MENTOR DIFFICULTY</label>
                    <select
                      value={socraticLevelEdit}
                      onChange={(e) => setSocraticLevelEdit(e.target.value)}
                      style={{ padding: 10, borderRadius: 8, background: isDark ? "rgba(255,255,255,0.03)" : "#ffffff", border: `1px solid ${borderColor}`, color: textMain, outline: "none", fontSize: 11 }}
                    >
                      <option value="strict">Strict Socratic (Never gives direct answers)</option>
                      <option value="socratic">Standard Socratic (Guides first, gives hints on 3rd attempt)</option>
                      <option value="guided">Guided (Gives answers but asks explanation prompts)</option>
                      <option value="help">Direct Assist (Direct code generation & explanations)</option>
                    </select>
                  </div>

                  {/* Custom learning goal */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(155,155,185,0.8)" }}>CUSTOM LEARNING DNA & GOALS</label>
                    <textarea
                      value={goalEdit}
                      onChange={(e) => setGoalEdit(e.target.value)}
                      placeholder="E.g., I learn best by reading diagrams. I want to build a deep understanding of databases, and I'm currently working on my final year college project."
                      style={{ padding: 10, borderRadius: 8, background: isDark ? "rgba(255,255,255,0.03)" : "#ffffff", border: `1px solid ${borderColor}`, color: textMain, outline: "none", fontSize: 11, minHeight: 70, resize: "none" }}
                    />
                  </div>

                  {/* Parent signed status */}
                  {userProfile?.parentSigned && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, padding: 10, fontSize: 10, color: "#60a5fa" }}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                      Parent/Guardian verification consent active.
                    </div>
                  )}

                  <button
                    onClick={async () => {
                      const updated = {
                        ...userProfile,
                        name: nameEdit,
                        assistantName: assistantNameEdit,
                        profession: profEdit,
                        profField1: field1Edit,
                        profField2: field2Edit,
                        goal: goalEdit,
                        socraticLevel: socraticLevelEdit
                      };
                      localStorage.setItem("nm_profile", JSON.stringify(updated));
                      setUserProfile(updated);
                      // Sync to backend DB
                      try {
                        await fetch("http://127.0.0.1:8000/api/profile", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(updated)
                        });
                      } catch (e) { console.warn("Profile sync failed:", e); }
                      setProfileSaveSuccess(true);
                      setTimeout(() => setProfileSaveSuccess(false), 3000);
                    }}
                    style={{
                      marginTop: 10,
                      padding: "12px 24px",
                      background: "linear-gradient(135deg, #2563eb, #3b82f6)",
                      border: "none",
                      borderRadius: 8,
                      color: "#ffffff",
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "'Syne',sans-serif",
                      cursor: "pointer",
                      textAlign: "center"
                    }}
                  >
                    Save DNA Configuration
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── VIEW: SETTINGS (Extension Zipped Download and FCM Toggles) ── */}
          {view === "settings" && (
            <div style={{ flex: 1, padding: 28, overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
              {/* extension */}
              <div style={{ background: isDark ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.7)", border: `1px solid ${borderColor}`, borderRadius: 12, padding: 20 }}>
                <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, marginBottom: 6 }}>Download browser extension</h2>
                <p style={{ fontSize: 10, color: "rgba(155,155,185,0.7)", lineHeight: 1.6, marginBottom: 14 }}>
                  Integrate Socratic suggestions directly on code sites (GitHub, StackOverflow). Slide open the full platform side panel using the floating orb.
                </p>
                <a 
                  href="/neuromentor-extension.zip" 
                  download="neuromentor-extension.zip"
                  style={{
                    display: "inline-block",
                    padding: "8px 16px",
                    background: "rgba(96,165,250,0.15)",
                    border: "1px solid rgba(96,165,250,0.35)",
                    borderRadius: "8px",
                    color: "#60a5fa",
                    fontSize: "11px",
                    fontWeight: 700,
                    textDecoration: "none",
                    fontFamily: "'Syne',sans-serif"
                  }}
                >
                  Download Chrome Extension .zip
                </a>
              </div>

              {/* FCM toggles */}
              <div style={{ background: isDark ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.7)", border: `1px solid ${borderColor}`, borderRadius: 12, padding: 20 }}>
                <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, marginBottom: 6 }}>FCM Push Notifications</h2>
                <p style={{ fontSize: 10, color: "rgba(155,155,185,0.7)", lineHeight: 1.6, marginBottom: 14 }}>
                  Enable real-time reminders and badge achievement notifications.
                </p>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input type="checkbox" defaultChecked id="streakRemind" style={{ width: 14, height: 14 }} />
                  <label htmlFor="streakRemind" style={{ fontSize: 11 }}>Streak reminders (nightly at 7 PM)</label>
                </div>
              </div>

              {/* Logout */}
              <button 
                onClick={handleLogout}
                style={{ 
                  alignSelf: "flex-start", 
                  padding: "8px 16px", 
                  background: "rgba(239,68,68,0.15)", 
                  border: "1px solid rgba(239,68,68,0.35)", 
                  borderRadius: "8px", 
                  color: "#ef4444", 
                  fontSize: "11px", 
                  fontWeight: 700, 
                  fontFamily: "'Syne',sans-serif",
                  cursor: "pointer"
                }}
              >
                Log Out Profile
              </button>
            </div>
          )}

        </div>
      </div>

      {/* PWA Install Banner */}
      {showPwaBanner && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(6,14,32,0.96)",
            border: "1px solid rgba(96,165,250,0.3)",
            padding: "10px 16px",
            borderRadius: "8px",
            color: "#fff",
            zIndex: 9999,
          }}
        >
          <span style={{ fontSize: 12 }}>
            Install NeuroMentor to learn offline.
          </span>
          <button
            onClick={triggerPwaInstall}
            style={{
              padding: "6px 12px",
              background: "#60a5fa",
              border: "none",
              borderRadius: 8,
              color: "#020409",
              fontSize: 11,
              fontWeight: 700,
              marginLeft: 8,
            }}
          >
            Install
          </button>
          <button
            onClick={() => setShowPwaBanner(false)}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.4)",
              fontSize: 12,
              marginLeft: 8,
            }}
          >
            Not now
          </button>
        </div>
      )}
    </>
  );
}
