"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const GRAD = "linear-gradient(135deg,#FF6A00,#ff9a3c)";
const GRAD_TEXT = "linear-gradient(90deg,#FF6A00,#ff9a3c)";
const HOUR_CATS = ["Career","Learning","Finance","Health"];
const uid = () => Math.random().toString(36).slice(2,9);

type DailyLog = { id:string; date:string; dateLabel:string; hours?:number; topic:string; mood:"great"|"okay"|"tough" };
type Goal = { id:string; title:string; category:string; deadline:string; why:string; milestones:any[]; collapsed:boolean; priority:boolean; createdAt:string; logs:DailyLog[] };

const moodColors = { great:"#4ade80", okay:"#FF6A00", tough:"#f87171" };
const moodEmoji  = { great:"😤", okay:"🙂", tough:"😓" };
const moodLabel  = { great:"Great", okay:"Okay", tough:"Tough" };

function getDatesInRange(start:string,end:string):string[]{
  const dates:string[]=[]; const s=new Date(start),e=new Date(end),cur=new Date(s);
  while(cur<=e){dates.push(cur.toISOString().slice(0,10));cur.setDate(cur.getDate()+1);}
  return dates;
}

function LogPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const goalId = params.get("id");
  const [goal,setGoal]=useState<Goal|null>(null);
  const [hours,setHours]=useState("");
  const [topic,setTopic]=useState("");
  const [mood,setMood]=useState<"great"|"okay"|"tough">("okay");
  const [saved,setSaved]=useState(false);
  const [hoverDay,setHoverDay]=useState<string|null>(null);

  useEffect(()=>{
    const raw=localStorage.getItem("growthosGoals");
    if(!raw||!goalId)return;
    const goals:Goal[]=JSON.parse(raw);
    const g=goals.find(g=>g.id===goalId);
    if(g){
      setGoal({...g,logs:g.logs||[]});
      const tk=new Date().toISOString().slice(0,10);
      const tl=g.logs?.find((l:DailyLog)=>l.date===tk);
      if(tl){setHours(tl.hours?.toString()||"");setTopic(tl.topic);setMood(tl.mood);}
    }
  },[goalId]);

  const saveToStorage=useCallback((updated:Goal)=>{
    const raw=localStorage.getItem("growthosGoals");
    if(!raw)return;
    const goals:Goal[]=JSON.parse(raw);
    localStorage.setItem("growthosGoals",JSON.stringify(goals.map(g=>g.id===updated.id?updated:g)));
    setGoal(updated);
  },[]);

  const saveLog=()=>{
    if(!topic.trim()||!goal)return;
    const tk=new Date().toISOString().slice(0,10);
    const tl=new Date().toLocaleDateString("en-GB",{day:"numeric",month:"short"});
    const todayLog=goal.logs.find(l=>l.date===tk);
    const newLog:DailyLog={id:todayLog?.id||uid(),date:tk,dateLabel:tl,hours:HOUR_CATS.includes(goal.category)?parseFloat(hours)||0:undefined,topic:topic.trim(),mood};
    const updatedLogs=todayLog?goal.logs.map(l=>l.id===todayLog.id?newLog:l):[newLog,...goal.logs];
    saveToStorage({...goal,logs:updatedLogs});
    setSaved(true);setTimeout(()=>setSaved(false),2000);
  };
  const deleteLog=(id:string)=>{if(!goal)return;saveToStorage({...goal,logs:goal.logs.filter(l=>l.id!==id)});};

  if(!goal)return <div style={{minHeight:"100vh",background:"#000",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontFamily:"'Poppins',sans-serif",color:"#444"}}>Loading...</span></div>;

  const isHours=HOUR_CATS.includes(goal.category);
  const logs=goal.logs||[];
  const tk=new Date().toISOString().slice(0,10);
  const todayLog=logs.find(l=>l.date===tk);
  const totalHours=logs.reduce((s,l)=>s+(l.hours||0),0);
  const streak=(()=>{let s=0;const t=new Date();for(let i=0;i<365;i++){const d=new Date(t);d.setDate(d.getDate()-i);if(logs.find(l=>l.date===d.toISOString().slice(0,10)))s++;else break;}return s;})();
  const best=Math.max(...logs.map(l=>l.hours||0),0);

  const startDate=goal.createdAt?goal.createdAt.slice(0,10):new Date(Date.now()-30*86400000).toISOString().slice(0,10);
  const endDate=goal.deadline||new Date(Date.now()+180*86400000).toISOString().slice(0,10);
  const allDates=getDatesInRange(startDate,endDate);
  const totalDays=allDates.length;
  const daysPassed=allDates.filter(d=>d<=tk).length;
  const progressPct=Math.round((daysPassed/totalDays)*100);

  // Line chart last 30 days
  const chartDates=allDates.slice(-30).map(d=>({date:d,hours:logs.find(l=>l.date===d)?.hours||0}));
  const maxH=Math.max(...chartDates.map(d=>d.hours),1);
  const W=600,H=130,pad=28;
  const gx=(i:number)=>pad+(i/(chartDates.length-1||1))*(W-pad*2);
  const gy=(h:number)=>H-pad-(h/maxH)*(H-pad*2);
  const pts=chartDates.map((d,i)=>`${gx(i)},${gy(d.hours)}`).join(" ");
  const areaPts=`${gx(0)},${H-pad} ${pts} ${gx(chartDates.length-1)},${H-pad}`;

  // Heatmap months
  const heatMonths:{year:number;month:number;firstDay:number;days:{date:string;log:DailyLog|undefined;inRange:boolean}[]}[]=[];
  const ms=new Date(startDate),me=new Date(endDate);
  let mc=new Date(ms.getFullYear(),ms.getMonth(),1);
  while(mc<=me){
    const y=mc.getFullYear(),m=mc.getMonth();
    const dim=new Date(y,m+1,0).getDate(),fd=new Date(y,m,1).getDay();
    const days=Array.from({length:dim},(_,i)=>{
      const ds=`${y}-${String(m+1).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`;
      return {date:ds,log:logs.find(l=>l.date===ds),inRange:ds>=startDate&&ds<=endDate};
    });
    heatMonths.push({year:y,month:m,firstDay:fd,days});
    mc.setMonth(mc.getMonth()+1);
  }
  const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const inp:React.CSSProperties={background:"#0d0d0d",border:"1px solid #222",borderRadius:8,color:"#e0e0e0",padding:"10px 14px",fontFamily:"'Poppins',sans-serif",fontSize:"0.85rem",outline:"none",transition:"border-color 0.18s",width:"100%",boxSizing:"border-box"};

  return (
    <div style={{minHeight:"100vh",background:"#000",fontFamily:"'Poppins',sans-serif",paddingBottom:80}}>
      <style>{`*{scrollbar-width:thin;scrollbar-color:#FF6A00 #111}*::-webkit-scrollbar{width:3px;height:3px}*::-webkit-scrollbar-thumb{background:#FF6A00;border-radius:2px}textarea{resize:vertical}`}</style>

      {/* ── HEADER ── */}
      <div style={{background:"#050505",borderBottom:"1px solid #1a1a1a",padding:"14px 32px",display:"flex",alignItems:"center",gap:16,position:"sticky",top:0,zIndex:50}}>
        <button onClick={()=>router.push("/goal-planner")} style={{background:"none",border:"1px solid #1e1e1e",borderRadius:7,color:"#555",padding:"6px 14px",cursor:"pointer",fontFamily:"'Poppins',sans-serif",fontSize:"0.72rem",fontWeight:600,transition:"all 0.18s",flexShrink:0}}
          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor="#FF6A00";(e.currentTarget as HTMLElement).style.color="#FF6A00";}}
          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor="#1e1e1e";(e.currentTarget as HTMLElement).style.color="#555";}}
        >← Back</button>
        <div style={{flex:1,minWidth:0}}>
          <h1 style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:"1.05rem",color:"#fff",margin:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{goal.title}</h1>
          <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.6rem",fontWeight:600,background:GRAD_TEXT,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"0.1em",textTransform:"uppercase"}}>{goal.category} · Daily Progress Log · {startDate} → {endDate}</span>
        </div>
        {/* Timeline bar */}
        <div style={{flexShrink:0,width:220}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.58rem",color:"#555"}}>Day {daysPassed} of {totalDays}</span>
            <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.58rem",color:"#FF6A00",fontWeight:700}}>{progressPct}% elapsed</span>
          </div>
          <div style={{height:5,background:"#1a1a1a",borderRadius:3,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${progressPct}%`,background:GRAD,borderRadius:3}}/>
          </div>
        </div>
      </div>

      <div style={{padding:"24px 32px",display:"flex",flexDirection:"column",gap:20}}>

        {/* ── ROW 1: STATS + LINE CHART ── */}
        <div style={{display:"grid",gridTemplateColumns:"260px 1fr",gap:16}}>
          {/* Stats */}
          <div style={{display:"grid",gridTemplateRows:"1fr 1fr 1fr",gap:10}}>
            {(isHours?[
              {label:"Total Hours",value:`${totalHours}h`,sub:`${logs.length} sessions logged`},
              {label:"🔥 Current Streak",value:`${streak} days`,sub:streak>0?"keep going!":"log today to start"},
              {label:"Best Session",value:`${best}h`,sub:"your personal record"},
            ]:[
              {label:"Total Entries",value:`${logs.length}`,sub:"reflections logged"},
              {label:"🔥 Streak",value:`${streak} days`,sub:streak>0?"keep going!":"log today"},
              {label:"Days Into Goal",value:`${daysPassed}d`,sub:`${totalDays-daysPassed}d remaining`},
            ]).map(s=>(
              <div key={s.label} style={{background:"#0d0d0d",border:"1px solid #1a1a1a",borderRadius:12,padding:"16px 20px",position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:0,left:0,width:3,height:"100%",background:GRAD,borderRadius:"12px 0 0 12px"}}/>
                <div style={{fontFamily:"'Poppins',sans-serif",fontWeight:900,fontSize:"1.6rem",background:GRAD_TEXT,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1,marginBottom:4}}>{s.value}</div>
                <div style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.6rem",fontWeight:700,color:"#555",textTransform:"uppercase",letterSpacing:"0.1em"}}>{s.label}</div>
                <div style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.65rem",color:"#3a3a3a",marginTop:3}}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Line chart */}
          <div style={{background:"#0d0d0d",border:"1px solid #1a1a1a",borderRadius:14,padding:"20px 24px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.65rem",fontWeight:700,color:"#444",letterSpacing:"0.12em",textTransform:"uppercase"}}>{isHours?"Hours Studied — Last 30 Days":"Activity — Last 30 Days"}</span>
              <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.72rem",fontWeight:700,background:GRAD_TEXT,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{isHours?`${totalHours}h total`:`${logs.length} entries`}</span>
            </div>
            <svg width="100%" viewBox={`0 0 ${W} ${H+10}`} preserveAspectRatio="xMidYMid meet" style={{overflow:"visible"}}>
              <defs>
                <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FF6A00" stopOpacity="0.4"/>
                  <stop offset="100%" stopColor="#FF6A00" stopOpacity="0.02"/>
                </linearGradient>
                <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#FF6A00"/><stop offset="100%" stopColor="#ff9a3c"/>
                </linearGradient>
                <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              </defs>
              {[0,0.25,0.5,0.75,1].map(v=>(
                <g key={v}>
                  <line x1={pad} y1={gy(maxH*v)} x2={W-pad} y2={gy(maxH*v)} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
                  <text x={pad-6} y={gy(maxH*v)+4} textAnchor="end" fill="#333" fontSize="9" fontFamily="Poppins,sans-serif">{Math.round(maxH*v)}h</text>
                </g>
              ))}
              {chartDates.length>1&&<polygon points={areaPts} fill="url(#areaGrad)"/>}
              {chartDates.length>1&&<polyline points={pts} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" filter="url(#glow)"/>}
              {chartDates.map((d,i)=>d.hours>0&&(
                <circle key={i} cx={gx(i)} cy={gy(d.hours)} r={d.date===tk?6:3.5}
                  fill={d.date===tk?"#FF6A00":"#ff9a3c"}
                  stroke={d.date===tk?"#fff":"rgba(255,106,0,0.3)"} strokeWidth="1.5"
                  style={{filter:d.date===tk?"drop-shadow(0 0 8px rgba(255,106,0,1))":"none"}}/>
              ))}
              {chartDates.map((d,i)=>(i===0||i===chartDates.length-1||i%7===0)&&(
                <text key={i} x={gx(i)} y={H+8} textAnchor="middle" fill="#333" fontSize="8.5" fontFamily="Poppins,sans-serif">
                  {new Date(d.date).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}
                </text>
              ))}
            </svg>
          </div>
        </div>

        {/* ── ROW 2: TODAY'S LOG FORM ── */}
        <div style={{background:"#0d0d0d",border:"1px solid rgba(255,106,0,0.2)",borderRadius:14,padding:"22px 28px",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:GRAD}}/>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16}}>
            <div>
              <div style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.7rem",fontWeight:700,color:"#FF6A00",letterSpacing:"0.1em",textTransform:"uppercase"}}>
                📅 {new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}
              </div>
              <div style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.72rem",color:"#444",marginTop:3}}>
                {todayLog?"Update today's entry below":"Log what you did today"}
              </div>
            </div>
            <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.68rem",color:"#333",fontWeight:500}}>{logs.length} total entries</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:isHours?"140px 1fr 200px":"1fr 200px",gap:16,alignItems:"start"}}>
            {isHours&&(
              <div>
                <label style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.6rem",fontWeight:700,color:"#555",letterSpacing:"0.1em",textTransform:"uppercase",display:"block",marginBottom:7}}>Hours Studied</label>
                <input type="number" value={hours} onChange={e=>setHours(e.target.value)}
                  placeholder="e.g. 3.5" min={0} max={24} step={0.5} style={inp}
                  onFocus={e=>(e.currentTarget as HTMLElement).style.borderColor="#FF6A00"}
                  onBlur={e=>(e.currentTarget as HTMLElement).style.borderColor="#222"}
                />
              </div>
            )}
            <div>
              <label style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.6rem",fontWeight:700,color:"#555",letterSpacing:"0.1em",textTransform:"uppercase",display:"block",marginBottom:7}}>
                {isHours?"What did you study / work on?":"Today's reflection"}
              </label>
              <textarea value={topic} onChange={e=>setTopic(e.target.value)} rows={3}
                placeholder={isHours?"e.g. OS Chapter 3, DPP questions, Networks revision...":"How did you pursue this goal today?"}
                style={inp}
                onFocus={e=>(e.currentTarget as HTMLElement).style.borderColor="#FF6A00"}
                onBlur={e=>(e.currentTarget as HTMLElement).style.borderColor="#222"}
              />
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <label style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.6rem",fontWeight:700,color:"#555",letterSpacing:"0.1em",textTransform:"uppercase"}}>How was it?</label>
              <div style={{display:"flex",gap:6}}>
                {(["great","okay","tough"] as const).map(m=>(
                  <button key={m} onClick={()=>setMood(m)} style={{
                    flex:1,background:mood===m?`${moodColors[m]}12`:"transparent",
                    border:`1px solid ${mood===m?moodColors[m]:"#1e1e1e"}`,
                    borderRadius:8,padding:"8px 4px",cursor:"pointer",textAlign:"center",transition:"all 0.18s",
                  }}>
                    <div style={{fontSize:"1.1rem",marginBottom:2}}>{moodEmoji[m]}</div>
                    <div style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.6rem",fontWeight:600,color:mood===m?moodColors[m]:"#444"}}>{moodLabel[m]}</div>
                  </button>
                ))}
              </div>
              <button onClick={saveLog} style={{
                background:saved?"rgba(74,222,128,0.1)":GRAD,
                border:saved?"1px solid #4ade80":"none",
                borderRadius:9,color:saved?"#4ade80":"#fff",
                padding:"13px 0",cursor:"pointer",
                fontFamily:"'Poppins',sans-serif",fontSize:"0.88rem",fontWeight:800,
                letterSpacing:"0.03em",transition:"all 0.3s",
                boxShadow:saved?"none":"0 4px 20px rgba(255,106,0,0.35)",
              }}
                onMouseEnter={e=>{ if(!saved)(e.currentTarget as HTMLElement).style.opacity="0.88"; }}
                onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.opacity="1"; }}
              >{saved?"✓ Saved!":"Save Today's Log"}</button>
            </div>
          </div>
        </div>

        {/* ── ROW 3: HEATMAP ── */}
        <div style={{background:"#0d0d0d",border:"1px solid #1a1a1a",borderRadius:14,padding:"22px 28px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
            <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.65rem",fontWeight:700,color:"#444",letterSpacing:"0.12em",textTransform:"uppercase"}}>Progress Heatmap — Entire Goal Period</span>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.58rem",color:"#333"}}>Less</span>
              {[0.1,0.3,0.55,0.75,1].map(o=><div key={o} style={{width:11,height:11,borderRadius:2,background:`rgba(255,106,0,${o})`}}/>)}
              <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.58rem",color:"#333"}}>More</span>
            </div>
          </div>
          <div style={{overflowX:"auto",paddingBottom:4}}>
            <div style={{display:"flex",gap:20,minWidth:"max-content",alignItems:"flex-start"}}>
              {heatMonths.map(({year,month,firstDay,days})=>(
                <div key={`${year}-${month}`} style={{flexShrink:0}}>
                  <div style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.62rem",fontWeight:700,color:"#555",marginBottom:6,letterSpacing:"0.08em",textTransform:"uppercase"}}>{MONTHS[month]} {year}</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(7,13px)",gap:3}}>
                    {["S","M","T","W","T","F","S"].map((d,i)=>(
                      <div key={i} style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.44rem",color:"#2a2a2a",textAlign:"center",height:13,lineHeight:"13px"}}>{d}</div>
                    ))}
                    {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`} style={{width:13,height:13}}/>)}
                    {days.map((d:any)=>{
                      const log=d.log;
                      const intensity=log?.hours?Math.min(log.hours/6,1):(log?0.45:0);
                      const isToday=d.date===tk;
                      const isFuture=d.date>tk;
                      return (
                        <div key={d.date}
                          title={log?`${d.date}${log.hours?` · ${log.hours}h`:""} · ${log.topic}`:d.date}
                          onMouseEnter={()=>setHoverDay(d.date)}
                          onMouseLeave={()=>setHoverDay(null)}
                          style={{
                            width:13,height:13,borderRadius:2,cursor:log?"pointer":"default",
                            background:!d.inRange?"transparent":isFuture?"#0d0d0d":log?`rgba(255,106,0,${0.1+intensity*0.9})`:"#111",
                            border:isToday?"1px solid #FF6A00":hoverDay===d.date&&log?"1px solid rgba(255,106,0,0.5)":"1px solid transparent",
                            boxShadow:isToday?"0 0 5px rgba(255,106,0,0.6)":"none",
                            transition:"all 0.15s",
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── ROW 4: ALL ENTRIES ── */}
        {logs.length>0&&(
          <div style={{background:"#0d0d0d",border:"1px solid #1a1a1a",borderRadius:14,padding:"22px 28px"}}>
            <div style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.65rem",fontWeight:700,color:"#444",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:16}}>All Entries · {logs.length}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:10}}>
              {[...logs].sort((a,b)=>b.date.localeCompare(a.date)).map(log=>(
                <div key={log.id} style={{display:"flex",gap:14,background:"#111",border:"1px solid #1a1a1a",borderRadius:10,padding:"12px 16px",borderLeft:`3px solid ${moodColors[log.mood]}`,position:"relative"}}>
                  <div style={{flexShrink:0,textAlign:"center",minWidth:46}}>
                    <div style={{fontFamily:"'Poppins',sans-serif",fontWeight:700,fontSize:"0.78rem",color:"#fff"}}>{log.dateLabel}</div>
                    {log.hours!=null&&log.hours>0&&<div style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.72rem",background:GRAD_TEXT,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontWeight:800,marginTop:2}}>{log.hours}h</div>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.8rem",color:"#ccc",lineHeight:1.5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{log.topic}</div>
                    <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.62rem",color:moodColors[log.mood],fontWeight:600}}>{moodEmoji[log.mood]} {moodLabel[log.mood]}</span>
                  </div>
                  {log.date===tk&&<div style={{position:"absolute",top:8,right:28,fontFamily:"'Poppins',sans-serif",fontSize:"0.55rem",color:"#FF6A00",fontWeight:700,background:"rgba(255,106,0,0.1)",border:"1px solid rgba(255,106,0,0.2)",borderRadius:4,padding:"2px 7px"}}>Today</div>}
                  <button onClick={()=>deleteLog(log.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#2a2a2a",fontSize:"0.65rem",opacity:0,transition:"opacity 0.15s",position:"absolute",top:10,right:10}}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.opacity="1"}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.opacity="0"}
                  >✕</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LogPage() {
  return (
    <Suspense fallback={<div style={{minHeight:"100vh",background:"#000",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"#444",fontFamily:"Poppins,sans-serif"}}>Loading...</span></div>}>
      <LogPageInner/>
    </Suspense>
  );
}