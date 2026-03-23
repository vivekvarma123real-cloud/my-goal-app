"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { loadIntrospection, saveIntrospection } from "@/lib/introspectionDb";

// ── Types ──────────────────────────────────────────────────────────────────
type Block = {
  id: string;
  type: "purpose" | "visualization" | "rules" | "datadrop" | "manifestation" | "custom";
  title: string;
  content: string;
  collapsed: boolean;
  color: string;
};

const STORAGE_KEY = "lifestack-introspection-v1";
const uid = () => Math.random().toString(36).slice(2, 9);

const BLOCK_COLORS: Record<string, string> = {
  purpose:       "#FF6A00",
  visualization: "#C36BFF",
  rules:         "#4A90FF",
  datadrop:      "#28D7FF",
  manifestation: "#4ade80",
  custom:        "#ff9a3c",
};

const BLOCK_ICONS: Record<string, string> = {
  purpose:       "🎯",
  visualization: "👁️",
  rules:         "⚡",
  datadrop:      "📊",
  manifestation: "🔥",
  custom:        "📝",
};

const BLOCK_HINTS: Record<string, string> = {
  purpose:       "Why are you doing all of this? Who are you doing it for?",
  visualization: "What does your ideal life look like? What do you want to have, be, feel?",
  rules:         "Rules that must be drummed into your head. Non-negotiables.",
  datadrop:      "What do you know about yourself? Patterns, weaknesses, triggers.",
  manifestation: "Write it as if it already happened. Feel it. Own it.",
  custom:        "Your thoughts...",
};

const DEFAULT_BLOCKS: Block[] = [
  { id:"b1", type:"purpose",       title:"My Purpose",      content:"", collapsed:false, color:"#FF6A00" },
  { id:"b2", type:"visualization", title:"Visualization",   content:"", collapsed:false, color:"#C36BFF" },
  { id:"b3", type:"rules",         title:"Read Every Day",  content:"", collapsed:false, color:"#4A90FF" },
  { id:"b4", type:"datadrop",      title:"Data Drop",       content:"", collapsed:false, color:"#28D7FF" },
  { id:"b5", type:"manifestation", title:"Manifestation",   content:"", collapsed:false, color:"#4ade80" },
];

