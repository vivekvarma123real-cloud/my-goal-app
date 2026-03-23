"use client";

import React, { useState } from "react";

const SECTIONS = [
  {
    id:"core", label:"Core OS", icon:"⚡", color:"#FF6A00",
    pages:[
      { num:"I",   title:"Slave to\nLogical Brain",    quote:"I am slave to my logical brain.",              desc:"Every decision comes from logic only. When emotion says stop, logical brain decides. Feel fear — act anyway. Feel lazy — work anyway.", source:"Personal OS", symbol:"∞" },
      { num:"II",  title:"Performance\nOver Output",   quote:"Do your duty. Never seek the fruit.",          desc:"Bhagavad Gita Ch.2.47. Act for family, future child, dharma. Never only for yourself. The action is yours. The result is not.", source:"Bhagavad Gita", symbol:"ॐ" },
      { num:"III", title:"Trust\nThe Path",            quote:"The journey is the destination.",              desc:"You don't know the journey but you will arrive. Accept 1000 failures as part of the adventure. Things not going to plan — that is the plan.", source:"Taoism · Wu Wei", symbol:"☯" },
      { num:"IV",  title:"Journey Builds\nCharacter",  quote:"The battle shapes the warrior, not the trophy.", desc:"The destination is nothing. Who you become on the way is everything. Every obstacle is a forge. Every failure is a teacher.", source:"Stoicism", symbol:"⚔" },
    ]
  },
  {
    id:"practical", label:"Practical", icon:"🔧", color:"#4A90FF",
    pages:[
      { num:"I",   title:"Repair,\nNot Blame",  quote:"Ask: what needs to be fixed?",         desc:"When something breaks — system, relationship, plan — repair it. Blame wastes energy that could fix the problem.", source:"Practical OS", symbol:"⚙" },
      { num:"II",  title:"It Is\nOkay",         quote:"It happened. It is okay. Move.",        desc:"Accept failure without resistance. This is not weakness — this is the warrior who absorbs hits and keeps moving. Every time.", source:"Acceptance Theory", symbol:"✓" },
      { num:"III", title:"Fix Not\nFixate",     quote:"If unfixable — release it completely.", desc:"If it can be fixed, fix it. If it cannot be fixed, move on immediately. Fixating on the unfixable is the only real failure.", source:"Stoicism · Epictetus", symbol:"→" },
    ]
  },
  {
    id:"mindset", label:"Mindset", icon:"🧠", color:"#C36BFF",
    pages:[
      { num:"I",  title:"Attribution\nTheory",  quote:"System failed. Not you. Redesign.",     desc:"When you fail: modify the system + apply more effort. Never conclude you are the problem. Redesign and reload.", source:"Psychology", symbol:"↻" },
      { num:"II", title:"Growth\nMindset",      quote:"Everything can change with effort.",    desc:"What you know, what you do, what you perform — all of it can change with effort. Fixed mindset is the only ceiling.", source:"Carol Dweck", symbol:"↑" },
    ]
  },
  {
    id:"battle", label:"Battle", icon:"⚔️", color:"#ff3b3b",
    pages:[
      { num:"I",   title:"Visualize\nMore",          quote:"See it before you live it.",          desc:"Visualize the outcome, the process, the obstacles. The mind that has already won fights completely differently.", source:"Battle Training", symbol:"◉" },
      { num:"II",  title:"Clarity\nIs Power",        quote:"Where exactly? Are you top 1%?",      desc:"Know exactly where you want to go. Are you top 1% committed? Vague goals produce vague results. Precision is everything.", source:"Battle Training", symbol:"◎" },
      { num:"III", title:"Screw\nMotivation",        quote:"Don't feel like it? Do it anyway.",   desc:"Logical brain overrides mood every single time. Motivation is a luxury. Discipline is the weapon. Show up — always.", source:"Battle Training", symbol:"⚡" },
      { num:"IV",  title:"Real\nConsistency",        quote:"Stop when time is up — not mood.",    desc:"If you work on intensity you will lack discipline. Consistency compounds forever. Same time, every single day.", source:"Battle Training", symbol:"∞" },
      { num:"V",   title:"Bulletproof\nPlanning",    quote:"Plan → Data → Daily → Modify",       desc:"Real plan → data → daily review → constantly modify. A plan that never updates is already dead. Evolve every day.", source:"Battle Training", symbol:"▦" },
      { num:"VI",  title:"Deadlines\nAre God",       quote:"The clock is always running.",        desc:"A goal without a deadline is a wish. Treat every deadline as non-negotiable. Time is the only resource that never returns.", source:"Battle Training", symbol:"⏳" },
      { num:"VII", title:"Beat Talented\nPeople",    quote:"Never stop showing up. Ever.",        desc:"The only person who wins is the one who doesn't break consistency. Talent is completely irrelevant to the warrior who never stops.", source:"Battle Training", symbol:"👑" },
    ]
  },
];

