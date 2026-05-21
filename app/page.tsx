"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { submitFeedback, fetchFeedback, type Feedback } from "@/lib/feedbackDb";

export default function LandingPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mouseX, setMouseX] = useState(0);
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [fbName, setFbName] = useState("");
  const [fbMessage, setFbMessage] = useState("");
  const [fbRating, setFbRating] = useState(5);
  const [fbFeature, setFbFeature] = useState("General");
  const [fbSubmitting, setFbSubmitting] = useState(false);
  const [fbSuccess, setFbSuccess] = useState(false);
  const [mouseY, setMouseY] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    window.addEventListener("appinstalled", () => {
      setDeferredPrompt(null);
      setShowInstallBtn(false);
      console.log("LifeStack PWA successfully installed!");
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA install prompt outcome: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setIsLoggedIn(!!session));
  }, []);

  useEffect(() => {
    const onMouse = (e: MouseEvent) => { setMouseX(e.clientX); setMouseY(e.clientY); };
    window.addEventListener("mousemove", onMouse, { passive: true });
    return () => window.removeEventListener("mousemove", onMouse);
  }, []);

  // Particle canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    const onResize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    window.addEventListener("resize", onResize);
    const COUNT = 70;
    const particles = Array.from({ length: COUNT }, (_, i) => ({
      x: Math.random() * w, y: Math.random() * h,
      r: Math.random() * 1.4 + 0.3,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
      color: i % 3 === 0 ? "#FF6A00" : i % 3 === 1 ? "#C36BFF" : "#4A90FF",
      opacity: Math.random() * 0.5 + 0.1,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(p.opacity * 255).toString(16).padStart(2, "0");
        ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 110) {
            ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(195,107,255,${0.07*(1-dist/110)})`; ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("resize", onResize); };
  }, []);

  const handleSignOut = async () => { await supabase.auth.signOut(); setIsLoggedIn(false); };
  // Load public feedback
  useEffect(() => {
    fetchFeedback().then(data => { console.log("Feedback loaded:", data.length, data); setFeedbackList(data.slice(0, 10)); });
  }, []);

  const submitFb = async () => {
    if (!fbName.trim() || !fbMessage.trim()) return;
    setFbSubmitting(true);
    const { error } = await submitFeedback({ name: fbName.trim(), message: fbMessage.trim(), rating: fbRating, feature: fbFeature });
    setFbSubmitting(false);
    if (!error) {
      setFbSuccess(true);
      setFbName(""); setFbMessage(""); setFbRating(5); setFbFeature("General");
      fetchFeedback().then(data => { console.log("Feedback loaded:", data.length, data); setFeedbackList(data.slice(0, 10)); });
      setTimeout(() => setFbSuccess(false), 3000);
    }
  };

  const goTo = () => router.push(isLoggedIn ? "/choose" : "/login");

  return (
    <div style={{ minHeight:"100vh", background:"#06060f", fontFamily:"'Poppins',sans-serif", overflowX:"hidden", position:"relative" }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.6;transform:scale(0.95)}}
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes orb1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(40px,-30px) scale(1.08)}}
        @keyframes orb2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-40px,30px) scale(0.92)}}
        @keyframes borderAnim{0%,100%{box-shadow:0 0 20px rgba(255,106,0,0.3)}50%{box-shadow:0 0 40px rgba(255,106,0,0.6),0 0 80px rgba(195,107,255,0.2)}}
        .shimmer-text{background:linear-gradient(90deg,#FF6A00,#ff9a3c,#C36BFF,#4A90FF,#FF6A00);background-size:300% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:shimmer 4s linear infinite}
        .btn-primary{transition:all 0.3s ease!important}
        .btn-primary:hover{transform:translateY(-3px)!important;box-shadow:0 12px 40px rgba(255,106,0,0.5),0 0 0 1px rgba(255,106,0,0.3)!important}
        .btn-ghost:hover{background:rgba(255,255,255,0.08)!important;color:#fff!important;border-color:rgba(255,255,255,0.2)!important}
        .feat-card{transition:all 0.4s cubic-bezier(0.175,0.885,0.32,1.275)}
        .feat-card:hover{transform:translateY(-8px) scale(1.02)!important}
        .sys-card{transition:all 0.4s cubic-bezier(0.175,0.885,0.32,1.275)}
        .sys-card:hover{transform:translateY(-6px)!important}
        *{scrollbar-width:thin;scrollbar-color:#FF6A00 #111}
        *::-webkit-scrollbar{width:3px}
        *::-webkit-scrollbar-thumb{background:linear-gradient(#FF6A00,#C36BFF);border-radius:2px}
      `}</style>

      {/* Cursor glow */}
      <div style={{position:"fixed",left:mouseX-200,top:mouseY-200,width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(255,106,0,0.04),transparent 70%)",pointerEvents:"none",zIndex:0,transition:"left 0.08s,top 0.08s"}}/>

      {/* Particle canvas */}
      <canvas ref={canvasRef} style={{position:"fixed",top:0,left:0,zIndex:0,pointerEvents:"none"}}/>

      {/* Orbs */}
      <div style={{position:"fixed",top:"5%",left:"0%",width:700,height:700,borderRadius:"50%",background:"radial-gradient(circle,rgba(255,106,0,0.07),transparent 70%)",filter:"blur(50px)",animation:"orb1 14s ease-in-out infinite",pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"fixed",bottom:"5%",right:"0%",width:800,height:800,borderRadius:"50%",background:"radial-gradient(circle,rgba(195,107,255,0.07),transparent 70%)",filter:"blur(60px)",animation:"orb2 18s ease-in-out infinite",pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"fixed",top:"40%",left:"40%",width:600,height:400,borderRadius:"50%",background:"radial-gradient(ellipse,rgba(74,144,255,0.04),transparent 70%)",filter:"blur(50px)",pointerEvents:"none",zIndex:0}}/>

      {/* Grid */}
      <div style={{position:"fixed",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,0.014) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.014) 1px,transparent 1px)",backgroundSize:"80px 80px",zIndex:0,pointerEvents:"none"}}/>

      {/* ── NAV ── */}
      <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:100,padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(6,6,15,0.88)",backdropFilter:"blur(24px)",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:34,height:34,borderRadius:9,background:"linear-gradient(135deg,#FF6A00,#C36BFF)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(255,106,0,0.35)",animation:"borderAnim 3s ease infinite"}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          </div>
          <span style={{fontFamily:"'Poppins',sans-serif",fontWeight:900,fontSize:"1.1rem",color:"#fff",letterSpacing:"0.02em"}}>LifeStack</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div className="nav-links" style={{display:"flex",gap:20}}>
            {[["Features","features"],["Systems","systems"]].map(([l,id])=>(
              <button key={id} onClick={()=>document.getElementById(id)?.scrollIntoView({behavior:"smooth"})} style={{background:"none",border:"none",color:"rgba(255,255,255,0.45)",cursor:"pointer",fontFamily:"'Poppins',sans-serif",fontSize:"0.82rem",fontWeight:500,transition:"color 0.2s",letterSpacing:"0.02em"}}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color="#fff"}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color="rgba(255,255,255,0.45)"}
              >{l}</button>
            ))}
          </div>
          {isLoggedIn&&(
            <button onClick={handleSignOut} style={{background:"none",border:"1px solid rgba(248,113,113,0.25)",borderRadius:7,color:"rgba(248,113,113,0.6)",padding:"7px 16px",cursor:"pointer",fontFamily:"'Poppins',sans-serif",fontSize:"0.78rem",fontWeight:600,transition:"all 0.2s"}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color="#f87171";(e.currentTarget as HTMLElement).style.borderColor="#f87171";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color="rgba(248,113,113,0.6)";(e.currentTarget as HTMLElement).style.borderColor="rgba(248,113,113,0.25)";}}
            >Log Out</button>
          )}
          {showInstallBtn && (
            <button onClick={handleInstallClick} className="btn-ghost" style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(195,107,255,0.3)",borderRadius:9,color:"#C36BFF",padding:"9px 18px",cursor:"pointer",fontFamily:"'Poppins',sans-serif",fontSize:"0.82rem",fontWeight:700,transition:"all 0.2s"}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(195,107,255,0.1)";(e.currentTarget as HTMLElement).style.borderColor="#C36BFF";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.05)";(e.currentTarget as HTMLElement).style.borderColor="rgba(195,107,255,0.3)";}}
            >
              ⬇️ Install App
            </button>
          )}
          <button onClick={goTo} className="btn-primary" style={{background:"linear-gradient(135deg,#FF6A00,#C36BFF)",border:"none",borderRadius:9,color:"#fff",padding:"9px 26px",cursor:"pointer",fontFamily:"'Poppins',sans-serif",fontSize:"0.82rem",fontWeight:700,letterSpacing:"0.02em",boxShadow:"0 4px 20px rgba(255,106,0,0.3)"}}>Get Started</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"100px 18px 80px",textAlign:"center",position:"relative",zIndex:1}}>

        {/* Badge */}
        <div style={{display:"inline-flex",alignItems:"center",gap:6,marginBottom:18,background:"rgba(255,106,0,0.08)",border:"1px solid rgba(255,106,0,0.2)",borderRadius:100,padding:"6px 20px",animation:"fadeIn 0.8s ease 0.2s both"}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:"#FF6A00",animation:"pulse 2s ease infinite"}}/>
          <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.68rem",fontWeight:700,color:"#FF6A00",letterSpacing:"0.18em",textTransform:"uppercase"}}>Personal Growth OS</span>
        </div>

        {/* Headline */}
        <div style={{maxWidth:940,animation:"fadeUp 1s ease 0.4s both",opacity:0}}>
          <h1 style={{fontFamily:"'Poppins',sans-serif",fontWeight:900,fontSize:"clamp(3rem,9vw,7rem)",lineHeight:0.95,letterSpacing:"-0.03em",color:"#fff",margin:"0 0 10px"}}>Build the Life</h1>
          <h1 style={{fontFamily:"'Poppins',sans-serif",fontWeight:900,fontSize:"clamp(3rem,9vw,7rem)",lineHeight:0.95,letterSpacing:"-0.03em",margin:"0 0 40px"}}>
            <span className="shimmer-text">You Deserve.</span>
          </h1>
        </div>

        <p style={{fontFamily:"'Poppins',sans-serif",fontSize:"clamp(1rem,2vw,1.2rem)",color:"rgba(255,255,255,0.45)",lineHeight:2,maxWidth:560,margin:"0 0 56px",animation:"fadeUp 1s ease 0.6s both",opacity:0}}>
          Two powerful tools — a{" "}<span style={{color:"#FF6A00",fontWeight:700}}>Goal Planner</span> and a{" "}<span style={{color:"#C36BFF",fontWeight:700}}>Habit Tracker</span> — built for people who refuse to stay average.
        </p>

        {/* CTAs */}
        <div style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap",marginBottom:80,animation:"fadeUp 1s ease 0.8s both",opacity:0}}>
          <button onClick={goTo} className="btn-primary" style={{background:"linear-gradient(135deg,#FF6A00,#ff9a3c)",border:"none",borderRadius:14,color:"#fff",padding:"17px 48px",cursor:"pointer",fontFamily:"'Poppins',sans-serif",fontSize:"1rem",fontWeight:800,letterSpacing:"0.02em",boxShadow:"0 8px 32px rgba(255,106,0,0.4)"}}>
            Start Building →
          </button>
          <button onClick={()=>document.getElementById("systems")?.scrollIntoView({behavior:"smooth"})} className="btn-ghost" style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:14,color:"rgba(255,255,255,0.65)",padding:"17px 36px",cursor:"pointer",fontFamily:"'Poppins',sans-serif",fontSize:"1rem",fontWeight:600,backdropFilter:"blur(10px)",transition:"all 0.3s"}}>
            See How It Works ↓
          </button>
          {showInstallBtn && (
            <button onClick={handleInstallClick} className="btn-ghost" style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(195,107,255,0.3)",borderRadius:14,color:"#C36BFF",padding:"17px 36px",cursor:"pointer",fontFamily:"'Poppins',sans-serif",fontSize:"1rem",fontWeight:700,backdropFilter:"blur(10px)",transition:"all 0.3s",boxShadow:"0 8px 24px rgba(195,107,255,0.15)"}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(195,107,255,0.15)";(e.currentTarget as HTMLElement).style.borderColor="#C36BFF";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.06)";(e.currentTarget as HTMLElement).style.borderColor="rgba(195,107,255,0.3)";}}
            >
              💻 Download PC & Mobile App
            </button>
          )}
        </div>

        {/* Stats */}
        <div style={{display:"flex",gap:56,justifyContent:"center",flexWrap:"wrap",animation:"fadeUp 1s ease 1s both",opacity:0}}>
          {[{n:"2",l:"Powerful Systems"},{n:"∞",l:"Goals & Habits"},{n:"24/7",l:"Data Tracked"}].map(s=>(
            <div key={s.l} style={{textAlign:"center"}}>
              <div style={{fontFamily:"'Poppins',sans-serif",fontWeight:900,fontSize:"2.2rem",background:"linear-gradient(135deg,#FF6A00,#C36BFF)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1}}>{s.n}</div>
              <div style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.65rem",color:"rgba(255,255,255,0.3)",fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",marginTop:6}}>{s.l}</div>
            </div>
          ))}
        </div>


      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{padding:"60px 18px",position:"relative",zIndex:1}}>
        <div style={{maxWidth:1120,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:72}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:14,marginBottom:18}}>
              <div style={{height:1,width:56,background:"linear-gradient(90deg,transparent,#FF6A00)"}}/>
              <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.68rem",fontWeight:700,color:"#FF6A00",letterSpacing:"0.22em",textTransform:"uppercase"}}>Why LifeStack</span>
              <div style={{height:1,width:56,background:"linear-gradient(90deg,#C36BFF,transparent)"}}/>
            </div>
            <h2 style={{fontFamily:"'Poppins',sans-serif",fontWeight:900,fontSize:"clamp(2rem,4vw,3.2rem)",color:"#fff",margin:0,lineHeight:1.1}}>
              Everything you need<br/>
              <span style={{background:"linear-gradient(90deg,#FF6A00,#C36BFF)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>to grow relentlessly</span>
            </h2>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(300px,100%),1fr))",gap:14}}>
            {[
              {icon:"🎯",title:"Goal Architecture",desc:"Set goals across 8 life areas. Break them into milestones with deadlines and countdown timers.",color:"#FF6A00",glow:"rgba(255,106,0,0.12)"},
              {icon:"🔥",title:"Habit Engine",desc:"Build unbreakable routines with calendar-accurate week views and real-time consistency charts.",color:"#C36BFF",glow:"rgba(195,107,255,0.12)"},
              {icon:"📊",title:"Progress Analytics",desc:"Monthly graphs, weekly bars, donut completion rings. See your growth in real time every day.",color:"#4A90FF",glow:"rgba(74,144,255,0.12)"},
              {icon:"📝",title:"Daily Log",desc:"Log your hours, what you worked on, and how you felt. Build a permanent record of your journey.",color:"#28D7FF",glow:"rgba(40,215,255,0.12)"},
              {icon:"🏆",title:"Priority Focus",desc:"Pin your #1 goal. Get reminded of your why. Never lose sight of what matters most.",color:"#FF6A00",glow:"rgba(255,106,0,0.12)"},
              {icon:"🔒",title:"Secure Cloud Sync",desc:"Your goals, habits, and logs saved securely. Access everything from any device, any time.",color:"#C36BFF",glow:"rgba(195,107,255,0.12)"},
            ].map((f,i)=>(
              <div key={f.title} className="feat-card" style={{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,padding:"28px 24px",position:"relative",overflow:"hidden",backdropFilter:"blur(10px)",animation:`fadeUp 0.6s ease ${i*0.08}s both`}}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=f.glow;(e.currentTarget as HTMLElement).style.borderColor=f.color+"44";}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.025)";(e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.06)";}}
              >
                <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${f.color},transparent)`}}/>
                <div style={{fontSize:"1.8rem",marginBottom:14}}>{f.icon}</div>
                <h3 style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:"1rem",color:"#fff",margin:"0 0 10px"}}>{f.title}</h3>
                <p style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.8rem",color:"rgba(255,255,255,0.4)",lineHeight:1.75,margin:0}}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="systems" style={{padding:"60px 18px 80px",position:"relative",zIndex:1}}>
        <div style={{maxWidth:1120,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:72}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:14,marginBottom:18}}>
              <div style={{height:1,width:56,background:"linear-gradient(90deg,transparent,#C36BFF)"}}/>
              <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.68rem",fontWeight:700,color:"#C36BFF",letterSpacing:"0.22em",textTransform:"uppercase"}}>The Four Systems</span>
              <div style={{height:1,width:56,background:"linear-gradient(90deg,#FF6A00,transparent)"}}/>
            </div>
            <h2 style={{fontFamily:"'Poppins',sans-serif",fontWeight:900,fontSize:"clamp(2rem,4vw,3.2rem)",color:"#fff",margin:0}}>Choose your system</h2>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(280px,100%),1fr))",gap:14}}>
            {/* Goal Planner */}
            <div className="sys-card" style={{background:"rgba(255,106,0,0.04)",border:"1px solid rgba(255,106,0,0.14)",borderRadius:18,padding:"clamp(16px,3vw,28px) clamp(14px,2.5vw,22px)",position:"relative",overflow:"hidden"}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,106,0,0.09)";(e.currentTarget as HTMLElement).style.borderColor="rgba(255,106,0,0.35)";(e.currentTarget as HTMLElement).style.boxShadow="0 24px 60px rgba(255,106,0,0.12)";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,106,0,0.04)";(e.currentTarget as HTMLElement).style.borderColor="rgba(255,106,0,0.14)";(e.currentTarget as HTMLElement).style.boxShadow="none";}}
            >
              <div style={{position:"absolute",top:-80,right:-80,width:220,height:220,borderRadius:"50%",background:"radial-gradient(circle,rgba(255,106,0,0.1),transparent)",pointerEvents:"none"}}/>
              <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:24}}>
                <div style={{width:44,height:44,borderRadius:12,background:"linear-gradient(135deg,#FF6A00,#ff9a3c)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 8px 28px rgba(255,106,0,0.4)",animation:"float 4s ease infinite",flexShrink:0}}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                </div>
                <div>
                  <h3 style={{fontFamily:"'Poppins',sans-serif",fontWeight:900,fontSize:"1.15rem",color:"#fff",margin:0}}>Goal Planner</h3>
                  <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.65rem",color:"#FF6A00",fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase"}}>Long-term Vision</span>
                </div>
              </div>
              <p style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.78rem",color:"rgba(255,255,255,0.45)",lineHeight:1.7,margin:"0 0 18px"}}>Set goals, break into milestones, track deadlines and visualize life balance on a radar chart.</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:18}}>
                {["Life Radar Chart","Step Milestones","Deadline Tracking","Daily Log","Progress Graph","Heatmap"].map(t=>(
                  <span key={t} style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.65rem",fontWeight:600,color:"#FF6A00",background:"rgba(255,106,0,0.1)",border:"1px solid rgba(255,106,0,0.2)",borderRadius:100,padding:"3px 9px"}}>{t}</span>
                ))}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{height:1,flex:1,background:"linear-gradient(90deg,rgba(255,106,0,0.4),transparent)"}}/>
                <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.62rem",fontWeight:700,color:"rgba(255,106,0,0.5)",letterSpacing:"0.12em",textTransform:"uppercase"}}>Goal Planner</span>
              </div>
            </div>

            {/* Habit Tracker */}
            <div className="sys-card" style={{background:"rgba(195,107,255,0.04)",border:"1px solid rgba(195,107,255,0.14)",borderRadius:18,padding:"clamp(16px,3vw,28px) clamp(14px,2.5vw,22px)",position:"relative",overflow:"hidden"}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(195,107,255,0.09)";(e.currentTarget as HTMLElement).style.borderColor="rgba(195,107,255,0.35)";(e.currentTarget as HTMLElement).style.boxShadow="0 24px 60px rgba(195,107,255,0.12)";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="rgba(195,107,255,0.04)";(e.currentTarget as HTMLElement).style.borderColor="rgba(195,107,255,0.14)";(e.currentTarget as HTMLElement).style.boxShadow="none";}}
            >
              <div style={{position:"absolute",top:-80,right:-80,width:220,height:220,borderRadius:"50%",background:"radial-gradient(circle,rgba(195,107,255,0.1),transparent)",pointerEvents:"none"}}/>
              <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:24}}>
                <div style={{width:44,height:44,borderRadius:12,background:"linear-gradient(135deg,#C36BFF,#4A90FF)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 8px 28px rgba(195,107,255,0.4)",animation:"float 4s ease 0.5s infinite",flexShrink:0}}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                </div>
                <div>
                  <h3 style={{fontFamily:"'Poppins',sans-serif",fontWeight:900,fontSize:"1.15rem",color:"#fff",margin:0}}>Habit Tracker</h3>
                  <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.65rem",color:"#C36BFF",fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase"}}>Daily Consistency</span>
                </div>
              </div>
              <p style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.78rem",color:"rgba(255,255,255,0.45)",lineHeight:1.7,margin:"0 0 18px"}}>Build unbreakable routines with week views, live charts and consistency tracking.</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:18}}>
                {["Week View","Monthly Graph","Bar Charts","Custom Categories","Donut Ring","Streaks"].map(t=>(
                  <span key={t} style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.65rem",fontWeight:600,color:"#C36BFF",background:"rgba(195,107,255,0.1)",border:"1px solid rgba(195,107,255,0.2)",borderRadius:100,padding:"3px 9px"}}>{t}</span>
                ))}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{height:1,flex:1,background:"linear-gradient(90deg,rgba(195,107,255,0.4),transparent)"}}/>
                <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.62rem",fontWeight:700,color:"rgba(195,107,255,0.5)",letterSpacing:"0.12em",textTransform:"uppercase"}}>Habit Tracker</span>
              </div>
            </div>

            {/* Battle Manual */}
            <div className="sys-card" style={{background:"rgba(255,59,59,0.04)",border:"1px solid rgba(255,59,59,0.14)",borderRadius:18,padding:"clamp(16px,3vw,28px) clamp(14px,2.5vw,22px)",position:"relative",overflow:"hidden"}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,59,59,0.09)";(e.currentTarget as HTMLElement).style.borderColor="rgba(255,59,59,0.35)";(e.currentTarget as HTMLElement).style.boxShadow="0 24px 60px rgba(255,59,59,0.12)";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,59,59,0.04)";(e.currentTarget as HTMLElement).style.borderColor="rgba(255,59,59,0.14)";(e.currentTarget as HTMLElement).style.boxShadow="none";}}
            >
              <div style={{position:"absolute",top:-80,right:-80,width:220,height:220,borderRadius:"50%",background:"radial-gradient(circle,rgba(255,59,59,0.1),transparent)",pointerEvents:"none"}}/>

              <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:24}}>
                <div style={{width:44,height:44,borderRadius:12,background:"linear-gradient(135deg,#ff3b3b,#FF6A00)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 8px 28px rgba(255,59,59,0.4)",animation:"float 4s ease 1s infinite",flexShrink:0}}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"/><path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/><path d="M9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83.67-1.5 1.5-1.5z"/><path d="M3.5 14H5v1.5c0 .83-.67 1.5-1.5 1.5S2 16.33 2 15.5 2.67 14 3.5 14z"/><path d="M14 14.5c0-.83.67-1.5 1.5-1.5h5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-5c-.83 0-1.5-.67-1.5-1.5z"/><path d="M15.5 19H14v1.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z"/><path d="M10 9.5C10 8.67 9.33 8 8.5 8h-5C2.67 8 2 8.67 2 9.5S2.67 11 3.5 11h5c.83 0 1.5-.67 1.5-1.5z"/><path d="M8.5 5H10V3.5C10 2.67 9.33 2 8.5 2S7 2.67 7 3.5 7.67 5 8.5 5z"/></svg>
                </div>
                <div>
                  <h3 style={{fontFamily:"'Poppins',sans-serif",fontWeight:900,fontSize:"1.15rem",color:"#fff",margin:0}}>Battle Manual</h3>
                  <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.65rem",color:"#ff6b6b",fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase"}}>Personal OS</span>
                </div>
              </div>
              <p style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.78rem",color:"rgba(255,255,255,0.45)",lineHeight:1.7,margin:"0 0 18px"}}>16 battle-tested principles from Gita, Taoism and Stoicism in an interactive book format.</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:18}}>
                {["Logical Brain","Bhagavad Gita","Taoism","Stoicism","Growth Mindset","Battle Training"].map(t=>(
                  <span key={t} style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.65rem",fontWeight:600,color:"#ff6b6b",background:"rgba(255,59,59,0.1)",border:"1px solid rgba(255,59,59,0.2)",borderRadius:100,padding:"3px 9px"}}>{t}</span>
                ))}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{height:1,flex:1,background:"linear-gradient(90deg,rgba(255,59,59,0.4),transparent)"}}/>
                <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.62rem",fontWeight:700,color:"rgba(255,99,99,0.5)",letterSpacing:"0.12em",textTransform:"uppercase"}}>Battle Manual</span>
              </div>
            </div>

            {/* Introspection */}
            <div className="sys-card" style={{background:"rgba(74,222,128,0.04)",border:"1px solid rgba(74,222,128,0.14)",borderRadius:18,padding:"clamp(16px,3vw,28px) clamp(14px,2.5vw,22px)",position:"relative",overflow:"hidden"}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(74,222,128,0.09)";(e.currentTarget as HTMLElement).style.borderColor="rgba(74,222,128,0.35)";(e.currentTarget as HTMLElement).style.boxShadow="0 24px 60px rgba(74,222,128,0.12)";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="rgba(74,222,128,0.04)";(e.currentTarget as HTMLElement).style.borderColor="rgba(74,222,128,0.14)";(e.currentTarget as HTMLElement).style.boxShadow="none";}}
            >
              <div style={{position:"absolute",top:-80,right:-80,width:220,height:220,borderRadius:"50%",background:"radial-gradient(circle,rgba(74,222,128,0.1),transparent)",pointerEvents:"none"}}/>
              <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:24}}>
                <div style={{width:44,height:44,borderRadius:12,background:"linear-gradient(135deg,#4ade80,#22c55e)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 8px 28px rgba(74,222,128,0.4)",animation:"float 4s ease 1.5s infinite",flexShrink:0,fontSize:"1.2rem"}}>🔍</div>
                <div>
                  <h3 style={{fontFamily:"'Poppins',sans-serif",fontWeight:900,fontSize:"1.15rem",color:"#fff",margin:0}}>Daily Introspection</h3>
                  <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.65rem",color:"#4ade80",fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase"}}>Daily Mirror</span>
                </div>
              </div>
              <p style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.78rem",color:"rgba(255,255,255,0.45)",lineHeight:1.7,margin:"0 0 18px"}}>Write your purpose, visualization, rules and manifestations. Read every morning.</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:18}}>
                {["Purpose","Visualization","Rules","Manifestation","Data Drop","Custom Sections"].map(t=>(
                  <span key={t} style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.65rem",fontWeight:600,color:"#4ade80",background:"rgba(74,222,128,0.1)",border:"1px solid rgba(74,222,128,0.2)",borderRadius:100,padding:"3px 9px"}}>{t}</span>
                ))}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{height:1,flex:1,background:"linear-gradient(90deg,rgba(74,222,128,0.4),transparent)"}}/>
                <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.62rem",fontWeight:700,color:"rgba(74,222,128,0.5)",letterSpacing:"0.12em",textTransform:"uppercase"}}>Daily Introspection</span>
              </div>
            </div>

          </div>
        </div>
      </section>




      {/* ── FEEDBACK SECTION ── */}
      <section style={{padding:"80px 18px 100px",position:"relative",zIndex:1,borderTop:"1px solid rgba(255,255,255,0.05)"}}>
        {/* Ambient glow */}
        <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 50% 0%,rgba(255,106,0,0.05),transparent 60%)",pointerEvents:"none"}}/>
        <div style={{maxWidth:960,margin:"0 auto",position:"relative"}}>
          {/* Header */}
          <div style={{textAlign:"center",marginBottom:56}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(255,106,0,0.08)",border:"1px solid rgba(255,106,0,0.2)",borderRadius:100,padding:"5px 16px",marginBottom:20}}>
              <span style={{fontSize:"0.6rem",color:"#FF6A00"}}>★</span>
              <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.68rem",fontWeight:700,color:"#FF6A00",letterSpacing:"0.12em",textTransform:"uppercase"}}>Community Feedback</span>
            </div>
            <h2 style={{fontFamily:"'Poppins',sans-serif",fontWeight:900,fontSize:"clamp(1.8rem,4vw,2.8rem)",color:"#fff",margin:"0 0 14px",lineHeight:1.1}}>
              What people are <span style={{background:"linear-gradient(90deg,#FF6A00,#C36BFF)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>saying</span>
            </h2>
            <p style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.88rem",color:"rgba(255,255,255,0.35)",margin:"0 0 32px"}}>Real feedback from real users — no filters</p>
            {/* CTA button here too */}
            <button onClick={goTo} style={{background:"linear-gradient(135deg,#FF6A00,#C36BFF)",border:"none",borderRadius:14,color:"#fff",padding:"16px 44px",cursor:"pointer",fontFamily:"'Poppins',sans-serif",fontSize:"0.95rem",fontWeight:800,letterSpacing:"0.02em",boxShadow:"0 8px 40px rgba(255,106,0,0.3)",marginBottom:8}}>
              Start Building Free →
            </button>
            <p style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.65rem",color:"rgba(255,255,255,0.18)",letterSpacing:"0.06em",marginBottom:0}}>Free early access · No credit card required</p>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(380px,100%),1fr))",gap:32,alignItems:"start"}}>

            {/* LEFT — Submit form */}
            <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:20,padding:"28px 24px"}}>
              <h3 style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:"1rem",color:"#fff",margin:"0 0 20px"}}>Leave your feedback</h3>

              {fbSuccess ? (
                <div style={{textAlign:"center",padding:"32px 20px"}}>
                  <div style={{fontSize:"2.5rem",marginBottom:12}}>🎉</div>
                  <div style={{fontFamily:"'Poppins',sans-serif",fontWeight:700,fontSize:"1rem",color:"#4ade80",marginBottom:8}}>Thank you!</div>
                  <div style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.82rem",color:"rgba(255,255,255,0.4)"}}>Your feedback has been submitted.</div>
                </div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  <input value={fbName} onChange={e=>setFbName(e.target.value)} placeholder="Your name"
                    style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,color:"#fff",padding:"11px 14px",fontFamily:"'Poppins',sans-serif",fontSize:"0.85rem",outline:"none",transition:"border-color 0.2s",width:"100%",boxSizing:"border-box"}}
                    onFocus={e=>(e.currentTarget.style.borderColor="rgba(255,106,0,0.5)") as any}
                    onBlur={e=>(e.currentTarget.style.borderColor="rgba(255,255,255,0.1)") as any}
                  />

                  {/* Feature selector */}
                  <select value={fbFeature} onChange={e=>setFbFeature(e.target.value)}
                    style={{background:"#0f0f1c",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,color:"rgba(255,255,255,0.7)",padding:"11px 14px",fontFamily:"'Poppins',sans-serif",fontSize:"0.85rem",outline:"none",cursor:"pointer",width:"100%",boxSizing:"border-box"}}>
                    {["General","Goal Planner","Habit Tracker","Battle Manual","UI/Design","Performance"].map(f=>(
                      <option key={f} value={f} style={{background:"#0f0f1c"}}>{f}</option>
                    ))}
                  </select>

                  {/* Star rating */}
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.75rem",color:"rgba(255,255,255,0.4)"}}>Rating:</span>
                    <div style={{display:"flex",gap:2}}>
                      {[1,2,3,4,5].map(s=>(
                        <button key={s} onClick={()=>setFbRating(s)} style={{background:"none",border:"none",cursor:"pointer",padding:"2px 3px",fontSize:"1.5rem",lineHeight:1,transition:"transform 0.15s",transform:s<=fbRating?"scale(1.15)":"scale(1)"}}>
                          {s<=fbRating
                            ? <span style={{background:"linear-gradient(135deg,#FF6A00,#C36BFF)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",filter:"drop-shadow(0 0 6px rgba(255,106,0,0.5))"}}>★</span>
                            : <span style={{color:"rgba(255,255,255,0.15)"}}>★</span>
                          }
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea value={fbMessage} onChange={e=>setFbMessage(e.target.value)} placeholder="Share your experience, suggestions, or anything..."
                    rows={4} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,color:"#fff",padding:"11px 14px",fontFamily:"'Poppins',sans-serif",fontSize:"0.85rem",outline:"none",resize:"vertical",width:"100%",boxSizing:"border-box",transition:"border-color 0.2s"}}
                    onFocus={e=>(e.currentTarget.style.borderColor="rgba(255,106,0,0.5)") as any}
                    onBlur={e=>(e.currentTarget.style.borderColor="rgba(255,255,255,0.1)") as any}
                  />

                  <button onClick={submitFb} disabled={fbSubmitting||!fbName.trim()||!fbMessage.trim()}
                    style={{background:fbSubmitting||!fbName.trim()||!fbMessage.trim()?"rgba(255,255,255,0.06)":"linear-gradient(135deg,#FF6A00,#C36BFF)",border:"none",borderRadius:10,color:fbSubmitting||!fbName.trim()||!fbMessage.trim()?"rgba(255,255,255,0.2)":"#fff",padding:"12px 0",cursor:fbSubmitting||!fbName.trim()||!fbMessage.trim()?"default":"pointer",fontFamily:"'Poppins',sans-serif",fontSize:"0.88rem",fontWeight:700,transition:"all 0.2s",width:"100%"}}>
                    {fbSubmitting?"Submitting...":"Submit Feedback →"}
                  </button>
                </div>
              )}
            </div>

            {/* RIGHT — Feedback list */}
            <div style={{display:"flex",flexDirection:"column",gap:14,maxHeight:520,overflowY:"auto",paddingRight:4}}>
              {feedbackList.length===0?(
                <div style={{textAlign:"center",padding:"48px 20px",color:"rgba(255,255,255,0.2)"}}>
                  <div style={{fontSize:"2rem",marginBottom:12}}>💬</div>
                  <div style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.82rem"}}>No feedback yet — be the first!</div>
                </div>
              ):feedbackList.map(fb=>(
                <div key={fb.id} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"18px 20px",transition:"border-color 0.2s"}}
                  onMouseEnter={e=>(e.currentTarget.style.borderColor="rgba(255,106,0,0.2)") as any}
                  onMouseLeave={e=>(e.currentTarget.style.borderColor="rgba(255,255,255,0.07)") as any}
                >
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10,gap:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      {/* Avatar */}
                      <div style={{width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#FF6A00,#C36BFF)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <span style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:"0.85rem",color:"#fff"}}>{fb.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <div style={{fontFamily:"'Poppins',sans-serif",fontWeight:700,fontSize:"0.85rem",color:"#fff"}}>{fb.name}</div>
                        <div style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.62rem",color:"rgba(255,255,255,0.25)"}}>{new Date(fb.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0}}>
                      <div style={{display:"flex",gap:1}}>{[1,2,3,4,5].map(s=>(
                        s<=fb.rating
                          ? <span key={s} style={{fontSize:"0.85rem",background:"linear-gradient(135deg,#FF6A00,#C36BFF)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",filter:"drop-shadow(0 0 4px rgba(255,106,0,0.4))"}}>★</span>
                          : <span key={s} style={{fontSize:"0.85rem",color:"rgba(255,255,255,0.12)"}}>★</span>
                      ))}</div>
                      {fb.feature&&<span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.58rem",fontWeight:700,color:"#FF6A00",background:"rgba(255,106,0,0.1)",border:"1px solid rgba(255,106,0,0.2)",borderRadius:100,padding:"2px 8px"}}>{fb.feature}</span>}
                    </div>
                  </div>
                  <p style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.82rem",color:"rgba(255,255,255,0.6)",margin:0,lineHeight:1.75}}>{fb.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{borderTop:"1px solid rgba(255,255,255,0.05)",padding:"22px 48px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"relative",zIndex:1}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:22,height:22,borderRadius:6,background:"linear-gradient(135deg,#FF6A00,#C36BFF)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          </div>
          <span style={{fontFamily:"'Poppins',sans-serif",fontWeight:700,fontSize:"0.82rem",color:"rgba(255,255,255,0.25)"}}>LifeStack</span>
        </div>
        <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.68rem",color:"rgba(255,255,255,0.12)",letterSpacing:"0.06em"}}>Build your empire, one day at a time.</span>
      </footer>
    </div>
  );
}