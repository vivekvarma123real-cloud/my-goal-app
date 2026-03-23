"use client";

import React from "react";
import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchGoals, upsertGoal, deleteGoalDb, upsertMilestones, upsertLog, deleteLogDb } from "@/lib/goalsDb";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
type Milestone = { id: string; text: string; done: boolean; doneAt?: string };
type DailyLog = {
  id: string;
  date: string;       // "YYYY-MM-DD"
  dateLabel: string;  // "15 Mar"
  hours?: number;
  topic: string;
  mood: "great" | "okay" | "tough";
};
type Goal = {
  id: string; title: string; category: string; deadline: string;
  why: string; milestones: Milestone[]; collapsed: boolean;
  priority: boolean; createdAt: string;
  logs: DailyLog[];
};

// Categories that support hour-based daily tracking
const HOUR_CATS = ["Career","Learning","Finance","Health"];
const REFLECTION_CATS = ["Spiritual","Relationship","Personal","Other"];
const logType = (cat: string) => HOUR_CATS.includes(cat) ? "hours" : "reflection";

// ─── Constants ────────────────────────────────────────────────────────────────
// SVG icons matching the dark circular style
const CAT_ICONS: Record<string,React.ReactNode> = {
  Finance: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v2m0 8v2M9.5 9.5C9.5 8.12 10.62 7 12 7s2.5 1.12 2.5 2.5c0 1.5-1.5 2-2.5 2.5-1 .5-2.5 1-2.5 2.5C9.5 15.88 10.62 17 12 17s2.5-1.12 2.5-2.5"/></svg>,
  Health: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 0 0 5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 1 0 5H18"/><path d="M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>,
  Learning: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  Career: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  Spiritual: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 8v8M8 12h8"/></svg>,
  Relationship: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  Personal: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  Other: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
};

const CATEGORIES = [
  { label:"Finance"      },
  { label:"Health"       },
  { label:"Learning"     },
  { label:"Career"       },
  { label:"Spiritual"    },
  { label:"Relationship" },
  { label:"Personal"     },
  { label:"Other"        },
];
const GRAD = "linear-gradient(135deg, #FF6A00, #ff9a3c)";
const GRAD2 = "linear-gradient(135deg, #FF6A00 0%, #ff4500 100%)";
const uid = () => Math.random().toString(36).slice(2,9);
const goalPct = (g: Goal) => !g.milestones.length ? 0 : Math.round(g.milestones.filter(m=>m.done).length/g.milestones.length*100);

// Deadline helpers
const daysLeft = (deadline: string) => {
  if (!deadline) return null;
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  return diff;
};
const deadlineLabel = (d: number | null) => {
  if (d === null) return null;
  if (d < 0)  return { text:`${Math.abs(d)}d overdue`, color:"#ff4444" };
  if (d === 0) return { text:"Due today!", color:"#ff4444" };
  if (d <= 3)  return { text:`${d}d left`, color:"#ff4444" };
  if (d <= 7)  return { text:`${d}d left`, color:"#FF6A00" };
  return { text:`${d}d left`, color:"#888" };
};

// Confetti burst
function Confetti({ onDone }: { onDone: ()=>void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const pieces = Array.from({length:120},()=>({
      x: Math.random()*canvas.width, y: Math.random()*canvas.height-canvas.height,
      r: Math.random()*6+3, d: Math.random()*120,
      color: ["#FF6A00","#ff9a3c","#fff","#ff4500","#ffcc00"][Math.floor(Math.random()*5)],
      tilt: Math.random()*10-10, tiltAngle:0, tiltSpeed: Math.random()*0.1+0.05,
    }));
    let frame = 0;
    const draw = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      pieces.forEach(p=>{
        p.tiltAngle += p.tiltSpeed; p.y += (Math.cos(p.d)+3+p.r/2)/2; p.tilt = Math.sin(p.tiltAngle)*15;
        ctx.beginPath(); ctx.lineWidth=p.r; ctx.strokeStyle=p.color;
        ctx.moveTo(p.x+p.tilt+p.r/4, p.y); ctx.lineTo(p.x+p.tilt, p.y+p.tilt+p.r/4);
        ctx.stroke();
      });
      frame++;
      if (frame < 200) requestAnimationFrame(draw); else onDone();
    };
    draw();
  },[onDone]);
  return <canvas ref={ref} style={{ position:"fixed",inset:0,zIndex:999,pointerEvents:"none" }}/>;
}

// Radar / balance chart
function RadarChart({ goals }: { goals: Goal[] }) {
  const size=200, cx=100, cy=100, r=58, n=CATEGORIES.length;
  const labels = ["Finance","Health","Learning","Career","Spiritual","Relation","Personal","Other"];
  const pcts = CATEGORIES.map(c=>{
    const cg = goals.filter(g=>g.category===c.label);
    return cg.length ? Math.round(cg.reduce((s,g)=>s+goalPct(g),0)/cg.length)/100 : 0;
  });
  const angle = (i:number) => (i/n)*Math.PI*2 - Math.PI/2;
  const pt = (i:number, ratio:number) => ({
    x: cx + Math.cos(angle(i))*r*ratio,
    y: cy + Math.sin(angle(i))*r*ratio,
  });
  const gridPts = (ratio:number) => CATEGORIES.map((_,i)=>pt(i,ratio)).map(p=>`${p.x},${p.y}`).join(" ");
  const dataPts = pcts.map((p,i)=>pt(i,Math.max(p,0.06))).map(p=>`${p.x},${p.y}`).join(" ");
  return (
    <svg width={size} height={size} viewBox={`-10 -10 ${size+20} ${size+20}`}>
      <defs>
        <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF6A00" stopOpacity="0.35"/>
          <stop offset="100%" stopColor="#FF6A00" stopOpacity="0.08"/>
        </radialGradient>
      </defs>
      {/* Grid rings */}
      {[0.25,0.5,0.75,1].map(r2=>(
        <polygon key={r2} points={gridPts(r2)} fill="none"
          stroke={r2===1?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.1)"}
          strokeWidth={r2===1?"1.5":"1"}/>
      ))}
      {/* Spokes */}
      {CATEGORIES.map((_,i)=>{
        const p=pt(i,1);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y}
          stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>;
      })}
      {/* Data polygon */}
      <polygon points={dataPts} fill="url(#radarFill)" stroke="#FF6A00" strokeWidth="2"
        style={{filter:"drop-shadow(0 0 6px rgba(255,106,0,0.4))"}}/>
      {/* Data dots */}
      {pcts.map((p,i)=>{
        const dp=pt(i,Math.max(p,0.06));
        return <circle key={i} cx={dp.x} cy={dp.y} r={p>0?4:2.5}
          fill={p>0?"#FF6A00":"#333"}
          stroke={p>0?"#ff9a3c":"#444"} strokeWidth="1"
          style={{filter:p>0?"drop-shadow(0 0 4px rgba(255,106,0,0.9))":"none"}}/>;
      })}
      {/* Labels */}
      {labels.map((lbl,i)=>{
        const lp=pt(i,1.42);
        return <text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle"
          fontSize="8.5" fill="rgba(255,255,255,0.6)" fontFamily="Poppins,sans-serif"
          fontWeight="600">{lbl}</text>;
      })}
    </svg>
  );
}

