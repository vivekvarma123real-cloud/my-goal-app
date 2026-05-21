"use client";

import React, { useState } from "react";

export default function ChoosePage() {
  const isProduction = process.env.NODE_ENV === "production";
  const [hoverGoal,  setHoverGoal]   = useState(false);
  const [hoverHabit, setHoverHabit]  = useState(false);
  const [hoverBattle,setHoverBattle] = useState(false);
  const [hoverIntro,setHoverIntro] = useState(false);
  const [hoverExam,setHoverExam] = useState(false);

  return (
    <div style={{
      minHeight:"100vh", background:"#05050f",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      fontFamily:"'Poppins',sans-serif", padding:"24px",
    }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}
      `}</style>

      {/* Back */}
      <button onClick={()=>window.location.href="/"} style={{
        position:"fixed",top:24,left:24,
        background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",
        borderRadius:8,color:"rgba(255,255,255,0.5)",padding:"6px 14px",
        cursor:"pointer",fontFamily:"'Poppins',sans-serif",fontSize:"0.75rem",
        fontWeight:600,transition:"all 0.2s",zIndex:10,
      }}
        onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color="#fff";(e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.3)";}}
        onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color="rgba(255,255,255,0.5)";(e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.1)";}}
      >← Back</button>

      {/* Header */}
      <div style={{textAlign:"center",marginBottom:48,animation:"fadeUp 0.6s ease both"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:12}}>
          <img src="/icons/icon-192.png" alt="LifeStack Logo" style={{width:28,height:28,borderRadius:7}} />
          <span style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:"0.9rem",color:"rgba(255,255,255,0.5)",letterSpacing:"0.06em"}}>LifeStack</span>
        </div>
        <h1 style={{fontFamily:"'Poppins',sans-serif",fontWeight:900,fontSize:"clamp(1.8rem,4vw,2.6rem)",color:"#fff",margin:"0 0 10px",lineHeight:1.1}}>
          Choose your <span style={{background:"linear-gradient(90deg,#FF6A00,#C36BFF)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>system</span>
        </h1>
        <p style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.9rem",color:"rgba(255,255,255,0.35)",margin:0}}>
          Four tools. One mission — become who you're meant to be.
        </p>
      </div>

      {/* Cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(260px,100%),1fr))",gap:18,width:"100%",maxWidth:1060,padding:"0 4px"}}>

        {/* Battle Manual */}
        <div onMouseEnter={()=>setHoverBattle(true)} onMouseLeave={()=>setHoverBattle(false)}
          onClick={()=>window.location.href="/battle-manual"}
          style={{
            background:hoverBattle?"rgba(255,59,59,0.07)":"rgba(255,255,255,0.03)",
            border:`2px solid ${hoverBattle?"rgba(255,59,59,0.45)":"rgba(255,255,255,0.07)"}`,
            borderRadius:20,padding:"36px 28px",cursor:"pointer",textAlign:"center",
            transform:hoverBattle?"translateY(-8px) scale(1.02)":"translateY(0) scale(1)",
            transition:"all 0.3s ease",
            boxShadow:hoverBattle?"0 24px 60px rgba(255,59,59,0.12)":"none",
            animation:"fadeUp 0.6s ease 0.1s both",position:"relative",overflow:"hidden",
          }}>
          <div style={{position:"absolute",top:-60,right:-60,width:180,height:180,borderRadius:"50%",background:"radial-gradient(circle,rgba(255,59,59,0.1),transparent)",pointerEvents:"none"}}/>
          <div style={{
            width:64,height:64,borderRadius:18,margin:"0 auto 20px",
            background:"linear-gradient(135deg,#ff3b3b,#FF6A00)",
            display:"flex",alignItems:"center",justifyContent:"center",
            boxShadow:hoverBattle?"0 12px 32px rgba(255,59,59,0.5)":"0 8px 24px rgba(255,59,59,0.3)",
            transition:"box-shadow 0.3s",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"/>
              <path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
              <path d="M9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83.67-1.5 1.5-1.5z"/>
              <path d="M3.5 14H5v1.5c0 .83-.67 1.5-1.5 1.5S2 16.33 2 15.5 2.67 14 3.5 14z"/>
              <path d="M14 14.5c0-.83.67-1.5 1.5-1.5h5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-5c-.83 0-1.5-.67-1.5-1.5z"/>
              <path d="M15.5 19H14v1.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z"/>
              <path d="M10 9.5C10 8.67 9.33 8 8.5 8h-5C2.67 8 2 8.67 2 9.5S2.67 11 3.5 11h5c.83 0 1.5-.67 1.5-1.5z"/>
              <path d="M8.5 5H10V3.5C10 2.67 9.33 2 8.5 2S7 2.67 7 3.5 7.67 5 8.5 5z"/>
            </svg>
          </div>
          <h2 style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:"1.3rem",color:"#fff",margin:"0 0 10px"}}>Battle Manual</h2>
          <p style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.82rem",color:"rgba(255,255,255,0.4)",margin:"0 0 22px",lineHeight:1.65}}>
            Your personal operating system. Philosophy, mindset, and battle training principles that keep you unbreakable.
          </p>
          <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:6,marginBottom:22}}>
            {["Logical Brain","Gita Principles","Tao Philosophy","Battle Training"].map(t=>(
              <span key={t} style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.62rem",fontWeight:600,color:"#ff6b6b",background:"rgba(255,59,59,0.1)",border:"1px solid rgba(255,59,59,0.2)",borderRadius:100,padding:"3px 10px"}}>{t}</span>
            ))}
          </div>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,fontFamily:"'Poppins',sans-serif",fontSize:"0.82rem",fontWeight:700,color:hoverBattle?"#ff6b6b":"rgba(255,255,255,0.25)",transition:"color 0.3s"}}>
            Open Manual
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{transform:hoverBattle?"translateX(4px)":"translateX(0)",transition:"transform 0.3s"}}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
        </div>

        {/* Daily Introspection */}
        <div onMouseEnter={()=>setHoverIntro(true)} onMouseLeave={()=>setHoverIntro(false)}
          onClick={()=>window.location.href="/introspection"}
          style={{
            background:hoverIntro?"rgba(74,222,128,0.08)":"rgba(255,255,255,0.03)",
            border:`2px solid ${hoverIntro?"rgba(74,222,128,0.5)":"rgba(255,255,255,0.07)"}`,
            borderRadius:20,padding:"36px 28px",cursor:"pointer",textAlign:"center",
            transform:hoverIntro?"translateY(-8px) scale(1.02)":"translateY(0) scale(1)",
            transition:"all 0.3s ease",
            boxShadow:hoverIntro?"0 24px 60px rgba(74,222,128,0.15)":"none",
            animation:"fadeUp 0.6s ease 0.2s both",position:"relative",overflow:"hidden",
          }}>
          <div style={{position:"absolute",top:-60,right:-60,width:180,height:180,borderRadius:"50%",background:"radial-gradient(circle,rgba(74,222,128,0.1),transparent)",pointerEvents:"none"}}/>
          <div style={{
            width:64,height:64,borderRadius:18,margin:"0 auto 20px",
            background:"linear-gradient(135deg,#4ade80,#22c55e)",
            display:"flex",alignItems:"center",justifyContent:"center",
            boxShadow:hoverIntro?"0 12px 32px rgba(74,222,128,0.5)":"0 8px 24px rgba(74,222,128,0.3)",
            transition:"box-shadow 0.3s",fontSize:"1.8rem",
          }}>🔍</div>
          <h2 style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:"1.3rem",color:"#fff",margin:"0 0 10px"}}>Daily Introspection</h2>
          <p style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.82rem",color:"rgba(255,255,255,0.4)",margin:"0 0 22px",lineHeight:1.65}}>
            Your daily mirror. Write your purpose, visualization, rules and manifestation. Read it every morning.
          </p>
          <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:6,marginBottom:22}}>
            {["Purpose","Visualization","Rules","Manifestation","Data Drop"].map(t=>(
              <span key={t} style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.62rem",fontWeight:600,color:"#4ade80",background:"rgba(74,222,128,0.1)",border:"1px solid rgba(74,222,128,0.2)",borderRadius:100,padding:"3px 10px"}}>{t}</span>
            ))}
          </div>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,fontFamily:"'Poppins',sans-serif",fontSize:"0.82rem",fontWeight:700,color:hoverIntro?"#4ade80":"rgba(255,255,255,0.25)",transition:"color 0.3s"}}>
            Open Journal
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{transform:hoverIntro?"translateX(4px)":"translateX(0)",transition:"transform 0.3s"}}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
        </div>

        {/* Goal Planner */}
        <div onMouseEnter={()=>setHoverGoal(true)} onMouseLeave={()=>setHoverGoal(false)}
          onClick={()=>window.location.href="/goal-planner"}
          style={{
            background:hoverGoal?"rgba(255,106,0,0.08)":"rgba(255,255,255,0.03)",
            border:`2px solid ${hoverGoal?"rgba(255,106,0,0.5)":"rgba(255,255,255,0.07)"}`,
            borderRadius:20,padding:"36px 28px",cursor:"pointer",textAlign:"center",
            transform:hoverGoal?"translateY(-8px) scale(1.02)":"translateY(0) scale(1)",
            transition:"all 0.3s ease",
            boxShadow:hoverGoal?"0 24px 60px rgba(255,106,0,0.15)":"none",
            animation:"fadeUp 0.6s ease 0.3s both",position:"relative",overflow:"hidden",
          }}>
          <div style={{position:"absolute",top:-60,right:-60,width:180,height:180,borderRadius:"50%",background:"radial-gradient(circle,rgba(255,106,0,0.1),transparent)",pointerEvents:"none"}}/>
          <div style={{
            width:64,height:64,borderRadius:18,margin:"0 auto 20px",
            background:"linear-gradient(135deg,#FF6A00,#ff9a3c)",
            display:"flex",alignItems:"center",justifyContent:"center",
            boxShadow:hoverGoal?"0 12px 32px rgba(255,106,0,0.5)":"0 8px 24px rgba(255,106,0,0.3)",
            transition:"box-shadow 0.3s",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
            </svg>
          </div>
          <h2 style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:"1.3rem",color:"#fff",margin:"0 0 10px"}}>Goal Planner</h2>
          <p style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.82rem",color:"rgba(255,255,255,0.4)",margin:"0 0 22px",lineHeight:1.65}}>
            Define long-term goals, break them into steps, track deadlines and visualize your life balance.
          </p>
          <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:6,marginBottom:22}}>
            {["Goals & Milestones","Life Radar","Deadline Tracking","Priority Focus"].map(t=>(
              <span key={t} style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.62rem",fontWeight:600,color:"#ff9a3c",background:"rgba(255,106,0,0.1)",border:"1px solid rgba(255,106,0,0.2)",borderRadius:100,padding:"3px 10px"}}>{t}</span>
            ))}
          </div>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,fontFamily:"'Poppins',sans-serif",fontSize:"0.82rem",fontWeight:700,color:hoverGoal?"#FF6A00":"rgba(255,255,255,0.25)",transition:"color 0.3s"}}>
            Open Planner
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{transform:hoverGoal?"translateX(4px)":"translateX(0)",transition:"transform 0.3s"}}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
        </div>

        {/* Habit Tracker */}
        <div onMouseEnter={()=>setHoverHabit(true)} onMouseLeave={()=>setHoverHabit(false)}
          onClick={()=>window.location.href="/habit-tracker"}
          style={{
            background:hoverHabit?"rgba(195,107,255,0.08)":"rgba(255,255,255,0.03)",
            border:`2px solid ${hoverHabit?"rgba(195,107,255,0.5)":"rgba(255,255,255,0.07)"}`,
            borderRadius:20,padding:"36px 28px",cursor:"pointer",textAlign:"center",
            transform:hoverHabit?"translateY(-8px) scale(1.02)":"translateY(0) scale(1)",
            transition:"all 0.3s ease",
            boxShadow:hoverHabit?"0 24px 60px rgba(195,107,255,0.15)":"none",
            animation:"fadeUp 0.6s ease 0.4s both",position:"relative",overflow:"hidden",
          }}>
          <div style={{position:"absolute",top:-60,right:-60,width:180,height:180,borderRadius:"50%",background:"radial-gradient(circle,rgba(195,107,255,0.1),transparent)",pointerEvents:"none"}}/>
          <div style={{
            width:64,height:64,borderRadius:18,margin:"0 auto 20px",
            background:"linear-gradient(135deg,#C36BFF,#4A90FF)",
            display:"flex",alignItems:"center",justifyContent:"center",
            boxShadow:hoverHabit?"0 12px 32px rgba(195,107,255,0.5)":"0 8px 24px rgba(195,107,255,0.3)",
            transition:"box-shadow 0.3s",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          </div>
          <h2 style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:"1.3rem",color:"#fff",margin:"0 0 10px"}}>Habit Tracker</h2>
          <p style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.82rem",color:"rgba(255,255,255,0.4)",margin:"0 0 22px",lineHeight:1.65}}>
            Track daily habits week by week with calendar-accurate views, live charts and consistency tracking.
          </p>
          <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:6,marginBottom:22}}>
            {["Daily Habits","Week View","Progress Charts","Consistency"].map(t=>(
              <span key={t} style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.62rem",fontWeight:600,color:"#C36BFF",background:"rgba(195,107,255,0.1)",border:"1px solid rgba(195,107,255,0.2)",borderRadius:100,padding:"3px 10px"}}>{t}</span>
            ))}
          </div>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,fontFamily:"'Poppins',sans-serif",fontSize:"0.82rem",fontWeight:700,color:hoverHabit?"#C36BFF":"rgba(255,255,255,0.25)",transition:"color 0.3s"}}>
            Open Tracker
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{transform:hoverHabit?"translateX(4px)":"translateX(0)",transition:"transform 0.3s"}}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
        </div>

        {/* Exam & Job Planner */}
        <div onMouseEnter={()=>setHoverExam(true)} onMouseLeave={()=>setHoverExam(false)}
          onClick={() => {
            localStorage.removeItem("lifestack-planner-mode");
            window.location.href = "/exam-planner";
          }}
          style={{
            background:hoverExam?"rgba(195,107,255,0.08)":"rgba(255,255,255,0.03)",
            border:`2px solid ${hoverExam?"rgba(195,107,255,0.5)":"rgba(255,255,255,0.07)"}`,
            borderRadius:20,padding:"36px 28px",cursor:"pointer",textAlign:"center",
            transform:hoverExam?"translateY(-8px) scale(1.02)":"translateY(0) scale(1)",
            transition:"all 0.3s ease",
            boxShadow:hoverExam?"0 24px 60px rgba(195,107,255,0.18)":"none",
            animation:"fadeUp 0.6s ease 0.5s both",position:"relative",overflow:"hidden",
            opacity:1,
          }}>
          <div style={{position:"absolute",top:-60,right:-60,width:180,height:180,borderRadius:"50%",background:"radial-gradient(circle,rgba(195,107,255,0.12),transparent)",pointerEvents:"none"}}/>
          <div style={{
            width:64,height:64,borderRadius:18,margin:"0 auto 20px",
            background:"linear-gradient(135deg,#C36BFF,#4A90FF)",
            display:"flex",alignItems:"center",justifyContent:"center",
            boxShadow:hoverExam?"0 12px 32px rgba(195,107,255,0.55)":"0 8px 24px rgba(195,107,255,0.35)",
            transition:"box-shadow 0.3s",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
          </div>
          <h2 style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:"1.3rem",color:"#fff",margin:"0 0 10px"}}>Exam & Job Planner</h2>
          <p style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.82rem",color:"rgba(255,255,255,0.4)",margin:"0 0 22px",lineHeight:1.65}}>
            Your career command center. Track competitive exams, skills, projects, interviews, and daily study hours.
          </p>
          <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:6,marginBottom:22}}>
            {["GATE / JEE / UPSC","Tech Interviews","Project Portfolio","Test Scores"].map(t=>(
              <span key={t} style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.62rem",fontWeight:600,color:"#C36BFF",background:"rgba(195,107,255,0.1)",border:"1px solid rgba(195,107,255,0.25)",borderRadius:100,padding:"3px 10px"}}>{t}</span>
            ))}
          </div>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,fontFamily:"'Poppins',sans-serif",fontSize:"0.82rem",fontWeight:700,color:hoverExam?"#C36BFF":"rgba(255,255,255,0.25)",transition:"color 0.3s"}}>
            Open Planner
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{transform:hoverExam?"translateX(4px)":"translateX(0)",transition:"transform 0.3s"}}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
        </div>

      </div>
    </div>
  );
}