export default function BattleManualPage() {
  const [activeSec, setActiveSec] = useState(0);
  const [page, setPage] = useState(0);
  const [flipping, setFlipping] = useState(false);
  const [flipDir, setFlipDir] = useState<"next"|"prev">("next");

  const section = SECTIONS[activeSec];
  const total = section.pages.length;
  const slide = section.pages[page];
  const color = section.color;

  const goNext = () => {
    if (flipping || page >= total-1) return;
    setFlipDir("next"); setFlipping(true);
    setTimeout(()=>{ setPage(p=>p+1); setFlipping(false); }, 550);
  };
  const goPrev = () => {
    if (flipping || page <= 0) return;
    setFlipDir("prev"); setFlipping(true);
    setTimeout(()=>{ setPage(p=>p-1); setFlipping(false); }, 550);
  };
  const switchSection = (idx: number) => {
    if (idx === activeSec) return;
    setActiveSec(idx); setPage(0); setFlipping(false);
  };

  const touchStart = React.useRef<number|null>(null);
  const onTS = (e: React.TouchEvent) => { touchStart.current = e.touches[0].clientX; };
  const onTE = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const d = touchStart.current - e.changedTouches[0].clientX;
    if (d > 40) goNext(); else if (d < -40) goPrev();
    touchStart.current = null;
  };

  return (
    <div onTouchStart={onTS} onTouchEnd={onTE}
      style={{ minHeight:"100vh", background:`#08070f`, fontFamily:"'Poppins',sans-serif", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-start", padding:"0 0 40px", transition:"background 0.6s ease", position:"relative", overflow:"hidden" }}>
      {/* Ambient background layers */}
      <div style={{ position:"fixed", inset:0, background:`radial-gradient(ellipse at 20% 50%, ${color}12, transparent 50%), radial-gradient(ellipse at 80% 50%, ${color}08, transparent 50%)`, pointerEvents:"none", transition:"background 0.8s ease", zIndex:0 }}/>
      <div style={{ position:"fixed", inset:0, backgroundImage:`repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(255,255,255,0.012) 60px), repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(255,255,255,0.012) 60px)`, pointerEvents:"none", zIndex:0 }}/>
      <style>{`
        @keyframes flipNext{0%{transform:perspective(1400px) rotateY(0deg)}100%{transform:perspective(1400px) rotateY(-180deg)}}
        @keyframes flipPrev{0%{transform:perspective(1400px) rotateY(-180deg)}100%{transform:perspective(1400px) rotateY(0deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes pulse{0%,100%{opacity:0.7}50%{opacity:1}}
        .flip-next{animation:flipNext 0.55s cubic-bezier(0.645,0.045,0.355,1) forwards;transform-origin:left center;}
        .flip-prev{animation:flipPrev 0.55s cubic-bezier(0.645,0.045,0.355,1) forwards;transform-origin:left center;}
        *{scrollbar-width:thin;scrollbar-color:#FF6A00 #111}
        *::-webkit-scrollbar{width:3px}
        *::-webkit-scrollbar-thumb{background:#FF6A00;border-radius:2px}
      `}</style>

      {/* ── TOP HEADER ── */}
      <div style={{ width:"100%", background:"rgba(8,7,15,0.97)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(255,255,255,0.06)", padding:"14px 20px", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ maxWidth:800, margin:"0 auto", display:"flex", flexDirection:"column", gap:12 }}>

          {/* Title row */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <button onClick={()=>window.location.href="/choose"} style={{ background:"none", border:`1px solid rgba(255,255,255,0.1)`, borderRadius:20, color:"rgba(255,255,255,0.4)", padding:"5px 12px", cursor:"pointer", fontFamily:"'Poppins',sans-serif", fontSize:"0.68rem", fontWeight:600, transition:"all 0.2s" }}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color=color;(e.currentTarget as HTMLElement).style.borderColor=color+"60";}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color="rgba(255,255,255,0.4)";(e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.1)";}}
              >← Back</button>
              <div>
                <span style={{ fontFamily:"'Poppins',sans-serif", fontWeight:900, fontSize:"1rem", color:"#fff", letterSpacing:"0.08em" }}>⚔️ BATTLE MANUAL</span>
                <p style={{ fontFamily:"'Poppins',sans-serif", fontSize:"0.52rem", color:"rgba(255,255,255,0.2)", margin:0, letterSpacing:"0.12em", textTransform:"uppercase" }}>Personal Operating System</p>
              </div>
            </div>
            <div style={{ fontFamily:"'Poppins',sans-serif", fontSize:"0.68rem", color:"rgba(255,255,255,0.25)", fontWeight:600 }}>
              <span style={{ color }}>{section.icon} {section.label}</span>
              <span style={{ margin:"0 6px", color:"rgba(255,255,255,0.1)" }}>·</span>
              <span style={{ color }}>{page+1}</span>
              <span style={{ color:"rgba(255,255,255,0.2)" }}>/{total}</span>
            </div>
          </div>

          {/* ── CATEGORY TABS ── */}
          <div style={{ display:"flex", gap:8, overflowX:"auto", scrollbarWidth:"none", paddingBottom:2 }}>
            {SECTIONS.map((s,i)=>{
              const isActive = i === activeSec;
              return (
                <button key={s.id} onClick={()=>switchSection(i)} style={{
                  display:"flex", alignItems:"center", gap:7, flexShrink:0,
                  padding:"8px 16px", borderRadius:12, cursor:"pointer", border:"1px solid",
                  fontFamily:"'Poppins',sans-serif", fontWeight:700, fontSize:"0.78rem",
                  transition:"all 0.25s",
                  background:isActive?`${s.color}18`:"rgba(255,255,255,0.03)",
                  borderColor:isActive?`${s.color}70`:"rgba(255,255,255,0.08)",
                  color:isActive?s.color:"rgba(255,255,255,0.35)",
                  boxShadow:isActive?`0 0 16px ${s.color}20`:"none",
                }}>
                  <span style={{ fontSize:"1rem" }}>{s.icon}</span>
                  <span>{s.label}</span>
                  {/* Page dots for this section */}
                  <div style={{ display:"flex", gap:3, marginLeft:4 }}>
                    {s.pages.map((_,pi)=>(
                      <div key={pi} style={{ width:5, height:5, borderRadius:"50%", background:isActive&&pi===page?s.color:isActive?`${s.color}50`:"rgba(255,255,255,0.12)", transition:"all 0.3s" }}/>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {/* ── BOOK ── */}
      <div style={{ marginTop:32, width:"min(740px,95vw)", position:"relative", zIndex:1 }}>

        {/* ── BEFORE BOOK — top decorative strip ── */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, padding:"0 4px" }}>
          {/* Left — section identity */}
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:3, height:36, background:`linear-gradient(180deg,transparent,${color},transparent)`, borderRadius:2 }}/>
            <div>
              <div style={{ fontFamily:"Georgia,serif", fontSize:"0.58rem", color:`${color}80`, letterSpacing:"0.18em", textTransform:"uppercase" }}>{section.label}</div>
              <div style={{ fontFamily:"Georgia,serif", fontSize:"1rem", color:"rgba(255,255,255,0.7)", fontStyle:"italic", lineHeight:1.2 }}>{slide.title.replace(/\n/g," ")}</div>
            </div>
          </div>
          {/* Right — ornamental */}
          <div style={{ display:"flex", alignItems:"center", gap:8, opacity:0.5 }}>
            <div style={{ width:40, height:1, background:`linear-gradient(90deg,transparent,${color})` }}/>
            <span style={{ color:color, fontSize:"0.7rem" }}>✦</span>
            <div style={{ fontFamily:"Georgia,serif", fontSize:"0.7rem", color:color, letterSpacing:"0.1em" }}>{slide.num}</div>
            <span style={{ color:color, fontSize:"0.7rem" }}>✦</span>
            <div style={{ width:40, height:1, background:`linear-gradient(90deg,${color},transparent)` }}/>
          </div>
        </div>

        {/* Glowing top edge line */}
        <div style={{ height:1, background:`linear-gradient(90deg,transparent,${color}80,${color},${color}80,transparent)`, marginBottom:0, boxShadow:`0 0 12px ${color}60`, borderRadius:1 }}/>
        <div style={{ position:"relative", height:"min(480px,80vh)", display:"flex", filter:"drop-shadow(0 30px 70px rgba(0,0,0,0.9))" }}>

          {/* Spine */}
          <div style={{ position:"absolute", left:"50%", top:0, bottom:0, width:20, transform:"translateX(-50%)", background:"linear-gradient(90deg,rgba(0,0,0,0.9),rgba(0,0,0,0.3),rgba(0,0,0,0.9))", zIndex:30, pointerEvents:"none" }}/>

          {/* LEFT PAGE — Category identity */}
          <div style={{ width:"50%", height:"100%", background:`linear-gradient(160deg,#18120a,#100c06)`, borderRadius:"10px 0 0 10px", border:"1px solid rgba(255,255,255,0.07)", borderRight:"none", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"36px 28px", position:"relative", overflow:"hidden" }}>
            {/* Paper lines */}
            {Array.from({length:20},(_,i)=>(<div key={i} style={{ position:"absolute", left:0, right:0, top:`${5+i*4.8}%`, height:"1px", background:"rgba(255,255,255,0.022)" }}/>))}
            {/* Glow blob */}
            <div style={{ position:"absolute", top:"20%", left:"20%", width:"60%", height:"60%", borderRadius:"50%", background:`radial-gradient(circle,${color}18,transparent)`, pointerEvents:"none" }}/>
            {/* Top ornament */}
            <div style={{ position:"absolute", top:14, left:"50%", transform:"translateX(-50%)", display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:28, height:1, background:`${color}50` }}/><span style={{ color:`${color}80`, fontSize:"0.5rem" }}>✦</span><div style={{ width:28, height:1, background:`${color}50` }}/>
            </div>
            {/* Category icon — big */}
            <div style={{ fontSize:"3.5rem", lineHeight:1, marginBottom:14, animation:"float 4s ease infinite", filter:`drop-shadow(0 0 20px ${color}60)` }}>{section.icon}</div>
            {/* Category name */}
            <div style={{ fontFamily:"Georgia,serif", fontSize:"1rem", color:color, fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:6, textAlign:"center" }}>{section.label}</div>
            {/* Big symbol */}
            <div style={{ fontSize:"clamp(50px,10vw,80px)", lineHeight:1, color:color, marginBottom:16, filter:`drop-shadow(0 0 25px ${color}50)`, animation:"pulse 3s ease infinite", textAlign:"center" }}>{slide.symbol}</div>
            {/* Roman numeral */}
            <div style={{ fontFamily:"Georgia,serif", fontSize:"0.85rem", color:`${color}70`, letterSpacing:"0.2em", marginBottom:10 }}>{slide.num}</div>
            <div style={{ width:50, height:1, background:`${color}50`, marginBottom:12 }}/>
            <div style={{ fontFamily:"'Poppins',sans-serif", fontSize:"0.58rem", color:"rgba(255,255,255,0.25)", letterSpacing:"0.12em", textTransform:"uppercase", textAlign:"center" }}>{slide.source}</div>
            {/* Bottom ornament */}
            <div style={{ position:"absolute", bottom:14, left:"50%", transform:"translateX(-50%)", display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:18, height:1, background:`${color}35` }}/><span style={{ color:`${color}50`, fontSize:"0.42rem" }}>◆</span><div style={{ width:18, height:1, background:`${color}35` }}/>
            </div>
            {/* Page curl */}
            <div style={{ position:"absolute", bottom:0, left:0, width:28, height:28, background:`linear-gradient(135deg,#0a0703,#18120a)`, borderTop:"1px solid rgba(255,255,255,0.05)", borderRight:"1px solid rgba(255,255,255,0.03)", clipPath:"polygon(0 100%,0 0,100% 100%)" }}/>
          </div>

          {/* RIGHT PAGE — Content */}
          <div style={{ width:"50%", height:"100%", background:`linear-gradient(220deg,#1e1810,#160e08)`, borderRadius:"0 10px 10px 0", border:"1px solid rgba(255,255,255,0.07)", borderLeft:"none", display:"flex", flexDirection:"column", justifyContent:"center", padding:"40px 30px 40px 26px", position:"relative", overflow:"hidden" }}>
            {/* Paper lines */}
            {Array.from({length:20},(_,i)=>(<div key={i} style={{ position:"absolute", left:0, right:0, top:`${5+i*4.8}%`, height:"1px", background:"rgba(255,255,255,0.02)" }}/>))}
            {/* Margin line */}
            <div style={{ position:"absolute", left:18, top:"6%", bottom:"6%", width:1, background:`${color}25` }}/>
            <div key={`${activeSec}-${page}`} style={{ animation:"fadeIn 0.4s ease both" }}>
              {/* Title */}
              <h2 style={{ fontFamily:"Georgia,serif", fontWeight:700, fontSize:"clamp(1.1rem,3vw,1.5rem)", color:"#fff", margin:"0 0 16px", lineHeight:1.15, whiteSpace:"pre-line", letterSpacing:"-0.01em" }}>{slide.title}</h2>
              {/* Quote */}
              <div style={{ borderLeft:`3px solid ${color}`, paddingLeft:14, marginBottom:18, background:`${color}06`, borderRadius:"0 6px 6px 0", padding:"10px 14px 10px 14px" }}>
                <p style={{ fontFamily:"Georgia,serif", fontStyle:"italic", fontSize:"clamp(0.75rem,1.8vw,0.88rem)", color:color, margin:0, lineHeight:1.65 }}>"{slide.quote}"</p>
              </div>
              {/* Desc */}
              <p style={{ fontFamily:"'Poppins',sans-serif", fontSize:"clamp(0.68rem,1.6vw,0.78rem)", color:"rgba(255,255,255,0.5)", lineHeight:1.9, margin:"0 0 18px" }}>{slide.desc}</p>
              {/* Bottom rule */}
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ flex:1, height:1, background:`${color}25` }}/>
                <span style={{ fontFamily:"Georgia,serif", fontSize:"0.52rem", color:`${color}55`, letterSpacing:"0.12em", textTransform:"uppercase" }}>LifeStack · Battle Manual</span>
              </div>
            </div>
            {/* Page number */}
            <div style={{ position:"absolute", bottom:14, right:20, fontFamily:"Georgia,serif", fontSize:"0.62rem", color:"rgba(255,255,255,0.18)" }}>{page+1}</div>
            {/* Curl */}
            <div style={{ position:"absolute", bottom:0, right:0, width:28, height:28, background:`linear-gradient(225deg,#0a0703,#1e1810)`, borderTop:"1px solid rgba(255,255,255,0.05)", borderLeft:"1px solid rgba(255,255,255,0.03)", clipPath:"polygon(100% 100%,0 100%,100% 0)" }}/>
          </div>

          {/* Flip overlay */}
          {flipping && (
            <div className={flipDir==="next"?"flip-next":"flip-prev"} style={{ position:"absolute", left:"50%", top:0, width:"50%", height:"100%", zIndex:25, transformStyle:"preserve-3d" }}>
              {/* FRONT — current page (flies away) */}
              <div style={{ position:"absolute", inset:0, backfaceVisibility:"hidden", WebkitBackfaceVisibility:"hidden", background:`linear-gradient(220deg,#1e1810,#160e08)`, borderRadius:"0 10px 10px 0", border:"1px solid rgba(255,255,255,0.07)", padding:"40px 30px 40px 26px", overflow:"hidden", display:"flex", flexDirection:"column", justifyContent:"center" }}>
                {Array.from({length:20},(_,i)=>(<div key={i} style={{ position:"absolute", left:0, right:0, top:`${5+i*4.8}%`, height:"1px", background:"rgba(255,255,255,0.02)" }}/>))}
                <div style={{ marginLeft:8 }}>
                  <h2 style={{ fontFamily:"Georgia,serif", fontWeight:700, fontSize:"clamp(1.1rem,3vw,1.5rem)", color:"#fff", margin:"0 0 16px", lineHeight:1.15, whiteSpace:"pre-line" }}>{slide.title}</h2>
                  <div style={{ borderLeft:`3px solid ${color}`, paddingLeft:14, marginBottom:16, background:`${color}06`, borderRadius:"0 6px 6px 0", padding:"10px 14px" }}>
                    <p style={{ fontFamily:"Georgia,serif", fontStyle:"italic", fontSize:"0.85rem", color:color, margin:0, lineHeight:1.6 }}>"{slide.quote}"</p>
                  </div>
                  <p style={{ fontFamily:"'Poppins',sans-serif", fontSize:"0.76rem", color:"rgba(255,255,255,0.45)", lineHeight:1.85, margin:0 }}>{slide.desc}</p>
                </div>
              </div>
              {/* BACK — plain dark paper, no text (realistic back of a page) */}
              <div style={{ position:"absolute", inset:0, backfaceVisibility:"hidden", WebkitBackfaceVisibility:"hidden", transform:"rotateY(180deg)", background:`linear-gradient(220deg,#16120a,#120e07)`, borderRadius:"0 10px 10px 0", border:"1px solid rgba(255,255,255,0.05)", overflow:"hidden" }}>
                {Array.from({length:20},(_,i)=>(<div key={i} style={{ position:"absolute", left:0, right:0, top:`${5+i*4.8}%`, height:"1px", background:"rgba(255,255,255,0.015)" }}/>))}
                {/* Subtle watermark only */}
                <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", opacity:0.04 }}>
                  <span style={{ fontSize:"6rem", color:color }}>⚔️</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Glowing bottom edge line */}
        <div style={{ height:1, background:`linear-gradient(90deg,transparent,${color}80,${color},${color}80,transparent)`, marginTop:0, boxShadow:`0 0 12px ${color}60`, borderRadius:1 }}/>

        {/* ── AFTER BOOK — bottom strip ── */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:14, marginBottom:8, padding:"0 4px", opacity:0.6 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            {[...Array(3)].map((_,i)=>(
              <div key={i} style={{ width:i===1?20:10, height:3, borderRadius:2, background:`${color}${i===1?"cc":"55"}` }}/>
            ))}
          </div>
          <div style={{ fontFamily:"Georgia,serif", fontSize:"0.58rem", color:`${color}80`, letterSpacing:"0.2em", textTransform:"uppercase" }}>— {slide.source} —</div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            {[...Array(3)].map((_,i)=>(
              <div key={i} style={{ width:i===1?20:10, height:3, borderRadius:2, background:`${color}${i===1?"cc":"55"}` }}/>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:16, padding:"0 4px" }}>
          <button onClick={goPrev} disabled={page===0||flipping} style={{ background:page===0?"transparent":`${color}18`, border:`1px solid ${page===0?"rgba(255,255,255,0.07)":color+"50"}`, borderRadius:12, color:page===0?"rgba(255,255,255,0.15)":color, padding:"10px 22px", cursor:page===0?"default":"pointer", fontFamily:"'Poppins',sans-serif", fontSize:"0.8rem", fontWeight:700, transition:"all 0.2s" }}>← Prev</button>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            {section.pages.map((_,i)=>(
              <div key={i} onClick={()=>{ if(!flipping&&i!==page){setFlipDir(i>page?"next":"prev");setFlipping(true);setTimeout(()=>{setPage(i);setFlipping(false);},550);}}} style={{ width:i===page?22:7, height:7, borderRadius:4, background:i===page?color:i<page?`${color}40`:"rgba(255,255,255,0.1)", cursor:"pointer", transition:"all 0.3s" }}/>
            ))}
          </div>
          <button onClick={goNext} disabled={page===total-1||flipping} style={{ background:page===total-1?"transparent":`${color}18`, border:`1px solid ${page===total-1?"rgba(255,255,255,0.07)":color+"50"}`, borderRadius:12, color:page===total-1?"rgba(255,255,255,0.15)":color, padding:"10px 22px", cursor:page===total-1?"default":"pointer", fontFamily:"'Poppins',sans-serif", fontSize:"0.8rem", fontWeight:700, transition:"all 0.2s" }}>Next →</button>
        </div>
        <div style={{ textAlign:"center", marginTop:16, display:"flex", alignItems:"center", justifyContent:"center", gap:12, opacity:0.3 }}>
          <div style={{ width:30, height:1, background:color }}/>
          <span style={{ fontFamily:"Georgia,serif", fontSize:"0.58rem", color:"rgba(255,255,255,0.6)", letterSpacing:"0.15em", textTransform:"uppercase", fontStyle:"italic" }}>swipe or press ← →</span>
          <div style={{ width:30, height:1, background:color }}/>
        </div>
      </div>
    </div>
  );
}