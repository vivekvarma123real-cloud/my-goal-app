"use client";

import { useEffect, useState } from "react";
import { fetchFeedback, type Feedback } from "@/lib/feedbackDb";

const FEATURES = ["All","General","Goal Planner","Habit Tracker","Battle Manual","UI/Design","Performance"];

export default function AdminPage() {
  const [list, setList]       = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("All");
  const [sort, setSort]       = useState<"newest"|"rating">("newest");
  const [authed, setAuthed]   = useState(false);
  const [pass, setPass]       = useState("");
  const [passErr, setPassErr] = useState(false);

  // Simple password gate — change this to your own password
  const ADMIN_PASS = "lifestack2026";

  const tryLogin = async () => {
    if (pass.trim() === ADMIN_PASS) {
      setPassErr(false);
      setLoading(true);
      const data = await fetchFeedback();
      setList(data);
      setLoading(false);
      setAuthed(true); // set last so render switches after data is ready
    } else {
      setPassErr(true);
      setTimeout(() => setPassErr(false), 2000);
    }
  };

  // refresh only
  // data is fetched directly in tryLogin

  const refresh = () => { 
    setLoading(true); 
    fetchFeedback().then(data => { 
      setList(data); 
      setLoading(false); 
    }).catch(() => setLoading(false)); 
  };

  const filtered = list
    .filter(f => filter === "All" || f.feature === filter)
    .sort((a,b) => sort === "newest"
      ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      : b.rating - a.rating
    );

  const avgRating = list.length ? (list.reduce((s,f) => s + f.rating, 0) / list.length).toFixed(1) : "—";
  const ratingCounts = [5,4,3,2,1].map(r => ({ r, count: list.filter(f => f.rating === r).length }));
  const featureCounts = FEATURES.slice(1).map(f => ({ f, count: list.filter(x => x.feature === f).length }));

  if (!authed) return (
    <div style={{ minHeight:"100vh", background:"#07070f", fontFamily:"'Poppins',sans-serif", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, padding:"40px 36px", width:"min(380px,90vw)", textAlign:"center" }}>
        <div style={{ fontSize:"2rem", marginBottom:16 }}>🔐</div>
        <h2 style={{ fontFamily:"'Poppins',sans-serif", fontWeight:900, fontSize:"1.2rem", color:"#fff", margin:"0 0 6px" }}>Admin Access</h2>
        <p style={{ fontFamily:"'Poppins',sans-serif", fontSize:"0.78rem", color:"rgba(255,255,255,0.3)", margin:"0 0 28px" }}>Enter password to continue</p>
        <input
          type="password" value={pass}
          onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === "Enter" && tryLogin()}
          placeholder="Password"
          autoFocus
          style={{ width:"100%", background:"rgba(255,255,255,0.05)", border:`1px solid ${passErr?"rgba(248,113,113,0.6)":"rgba(255,255,255,0.1)"}`, borderRadius:10, color:"#fff", padding:"12px 16px", fontFamily:"'Poppins',sans-serif", fontSize:"0.88rem", outline:"none", boxSizing:"border-box", marginBottom:12, transition:"border-color 0.2s" }}
        />
        {passErr && <p style={{ fontFamily:"'Poppins',sans-serif", fontSize:"0.72rem", color:"#f87171", margin:"0 0 12px" }}>Wrong password</p>}
        <button onClick={tryLogin} style={{ width:"100%", background:"linear-gradient(135deg,#FF6A00,#C36BFF)", border:"none", borderRadius:10, color:"#fff", padding:"12px 0", cursor:"pointer", fontFamily:"'Poppins',sans-serif", fontSize:"0.88rem", fontWeight:700 }}>
          Enter →
        </button>
        <button onClick={()=>window.location.href="/"} style={{ width:"100%", background:"none", border:"none", color:"rgba(255,255,255,0.2)", padding:"12px 0", cursor:"pointer", fontFamily:"'Poppins',sans-serif", fontSize:"0.75rem", marginTop:8 }}>← Back to home</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#07070f", fontFamily:"'Poppins',sans-serif", padding:"0 0 60px" }}>
      <style>{`
        * { scrollbar-width:thin; scrollbar-color:#FF6A00 #111; }
        *::-webkit-scrollbar { width:3px } *::-webkit-scrollbar-thumb { background:#FF6A00; border-radius:2px }
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Header */}
      <header style={{ background:"rgba(7,7,15,0.97)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(255,255,255,0.07)", padding:"14px 24px", position:"sticky", top:0, zIndex:50, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <button onClick={()=>window.location.href="/"} style={{ background:"none", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"rgba(255,255,255,0.4)", padding:"5px 12px", cursor:"pointer", fontFamily:"'Poppins',sans-serif", fontSize:"0.7rem", fontWeight:600, transition:"all 0.2s" }}>← Home</button>
          <div>
            <div style={{ fontFamily:"'Poppins',sans-serif", fontWeight:900, fontSize:"1rem", color:"#fff" }}>📊 Feedback Admin</div>
            <div style={{ fontFamily:"'Poppins',sans-serif", fontSize:"0.55rem", color:"rgba(255,255,255,0.25)", letterSpacing:"0.1em", textTransform:"uppercase" }}>LifeStack · Internal Dashboard</div>
          </div>
        </div>
        <button onClick={refresh} style={{ background:"rgba(255,106,0,0.12)", border:"1px solid rgba(255,106,0,0.3)", borderRadius:8, color:"#FF6A00", padding:"7px 16px", cursor:"pointer", fontFamily:"'Poppins',sans-serif", fontSize:"0.75rem", fontWeight:700, transition:"all 0.2s" }}>↺ Refresh</button>
      </header>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"24px 20px" }}>

        {/* Stats row */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginBottom:28 }}>
          {[
            { label:"Total Feedback", value:list.length, color:"#FF6A00" },
            { label:"Avg Rating", value:`${avgRating} ★`, color:"#FFD700" },
            { label:"5 Star", value:list.filter(f=>f.rating===5).length, color:"#4ade80" },
            { label:"This Week", value:list.filter(f=>new Date(f.created_at)>new Date(Date.now()-7*86400000)).length, color:"#C36BFF" },
          ].map((s,i)=>(
            <div key={i} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:"16px 18px", animation:`fadeUp 0.4s ease ${i*0.08}s both` }}>
              <div style={{ fontFamily:"'Poppins',sans-serif", fontWeight:900, fontSize:"1.8rem", color:s.color, lineHeight:1, marginBottom:6 }}>{s.value}</div>
              <div style={{ fontFamily:"'Poppins',sans-serif", fontSize:"0.7rem", color:"rgba(255,255,255,0.35)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em" }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"240px 1fr", gap:20, alignItems:"start" }}>

          {/* LEFT sidebar — rating breakdown + feature counts */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {/* Rating breakdown */}
            <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:"18px 16px" }}>
              <div style={{ fontFamily:"'Poppins',sans-serif", fontWeight:700, fontSize:"0.78rem", color:"#fff", marginBottom:14 }}>Rating Breakdown</div>
              {ratingCounts.map(({r,count})=>(
                <div key={r} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <span style={{ fontFamily:"'Poppins',sans-serif", fontSize:"0.7rem", color:"#FFD700", minWidth:24 }}>{r}★</span>
                  <div style={{ flex:1, height:6, background:"rgba(255,255,255,0.06)", borderRadius:3, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${list.length?count/list.length*100:0}%`, background:"linear-gradient(90deg,#FF6A00,#FFD700)", borderRadius:3, transition:"width 0.5s" }}/>
                  </div>
                  <span style={{ fontFamily:"'Poppins',sans-serif", fontSize:"0.65rem", color:"rgba(255,255,255,0.3)", minWidth:16, textAlign:"right" }}>{count}</span>
                </div>
              ))}
            </div>

            {/* Feature breakdown */}
            <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:"18px 16px" }}>
              <div style={{ fontFamily:"'Poppins',sans-serif", fontWeight:700, fontSize:"0.78rem", color:"#fff", marginBottom:14 }}>By Feature</div>
              {featureCounts.map(({f,count})=>(
                <div key={f} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8, cursor:"pointer" }} onClick={()=>setFilter(f)}>
                  <span style={{ fontFamily:"'Poppins',sans-serif", fontSize:"0.72rem", color:filter===f?"#FF6A00":"rgba(255,255,255,0.5)" }}>{f}</span>
                  <span style={{ fontFamily:"'Poppins',sans-serif", fontSize:"0.7rem", fontWeight:700, color:count>0?"#FF6A00":"rgba(255,255,255,0.2)", background:count>0?"rgba(255,106,0,0.1)":"transparent", borderRadius:100, padding:"1px 8px" }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — Feedback list */}
          <div>
            {/* Filters */}
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16, flexWrap:"wrap" }}>
              <div style={{ display:"flex", gap:6, flex:1, flexWrap:"wrap" }}>
                {FEATURES.map(f=>(
                  <button key={f} onClick={()=>setFilter(f)} style={{ fontFamily:"'Poppins',sans-serif", fontSize:"0.65rem", fontWeight:700, padding:"5px 12px", borderRadius:100, border:"1px solid", cursor:"pointer", transition:"all 0.2s", borderColor:filter===f?"#FF6A00":"rgba(255,255,255,0.1)", background:filter===f?"rgba(255,106,0,0.12)":"transparent", color:filter===f?"#FF6A00":"rgba(255,255,255,0.3)" }}>{f}</button>
                ))}
              </div>
              <select value={sort} onChange={e=>setSort(e.target.value as any)} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"rgba(255,255,255,0.6)", padding:"5px 10px", fontFamily:"'Poppins',sans-serif", fontSize:"0.7rem", outline:"none", cursor:"pointer" }}>
                <option value="newest" style={{background:"#0f0f1c"}}>Newest first</option>
                <option value="rating" style={{background:"#0f0f1c"}}>Highest rating</option>
              </select>
            </div>

            {/* Cards */}
            {loading ? (
              <div style={{ textAlign:"center", padding:"48px", color:"rgba(255,255,255,0.2)", fontFamily:"'Poppins',sans-serif" }}>Loading...</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign:"center", padding:"48px", color:"rgba(255,255,255,0.2)", fontFamily:"'Poppins',sans-serif", fontSize:"0.85rem" }}>No feedback found</div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {filtered.map((fb,i)=>(
                  <div key={fb.id} style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.07)", borderLeft:`3px solid ${fb.rating>=4?"#4ade80":fb.rating===3?"#FF6A00":"#f87171"}`, borderRadius:12, padding:"16px 18px", animation:`fadeUp 0.4s ease ${i*0.04}s both` }}>
                    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10, gap:12 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:38, height:38, borderRadius:"50%", background:"linear-gradient(135deg,#FF6A00,#C36BFF)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <span style={{ fontFamily:"'Poppins',sans-serif", fontWeight:800, fontSize:"0.9rem", color:"#fff" }}>{fb.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <div style={{ fontFamily:"'Poppins',sans-serif", fontWeight:700, fontSize:"0.88rem", color:"#fff" }}>{fb.name}</div>
                          <div style={{ fontFamily:"'Poppins',sans-serif", fontSize:"0.62rem", color:"rgba(255,255,255,0.25)" }}>
                            {new Date(fb.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})} · {new Date(fb.created_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}
                          </div>
                        </div>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5, flexShrink:0 }}>
                        <div style={{ display:"flex", gap:2 }}>{[1,2,3,4,5].map(s=><span key={s} style={{ fontSize:"0.85rem", color:"#FFD700", opacity:s<=fb.rating?1:0.2 }}>★</span>)}</div>
                        {fb.feature && <span style={{ fontFamily:"'Poppins',sans-serif", fontSize:"0.6rem", fontWeight:700, color:"#FF6A00", background:"rgba(255,106,0,0.1)", border:"1px solid rgba(255,106,0,0.25)", borderRadius:100, padding:"2px 10px" }}>{fb.feature}</span>}
                      </div>
                    </div>
                    <p style={{ fontFamily:"'Poppins',sans-serif", fontSize:"0.83rem", color:"rgba(255,255,255,0.6)", margin:0, lineHeight:1.75 }}>{fb.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}