// ── Read Mode ─────────────────────────────────────────────────────────────
function ReadMode({ blocks, onEdit }: { blocks: Block[]; onEdit: () => void }) {
  const [current, setCurrent] = useState(0);
  const filled = blocks.filter(b => b.content.trim());

  if (!filled.length) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh", gap:16, textAlign:"center" }}>
      <div style={{ fontSize:"3rem" }}>📖</div>
      <h2 style={{ fontFamily:"'Poppins',sans-serif", fontWeight:800, fontSize:"1.3rem", color:"#fff", margin:0 }}>Nothing written yet</h2>
      <p style={{ fontFamily:"'Poppins',sans-serif", fontSize:"0.85rem", color:"rgba(255,255,255,0.4)" }}>Start writing your introspection to read it here every day</p>
      <button onClick={onEdit} style={{ background:"linear-gradient(135deg,#FF6A00,#C36BFF)", border:"none", borderRadius:10, color:"#fff", padding:"12px 28px", cursor:"pointer", fontFamily:"'Poppins',sans-serif", fontSize:"0.88rem", fontWeight:700 }}>Start Writing →</button>
    </div>
  );

  const block = filled[current];
  const color = block.color;
  const progress = ((current + 1) / filled.length) * 100;

  return (
    <div style={{ maxWidth:680, margin:"0 auto", padding:"0 0 80px" }}>
      <style>{`
        @keyframes fadeSlide{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
      `}</style>

      {/* Progress */}
      <div style={{ height:2, background:"rgba(255,255,255,0.06)", borderRadius:2, marginBottom:40, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${progress}%`, background:`linear-gradient(90deg,${color},${color}88)`, transition:"width 0.4s ease", boxShadow:`0 0 8px ${color}60` }}/>
      </div>

      {/* Card */}
      <div key={block.id} style={{ animation:"fadeSlide 0.5s ease both", textAlign:"center" }}>
        {/* Icon */}
        <div style={{ fontSize:"3.5rem", marginBottom:20, animation:"float 4s ease infinite", filter:`drop-shadow(0 0 20px ${color}60)` }}>
          {BLOCK_ICONS[block.type]}
        </div>

        {/* Title */}
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:`${color}15`, border:`1px solid ${color}40`, borderRadius:100, padding:"5px 18px", marginBottom:20 }}>
          <span style={{ fontFamily:"'Poppins',sans-serif", fontSize:"0.65rem", fontWeight:800, color:color, letterSpacing:"0.15em", textTransform:"uppercase" }}>{block.title}</span>
        </div>

        {/* Content */}
        <div style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${color}25`, borderLeft:`3px solid ${color}`, borderRadius:"0 14px 14px 0", padding:"24px 28px", textAlign:"left", marginBottom:32 }}>
          <p style={{ fontFamily:"'Poppins',sans-serif", fontSize:"1rem", color:"rgba(255,255,255,0.85)", lineHeight:1.9, margin:0, whiteSpace:"pre-wrap" }}>{block.content}</p>
        </div>

        {/* Counter */}
        <div style={{ fontFamily:"'Poppins',sans-serif", fontSize:"0.65rem", color:"rgba(255,255,255,0.2)", letterSpacing:"0.12em", marginBottom:32 }}>
          {current + 1} / {filled.length}
        </div>
      </div>

      {/* Nav */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"rgba(7,7,15,0.97)", backdropFilter:"blur(20px)", borderTop:"1px solid rgba(255,255,255,0.06)", padding:"16px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", zIndex:50 }}>
        <button onClick={()=>setCurrent(c=>Math.max(0,c-1))} disabled={current===0} style={{ background:current===0?"transparent":`${color}18`, border:`1px solid ${current===0?"rgba(255,255,255,0.06)":color+"50"}`, borderRadius:12, color:current===0?"rgba(255,255,255,0.15)":color, padding:"10px 24px", cursor:current===0?"default":"pointer", fontFamily:"'Poppins',sans-serif", fontSize:"0.82rem", fontWeight:700, transition:"all 0.2s" }}>← Prev</button>

        <div style={{ display:"flex", gap:6 }}>
          {filled.map((_,i)=>(
            <div key={i} onClick={()=>setCurrent(i)} style={{ width:i===current?22:7, height:7, borderRadius:4, background:i===current?color:i<current?`${color}50`:"rgba(255,255,255,0.1)", cursor:"pointer", transition:"all 0.3s" }}/>
          ))}
        </div>

        {current < filled.length - 1
          ? <button onClick={()=>setCurrent(c=>c+1)} style={{ background:`${color}18`, border:`1px solid ${color}50`, borderRadius:12, color:color, padding:"10px 24px", cursor:"pointer", fontFamily:"'Poppins',sans-serif", fontSize:"0.82rem", fontWeight:700, transition:"all 0.2s" }}>Next →</button>
          : <button onClick={onEdit} style={{ background:`linear-gradient(135deg,#FF6A00,#C36BFF)`, border:"none", borderRadius:12, color:"#fff", padding:"10px 24px", cursor:"pointer", fontFamily:"'Poppins',sans-serif", fontSize:"0.82rem", fontWeight:700 }}>Edit ✏️</button>
        }
      </div>
    </div>
  );
}