// Milestone row with timeline
function MilestoneRow({ m, index, total, onToggle, onDelete }: {
  m: Milestone; index: number; total: number; onToggle:()=>void; onDelete:()=>void;
}) {
  const isLast = index === total-1;
  return (
    <div style={{ display:"flex", gap:0, position:"relative" }}>
      <div style={{ display:"flex",flexDirection:"column",alignItems:"center",width:32,flexShrink:0 }}>
        <div onClick={onToggle} style={{
          width:26,height:26,borderRadius:"50%",flexShrink:0,
          border:`2px solid ${m.done?"#FF6A00":"#333"}`,
          background: m.done ? GRAD : "#0a0a0a",
          display:"flex",alignItems:"center",justifyContent:"center",
          cursor:"pointer",transition:"all 0.2s",
          boxShadow: m.done?"0 0 10px rgba(255,106,0,0.5)":"none",
          zIndex:1,position:"relative",
        }}>
          {m.done
            ? <span style={{color:"#fff",fontSize:"0.7rem",fontWeight:800,lineHeight:1}}>✓</span>
            : <span style={{color:"#666",fontSize:"0.65rem",fontWeight:700,lineHeight:1}}>{index+1}</span>
          }
        </div>
        {!isLast&&<div style={{width:2,flex:1,minHeight:14,background:m.done?"#FF6A00":"#2a2a2a",transition:"background 0.3s",margin:"2px 0"}}/>}
      </div>
      <div style={{ flex:1,paddingLeft:10,paddingBottom:isLast?0:14,paddingTop:3 }}>
        <div style={{ display:"flex",alignItems:"center",gap:6 }}>
          <span style={{
            fontFamily:"'Poppins',sans-serif",fontSize:"0.82rem",
            fontWeight:m.done?400:500,
            color:m.done?"#666":"#f0f0f0",
            textDecoration:m.done?"line-through":"none",
            flex:1,transition:"all 0.2s",
          }}>{m.text}</span>
          {m.done && m.doneAt && (
            <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.58rem",color:"#555"}}>{m.doneAt}</span>
          )}
          <button onClick={onDelete} style={{background:"none",border:"none",cursor:"pointer",color:"#444",fontSize:"0.6rem",opacity:0,transition:"opacity 0.15s",padding:"0 2px"}}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.opacity="1"}
            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.opacity="0"}
          >✕</button>
        </div>
      </div>
    </div>
  );
}


