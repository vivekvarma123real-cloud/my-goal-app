"use client";

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { loadHabits, saveHabits } from "@/lib/habitsDb";

// ─── Types ────────────────────────────────────────────────────────────────────
type Habit    = { id: string; label: string; done: boolean };
type Category = { id: string; name: string; icon: string; collapsed: boolean; habits: Habit[] };
type DayEntry = { dayName: string; date: Date; dateStr: string; bg: string; dot: string; categories: Category[] };

const ICON_OPTIONS: { key: string; node: React.ReactNode }[] = [
  { key:"rich",        node:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v2m0 8v2M9.5 9.5C9.5 8.12 10.62 7 12 7s2.5 1.12 2.5 2.5c0 1.5-1.5 2-2.5 2.5-1 .5-2.5 1-2.5 2.5C9.5 15.88 10.62 17 12 17s2.5-1.12 2.5-2.5"/></svg> },
  { key:"muscular",    node:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 0 0 5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 1 0 5H18"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg> },
  { key:"intelligent", node:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> },
  { key:"career",      node:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> },
  { key:"spiritual",   node:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 8v8M8 12h8"/></svg> },
  { key:"heart",       node:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
  { key:"star",        node:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
  { key:"target",      node:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> },
  { key:"lightning",   node:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> },
  { key:"globe",       node:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
  { key:"default",     node:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
];
const ALL_ICONS: Record<string,React.ReactNode> = Object.fromEntries(ICON_OPTIONS.map(o=>[o.key,o.node]));

const DAY_META: Record<string, { bg: string; dot: string }> = {
  Monday:    { bg: "#1e1040", dot: "#C36BFF" },
  Tuesday:   { bg: "#0e1a40", dot: "#9e7dff" },
  Wednesday: { bg: "#0a1e3a", dot: "#4A90FF" },
  Thursday:  { bg: "#0d1e44", dot: "#28D7FF" },
  Friday:    { bg: "#1a0e40", dot: "#C36BFF" },
  Saturday:  { bg: "#22083a", dot: "#28D7FF" },
  Sunday:    { bg: "#180840", dot: "#9e7dff" },
};
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const YEARS  = [2026, 2027, 2028];
const JS_DAY_TO_NAME = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const STORAGE_KEY = "lifestack-habits-v2";

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

function getWeeksInMonth(year: number, monthIdx: number): Date[][] {
  const weeks: Date[][] = [];
  const firstDay = new Date(year, monthIdx, 1);
  const lastDay  = new Date(year, monthIdx + 1, 0);
  let cursor = new Date(firstDay), week: Date[] = [];
  while (cursor <= lastDay) {
    week.push(new Date(cursor));
    if (cursor.getDay() === 0) { weeks.push(week); week = []; }
    cursor.setDate(cursor.getDate() + 1);
  }
  if (week.length > 0) weeks.push(week);
  return weeks;
}

const getCatIconKey = (id: string) => {
  if (id.includes("rich"))        return "rich";
  if (id.includes("muscular"))    return "muscular";
  if (id.includes("intelligent")) return "intelligent";
  return "default";
};

const DEFAULT_CATS = (ds: string): Category[] => [
  { id:`${ds}-rich`,        icon:"rich",        name:"BECOME INCREDIBLY RICH",        collapsed:false, habits:[
    { id:`${ds}-rich-1`, label:"Study", done:false },
  ]},
  { id:`${ds}-muscular`,    icon:"muscular",    name:"BECOME INCREDIBLY MUSCULAR",    collapsed:false, habits:[
    { id:`${ds}-mus-1`, label:"Workout", done:false },
  ]},
  { id:`${ds}-intelligent`, icon:"intelligent", name:"BECOME INCREDIBLY INTELLIGENT", collapsed:false, habits:[
    { id:`${ds}-int-1`, label:"Book (20 min)", done:false },
  ]},
];

const uid = () => Math.random().toString(36).slice(2,9);
const pct = (cats: Category[]) => {
  const all = cats.flatMap(c => c.habits);
  return all.length ? Math.round(all.filter(h=>h.done).length/all.length*100) : 0;
};

// ─── EmojiPicker ─────────────────────────────────────────────────────────────
function EmojiPicker({ onSelect, onClose }: { onSelect:(e:string)=>void; onClose:()=>void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  },[onClose]);
  return (
    <div ref={ref} style={{ position:"absolute",zIndex:200,top:"110%",left:0,background:"#1a1a2e",border:"1px solid rgba(195,107,255,0.3)",borderRadius:10,padding:10,display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,boxShadow:"0 8px 32px rgba(0,0,0,0.6)",minWidth:180 }}>
      {ICON_OPTIONS.map(opt=>(
        <button key={opt.key} onClick={()=>{ onSelect(opt.key); onClose(); }} style={{ background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"8px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.7)",transition:"all 0.15s",width:38,height:38 }}
          onMouseEnter={el=>{ (el.currentTarget as HTMLElement).style.background="rgba(195,107,255,0.15)"; (el.currentTarget as HTMLElement).style.color="#C36BFF"; }}
          onMouseLeave={el=>{ (el.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.04)"; (el.currentTarget as HTMLElement).style.color="rgba(255,255,255,0.7)"; }}
        ><div style={{width:18,height:18}}>{opt.node}</div></button>
      ))}
    </div>
  );
}

// ─── CategoryBlock ────────────────────────────────────────────────────────────
function CategoryBlock({ category, onToggleHabit, onToggleCollapse, onDeleteHabit, onCheckAll, onEditCat, onDeleteCat }: {
  category: Category; onToggleHabit:(id:string)=>void; onToggleCollapse:(id:string)=>void;
  onDeleteHabit:(id:string)=>void; onCheckAll:(catId:string)=>void;
  onEditCat:(catId:string,name:string,icon:string)=>void; onDeleteCat:(catId:string)=>void;
}) {
  const [editing,setEditing]=useState(false);
  const [editName,setEditName]=useState(category.name);
  const [editIcon,setEditIcon]=useState(category.icon);
  const [showEmoji,setShowEmoji]=useState(false);
  const allDone = category.habits.length>0 && category.habits.every(h=>h.done);
  const catPct  = category.habits.length ? Math.round(category.habits.filter(h=>h.done).length/category.habits.length*100) : 0;
  const saveEdit = () => { if(editName.trim()) onEditCat(category.id,editName.trim().toUpperCase(),editIcon); setEditing(false); setShowEmoji(false); };

  return (
    <div style={{ marginBottom:10,borderRadius:8,background:"transparent",border:"1px solid rgba(255,255,255,0.07)",overflow:"visible",position:"relative",textAlign:"left" }}>
      {editing ? (
        <div style={{ display:"flex",alignItems:"center",gap:6,padding:"7px 10px" }}>
          <div style={{ position:"relative" }}>
            <button onClick={()=>setShowEmoji(v=>!v)} style={{ background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:6,padding:"6px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",width:32,height:32,color:"rgba(255,255,255,0.7)" }}>
              <div style={{width:16,height:16}}>{ALL_ICONS[editIcon]??ALL_ICONS["default"]}</div>
            </button>
            {showEmoji&&<EmojiPicker onSelect={e=>setEditIcon(e)} onClose={()=>setShowEmoji(false)}/>}
          </div>
          <input value={editName} onChange={e=>setEditName(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter")saveEdit(); if(e.key==="Escape"){setEditing(false);setEditName(category.name);} }}
            autoFocus style={{ flex:1,fontFamily:"var(--font)",fontSize:"0.7rem",fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(195,107,255,0.4)",borderRadius:6,color:"#fff",padding:"4px 8px",outline:"none" }}
          />
          <button onClick={saveEdit} style={{ background:"rgba(74,144,255,0.15)",border:"1px solid rgba(74,144,255,0.4)",borderRadius:5,padding:"3px 10px",cursor:"pointer",fontFamily:"var(--font)",fontSize:"0.65rem",fontWeight:700,color:"#4A90FF" }}>Save</button>
          <button onClick={()=>{setEditing(false);setEditName(category.name);setShowEmoji(false);}} style={{ background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:5,padding:"3px 8px",cursor:"pointer",fontFamily:"var(--font)",fontSize:"0.65rem",color:"rgba(255,255,255,0.5)" }}>✕</button>
        </div>
      ) : (
        <div style={{ display:"flex",alignItems:"center",padding:"6px 10px",gap:5,minWidth:0,overflow:"hidden",textAlign:"left" }}>
          <button onClick={()=>onToggleCollapse(category.id)} style={{ display:"flex",alignItems:"center",gap:5,flex:1,minWidth:0,background:"none",border:"none",cursor:"pointer",overflow:"hidden",textAlign:"left" }}>
            <div style={{ width:16,height:16,minWidth:16,flexShrink:0,color:"rgba(255,255,255,0.6)" }}>
              {ALL_ICONS[category.icon]??ALL_ICONS[getCatIconKey(category.id)]??ALL_ICONS["default"]}
            </div>
            <span style={{ fontFamily:"var(--font)",fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.04em",textTransform:"uppercase",color:"rgba(255,255,255,0.82)",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{category.name}</span>
            <span style={{ fontSize:"0.5rem",flexShrink:0,transition:"transform 0.22s",transform:category.collapsed?"rotate(-90deg)":"rotate(0deg)",background:"var(--gradient)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>▼</span>
          </button>
          <span style={{ fontFamily:"var(--font)",fontSize:"0.6rem",fontWeight:600,color:catPct===100?"#28D7FF":"rgba(255,255,255,0.4)",minWidth:26,textAlign:"right" }}>{catPct}%</span>
          <button onClick={()=>onCheckAll(category.id)} style={{ background:allDone?"rgba(40,215,255,0.12)":"rgba(255,255,255,0.06)",border:`1px solid ${allDone?"rgba(40,215,255,0.35)":"rgba(255,255,255,0.1)"}`,borderRadius:5,padding:"2px 7px",cursor:"pointer",fontFamily:"var(--font)",fontSize:"0.58rem",fontWeight:600,color:allDone?"#28D7FF":"rgba(255,255,255,0.4)",transition:"all 0.18s",whiteSpace:"nowrap" }}>{allDone?"✓ All":"All"}</button>
          <button onClick={()=>{setEditing(true);setEditName(category.name);setEditIcon(category.icon);}} style={{ background:"none",border:"none",cursor:"pointer",padding:"2px 4px",fontSize:"0.7rem",opacity:0.35,transition:"opacity 0.15s" }}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.opacity="1"}
            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.opacity="0.35"}
          >✏️</button>
          <button onClick={()=>{if(window.confirm(`Delete "${category.name}"?`))onDeleteCat(category.id);}} style={{ background:"none",border:"none",cursor:"pointer",padding:"2px 4px",fontSize:"0.65rem",color:"rgba(195,107,255,0.4)",transition:"color 0.15s" }}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color="#C36BFF"}
            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color="rgba(195,107,255,0.4)"}
          >🗑</button>
        </div>
      )}
      <div className={`cat-items${category.collapsed?" closed":""}`} style={{ maxHeight:category.collapsed?"0px":"600px",padding:category.collapsed?"0":"0 8px 8px" }}>
        {category.habits.map(h=>(
          <div key={h.id} style={{ display:"flex",alignItems:"center",gap:7,padding:"4px 6px",borderRadius:6,marginBottom:2,background:h.done?"rgba(195,107,255,0.07)":"transparent",transition:"background 0.15s" }}
            onMouseEnter={e=>{if(!h.done)(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.03)";}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background=h.done?"rgba(195,107,255,0.07)":"transparent";}}
          >
            <input type="checkbox" className="habit-checkbox" checked={h.done} onChange={()=>onToggleHabit(h.id)}/>
            <span style={{ fontFamily:"var(--font)",fontSize:"0.8rem",fontWeight:h.done?400:500,color:h.done?"var(--text-muted)":"var(--text)",textDecoration:h.done?"line-through":"none",flex:1,transition:"all 0.18s" }}>{h.label}</span>
            <button onClick={()=>onDeleteHabit(h.id)} style={{ background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:4,cursor:"pointer",color:"rgba(248,113,113,0.7)",fontSize:"0.65rem",padding:"2px 6px",transition:"all 0.15s",flexShrink:0 }}
              onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.background="rgba(248,113,113,0.18)"; (e.currentTarget as HTMLElement).style.color="#f87171"; }}
              onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.background="rgba(248,113,113,0.08)"; (e.currentTarget as HTMLElement).style.color="rgba(248,113,113,0.7)"; }}
            >✕</button>
          </div>
        ))}
        {category.habits.length===0&&<p style={{ fontFamily:"var(--font)",fontSize:"0.72rem",color:"var(--text-muted)",padding:"3px 6px",fontStyle:"italic" }}>No habits yet</p>}
      </div>
    </div>
  );
}

// ─── AddRow ───────────────────────────────────────────────────────────────────
function AddRow({ categories,onAdd,onAddCategory,onClose }: { categories:Category[];onAdd:(catId:string,label:string)=>void;onAddCategory:(name:string,icon:string)=>void;onClose:()=>void; }) {
  const [tab,setTab]=useState<"habit"|"category">("habit");
  const [label,setLabel]=useState("");
  const [catId,setCatId]=useState(categories[0]?.id??"");
  const [catName,setCatName]=useState("");
  const [catIcon,setCatIcon]=useState("default");
  const [showEmoji,setShowEmoji]=useState(false);
  const submitHabit=()=>{if(!label.trim())return;onAdd(catId,label.trim());setLabel("");onClose();};
  const submitCat=()=>{if(!catName.trim())return;onAddCategory(catName.trim(),catIcon||"default");setCatName("");onClose();};
  return (
    <div style={{ marginTop:10,paddingTop:10,borderTop:"1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ display:"flex",gap:4,marginBottom:8 }}>
        {(["habit","category"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{ fontFamily:"var(--font)",fontSize:"0.65rem",fontWeight:700,padding:"3px 10px",borderRadius:5,border:"1px solid",cursor:"pointer",transition:"all 0.18s",textTransform:"capitalize",borderColor:tab===t?"var(--grad-start)":"var(--border)",background:tab===t?"rgba(195,107,255,0.14)":"transparent",color:tab===t?"var(--grad-start)":"var(--text-muted)" }}>+ {t==="habit"?"New Habit":"New Category"}</button>
        ))}
        <button onClick={onClose} style={{ marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",fontSize:"0.75rem" }}>✕</button>
      </div>
      {tab==="habit"?(
        <>
          <select value={catId} onChange={e=>setCatId(e.target.value)} className="h-input" style={{ marginBottom:6,fontSize:"0.7rem" }}>
            {categories.map(c=>(<option key={c.id} value={c.id} style={{ background:"#0f0f1c" }}>{c.name}</option>))}
          </select>
          <div style={{ display:"flex",gap:6 }}>
            <input value={label} onChange={e=>setLabel(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submitHabit()} placeholder="Habit name..." className="h-input" style={{ flex:1 }}/>
            <button onClick={submitHabit} className="grad-btn">Add</button>
          </div>
        </>
      ):(
        <div style={{ display:"flex",gap:6,alignItems:"center" }}>
          <div style={{ position:"relative" }}>
            <button onClick={()=>setShowEmoji(v=>!v)} style={{ background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:6,padding:"6px 8px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",width:34,height:34,color:"rgba(255,255,255,0.7)" }}>
              <div style={{width:16,height:16}}>{ALL_ICONS[catIcon]??ALL_ICONS["default"]}</div>
            </button>
            {showEmoji&&<EmojiPicker onSelect={e=>setCatIcon(e)} onClose={()=>setShowEmoji(false)}/>}
          </div>
          <input value={catName} onChange={e=>setCatName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submitCat()} placeholder="Category name..." className="h-input" style={{ flex:1 }}/>
          <button onClick={submitCat} className="grad-btn">Add</button>
        </div>
      )}
    </div>
  );
}

// ─── DayCard ──────────────────────────────────────────────────────────────────
function DayCard({ entry,onToggleHabit,onToggleCollapse,onAddHabit,onDeleteHabit,onCheckAll,onEditCat,onDeleteCat,onAddCategory }: {
  entry:DayEntry;onToggleHabit:(ds:string,catId:string,hId:string)=>void;onToggleCollapse:(ds:string,catId:string)=>void;
  onAddHabit:(ds:string,catId:string,label:string)=>void;onDeleteHabit:(ds:string,catId:string,hId:string)=>void;
  onCheckAll:(ds:string,catId:string)=>void;onEditCat:(ds:string,catId:string,name:string,icon:string)=>void;
  onDeleteCat:(ds:string,catId:string)=>void;onAddCategory:(ds:string,name:string,icon:string)=>void;
}) {
  const [showAdd,setShowAdd]=useState(false);
  const p=pct(entry.categories);
  const dd=entry.date.getDate(), mm=MONTHS[entry.date.getMonth()];
  return (
    <div style={{ background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:12,display:"flex",flexDirection:"column",height:"100%" }}>
      <div style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 14px",background:entry.bg,borderRadius:"11px 11px 0 0",borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ width:9,height:9,borderRadius:"50%",flexShrink:0,background:entry.dot,boxShadow:`0 0 8px ${entry.dot}88` }}/>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"var(--font)",fontWeight:700,fontSize:"0.84rem",letterSpacing:"0.08em",color:"#fff",textTransform:"uppercase" }}>{entry.dayName}</div>
          <div style={{ fontFamily:"var(--font)",fontSize:"0.62rem",fontWeight:500,color:"rgba(255,255,255,0.45)",marginTop:1 }}>{dd} {mm}</div>
        </div>
        <span style={{ fontFamily:"var(--font)",fontSize:"0.72rem",fontWeight:600,color:"rgba(255,255,255,0.65)" }}>
          {entry.categories.flatMap(c=>c.habits).filter(h=>h.done).length}
          <span style={{ color:"rgba(255,255,255,0.35)",fontWeight:400 }}>/{entry.categories.flatMap(c=>c.habits).length}</span>
        </span>
      </div>
      <div style={{ height:2,background:"rgba(255,255,255,0.04)" }}>
        <div className="prog-fill" style={{ width:`${p}%` }}/>
      </div>
      <div style={{ padding:10,flex:1,overflowY:"auto",textAlign:"left" }}>

        {entry.categories.map(cat=>(
          <CategoryBlock key={cat.id} category={cat}
            onToggleHabit={hId=>onToggleHabit(entry.dateStr,cat.id,hId)}
            onToggleCollapse={cId=>onToggleCollapse(entry.dateStr,cId)}
            onDeleteHabit={hId=>onDeleteHabit(entry.dateStr,cat.id,hId)}
            onCheckAll={cId=>onCheckAll(entry.dateStr,cId)}
            onEditCat={(cId,n,ic)=>onEditCat(entry.dateStr,cId,n,ic)}
            onDeleteCat={cId=>onDeleteCat(entry.dateStr,cId)}
          />
        ))}
        {showAdd
          ? <AddRow categories={entry.categories} onAdd={(cId,lbl)=>onAddHabit(entry.dateStr,cId,lbl)} onAddCategory={(n,ic)=>onAddCategory(entry.dateStr,n,ic)} onClose={()=>setShowAdd(false)}/>
          : <button className="ghost-btn" onClick={()=>setShowAdd(true)}>+ Add Habit / Category</button>
        }
      </div>
    </div>
  );
}

// ─── Charts ───────────────────────────────────────────────────────────────────
function LineGraph({ data,labels,activeIdx }: { data:number[];labels:string[];activeIdx:number }) {
  const W=460,H=180,PL=36,PR=16,PT=28,PB=36,gW=W-PL-PR,gH=H-PT-PB,n=data.length;
  const pts=data.map((v,i)=>({ x:n<2?PL+gW/2:PL+(i/(n-1))*gW, y:PT+gH-(v/100)*gH }));
  const lp=pts.length>1?pts.map((p,i)=>`${i===0?"M":"L"}${p.x},${p.y}`).join(" "):"";
  const ap=pts.length>1?`M${pts[0].x},${PT+gH} ${pts.map(p=>`L${p.x},${p.y}`).join(" ")} L${pts[n-1].x},${PT+gH} Z`:"";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%",height:"100%",overflow:"visible" }}>
      <defs>
        <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#C36BFF"/><stop offset="50%" stopColor="#4A90FF"/><stop offset="100%" stopColor="#28D7FF"/></linearGradient>
        <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4A90FF" stopOpacity="0.2"/><stop offset="100%" stopColor="#4A90FF" stopOpacity="0"/></linearGradient>
        <filter id="lgw"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {[0,25,50,75,100].map(v=>{ const y=PT+gH-(v/100)*gH; return <g key={v}><line x1={PL} y1={y} x2={W-PR} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1"/><text x={PL-6} y={y+4} fill="rgba(255,255,255,0.4)" fontSize="10" textAnchor="end" fontFamily="Poppins,sans-serif">{v}</text></g>; })}
      {ap&&<path d={ap} fill="url(#ag)"/>}
      {lp&&<path d={lp} fill="none" stroke="url(#lg)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" filter="url(#lgw)"/>}
      {pts.map((p,i)=>(
        <g key={i}>
          {i===activeIdx&&<rect x={p.x-16} y={PT} width={32} height={gH} fill="rgba(195,107,255,0.08)" rx="4"/>}
          <circle cx={p.x} cy={p.y} r={i===activeIdx?6:4} fill={i===activeIdx?"#C36BFF":"#0f0f1c"} stroke={i===activeIdx?"#C36BFF":"url(#lg)"} strokeWidth="2"/>
          <text x={p.x} y={p.y-12} fill={i===activeIdx?"#d48aff":"rgba(255,255,255,0.65)"} fontSize="11" textAnchor="middle" fontFamily="Poppins,sans-serif" fontWeight={i===activeIdx?"700":"500"}>{data[i]}%</text>
          <text x={p.x} y={H-4} fill={i===activeIdx?"#28D7FF":"rgba(255,255,255,0.45)"} fontSize="11" textAnchor="middle" fontFamily="Poppins,sans-serif" fontWeight={i===activeIdx?"700":"500"}>{labels[i]}</text>
        </g>
      ))}
    </svg>
  );
}

function BarGraph({ entries }: { entries:{label:string;date:string;value:number}[] }) {
  const W=400,H=180,PL=36,PR=16,PT=28,PB=44,gW=W-PL-PR,gH=H-PT-PB,n=entries.length;
  const slot=n>0?gW/n:gW, barW=Math.min(36,slot*0.55);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%",height:"100%",overflow:"visible" }}>
      <defs>
        <linearGradient id="bg1" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#C36BFF"/><stop offset="100%" stopColor="#4A90FF"/></linearGradient>
        <linearGradient id="bg2" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#4A90FF"/><stop offset="100%" stopColor="#28D7FF"/></linearGradient>
        <filter id="bgw"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {[0,25,50,75,100].map(v=>{ const y=PT+gH-(v/100)*gH; return <g key={v}><line x1={PL} y1={y} x2={W-PR} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1"/><text x={PL-6} y={y+4} fill="rgba(255,255,255,0.4)" fontSize="10" textAnchor="end" fontFamily="Poppins,sans-serif">{v}</text></g>; })}
      <line x1={PL} y1={PT+gH} x2={W-PR} y2={PT+gH} stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
      {entries.map((e,i)=>{
        const x=PL+slot*i+slot/2, barH=(e.value/100)*gH, barY=PT+gH-barH, grad=i%2===0?"url(#bg1)":"url(#bg2)", dp=e.date.split(" ");
        return (
          <g key={i}>
            <rect x={x-barW/2} y={PT} width={barW} height={gH} fill="rgba(255,255,255,0.04)" rx="5"/>
            {barH>0&&<rect x={x-barW/2} y={barY} width={barW} height={barH} fill={grad} rx="5" filter="url(#bgw)" opacity="0.9"/>}
            <text x={x} y={Math.min(barY-8,PT+gH-4)} fill="rgba(255,255,255,0.8)" fontSize="11" fontWeight="600" textAnchor="middle" fontFamily="Poppins,sans-serif">{e.value}%</text>
            <text x={x} y={PT+gH+16} fill="rgba(255,255,255,0.7)" fontSize="11" fontWeight="600" textAnchor="middle" fontFamily="Poppins,sans-serif">{e.label.slice(0,3)}</text>
            <text x={x} y={PT+gH+28} fill="rgba(255,255,255,0.4)" fontSize="10" textAnchor="middle" fontFamily="Poppins,sans-serif">{dp[0]} {dp[1]}</text>
          </g>
        );
      })}
    </svg>
  );
}

function DonutChart({ percent }: { percent:number }) {
  const R=48,cx=65,cy=65,sw=11,circ=2*Math.PI*R;
  return (
    <svg viewBox="0 0 130 130" style={{ width:"100%",height:"100%" }}>
      <defs>
        <linearGradient id="dg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#C36BFF"/><stop offset="50%" stopColor="#4A90FF"/><stop offset="100%" stopColor="#28D7FF"/></linearGradient>
        <filter id="dgw"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw}/>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="url(#dg)" strokeWidth={sw} strokeDasharray={`${(percent/100)*circ} ${circ}`} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} filter="url(#dgw)"/>
      <text x={cx} y={cy-6} textAnchor="middle" fill="#fff" fontSize="20" fontWeight="800" fontFamily="Poppins,sans-serif">{percent}%</text>
      <text x={cx} y={cy+9} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="8" fontFamily="Poppins,sans-serif">COMPLETE</text>
      <text x={cx} y={cy+20} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="7" fontFamily="Poppins,sans-serif">this week</text>
    </svg>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HabitTrackerPage() {
  const now = new Date();
  const [selYear,  setSelYear]  = useState(now.getFullYear()<2026?2026:now.getFullYear());
  const [selMonth, setSelMonth] = useState(now.getMonth());
  const [selWeek,  setSelWeek]  = useState(0);
  const [store,    setStore]    = useState<Record<string,{categories:Category[]}>>({});
  const [userId,   setUserId]   = useState<string|null>(null);
  const userIdRef = useRef<string|null>(null);
  const saveTimer = useRef<any>(null);

  // ── Load + realtime sync ──
  useEffect(()=>{
    let channel: any = null;

    // Show local cache instantly
    let localStore: any = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) { localStore = JSON.parse(raw); setStore(localStore); }
    } catch(e) {}

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      const uid = session.user.id;
      setUserId(uid);
      userIdRef.current = uid;
      userIdRef.current = uid;

      // Initial load from Supabase
      loadHabits(uid).then(dbStore => {
        if (dbStore && Object.keys(dbStore).length > 0) {
          setStore(dbStore);
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(dbStore)); } catch(e) {}
        } else if (localStore && Object.keys(localStore).length > 0) {
          saveHabits(uid, localStore);
        }
      });

      // Realtime subscription — listen for changes from other devices
      channel = supabase
        .channel('habits-sync')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'habits_store',
          filter: `user_id=eq.${uid}`,
        }, (payload: any) => {
          if (payload.new?.store) {
            setStore(payload.new.store);
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload.new.store)); } catch(e) {}
          }
        })
        .subscribe();
    });

    return () => { if (channel) supabase.removeChannel(channel); };
  },[]);

  // Save to Supabase debounced

  const weeksInMonth     = useMemo(()=>getWeeksInMonth(selYear,selMonth),[selYear,selMonth]);
  const safeWeek         = Math.min(selWeek, weeksInMonth.length-1);
  const currentWeekDates = weeksInMonth[safeWeek]??[];

  const dayEntries: DayEntry[] = currentWeekDates.map(date=>{
    const ds=dateKey(date), name=JS_DAY_TO_NAME[date.getDay()];
    const saved = store[ds]?.categories;
    return { dayName:name,date,dateStr:ds,...DAY_META[name],categories:(saved && saved.length>0)?saved:DEFAULT_CATS(ds) };
  });

  const updateDay = useCallback((ds:string,fn:(c:Category[])=>Category[])=>{
    setStore(p=>{
      const existing = p[ds]?.categories;
      const base = (existing && existing.length>0) ? existing : DEFAULT_CATS(ds);
      const newCats = fn(base);
      const newStore = { ...p,[ds]:{ categories:newCats } };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newStore)); } catch(e){}
      // Use ref to save - always has latest userId
      const uid = userIdRef.current;
      if (uid) {
        saveHabits(uid, newStore).then(r => {
          if (r.error) console.error("Supabase save failed:", r.error.message);
          else console.log("Saved to Supabase ok");
        });
      } else {
        console.warn("No userId - not saving to Supabase");
      }
      return newStore;
    });
  },[]);

  const toggleHabit    = useCallback((ds:string,catId:string,hId:string)=>{ updateDay(ds,cats=>cats.map(c=>c.id!==catId?c:{...c,habits:c.habits.map(h=>h.id!==hId?h:{...h,done:!h.done})})); },[updateDay]);
  const toggleCollapse = useCallback((ds:string,catId:string)=>{ updateDay(ds,cats=>cats.map(c=>c.id!==catId?c:{...c,collapsed:!c.collapsed})); },[updateDay]);
  const addHabit       = useCallback((ds:string,catId:string,label:string)=>{ updateDay(ds,cats=>cats.map(c=>c.id!==catId?c:{...c,habits:[...c.habits,{id:uid(),label,done:false}]})); },[updateDay]);
  const deleteHabit    = useCallback((ds:string,catId:string,hId:string)=>{ updateDay(ds,cats=>cats.map(c=>c.id!==catId?c:{...c,habits:c.habits.filter(h=>h.id!==hId)})); },[updateDay]);
  const checkAll       = useCallback((ds:string,catId:string)=>{ updateDay(ds,cats=>cats.map(c=>{ if(c.id!==catId)return c; const a=c.habits.every(h=>h.done); return {...c,habits:c.habits.map(h=>({...h,done:!a}))}; })); },[updateDay]);
  const editCat        = useCallback((ds:string,catId:string,name:string,icon:string)=>{ updateDay(ds,cats=>cats.map(c=>c.id!==catId?c:{...c,name,icon})); },[updateDay]);
  const deleteCat      = useCallback((ds:string,catId:string)=>{ updateDay(ds,cats=>cats.filter(c=>c.id!==catId)); },[updateDay]);
  const addCategory    = useCallback((ds:string,name:string,icon:string)=>{ updateDay(ds,cats=>[...cats,{id:`${ds}-${uid()}`,name:name.toUpperCase(),icon,collapsed:false,habits:[]}]); },[updateDay]);

  const allHabits = dayEntries.flatMap(d=>d.categories.flatMap(c=>c.habits));
  const totalDone = allHabits.filter(h=>h.done).length;
  const weekPct   = allHabits.length?Math.round(totalDone/allHabits.length*100):0;

  const monthGraphData = useMemo(()=>weeksInMonth.map(wDates=>{
    const allH=wDates.flatMap(d=>{ const ds=dateKey(d); return (store[ds]?.categories??DEFAULT_CATS(ds)).flatMap(c=>c.habits); });
    return allH.length?Math.round(allH.filter(h=>h.done).length/allH.length*100):0;
  }),[store,weeksInMonth]);

  const graphLabels = weeksInMonth.map((_,i)=>`W${i+1}`);

  const weekBarData = useMemo(()=>currentWeekDates.map(date=>{
    const ds=dateKey(date), cats=store[ds]?.categories??DEFAULT_CATS(ds), all=cats.flatMap(c=>c.habits);
    return { label:JS_DAY_TO_NAME[date.getDay()],date:`${date.getDate()} ${MONTHS[date.getMonth()]}`,value:all.length?Math.round(all.filter(h=>h.done).length/all.length*100):0 };
  }),[store,currentWeekDates]);

  const weekDates  = weeksInMonth[safeWeek]??[];
  const rangeLabel = weekDates.length>0?`${weekDates[0].getDate()} ${MONTHS[weekDates[0].getMonth()]} – ${weekDates[weekDates.length-1].getDate()} ${MONTHS[weekDates[weekDates.length-1].getMonth()]}`:"";
  const ROW_DAYS=[["Monday","Tuesday","Wednesday"],["Thursday","Friday","Saturday"],["Sunday"]];
  const getEntry=(d:string)=>dayEntries.find(e=>e.dayName===d)??null;

  return (
    <div style={{ minHeight:"100vh",background:"var(--bg)" }}>
      {/* ── Header ── */}
      <header style={{ position:"sticky",top:0,zIndex:50,padding:"10px 16px",background:"rgba(8,8,15,0.97)",backdropFilter:"blur(16px)",borderBottom:"1px solid var(--border)" }}>
        <div className="habit-tracker-header" style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
          <div style={{ display:"flex",alignItems:"center",gap:14 }}>
            <button onClick={()=>window.location.href="/choose"} style={{ background:"none",border:"1px solid var(--border)",borderRadius:7,color:"var(--text-muted)",padding:"5px 12px",cursor:"pointer",fontFamily:"var(--font)",fontSize:"0.7rem",fontWeight:600,letterSpacing:"0.06em",transition:"all 0.18s" }}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor="var(--grad-start)";(e.currentTarget as HTMLElement).style.color="var(--grad-start)";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor="var(--border)";(e.currentTarget as HTMLElement).style.color="var(--text-muted)";}}
            >← Home</button>
            <div>
              <div style={{ display:"flex",alignItems:"baseline",gap:7 }}>
                <span className="logo-habit">HABIT</span><span className="logo-tracker">TRACKER</span>
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:5,marginTop:2 }}>
                <span style={{ fontSize:"0.55rem",background:"var(--gradient)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>✦</span>
                <span className="logo-sub">Consistency Protocol</span>
              </div>
            </div>
          </div>
          <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4 }}>
            <span style={{ fontFamily:"var(--font)",fontSize:"0.62rem",fontWeight:600,color:"var(--text-muted)",letterSpacing:"0.08em" }}>{rangeLabel} · {totalDone}/{allHabits.length} done</span>
            <div style={{ width:120,height:3,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden" }}>
              <div className="prog-fill" style={{ width:`${weekPct}%` }}/>
            </div>
          </div>
        </div>
        <div className="habit-tracker-selectors" style={{ display:"flex",alignItems:"center",gap:10,flexWrap:"wrap" }}>
          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
            <span style={{ fontFamily:"var(--font)",fontSize:"0.58rem",fontWeight:700,letterSpacing:"0.12em",color:"var(--text-muted)",textTransform:"uppercase" }}>Year</span>
            <select value={selYear} onChange={e=>{ setSelYear(Number(e.target.value));setSelWeek(0); }} style={{ fontFamily:"var(--font)",fontSize:"0.78rem",fontWeight:600,padding:"5px 32px 5px 12px",borderRadius:7,border:"1px solid var(--grad-start)",background:"rgba(195,107,255,0.12)",color:"var(--grad-start)",cursor:"pointer",outline:"none",appearance:"none",WebkitAppearance:"none",backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23C36BFF' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,backgroundRepeat:"no-repeat",backgroundPosition:"right 10px center" }}>
              {YEARS.map(y=>(<option key={y} value={y} style={{ background:"#12121e",color:"#e8e8f0" }}>{y}</option>))}
            </select>
          </div>
          <div style={{ width:1,height:28,background:"var(--border)" }}/>
          <div style={{ display:"flex",alignItems:"center",gap:6 }}>
            <span style={{ fontFamily:"var(--font)",fontSize:"0.58rem",fontWeight:700,letterSpacing:"0.12em",color:"var(--text-muted)",textTransform:"uppercase",minWidth:36 }}>Month</span>
            <div style={{ display:"flex",gap:3,flexWrap:"wrap",maxWidth:"calc(100vw - 120px)",overflowX:"auto" }}>
              {MONTHS.map((m,i)=>(<button key={m} onClick={()=>{ setSelMonth(i);setSelWeek(0); }} style={{ fontFamily:"var(--font)",fontSize:"0.68rem",fontWeight:600,padding:"3px 8px",borderRadius:5,border:"1px solid",cursor:"pointer",transition:"all 0.18s",borderColor:selMonth===i?"var(--grad-mid)":"var(--border)",background:selMonth===i?"rgba(74,144,255,0.14)":"transparent",color:selMonth===i?"var(--grad-mid)":"var(--text-muted)" }}>{m}</button>))}
            </div>
          </div>
          <div style={{ width:1,height:28,background:"var(--border)" }}/>
          <div style={{ display:"flex",alignItems:"center",gap:6 }}>
            <span style={{ fontFamily:"var(--font)",fontSize:"0.58rem",fontWeight:700,letterSpacing:"0.12em",color:"var(--text-muted)",textTransform:"uppercase",minWidth:30 }}>Week</span>
            <div style={{ display:"flex",gap:4 }}>
              {weeksInMonth.map((wDates,i)=>{ const s=wDates[0].getDate(),e=wDates[wDates.length-1].getDate(); return (
                <button key={i} onClick={()=>setSelWeek(i)} style={{ fontFamily:"var(--font)",fontSize:"0.68rem",fontWeight:600,padding:"4px 10px",borderRadius:5,border:"1px solid",cursor:"pointer",transition:"all 0.18s",borderColor:safeWeek===i?"var(--grad-end)":"var(--border)",background:safeWeek===i?"rgba(40,215,255,0.12)":"transparent",color:safeWeek===i?"var(--grad-end)":"var(--text-muted)" }}>
                  W{i+1}<span style={{ fontSize:"0.55rem",marginLeft:3,opacity:0.6 }}>{s}–{e}</span>
                </button>
              ); })}
            </div>
          </div>
        </div>
      </header>

      {/* ── Analytics ── */}
      <section className="habit-tracker-analytics" style={{ margin:"16px 12px 0",background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:14,padding:"14px 16px",display:"grid",gridTemplateColumns:"1fr 1px 1fr 1px auto",gap:"0 16px",alignItems:"stretch" }}>
        <div className="analytics-line-chart">
          <div style={{ display:"flex",alignItems:"baseline",gap:7,marginBottom:8 }}>
            <span style={{ fontFamily:"var(--font)",fontSize:"0.76rem",fontWeight:700,color:"var(--text)" }}>Monthly</span>
            <span style={{ fontFamily:"var(--font)",fontSize:"0.72rem",fontWeight:500,color:"rgba(255,255,255,0.6)" }}>{MONTHS[selMonth]} {selYear} · line per week</span>
          </div>
          <div style={{ height:180 }}><LineGraph data={monthGraphData} labels={graphLabels} activeIdx={safeWeek}/></div>
        </div>
        <div className="analytics-divider habit-tracker-analytics-divider" style={{ background:"var(--border)" }}/>
        <div className="analytics-bar-chart">
          <div style={{ display:"flex",alignItems:"baseline",gap:7,marginBottom:8 }}>
            <span style={{ fontFamily:"var(--font)",fontSize:"0.76rem",fontWeight:700,color:"var(--text)" }}>Week {safeWeek+1}</span>
            <span style={{ fontFamily:"var(--font)",fontSize:"0.72rem",fontWeight:500,color:"rgba(255,255,255,0.6)" }}>{rangeLabel} · bar per day</span>
          </div>
          <div style={{ height:180 }}><BarGraph entries={weekBarData}/></div>
        </div>
        <div className="analytics-divider habit-tracker-analytics-divider" style={{ background:"var(--border)" }}/>
        <div className="analytics-donut" style={{ width:140,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4 }}>
          <span style={{ fontFamily:"var(--font)",fontSize:"0.68rem",fontWeight:700,color:"var(--text)" }}>{MONTHS[selMonth]} W{safeWeek+1}</span>
          <div style={{ width:130,height:130 }}><DonutChart percent={weekPct}/></div>
          <span style={{ fontFamily:"var(--font)",fontSize:"0.78rem",fontWeight:600,color:"rgba(255,255,255,0.65)",textAlign:"center" }}>{totalDone}/{allHabits.length} habits</span>
        </div>
      </section>

      {/* ── Habit Grid ── */}
      <main style={{ padding:"12px 12px 80px" }}>
        {ROW_DAYS.map((rowDays,rowIdx)=>{
          const rowEntries=rowDays.map(d=>getEntry(d)).filter(Boolean) as DayEntry[];
          if(!rowEntries.length) return null;
          return (
            <div key={rowIdx} style={{ marginBottom:14 }}>
              {rowIdx===2
                ? <div className="habit-tracker-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
                    <div/>{rowEntries.map(e=>(<DayCard key={e.dateStr} entry={e} onToggleHabit={toggleHabit} onToggleCollapse={toggleCollapse} onAddHabit={addHabit} onDeleteHabit={deleteHabit} onCheckAll={checkAll} onEditCat={editCat} onDeleteCat={deleteCat} onAddCategory={addCategory}/>))}<div/>
                  </div>
                : <div className="habit-tracker-grid" style={{ display:"grid",gridTemplateColumns:`repeat(${rowEntries.length},1fr)`,gap:14 }}>
                    {rowEntries.map(e=>(<DayCard key={e.dateStr} entry={e} onToggleHabit={toggleHabit} onToggleCollapse={toggleCollapse} onAddHabit={addHabit} onDeleteHabit={deleteHabit} onCheckAll={checkAll} onEditCat={editCat} onDeleteCat={deleteCat} onAddCategory={addCategory}/>))}
                  </div>
              }
            </div>
          );
        })}
      </main>

      <footer style={{ position:"fixed",bottom:0,left:0,right:0,padding:"8px 12px",textAlign:"center",background:"rgba(8,8,15,0.97)",backdropFilter:"blur(10px)",borderTop:"1px solid var(--border)" }}>
        <span style={{ fontFamily:"var(--font)",fontSize:"0.62rem",fontWeight:500,letterSpacing:"0.1em",color:"var(--text-muted)" }}>
          {MONTHS[selMonth]} {selYear} · Week {safeWeek+1} · {rangeLabel} · {weekPct}% complete · {totalDone}/{allHabits.length} done
        </span>
      </footer>
    </div>
  );
}