// ── Edit Mode ─────────────────────────────────────────────────────────────
function EditMode({ blocks, setBlocks, onRead, saving }: { blocks: Block[]; setBlocks: (b: Block[]) => void; onRead: () => void; saving: boolean }) {
  const [addingType, setAddingType] = useState(false);

  const update = (id: string, content: string) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, content } : b));
  };
  const updateTitle = (id: string, title: string) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, title } : b));
  };
  const toggleCollapse = (id: string) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, collapsed: !b.collapsed } : b));
  };
  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
  };
  const addBlock = (type: Block["type"]) => {
    const newBlock: Block = {
      id: uid(), type, collapsed: false,
      title: type === "custom" ? "New Section" : BLOCK_ICONS[type] + " " + type.charAt(0).toUpperCase() + type.slice(1),
      content: "", color: BLOCK_COLORS[type],
    };
    setBlocks([...blocks, newBlock]);
    setAddingType(false);
  };

  const BLOCK_TYPES: { type: Block["type"]; label: string }[] = [
    { type:"purpose", label:"Purpose" },
    { type:"visualization", label:"Visualization" },
    { type:"rules", label:"Rules" },
    { type:"datadrop", label:"Data Drop" },
    { type:"manifestation", label:"Manifestation" },
    { type:"custom", label:"Custom" },
  ];

  return (
    <div style={{ maxWidth:720, margin:"0 auto", padding:"0 0 120px" }}>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {blocks.map((block, i) => {
          const color = block.color;
          return (
            <div key={block.id} style={{ background:"rgba(255,255,255,0.025)", border:`1px solid ${block.collapsed?"rgba(255,255,255,0.07)":color+"30"}`, borderLeft:`3px solid ${color}`, borderRadius:"0 12px 12px 0", overflow:"hidden", transition:"all 0.25s" }}>
              {/* Block header */}
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", cursor:"pointer" }} onClick={()=>toggleCollapse(block.id)}>
                <span style={{ fontSize:"1.2rem", flexShrink:0 }}>{BLOCK_ICONS[block.type]}</span>
                <input
                  value={block.title}
                  onChange={e=>{ e.stopPropagation(); updateTitle(block.id, e.target.value); }}
                  onClick={e=>e.stopPropagation()}
                  style={{ flex:1, background:"none", border:"none", outline:"none", fontFamily:"'Poppins',sans-serif", fontWeight:700, fontSize:"0.92rem", color:"#fff", cursor:"text" }}
                />
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  {block.content && <span style={{ fontFamily:"'Poppins',sans-serif", fontSize:"0.6rem", color:`${color}80`, fontWeight:600 }}>{block.content.length} chars</span>}
                  <span style={{ color:"rgba(255,255,255,0.3)", fontSize:"0.65rem", transform:block.collapsed?"rotate(-90deg)":"rotate(0)", transition:"transform 0.25s" }}>▼</span>
                  <button onClick={e=>{e.stopPropagation();if(window.confirm("Delete this section?"))deleteBlock(block.id);}} style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,100,100,0.4)", fontSize:"0.75rem", padding:"2px 4px", transition:"color 0.15s" }}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color="#f87171"}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color="rgba(255,100,100,0.4)"}
                  >✕</button>
                </div>
              </div>

              {/* Textarea */}
              {!block.collapsed && (
                <div style={{ padding:"0 16px 16px" }}>
                  <p style={{ fontFamily:"'Poppins',sans-serif", fontSize:"0.68rem", color:`${color}70`, marginBottom:8, fontStyle:"italic" }}>{BLOCK_HINTS[block.type]}</p>
                  <textarea
                    value={block.content}
                    onChange={e=>update(block.id, e.target.value)}
                    placeholder={BLOCK_HINTS[block.type]}
                    rows={6}
                    style={{ width:"100%", background:"rgba(255,255,255,0.04)", border:`1px solid ${color}25`, borderRadius:10, color:"rgba(255,255,255,0.85)", padding:"12px 14px", fontFamily:"'Poppins',sans-serif", fontSize:"0.88rem", lineHeight:1.85, outline:"none", resize:"vertical", boxSizing:"border-box", transition:"border-color 0.2s" }}
                    onFocus={e=>(e.currentTarget as HTMLElement).style.borderColor=color+"60"}
                    onBlur={e=>(e.currentTarget as HTMLElement).style.borderColor=color+"25"}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Add section */}
        {addingType ? (
          <div style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, padding:"16px" }}>
            <div style={{ fontFamily:"'Poppins',sans-serif", fontSize:"0.72rem", color:"rgba(255,255,255,0.4)", marginBottom:12 }}>Choose section type:</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {BLOCK_TYPES.map(t=>(
                <button key={t.type} onClick={()=>addBlock(t.type)} style={{ display:"flex", alignItems:"center", gap:6, background:`${BLOCK_COLORS[t.type]}12`, border:`1px solid ${BLOCK_COLORS[t.type]}40`, borderRadius:8, padding:"8px 14px", cursor:"pointer", fontFamily:"'Poppins',sans-serif", fontSize:"0.75rem", fontWeight:700, color:BLOCK_COLORS[t.type], transition:"all 0.2s" }}>
                  {BLOCK_ICONS[t.type]} {t.label}
                </button>
              ))}
              <button onClick={()=>setAddingType(false)} style={{ background:"none", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"8px 14px", cursor:"pointer", fontFamily:"'Poppins',sans-serif", fontSize:"0.75rem", color:"rgba(255,255,255,0.3)" }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={()=>setAddingType(true)} style={{ background:"rgba(255,255,255,0.025)", border:"1px dashed rgba(255,255,255,0.12)", borderRadius:12, padding:"14px", cursor:"pointer", fontFamily:"'Poppins',sans-serif", fontSize:"0.82rem", fontWeight:600, color:"rgba(255,255,255,0.3)", transition:"all 0.2s", width:"100%" }}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor="rgba(255,106,0,0.4)";(e.currentTarget as HTMLElement).style.color="#FF6A00";}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.12)";(e.currentTarget as HTMLElement).style.color="rgba(255,255,255,0.3)";}}
          >+ Add Section</button>
        )}
      </div>

      {/* Bottom bar */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"rgba(7,7,15,0.97)", backdropFilter:"blur(20px)", borderTop:"1px solid rgba(255,255,255,0.06)", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", zIndex:50 }}>
        <span style={{ fontFamily:"'Poppins',sans-serif", fontSize:"0.7rem", color:saving?"#FF6A00":"#4ade80", fontStyle:"italic", transition:"color 0.3s" }}>
                {saving ? "⏳ Saving..." : "✓ Saved to cloud"} · {blocks.filter(b=>b.content).length}/{blocks.length} sections filled
              </span>
        <button onClick={onRead} style={{ background:"linear-gradient(135deg,#FF6A00,#C36BFF)", border:"none", borderRadius:10, color:"#fff", padding:"10px 24px", cursor:"pointer", fontFamily:"'Poppins',sans-serif", fontSize:"0.82rem", fontWeight:700, transition:"opacity 0.2s" }}>
          Read Mode →
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function IntrospectionPage() {
  const [blocks, setBlocksRaw] = useState<Block[]>(DEFAULT_BLOCKS);
  const [userId, setUserId] = useState<string|null>(null);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<any>(null);
  const [mode, setMode] = useState<"read" | "edit">("read");
  const [loaded, setLoaded] = useState(false);

  // Load from Supabase first — source of truth
  useEffect(() => {
    // Clear old shared localStorage immediately
    try { localStorage.removeItem(STORAGE_KEY); } catch(e) {}
    // Start empty until we know who is logged in
    setBlocksRaw(DEFAULT_BLOCKS);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = "/login"; return; }
      const uid = session.user.id;
      setUserId(uid);

      const userKey = STORAGE_KEY + "-" + uid;

      // Always load from Supabase first
      loadIntrospection(uid).then(dbBlocks => {
        if (dbBlocks && dbBlocks.length > 0) {
          setBlocksRaw(dbBlocks);
          try { localStorage.setItem(userKey, JSON.stringify(dbBlocks)); } catch(e) {}
        } else {
          // Check user-specific local cache
          try {
            const raw = localStorage.getItem(userKey);
            if (raw) {
              const local = JSON.parse(raw);
              setBlocksRaw(local);
              saveIntrospection(uid, local);
            }
            // else: new user, keep DEFAULT_BLOCKS
          } catch(e) {}
        }
        setLoaded(true);
      });
    });
  }, []);

  // Auto-save: localStorage instantly + Supabase debounced 2s
  const setBlocks = useCallback((b: Block[]) => {
    setBlocksRaw(b);
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id;
      if (uid) {
        const userKey = STORAGE_KEY + "-" + uid;
        try { localStorage.setItem(userKey, JSON.stringify(b)); } catch(e) {}
      }
    });
    // Debounce Supabase save — don't save on every keystroke
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) saveIntrospection(session.user.id, b).then(() => setSaving(false));
        else setSaving(false);
      });
    }, 2000);
  }, []);

  if (!loaded) return null;

  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const today = new Date().toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long" });

  return (
    <div style={{ minHeight:"100vh", background:"#07070f", fontFamily:"'Poppins',sans-serif" }}>
      <style>{`
        * { scrollbar-width:thin; scrollbar-color:#FF6A00 #111; }
        *::-webkit-scrollbar { width:3px } *::-webkit-scrollbar-thumb { background:#FF6A00; border-radius:2px }
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Header */}
      <header style={{ position:"sticky", top:0, zIndex:100, background:"rgba(7,7,15,0.97)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(255,255,255,0.06)", padding:"12px 20px" }}>
        <div style={{ maxWidth:720, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <button onClick={()=>window.location.href="/choose"} style={{ background:"none", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"rgba(255,255,255,0.4)", padding:"5px 12px", cursor:"pointer", fontFamily:"'Poppins',sans-serif", fontSize:"0.7rem", fontWeight:600, transition:"all 0.2s" }}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color="#FF6A00";(e.currentTarget as HTMLElement).style.borderColor="rgba(255,106,0,0.4)";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color="rgba(255,255,255,0.4)";(e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.1)";}}
            >← Back</button>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:"1rem" }}>🔍</span>
                <span style={{ fontFamily:"'Poppins',sans-serif", fontWeight:900, fontSize:"1rem", color:"#fff", letterSpacing:"0.04em" }}>DAILY INTROSPECTION</span>
              </div>
              <p style={{ fontFamily:"'Poppins',sans-serif", fontSize:"0.52rem", color:"rgba(255,255,255,0.25)", margin:0, letterSpacing:"0.12em", textTransform:"uppercase" }}>Daily Mirror · Know Thyself</p>
            </div>
          </div>

          {/* Mode toggle */}
          <div style={{ display:"flex", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, overflow:"hidden" }}>
            {(["read","edit"] as const).map(m=>(
              <button key={m} onClick={()=>setMode(m)} style={{ padding:"7px 18px", border:"none", cursor:"pointer", fontFamily:"'Poppins',sans-serif", fontSize:"0.72rem", fontWeight:700, transition:"all 0.2s", background:mode===m?"linear-gradient(135deg,#FF6A00,#C36BFF)":"transparent", color:mode===m?"#fff":"rgba(255,255,255,0.35)", textTransform:"capitalize" }}>{m === "read" ? "📖 Read" : "✏️ Edit"}</button>
            ))}
          </div>
        </div>
      </header>

      {/* Date greeting */}
      <div style={{ maxWidth:720, margin:"0 auto", padding:"28px 20px 16px" }}>
        <div style={{ animation:"fadeUp 0.5s ease both" }}>
          <p style={{ fontFamily:"'Poppins',sans-serif", fontSize:"0.72rem", color:"rgba(255,255,255,0.25)", margin:"0 0 4px", letterSpacing:"0.08em" }}>{today}</p>
          <h1 style={{ fontFamily:"'Poppins',sans-serif", fontWeight:900, fontSize:"clamp(1.4rem,4vw,1.9rem)", color:"#fff", margin:"0 0 24px", lineHeight:1.1 }}>
            {greet()}, <span style={{ background:"linear-gradient(90deg,#FF6A00,#C36BFF)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>warrior.</span>
          </h1>
        </div>

        {mode === "read"
          ? <ReadMode blocks={blocks} onEdit={()=>setMode("edit")}/>
          : <EditMode blocks={blocks} setBlocks={setBlocks} onRead={()=>setMode("read")} saving={saving}/>
        }
      </div>
    </div>
  );
}