// ─── Daily Log Panel ──────────────────────────────────────────────────────────
function DailyLogPanel({ goal, onUpdate }: { goal: Goal; onUpdate:(g:Goal)=>void }) {
  const isHours = logType(goal.category) === "hours";
  const logs = goal.logs || [];
  const todayKey = new Date().toISOString().slice(0,10);
  const todayLabel = new Date().toLocaleDateString("en-GB",{day:"numeric",month:"short"});
  const todayLog = logs.find(l=>l.date===todayKey);

  const [hours, setHours] = useState(todayLog?.hours?.toString()||"");
  const [topic, setTopic] = useState(todayLog?.topic||"");
  const [mood, setMood] = useState<"great"|"okay"|"tough">(todayLog?.mood||"okay");
  const [saved, setSaved] = useState(false);

  const saveLog = () => {
    if (!topic.trim()) return;
    const newLog: DailyLog = {
      id: todayLog?.id || uid(),
      date: todayKey, dateLabel: todayLabel,
      hours: isHours ? parseFloat(hours)||0 : undefined,
      topic: topic.trim(), mood,
    };
    const updatedLogs = todayLog
      ? logs.map(l=>l.id===todayLog.id?newLog:l)
      : [newLog, ...logs];
    onUpdate({...goal, logs: updatedLogs});
    setSaved(true); setTimeout(()=>setSaved(false),1800);
  };

  const deleteLog = (id: string) => onUpdate({...goal, logs: logs.filter(l=>l.id!==id)});

  // Stats
  const totalHours = logs.reduce((s,l)=>s+(l.hours||0),0);
  const streak = (()=>{
    let s=0; const today=new Date();
    for(let i=0;i<30;i++){
      const d=new Date(today); d.setDate(d.getDate()-i);
      const key=d.toISOString().slice(0,10);
      if(logs.find(l=>l.date===key)) s++; else break;
    }
    return s;
  })();

  // Current week Mon→Sun
  const [hoveredPoint, setHoveredPoint] = useState<number|null>(null);
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today); monday.setDate(today.getDate() + mondayOffset);
  const weekDays = Array.from({length:7},(_,i)=>{
    const d = new Date(monday); d.setDate(monday.getDate()+i);
    const key = d.toISOString().slice(0,10);
    const log = logs.find(l=>l.date===key);
    return {
      key, date:d.getDate(),
      label:d.toLocaleDateString("en-GB",{weekday:"short"}).slice(0,2),
      fullLabel:d.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"short"}),
      hours:log?.hours||0, log, isToday:key===todayKey,
    };
  });
  const maxH = Math.max(...weekDays.map(d=>d.hours),1);
  // SVG line chart coords
  const LW=460,LH=70,LP=10;
  const lx=(i:number)=>LP+(i/6)*(LW-LP*2);
  const ly=(h:number)=>LH-LP-(h/maxH)*(LH-LP*2);
  const linePts=weekDays.map((d,i)=>`${lx(i)},${ly(d.hours)}`).join(" ");
  const areaPts=`${lx(0)},${LH-LP} ${linePts} ${lx(6)},${LH-LP}`;

  const moodColors = { great:"#4ade80", okay:"#FF6A00", tough:"#f87171" };
  const moodEmoji  = { great:"😤", okay:"🙂", tough:"😓" };

  const inp: React.CSSProperties = {
    background:"#111",border:"1px solid #222",borderRadius:7,color:"#e0e0e0",
    padding:"7px 11px",fontFamily:"'Poppins',sans-serif",fontSize:"0.78rem",
    outline:"none",transition:"border-color 0.18s",width:"100%",boxSizing:"border-box",
  };

  return (
    <div>
      {/* Stats row */}
      {logs.length>0 && (
        <div style={{display:"flex",gap:12,marginBottom:14}}>
          {isHours && (
            <div style={{background:"#111",border:"1px solid #1e1e1e",borderRadius:8,padding:"8px 14px",flex:1,textAlign:"center"}}>
              <div style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:"1.1rem",color:"#FF6A00"}}>{totalHours}h</div>
              <div style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.55rem",color:"#555",textTransform:"uppercase",letterSpacing:"0.1em"}}>Total Hours</div>
            </div>
          )}
          <div style={{background:"#111",border:"1px solid #1e1e1e",borderRadius:8,padding:"8px 14px",flex:1,textAlign:"center"}}>
            <div style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:"1.1rem",color:"#FF6A00"}}>🔥 {streak}</div>
            <div style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.55rem",color:"#555",textTransform:"uppercase",letterSpacing:"0.1em"}}>Day Streak</div>
          </div>
          <div style={{background:"#111",border:"1px solid #1e1e1e",borderRadius:8,padding:"8px 14px",flex:1,textAlign:"center"}}>
            <div style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:"1.1rem",color:"#FF6A00"}}>{logs.length}</div>
            <div style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.55rem",color:"#555",textTransform:"uppercase",letterSpacing:"0.1em"}}>Days Logged</div>
          </div>
        </div>
      )}

      {/* Weekly line chart */}
      {isHours && (
        <div style={{background:"#0d0d0d",border:"1px solid #1a1a1a",borderRadius:10,padding:"12px 14px",marginBottom:14,position:"relative"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.58rem",fontWeight:700,color:"#444",letterSpacing:"0.1em",textTransform:"uppercase"}}>This Week</span>
            <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.6rem",color:"#FF6A00",fontWeight:600}}>
              {monday.toLocaleDateString("en-GB",{day:"numeric",month:"short"})} — {weekDays[6].fullLabel.split(" ").slice(1).join(" ")}
            </span>
          </div>
          {/* Tooltip */}
          {hoveredPoint!==null && weekDays[hoveredPoint] && (
            <div style={{position:"absolute",top:8,right:10,background:"#1a1a1a",border:"1px solid rgba(255,106,0,0.4)",borderRadius:7,padding:"5px 10px",zIndex:10}}>
              <div style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.65rem",color:"#fff",fontWeight:700}}>{weekDays[hoveredPoint].hours}h</div>
              <div style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.55rem",color:"#888"}}>{weekDays[hoveredPoint].fullLabel}</div>
            </div>
          )}
          <svg width="100%" viewBox={`0 0 ${LW} ${LH+16}`} preserveAspectRatio="xMidYMid meet" style={{overflow:"visible"}}>
            <defs>
              <linearGradient id={`wg${goal.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FF6A00" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="#FF6A00" stopOpacity="0.02"/>
              </linearGradient>
            </defs>
            {[0,0.5,1].map(v=><line key={v} x1={LP} y1={ly(maxH*v)} x2={LW-LP} y2={ly(maxH*v)} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>)}
            <polygon points={areaPts} fill={`url(#wg${goal.id})`}/>
            <polyline points={linePts} fill="none" stroke="#FF6A00" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
            {weekDays.map((d,i)=>(
              <g key={i}>
                {/* invisible hit area */}
                <rect x={lx(i)-14} y={0} width={28} height={LH} fill="transparent" style={{cursor:"pointer"}}
                  onMouseEnter={()=>setHoveredPoint(i)} onMouseLeave={()=>setHoveredPoint(null)}/>
                {/* dot */}
                <circle cx={lx(i)} cy={ly(d.hours)} r={hoveredPoint===i?6:d.isToday?5:d.hours>0?3.5:2}
                  fill={d.hours>0||d.isToday?"#FF6A00":"#1e1e1e"}
                  stroke={d.isToday||hoveredPoint===i?"#fff":"transparent"} strokeWidth="1.5"
                  style={{transition:"r 0.15s",filter:d.isToday?"drop-shadow(0 0 5px rgba(255,106,0,0.8))":"none",cursor:"pointer"}}
                  onMouseEnter={()=>setHoveredPoint(i)} onMouseLeave={()=>setHoveredPoint(null)}/>
                {/* x label */}
                <text x={lx(i)} y={LH+13} textAnchor="middle" fill={d.isToday?"#FF6A00":"#333"} fontSize="8.5" fontFamily="Poppins,sans-serif" fontWeight={d.isToday?"700":"400"}>{d.label}</text>
              </g>
            ))}
          </svg>
        </div>
      )}

      {/* Today's log form */}
      <div style={{background:"rgba(255,106,0,0.04)",border:"1px solid rgba(255,106,0,0.12)",borderRadius:10,padding:"12px 14px",marginBottom:14}}>
        <div style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.6rem",fontWeight:700,color:"#FF6A00",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>
          📅 Today — {todayLabel} {todayLog?"(update)":""}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {isHours && (
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.72rem",color:"#888",whiteSpace:"nowrap"}}>Hours:</span>
              <input type="number" value={hours} onChange={e=>setHours(e.target.value)} placeholder="e.g. 3.5"
                style={{...inp,width:80}} min={0} max={24} step={0.5}
                onFocus={e=>(e.currentTarget as HTMLElement).style.borderColor="#FF6A00"}
                onBlur={e=>(e.currentTarget as HTMLElement).style.borderColor="#222"}
              />
            </div>
          )}
          <input value={topic} onChange={e=>setTopic(e.target.value)}
            placeholder={isHours?"What did you study / work on?":"Write your reflection for today..."}
            style={inp}
            onFocus={e=>(e.currentTarget as HTMLElement).style.borderColor="#FF6A00"}
            onBlur={e=>(e.currentTarget as HTMLElement).style.borderColor="#222"}
          />
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.72rem",color:"#888"}}>How was it?</span>
            {(["great","okay","tough"] as const).map(m=>(
              <button key={m} onClick={()=>setMood(m)} style={{
                background:mood===m?`${moodColors[m]}18`:"transparent",
                border:`1px solid ${mood===m?moodColors[m]:"#222"}`,
                borderRadius:6,padding:"3px 10px",cursor:"pointer",
                fontFamily:"'Poppins',sans-serif",fontSize:"0.7rem",fontWeight:600,
                color:mood===m?moodColors[m]:"#444",transition:"all 0.18s",
              }}>{moodEmoji[m]} {m}</button>
            ))}
            <button onClick={saveLog} style={{
              marginLeft:"auto",background:saved?"rgba(74,222,128,0.15)":GRAD,
              border:"none",borderRadius:6,color:"#fff",padding:"4px 14px",cursor:"pointer",
              fontFamily:"'Poppins',sans-serif",fontSize:"0.72rem",fontWeight:700,transition:"all 0.2s",
            }}>
              {saved?"✓ Saved!":"Save"}
            </button>
          </div>
        </div>
      </div>

      {/* Past logs */}
      {logs.filter(l=>l.date!==todayKey).slice(0,8).length>0 && (
        <div>
          <div style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.6rem",fontWeight:700,color:"#444",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>Past Entries</div>
          <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:200,overflowY:"auto"}}>
            {logs.filter(l=>l.date!==todayKey).map(log=>(
              <div key={log.id} style={{display:"flex",alignItems:"flex-start",gap:10,background:"#0d0d0d",border:"1px solid #1a1a1a",borderRadius:8,padding:"8px 10px"}}>
                <div style={{flexShrink:0,textAlign:"center",minWidth:36}}>
                  <div style={{fontFamily:"'Poppins',sans-serif",fontWeight:700,fontSize:"0.7rem",color:"#fff"}}>{log.dateLabel}</div>
                  {log.hours&&<div style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.6rem",color:"#FF6A00",fontWeight:700}}>{log.hours}h</div>}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.75rem",color:"#ccc"}}>{log.topic}</div>
                  <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.6rem",color:moodColors[log.mood]}}>{moodEmoji[log.mood]} {log.mood}</span>
                </div>
                <button onClick={()=>deleteLog(log.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#333",fontSize:"0.6rem",opacity:0,transition:"opacity 0.15s"}}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.opacity="1"}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.opacity="0"}
                >✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Daily Graph Panel ────────────────────────────────────────────────────────
function DailyGraphPanel({ goal }: { goal: Goal }) {
  const logs = goal.logs || [];
  const isHours = HOUR_CATS.includes(goal.category);
  const [hoveredMonth, setHoveredMonth] = useState<number|null>(null);
  const tk = new Date().toISOString().slice(0,10);

  const totalH = logs.reduce((s,l)=>s+(l.hours||0),0);
  const streak = (()=>{let s=0;const t=new Date();for(let i=0;i<60;i++){const d=new Date(t);d.setDate(d.getDate()-i);if(logs.find(l=>l.date===d.toISOString().slice(0,10)))s++;else break;}return s;})();
  const bestDay = Math.max(...logs.map(l=>l.hours||0),0);

  // Monthly hours from goal start to deadline
  const startDate = goal.createdAt ? goal.createdAt.slice(0,10) : new Date(Date.now()-30*86400000).toISOString().slice(0,10);
  const endDate = goal.deadline || new Date(Date.now()+180*86400000).toISOString().slice(0,10);
  const MNAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const monthlyData: {key:string;label:string;hours:number;days:number}[] = [];
  let mc = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth(), 1);
  const me = new Date(endDate);
  while(mc<=me){
    const y=mc.getFullYear(), m=mc.getMonth();
    const prefix=`${y}-${String(m+1).padStart(2,"0")}`;
    const mLogs=logs.filter(l=>l.date.startsWith(prefix));
    monthlyData.push({
      key:prefix,
      label:`${MNAMES[m]} ${y===new Date().getFullYear()?"":y}`.trim(),
      hours:mLogs.reduce((s,l)=>s+(l.hours||0),0),
      days:mLogs.length,
    });
    mc.setMonth(mc.getMonth()+1);
  }

  const maxMH = Math.max(...monthlyData.map(d=>d.hours),1);
  const W=560, H=100, pad=24;
  const n = monthlyData.length;
  const gx=(i:number)=>pad+(i/(Math.max(n-1,1)))*(W-pad*2);
  const gy=(h:number)=>H-16-(h/maxMH)*(H-16-8);
  const pts=monthlyData.map((d,i)=>`${gx(i)},${gy(d.hours)}`).join(" ");
  const area=`${gx(0)},${H-16} ${pts} ${gx(n-1)},${H-16}`;

  if(!logs.length) return <p style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.75rem",color:"#444",padding:"12px 0",fontStyle:"italic"}}>No data yet — start logging to see your graph.</p>;

  return (
    <div style={{paddingBottom:8}}>
      {/* Stats */}
      <div style={{display:"flex",gap:8,marginBottom:12}}>
        {[
          {v:isHours?`${totalH}h`:`${logs.length}`,l:"Total"},
          {v:`🔥 ${streak}`,l:"Streak"},
          {v:isHours?`${bestDay}h`:`${logs.filter(l=>l.mood==="great").length}`,l:isHours?"Best Day":"Great Days"},
        ].map(s=>(
          <div key={s.l} style={{flex:1,background:"#111",border:"1px solid #1a1a1a",borderRadius:8,padding:"8px",textAlign:"center"}}>
            <div style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:"1rem",background:"linear-gradient(90deg,#FF6A00,#ff9a3c)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{s.v}</div>
            <div style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.55rem",color:"#555",textTransform:"uppercase",letterSpacing:"0.08em",marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Monthly line chart */}
      <div style={{background:"#0d0d0d",border:"1px solid #1a1a1a",borderRadius:10,padding:"12px 10px 6px",position:"relative"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
          <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.55rem",fontWeight:700,color:"#333",letterSpacing:"0.1em",textTransform:"uppercase"}}>Monthly Hours — Full Goal Period</span>
          {hoveredMonth!==null&&monthlyData[hoveredMonth]&&(
            <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.65rem",fontWeight:700,color:"#FF6A00"}}>
              {monthlyData[hoveredMonth].label}: {monthlyData[hoveredMonth].hours}h ({monthlyData[hoveredMonth].days} days)
            </span>
          )}
        </div>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{overflow:"visible"}}>
          <defs>
            <linearGradient id={`mgr${goal.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FF6A00" stopOpacity="0.35"/>
              <stop offset="100%" stopColor="#FF6A00" stopOpacity="0.02"/>
            </linearGradient>
          </defs>
          {[0,0.5,1].map(v=>(
            <g key={v}>
              <line x1={pad} y1={gy(maxMH*v)} x2={W-pad} y2={gy(maxMH*v)} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
              <text x={pad-4} y={gy(maxMH*v)+4} textAnchor="end" fill="#2a2a2a" fontSize="8" fontFamily="Poppins,sans-serif">{Math.round(maxMH*v)}h</text>
            </g>
          ))}
          {n>1&&<polygon points={area} fill={`url(#mgr${goal.id})`}/>}
          {n>1&&<polyline points={pts} fill="none" stroke="#FF6A00" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>}
          {monthlyData.map((d,i)=>{
            const curMonth=tk.slice(0,7)===d.key;
            return (
              <g key={i}>
                <rect x={gx(i)-12} y={0} width={24} height={H-16} fill="transparent" style={{cursor:"pointer"}}
                  onMouseEnter={()=>setHoveredMonth(i)} onMouseLeave={()=>setHoveredMonth(null)}/>
                <circle cx={gx(i)} cy={gy(d.hours)} r={hoveredMonth===i?6:curMonth?5:d.hours>0?3.5:2}
                  fill={d.hours>0||curMonth?"#FF6A00":"#1e1e1e"}
                  stroke={curMonth||hoveredMonth===i?"#fff":"transparent"} strokeWidth="1.5"
                  style={{transition:"r 0.15s",filter:curMonth?"drop-shadow(0 0 5px rgba(255,106,0,0.8))":"none",cursor:"pointer"}}
                  onMouseEnter={()=>setHoveredMonth(i)} onMouseLeave={()=>setHoveredMonth(null)}/>
                {(i===0||i===n-1||i%3===0)&&(
                  <text x={gx(i)} y={H-2} textAnchor="middle" fill={curMonth?"#FF6A00":"#2a2a2a"} fontSize="8" fontFamily="Poppins,sans-serif" fontWeight={curMonth?"700":"400"}>{d.label}</text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Monthly breakdown list */}
      <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:5}}>
        {monthlyData.filter(m=>m.hours>0||m.days>0).map(m=>(
          <div key={m.key} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:"#0d0d0d",border:"1px solid #1a1a1a",borderRadius:7}}>
            <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.72rem",fontWeight:600,color:"#aaa",minWidth:56}}>{m.label}</span>
            <div style={{flex:1,height:4,background:"#1a1a1a",borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${(m.hours/maxMH)*100}%`,background:"linear-gradient(90deg,#FF6A00,#ff9a3c)",borderRadius:2,transition:"width 0.4s"}}/>
            </div>
            <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.7rem",fontWeight:700,color:"#FF6A00",minWidth:32,textAlign:"right"}}>{m.hours}h</span>
            <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.6rem",color:"#444",minWidth:40}}>{m.days} days</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Daily Heatmap Panel ───────────────────────────────────────────────────────
function DailyHeatmapPanel({ goal }: { goal: Goal }) {
  const [hoveredDate,setHoveredDate]=useState<string|null>(null);
  const logs = goal.logs || [];
  const tk = new Date().toISOString().slice(0,10);
  const startDate = goal.createdAt ? goal.createdAt.slice(0,10) : new Date(Date.now()-60*86400000).toISOString().slice(0,10);
  const endDate = goal.deadline || new Date(Date.now()+180*86400000).toISOString().slice(0,10);
  const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const heatMonths:{y:number;m:number;fd:number;days:{date:string;log:DailyLog|undefined}[]}[]=[];
  let mc=new Date(new Date(startDate).getFullYear(),new Date(startDate).getMonth(),1);
  const me=new Date(endDate);
  while(mc<=me){
    const y=mc.getFullYear(),m=mc.getMonth();
    const dim=new Date(y,m+1,0).getDate(),fd=new Date(y,m,1).getDay();
    heatMonths.push({y,m,fd,days:Array.from({length:dim},(_,i)=>{
      const ds=`${y}-${String(m+1).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`;
      return {date:ds,log:logs.find(l=>l.date===ds)};
    })});
    mc.setMonth(mc.getMonth()+1);
  }

  if(!logs.length) return <p style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.75rem",color:"#444",padding:"12px 0",fontStyle:"italic"}}>No data yet — log daily to fill your heatmap.</p>;

  return (
    <div style={{paddingBottom:8}}>
      <div style={{overflowX:"auto",paddingBottom:4}}>
        <div style={{display:"flex",gap:12,minWidth:"max-content"}}>
          {heatMonths.map(({y,m,fd,days})=>(
            <div key={`${y}-${m}`}>
              <div style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.55rem",fontWeight:700,color:"#444",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:5}}>{MONTHS[m]}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,11px)",gap:2}}>
                {["S","M","T","W","T","F","S"].map((d,i)=><div key={i} style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.42rem",color:"#2a2a2a",textAlign:"center",height:11,lineHeight:"11px"}}>{d}</div>)}
                {Array.from({length:fd}).map((_,i)=><div key={`e${i}`} style={{width:11,height:11}}/>)}
                {days.map((d:any)=>{
                  const intensity=d.log?.hours?Math.min(d.log.hours/6,1):(d.log?0.5:0);
                  const isToday=d.date===tk;
                  const isFuture=d.date>tk;
                  return (
                    <div key={d.date}
                      onMouseEnter={()=>d.log&&setHoveredDate(d.date)}
                      onMouseLeave={()=>setHoveredDate(null)}
                      style={{
                        width:11,height:11,borderRadius:2,cursor:d.log?"pointer":"default",
                        background:isFuture?"#0d0d0d":d.log?`rgba(255,106,0,${0.12+intensity*0.88})`:"#111",
                        border:isToday?"1px solid #FF6A00":hoveredDate===d.date?"1px solid rgba(255,106,0,0.5)":"1px solid transparent",
                        boxShadow:isToday?"0 0 4px rgba(255,106,0,0.5)":"none",
                        transition:"border 0.1s",
                      }}/>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.55rem",color:"#333"}}>Less</span>
          {[0.12,0.35,0.6,0.8,1].map(o=><div key={o} style={{width:10,height:10,borderRadius:2,background:`rgba(255,106,0,${o})`}}/>)}
          <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.55rem",color:"#333"}}>More</span>
        </div>
        {hoveredDate&&(()=>{
          const log=logs.find(l=>l.date===hoveredDate);
          return log?(
            <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.65rem",color:"#FF6A00",fontWeight:600,marginLeft:8}}>
              {new Date(hoveredDate).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}
              {log.hours?` · ${log.hours}h`:""}
              {log.topic?` · ${log.topic.slice(0,40)}${log.topic.length>40?"...":""}` : ""}
            </span>
          ):null;
        })()}
      </div>
    </div>
  );
}

// Goal Card
function GoalCard({ goal, onUpdate, onDelete, onComplete }: {
  goal: Goal; onUpdate:(g:Goal)=>void; onDelete:(id:string)=>void; onComplete:()=>void;
}) {
  const [newMs, setNewMs] = useState("");
  const [activeTab, setActiveTab] = useState<"Steps"|"Daily Log"|"Graph"|"Heatmap">("Steps");
  const p = goalPct(goal);
  const cat = CATEGORIES.find(c=>c.label===goal.category)??CATEGORIES[7];
  const dl = deadlineLabel(daysLeft(goal.deadline));
  const wasDone = useRef(p===100);

  useEffect(()=>{ if(p===100 && !wasDone.current){ onComplete(); wasDone.current=true; } if(p<100) wasDone.current=false; },[p]);

  const toggleMs = (mId:string) => onUpdate({...goal, milestones:goal.milestones.map(m=>m.id!==mId?m:{
    ...m, done:!m.done, doneAt:!m.done ? new Date().toLocaleDateString("en-GB",{day:"numeric",month:"short"}) : undefined
  })});
  const deleteMs = (mId:string) => onUpdate({...goal,milestones:goal.milestones.filter(m=>m.id!==mId)});
  const addMs    = () => { if(!newMs.trim())return; onUpdate({...goal,milestones:[...goal.milestones,{id:uid(),text:newMs.trim(),done:false}]}); setNewMs(""); };

  const R=20,circ=2*Math.PI*R;
  const isComplete = p===100;

  return (
    <div style={{
      background:"#0a0a0a",
      border:`1px solid ${goal.priority?"rgba(255,106,0,0.5)":isComplete?"rgba(255,106,0,0.3)":"#1a1a1a"}`,
      borderRadius:14, overflow:"hidden",
      borderLeft:`3px solid ${goal.priority?"#FF6A00":isComplete?"#ff9a3c":"#2a2a2a"}`,
      boxShadow: goal.priority ? "0 0 20px rgba(255,106,0,0.08)" : "none",
      transition:"all 0.3s",
    }}>
      {/* Priority banner */}
      {goal.priority&&(
        <div style={{background:GRAD,padding:"3px 14px",display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:"0.6rem"}}>◈</span>
          <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.6rem",fontWeight:800,color:"#fff",letterSpacing:"0.12em",textTransform:"uppercase"}}>Main Focus</span>
        </div>
      )}
      {/* Complete banner */}
      {isComplete&&!goal.priority&&(
        <div style={{background:"linear-gradient(90deg,rgba(255,106,0,0.15),transparent)",padding:"3px 14px",display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:"0.65rem",fontWeight:700,color:"#FF6A00"}}>✦</span>
          <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.6rem",fontWeight:700,color:"#FF6A00",letterSpacing:"0.1em"}}>GOAL ACHIEVED!</span>
        </div>
      )}

      {/* Header */}
      <div style={{padding:"14px 16px 10px",cursor:"pointer"}} onClick={()=>onUpdate({...goal,collapsed:!goal.collapsed})}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
          <div style={{width:24,height:24,color:"#FF6A00",flexShrink:0,marginTop:2}}>{CAT_ICONS[cat.label]}</div>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3,flexWrap:"wrap"}}>
              <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.6rem",fontWeight:700,
                background:GRAD,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
                letterSpacing:"0.12em",textTransform:"uppercase"}}>{goal.category}</span>
              {dl&&<span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.58rem",fontWeight:700,color:dl.color,
                background:dl.color==="rgba(255,255,255,0.55)"?"none":`${dl.color}18`,
                padding:"1px 6px",borderRadius:4}}>⏰ {dl.text}</span>}
              <button onClick={e=>{e.stopPropagation();onUpdate({...goal,priority:!goal.priority});}} style={{
                background:goal.priority?"rgba(255,106,0,0.15)":"transparent",
                border:`1px solid ${goal.priority?"rgba(255,106,0,0.4)":"#222"}`,
                borderRadius:5,padding:"1px 7px",cursor:"pointer",fontSize:"0.58rem",
                fontFamily:"'Poppins',sans-serif",fontWeight:600,
                color:goal.priority?"#FF6A00":"#444",transition:"all 0.18s",
              }}>◉ Focus</button>
            </div>
            <h3 style={{fontFamily:"'Poppins',sans-serif",fontWeight:700,fontSize:"1rem",color:"#fff",margin:0}}>{goal.title}</h3>
            {goal.why&&<p style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.75rem",color:"#aaa",margin:"4px 0 0",fontStyle:"italic"}}>"{goal.why}"</p>}
          </div>
          {/* Ring */}
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,flexShrink:0}}>
            <svg width="44" height="44" viewBox="0 0 44 44">
              <circle cx="22" cy="22" r={R} fill="none" stroke="#1a1a1a" strokeWidth="4"/>
              <circle cx="22" cy="22" r={R} fill="none" stroke="url(#gr1)" strokeWidth="4"
                strokeDasharray={`${(p/100)*circ} ${circ}`} strokeLinecap="round" transform="rotate(-90 22 22)"
                style={{filter:"drop-shadow(0 0 4px rgba(255,106,0,0.5))",transition:"stroke-dasharray 0.4s ease"}}/>
              <defs><linearGradient id="gr1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF6A00"/><stop offset="100%" stopColor="#ff9a3c"/>
              </linearGradient></defs>
              <text x="22" y="26" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="800" fontFamily="Poppins,sans-serif">{p}%</text>
            </svg>
            <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.58rem",color:"#aaa"}}>
              {goal.milestones.filter(m=>m.done).length}/{goal.milestones.length}
            </span>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{height:3,background:"#1a1a1a",borderRadius:2,marginTop:12,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${p}%`,background:GRAD,borderRadius:2,transition:"width 0.4s ease"}}/>
        </div>
      </div>

      {/* Body with tabs */}
      {!goal.collapsed&&(
        <div style={{padding:"0 14px 14px"}}>
          {/* Tab bar */}
          <div style={{borderTop:"1px solid #1a1a1a",paddingTop:10,marginBottom:12,display:"flex",alignItems:"center",gap:2}}>
            {(["Steps","Daily Log","Graph","Heatmap"] as const).map(tab=>(
              <button key={tab} onClick={()=>setActiveTab(tab)} style={{
                fontFamily:"'Poppins',sans-serif",fontSize:"0.65rem",fontWeight:700,
                padding:"4px 10px",borderRadius:6,border:"none",cursor:"pointer",
                transition:"all 0.18s",letterSpacing:"0.03em",
                background:activeTab===tab?"rgba(255,106,0,0.15)":"transparent",
                color:activeTab===tab?"#FF6A00":"#444",
              }}>{tab}</button>
            ))}
            <div style={{flex:1}}/>
            {activeTab==="Steps" && goal.milestones.length>0 && (
              <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.62rem",fontWeight:600,
                background:GRAD,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
                {goal.milestones.filter(m=>m.done).length}/{goal.milestones.length} done
              </span>
            )}
            {(activeTab==="Daily Log"||activeTab==="Graph"||activeTab==="Heatmap") && (
              <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.62rem",color:"#444"}}>
                {(goal.logs||[]).length} entries · {HOUR_CATS.includes(goal.category)?`${(goal.logs||[]).reduce((s,l)=>s+(l.hours||0),0)}h`:`${(goal.logs||[]).length} notes`}
              </span>
            )}
          </div>

          {/* STEPS TAB */}
          {activeTab==="Steps" && <>
            {goal.milestones.map((m,i)=>(
              <MilestoneRow key={m.id} m={m} index={i} total={goal.milestones.length} onToggle={()=>toggleMs(m.id)} onDelete={()=>deleteMs(m.id)}/>
            ))}
            {goal.milestones.length===0&&(
              <p style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.75rem",color:"#888",padding:"4px 10px 12px",fontStyle:"italic"}}>No steps yet — add your first step below</p>
            )}
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <input value={newMs} onChange={e=>setNewMs(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addMs()}
                placeholder="Add a step... (press Enter)" style={{
                  flex:1,background:"#111",border:"1px solid #222",borderRadius:7,
                  color:"#e0e0e0",padding:"6px 12px",fontFamily:"'Poppins',sans-serif",fontSize:"0.78rem",outline:"none",transition:"border-color 0.18s",
                }}
                onFocus={e=>(e.currentTarget as HTMLElement).style.borderColor="#FF6A00"}
                onBlur={e=>(e.currentTarget as HTMLElement).style.borderColor="#222"}
              />
              <button onClick={addMs} style={{background:GRAD,border:"none",borderRadius:7,color:"#fff",padding:"6px 14px",cursor:"pointer",fontFamily:"'Poppins',sans-serif",fontSize:"0.8rem",fontWeight:700}}>+</button>
            </div>
          </>}

          {/* DAILY LOG TAB */}
          {activeTab==="Daily Log" && (
            <DailyLogPanel goal={goal} onUpdate={onUpdate}/>
          )}

          {/* GRAPH TAB */}
          {activeTab==="Graph" && (
            <DailyGraphPanel goal={goal}/>
          )}

          {/* HEATMAP TAB */}
          {activeTab==="Heatmap" && (
            <DailyHeatmapPanel goal={goal}/>
          )}

          <button onClick={()=>onDelete(goal.id)} style={{
            marginTop:12,background:"none",border:"1px solid #1e1e1e",borderRadius:6,padding:"4px 12px",cursor:"pointer",
            fontFamily:"'Poppins',sans-serif",fontSize:"0.65rem",fontWeight:600,color:"#aaa",letterSpacing:"0.06em",transition:"all 0.18s",
          }}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor="#FF6A00";(e.currentTarget as HTMLElement).style.color="#FF6A00";}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor="#1e1e1e";(e.currentTarget as HTMLElement).style.color="#aaa";}}
          >Delete Goal</button>
        </div>
      )}
    </div>
  );
}

// Add Goal Drawer
function AddGoalModal({ onAdd, onClose }: { onAdd:(g:Goal)=>void; onClose:()=>void }) {
  const [title,setTitle]=useState(""); const [category,setCategory]=useState("Personal");
  const [deadline,setDeadline]=useState(""); const [why,setWhy]=useState("");
  const submit = () => {
    const t = title.trim();
    if (!t) return;
    const newGoal: Goal = {
      id: uid(),
      title: t,
      category,
      deadline,
      why: why.trim(),
      milestones: [],
      collapsed: false,
      priority: false,
      createdAt: "",
      logs: [],
    };
    onAdd(newGoal);
    onClose();
  };
  const lbl:React.CSSProperties={fontFamily:"'Poppins',sans-serif",fontSize:"0.62rem",fontWeight:700,color:"#888",letterSpacing:"0.1em",textTransform:"uppercase",display:"block",marginBottom:6};
  const inp:React.CSSProperties={background:"#111",border:"1px solid #2a2a2a",borderRadius:8,color:"#e0e0e0",padding:"9px 12px",width:"100%",fontFamily:"'Poppins',sans-serif",fontSize:"0.85rem",outline:"none",boxSizing:"border-box",transition:"border-color 0.18s"};
  return (
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:90,background:"rgba(0,0,0,0.4)"}}/>
      <div style={{position:"fixed",top:0,right:0,bottom:0,zIndex:100,width:380,background:"#0d0d0d",borderLeft:"1px solid #1e1e1e",boxShadow:"-8px 0 40px rgba(0,0,0,0.6)",display:"flex",flexDirection:"column",animation:"slideIn 0.25s ease"}}>
        <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
        <div style={{padding:"20px 24px 16px",borderBottom:"1px solid #1a1a1a",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <h2 style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:"1.1rem",color:"#fff",margin:0}}>New <span style={{background:GRAD,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Goal</span></h2>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.06)",border:"1px solid #2a2a2a",borderRadius:7,width:30,height:30,cursor:"pointer",color:"#888",fontSize:"0.9rem",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.18s"}}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor="#FF6A00";(e.currentTarget as HTMLElement).style.color="#FF6A00";}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor="#2a2a2a";(e.currentTarget as HTMLElement).style.color="#888";}}
          >✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"20px 24px",display:"flex",flexDirection:"column",gap:16}}>
          <div><label style={lbl}>Goal Title *</label><input value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="e.g. Crack GATE 2027" style={inp} autoFocus onFocus={e=>(e.currentTarget as HTMLElement).style.borderColor="#FF6A00"} onBlur={e=>(e.currentTarget as HTMLElement).style.borderColor="#2a2a2a"}/></div>
          <div><label style={lbl}>Category</label><select value={category} onChange={e=>setCategory(e.target.value)} style={{...inp,cursor:"pointer"}} onFocus={e=>(e.currentTarget as HTMLElement).style.borderColor="#FF6A00"} onBlur={e=>(e.currentTarget as HTMLElement).style.borderColor="#2a2a2a"}>{CATEGORIES.map(c=><option key={c.label} value={c.label} style={{background:"#111"}}>{c.label}</option>)}</select></div>
          <div><label style={lbl}>Deadline</label><input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)} style={{...inp,colorScheme:"dark"}} onFocus={e=>(e.currentTarget as HTMLElement).style.borderColor="#FF6A00"} onBlur={e=>(e.currentTarget as HTMLElement).style.borderColor="#2a2a2a"}/></div>
          <div><label style={lbl}>Why this goal?</label><input value={why} onChange={e=>setWhy(e.target.value)} placeholder="Your motivation..." style={inp} onFocus={e=>(e.currentTarget as HTMLElement).style.borderColor="#FF6A00"} onBlur={e=>(e.currentTarget as HTMLElement).style.borderColor="#2a2a2a"}/></div>
          {title&&<div style={{background:"#111",border:"1px solid #1e1e1e",borderLeft:"3px solid #FF6A00",borderRadius:10,padding:"12px 14px"}}>
            <p style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.6rem",fontWeight:700,background:GRAD,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"0.1em",textTransform:"uppercase",margin:"0 0 4px"}}>Preview</p>
            <p style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.9rem",fontWeight:700,color:"#fff",margin:0}}>{title}</p>
            {why&&<p style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.75rem",color:"#aaa",margin:"3px 0 0",fontStyle:"italic"}}>"{why}"</p>}
          </div>}
        </div>
        <div style={{padding:"16px 24px",borderTop:"1px solid #1a1a1a"}}>
          <button onClick={submit} style={{width:"100%",background:GRAD,border:"none",borderRadius:9,color:"#fff",padding:"12px 0",cursor:"pointer",fontFamily:"'Poppins',sans-serif",fontSize:"0.9rem",fontWeight:700,letterSpacing:"0.04em",transition:"opacity 0.18s",boxShadow:"0 4px 20px rgba(255,106,0,0.3)"}}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.opacity="0.88"}
            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.opacity="1"}
          >Create Goal →</button>
        </div>
      </div>
    </>
  );
}

// Life Areas Sidebar
function LifeAreasSidebar({ goals, filterCat, setFilterCat }: { goals:Goal[]; filterCat:string; setFilterCat:(c:string)=>void }) {
  return (
    <aside className="goal-planner-sidebar" style={{width:260,flexShrink:0,background:"#080808",borderRight:"1px solid #141414",minHeight:"calc(100vh - 57px)",position:"sticky",top:57,maxHeight:"calc(100vh - 57px)",overflowY:"auto",padding:"16px 12px",scrollbarWidth:"thin",scrollbarColor:"#FF6A00 #111"}}>
      <style>{`
        aside::-webkit-scrollbar { width: 3px; }
        aside::-webkit-scrollbar-track { background: #111; }
        aside::-webkit-scrollbar-thumb { background: #FF6A00; border-radius: 2px; }
      `}</style>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:18}}>
        <span style={{fontSize:"1rem",background:GRAD,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF6A00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        </span>
        <span style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:"0.7rem",color:"#fff",letterSpacing:"0.18em",textTransform:"uppercase"}}>Life Areas</span>
      </div>

      {/* Radar chart */}
      <div style={{display:"flex",justifyContent:"center",marginBottom:14,padding:"8px",background:"#0d0d0d",borderRadius:12,border:"1px solid #1a1a1a"}}>
        <RadarChart goals={goals}/>
      </div>

      {/* All */}
      <button onClick={()=>setFilterCat("All")} style={{width:"100%",marginBottom:10,padding:"10px 14px",borderRadius:10,border:`1px solid ${filterCat==="All"?"rgba(255,106,0,0.5)":"#1c1c1c"}`,background:filterCat==="All"?"rgba(255,106,0,0.1)":"#0e0e0e",cursor:"pointer",transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:"space-between"}}
        onMouseEnter={e=>{ if(filterCat!=="All"){(e.currentTarget as HTMLElement).style.background="#121212";}}}
        onMouseLeave={e=>{ if(filterCat!=="All"){(e.currentTarget as HTMLElement).style.background="#0e0e0e";}}}
      >
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:20,height:20,color:filterCat==="All"?"#FF6A00":"#888"}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          </div>
          <span style={{fontFamily:"'Poppins',sans-serif",fontWeight:700,fontSize:"0.82rem",color:filterCat==="All"?"#FF6A00":"#ddd"}}>All Goals</span>
        </div>
        <span style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:"0.9rem",color:filterCat==="All"?"#FF6A00":"#888"}}>{goals.length}</span>
      </button>

      {/* 2-col grid */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {CATEGORIES.map(cat=>{
          const cg=goals.filter(g=>g.category===cat.label);
          const cd=cg.filter(g=>goalPct(g)===100).length;
          const cp=cg.length?Math.round(cg.reduce((s,g)=>s+goalPct(g),0)/cg.length):0;
          const isActive=filterCat===cat.label;
          return (
            <button key={cat.label} onClick={()=>setFilterCat(cat.label)} style={{
              padding:"14px 10px 12px",borderRadius:12,
              border:`1px solid ${isActive?"rgba(255,106,0,0.5)":"#1c1c1c"}`,
              background:isActive?"rgba(255,106,0,0.09)":"#0e0e0e",
              cursor:"pointer",transition:"all 0.2s",
              display:"flex",flexDirection:"column",alignItems:"center",gap:6,
              position:"relative",overflow:"hidden",
            }}
              onMouseEnter={e=>{ if(!isActive){(e.currentTarget as HTMLElement).style.background="#121212";}}}
              onMouseLeave={e=>{ if(!isActive){(e.currentTarget as HTMLElement).style.background="#0e0e0e";}}}
            >
              <div style={{position:"absolute",bottom:0,left:0,right:0,height:2,background:"#1a1a1a"}}>
                <div style={{height:"100%",width:`${cp}%`,background:GRAD,transition:"width 0.4s",borderRadius:2}}/>
              </div>
              <div style={{width:50,height:50,borderRadius:14,background:isActive?"rgba(255,106,0,0.15)":"#1e1e1e",border:`1px solid ${isActive?"rgba(255,106,0,0.4)":"#2a2a2a"}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s",color:isActive?"#FF6A00":"#aaa"}}>
                <div style={{width:26,height:26}}>{CAT_ICONS[cat.label]}</div>
              </div>
              <span style={{fontFamily:"'Poppins',sans-serif",fontWeight:700,fontSize:"0.7rem",color:isActive?"#FF6A00":"#ddd"}}>{cat.label}</span>
              <span style={{fontFamily:"'Poppins',sans-serif",fontWeight:600,fontSize:"0.65rem",color:cg.length>0?(isActive?"#FF6A00":"#aaa"):"#444"}}>{cd}/{cg.length}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function GoalPlannerPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string|null>(null);
  const [goals,setGoals]         = useState<Goal[]>([]);
  const [showModal,setShowModal] = useState(false);
  const [filterCat,setFilterCat] = useState("All");
  const [confetti,setConfetti]   = useState(false);
  const [loading,setLoading] = useState(true);
  const [quote, setQuote] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(()=>{
    setMounted(true);
    setQuote(QUOTES[Math.floor(Math.random()*QUOTES.length)]);

    // Show cached goals instantly from localStorage
    try {
      const cached = localStorage.getItem("lifestack-goals-cache");
      if (cached) { setGoals(JSON.parse(cached)); setLoading(false); }
    } catch(e) {}

    // Then fetch fresh from Supabase in background
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = "/login"; return; }
      const uid = session.user.id;
      setUserId(uid);
      fetchGoals(uid).then(data => {
        setGoals(data as Goal[]);
        setLoading(false);
        // Update cache
        try { localStorage.setItem("lifestack-goals-cache", JSON.stringify(data)); } catch(e) {}
      });
    });
  },[]);

  const addGoal = useCallback(async (g:Goal)=>{
    if (!userId) return;
    setGoals(p=>{ const n=[g,...p]; try{localStorage.setItem("lifestack-goals-cache",JSON.stringify(n));}catch(e){} return n; });
    await upsertGoal(g, userId);
  },[userId]);

  const updateGoal = useCallback(async (g:Goal)=>{
    if (!userId) return;
    setGoals(p=>{ const n=p.map(x=>x.id!==g.id?x:g); try{localStorage.setItem("lifestack-goals-cache",JSON.stringify(n));}catch(e){} return n; });
    await upsertGoal(g, userId);
    await upsertMilestones(g.id, g.milestones, userId);
    for (const log of g.logs||[]) { await upsertLog(g.id, log, userId); }
  },[userId]);

  const deleteGoal = useCallback(async (id:string)=>{
    if (!userId) return;
    setGoals(p=>{ const n=p.filter(g=>g.id!==id); try{localStorage.setItem("lifestack-goals-cache",JSON.stringify(n));}catch(e){} return n; });
    await deleteGoalDb(id);
  },[userId]);

  // Sort: priority first, then incomplete, then complete
  const sortedGoals = [...goals].sort((a,b)=>{
    if(a.priority&&!b.priority) return -1;
    if(!a.priority&&b.priority) return 1;
    const pa=goalPct(a),pb=goalPct(b);
    if(pa===100&&pb!==100) return 1;
    if(pa!==100&&pb===100) return -1;
    return 0;
  });
  const filtered = filterCat==="All" ? sortedGoals : sortedGoals.filter(g=>g.category===filterCat);

  const totalGoals=goals.length, completedGoals=goals.filter(g=>goalPct(g)===100).length;
  const inProgress=goals.filter(g=>goalPct(g)>0&&goalPct(g)<100).length;
  const overallPct=goals.length?Math.round(goals.reduce((s,g)=>s+goalPct(g),0)/goals.length):0;
  const R=17,circ=2*Math.PI*R;

  // Don't block render — show shell immediately, goals appear when ready

  return (
    <div style={{minHeight:"100vh",background:"#000",fontFamily:"'Poppins',sans-serif",paddingTop:8}}>
      <style>{`
        * { scrollbar-width: thin; scrollbar-color: #FF6A00 #111; }
        *::-webkit-scrollbar { width: 3px; height: 3px; }
        *::-webkit-scrollbar-track { background: #111; }
        *::-webkit-scrollbar-thumb { background: #FF6A00; border-radius: 2px; }
      `}</style>
      {confetti&&<Confetti onDone={()=>setConfetti(false)}/>}

      {/* Header */}
      <header style={{position:"sticky",top:0,zIndex:50,background:"rgba(0,0,0,0.97)",backdropFilter:"blur(14px)",borderBottom:"1px solid #111",padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",minHeight:57,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <button onClick={()=>router.push("/choose")} style={{background:"none",border:"1px solid #1a1a1a",borderRadius:7,color:"#666",padding:"5px 12px",cursor:"pointer",fontFamily:"'Poppins',sans-serif",fontSize:"0.7rem",fontWeight:600,letterSpacing:"0.06em",transition:"all 0.18s"}}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor="#FF6A00";(e.currentTarget as HTMLElement).style.color="#FF6A00";}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor="#1a1a1a";(e.currentTarget as HTMLElement).style.color="#666";}}
          >← Home</button>
          <div>
            <div style={{display:"flex",alignItems:"baseline",gap:6}}>
              <span style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:"1.2rem",color:"#fff"}}>GOAL</span>
              <span style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:"1.2rem",background:GRAD,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>PLANNER</span>
            </div>
            <p style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.58rem",color:"#888",margin:0,letterSpacing:"0.06em"}}>Master your discipline. Design your future.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="goal-planner-header-stats" style={{display:"flex",alignItems:"center",gap:16,padding:"6px 0"}}>
          {[{label:"Total",value:totalGoals},{label:"Completed",value:completedGoals},{label:"In Progress",value:inProgress}].map(s=>(
            <div key={s.label} style={{textAlign:"center"}}>
              <div style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:"1.15rem",color:"#fff",lineHeight:1}}>{s.value}</div>
              <div style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.58rem",fontWeight:600,color:"#aaa",letterSpacing:"0.1em",textTransform:"uppercase",marginTop:3}}>{s.label}</div>
            </div>
          ))}
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <svg width="46" height="46" viewBox="0 0 46 46">
              <defs><linearGradient id="ogr" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#FF6A00"/><stop offset="100%" stopColor="#ff9a3c"/></linearGradient></defs>
              <circle cx="23" cy="23" r={R} fill="none" stroke="#222" strokeWidth="4.5"/>
              <circle cx="23" cy="23" r={R} fill="none" stroke="url(#ogr)" strokeWidth="4.5"
                strokeDasharray={`${(overallPct/100)*circ} ${circ}`} strokeLinecap="round" transform="rotate(-90 23 23)"
                style={{filter:"drop-shadow(0 0 4px rgba(255,106,0,0.55))",transition:"stroke-dasharray 0.5s"}}/>
              <text x="23" y="27" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="800" fontFamily="Poppins,sans-serif">{overallPct}%</text>
            </svg>
            <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.54rem",fontWeight:600,color:"#aaa",letterSpacing:"0.1em",textTransform:"uppercase"}}>Overall</span>
          </div>
          <div style={{width:1,height:32,background:"#1e1e1e",margin:"0 4px"}}/>
          <button onClick={()=>setShowModal(true)} style={{background:GRAD,border:"none",borderRadius:9,color:"#fff",padding:"9px 20px",cursor:"pointer",fontFamily:"'Poppins',sans-serif",fontSize:"0.82rem",fontWeight:700,letterSpacing:"0.04em",transition:"opacity 0.18s",boxShadow:"0 4px 16px rgba(255,106,0,0.3)"}}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.opacity="0.85"}
            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.opacity="1"}
          >+ New Goal</button>
        </div>
      </header>

      {/* Quote banner — only render client-side to avoid hydration mismatch */}
      {mounted && quote && (
        <div style={{background:"linear-gradient(90deg,rgba(255,106,0,0.08),rgba(255,154,60,0.04),transparent)",borderBottom:"1px solid rgba(255,106,0,0.1)",padding:"8px 24px 8px 284px",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:"0.75rem"}}>◆</span>
          <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.72rem",fontStyle:"italic",color:"#aaa"}}>{quote}</span>
        </div>
      )}

      {/* Body */}
      <div className="goal-planner-layout" style={{display:"flex",alignItems:"flex-start",height:"calc(100vh - 65px)",overflow:"hidden"}}>
        <LifeAreasSidebar goals={goals} filterCat={filterCat} setFilterCat={setFilterCat}/>
        <main className="goal-planner-main" style={{flex:1,padding:"20px 24px 48px",height:"100%",overflowY:"auto"}}>
          {filtered.length===0?(
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"60vh",gap:16,textAlign:"center"}}>
              <span style={{fontSize:"2rem",fontWeight:700,background:GRAD,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>◈</span>
              <h2 style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:"1.3rem",color:"#fff",margin:0}}>
                {filterCat==="All"?"No goals yet":`No ${filterCat} goals yet`}
              </h2>
              <p style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.82rem",color:"#aaa",maxWidth:300,lineHeight:1.6}}>
                {filterCat==="All"?"Create your first goal and break it into steps.":``}
              </p>
              <button onClick={()=>setShowModal(true)} style={{background:GRAD,border:"none",borderRadius:10,color:"#fff",padding:"11px 26px",cursor:"pointer",fontFamily:"'Poppins',sans-serif",fontSize:"0.88rem",fontWeight:700,transition:"opacity 0.18s",boxShadow:"0 4px 20px rgba(255,106,0,0.3)"}}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.opacity="0.85"}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.opacity="1"}
              >+ Create Goal</button>
            </div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(320px,100%),1fr))",gap:14}}>
              {filtered.map(g=>(
                <GoalCard key={g.id} goal={g} onUpdate={updateGoal} onDelete={deleteGoal} onComplete={()=>setConfetti(true)}/>
              ))}
            </div>
          )}
        </main>
      </div>
      {showModal&&<AddGoalModal onAdd={addGoal} onClose={()=>setShowModal(false)}/>}
      {/* Mobile floating add button */}
      <button className="goal-planner-add-btn" onClick={()=>setShowModal(true)} style={{display:"none",position:"fixed",bottom:16,right:16,zIndex:99,background:"linear-gradient(135deg,#FF6A00,#ff9a3c)",border:"none",borderRadius:"50px",color:"#fff",padding:"12px 20px",cursor:"pointer",fontFamily:"'Poppins',sans-serif",fontSize:"0.85rem",fontWeight:700,boxShadow:"0 4px 20px rgba(255,106,0,0.4)"}}>+ Goal</button>
    </div>
  );
}

const QUOTES = [
  "A goal without a plan is just a wish.",
  "The secret of getting ahead is getting started.",
  "Small daily improvements lead to stunning results.",
  "Discipline is choosing between what you want now and what you want most.",
  "Success is the sum of small efforts repeated day in and day out.",
  "You don't have to be great to start, but you have to start to be great.",
  "Focus on progress, not perfection.",
  "Your future is created by what you do today, not tomorrow.",
  "Dream big. Start small. Act now.",
  "The pain of discipline is far less than the pain of regret.",
];