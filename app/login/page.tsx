"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const toEmail = (u: string) => `${u.toLowerCase().trim()}@lifestack.app`;

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab]           = useState<"signup"|"login">("signup");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [done, setDone]         = useState(false); // signup success

  const handleSignup = async () => {
    setError("");
    const u = username.toLowerCase().trim();
    if (!u || u.length < 3)          { setError("Username must be at least 3 characters."); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(u)) { setError("Only letters, numbers, underscores allowed."); return; }
    if (!password || password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);

    // Check if taken
    const { data: taken } = await supabase.from("profiles").select("username").eq("username", u).single();
    if (taken) { setError("Username already taken. Choose another."); setLoading(false); return; }

    // Create account
    const { data, error: err } = await supabase.auth.signUp({ email: toEmail(u), password });
    if (err)         { setError(err.message); setLoading(false); return; }
    if (!data.user)  { setError("Something went wrong. Try again."); setLoading(false); return; }

    // Save profile
    await supabase.from("profiles").insert({ id: data.user.id, username: u });

    setLoading(false);
    setDone(true); // show success screen
  };

  const handleLogin = async () => {
    setError("");
    const u = username.toLowerCase().trim();
    if (!u)       { setError("Enter your username."); return; }
    if (!password){ setError("Enter your password."); return; }
    setLoading(true);

    const { data, error: err } = await supabase.auth.signInWithPassword({ email: toEmail(u), password });
    if (err || !data.session) {
      const { data: profile } = await supabase.from("profiles").select("username").eq("username", u).single();
      setError(!profile ? "Username not found." : "Wrong password.");
      setLoading(false); return;
    }

    // Success — redirect to choose page
    setTimeout(() => {
      router.push("/choose");
    }, 500);
  };

  const inp: React.CSSProperties = {
    width: "100%", padding: "13px 16px",
    background: "rgba(255,255,255,0.07)",
    border: "1.5px solid rgba(255,255,255,0.12)",
    borderRadius: 10, color: "#fff",
    fontFamily: "'Poppins',sans-serif", fontSize: "0.92rem",
    outline: "none", boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  // ── SIGNUP SUCCESS SCREEN ──────────────────────────────────────────────
  if (done) return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0a0a14,#0f0f1e,#0a1020)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Poppins',sans-serif",padding:24}}>
      <div style={{textAlign:"center",animation:"fadeUp 0.5s ease"}}>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div style={{width:72,height:72,borderRadius:"50%",background:"rgba(74,222,128,0.12)",border:"2px solid #4ade80",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px",fontSize:"2rem"}}>✓</div>
        <h2 style={{fontFamily:"'Poppins',sans-serif",fontWeight:900,fontSize:"1.8rem",color:"#4ade80",margin:"0 0 8px"}}>Registered Successfully!</h2>
        <p style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.9rem",color:"rgba(255,255,255,0.5)",margin:"0 0 32px"}}>Your account <strong style={{color:"#fff"}}>@{username}</strong> is ready.</p>
        <button onClick={()=>{ setDone(false); setTab("login"); setPassword(""); setError(""); }} style={{
          background:"linear-gradient(135deg,#FF6A00,#ff9a3c)",border:"none",borderRadius:12,
          color:"#fff",padding:"14px 40px",cursor:"pointer",
          fontFamily:"'Poppins',sans-serif",fontSize:"0.95rem",fontWeight:800,
          boxShadow:"0 8px 24px rgba(255,106,0,0.35)",
        }}>Log In Now →</button>
      </div>
    </div>
  );

  // ── MAIN LOGIN/SIGNUP PAGE ─────────────────────────────────────────────
  return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(135deg,#0a0a14 0%,#0f0f1e 50%,#0a1020 100%)",
      display:"flex",alignItems:"center",justifyContent:"center",
      fontFamily:"'Poppins',sans-serif",padding:"16px",position:"relative",overflow:"hidden",
    }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)}}
        input::placeholder{color:rgba(255,255,255,0.25)}
        input:focus{border-color:rgba(255,106,0,0.6) !important; box-shadow:0 0 0 3px rgba(255,106,0,0.1)}
      `}</style>

      {/* Background blobs */}
      <div style={{position:"absolute",top:"-10%",left:"-5%",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(255,106,0,0.08),transparent 70%)",filter:"blur(40px)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:"-10%",right:"-5%",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,rgba(99,102,241,0.1),transparent 70%)",filter:"blur(50px)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",top:"40%",left:"50%",transform:"translate(-50%,-50%)",width:800,height:400,borderRadius:"50%",background:"radial-gradient(ellipse,rgba(195,107,255,0.05),transparent 70%)",filter:"blur(60px)",pointerEvents:"none"}}/>

      {/* Card */}
      <div style={{
        position:"relative",zIndex:1,
        width:"100%",maxWidth:"min(420px,100%)",
        background:"rgba(13,13,20,0.85)",
        backdropFilter:"blur(24px)",
        border:"1px solid rgba(255,255,255,0.08)",
        borderRadius:24,padding:"28px 22px",
        animation:"fadeUp 0.6s ease",
        boxShadow:"0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}>

        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:10,marginBottom:12}}>
            <img src="/icons/icon-192.png" alt="LifeStack Logo" style={{width:40,height:40,borderRadius:11,boxShadow:"0 4px 20px rgba(255,106,0,0.4)"}} />
            <span style={{fontFamily:"'Poppins',sans-serif",fontWeight:900,fontSize:"1.6rem",color:"#fff",letterSpacing:"-0.01em"}}>LifeStack</span>
          </div>
          <p style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.82rem",color:"rgba(255,255,255,0.35)",margin:0}}>
            {tab==="signup"?"Build your growth system today.":"Welcome back. Keep building."}
          </p>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",background:"rgba(255,255,255,0.04)",borderRadius:12,padding:4,marginBottom:28,border:"1px solid rgba(255,255,255,0.06)"}}>
          {(["signup","login"] as const).map(t=>(
            <button key={t} onClick={()=>{setTab(t);setError("");setUsername("");setPassword("");}} style={{
              flex:1,padding:"10px",borderRadius:9,border:"none",cursor:"pointer",
              fontFamily:"'Poppins',sans-serif",fontSize:"0.84rem",fontWeight:700,
              background:tab===t?"linear-gradient(135deg,#FF6A00,#ff9a3c)":"transparent",
              color:tab===t?"#fff":"rgba(255,255,255,0.35)",
              transition:"all 0.22s",
              boxShadow:tab===t?"0 4px 12px rgba(255,106,0,0.3)":"none",
            }}>{t==="signup"?"Sign Up":"Log In"}</button>
          ))}
        </div>

        {/* Fields */}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <label style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.6rem",fontWeight:700,color:"rgba(255,255,255,0.35)",letterSpacing:"0.12em",textTransform:"uppercase",display:"block",marginBottom:7}}>Username</label>
            <input value={username} onChange={e=>{setUsername(e.target.value);setError("");}}
              placeholder="e.g. vivek_verma" autoCapitalize="none" style={inp}
              onKeyDown={e=>e.key==="Enter"&&(tab==="signup"?handleSignup():handleLogin())}
            />
          </div>
          <div>
            <label style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.6rem",fontWeight:700,color:"rgba(255,255,255,0.35)",letterSpacing:"0.12em",textTransform:"uppercase",display:"block",marginBottom:7}}>
              Password {tab==="signup"&&<span style={{fontWeight:400,color:"rgba(255,255,255,0.2)",letterSpacing:0,textTransform:"none"}}>(min 6 chars)</span>}
            </label>
            <input type="password" value={password} onChange={e=>{setPassword(e.target.value);setError("");}}
              placeholder="••••••••" style={inp}
              onKeyDown={e=>e.key==="Enter"&&(tab==="signup"?handleSignup():handleLogin())}
            />
          </div>

          {error && (
            <div style={{background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)",borderRadius:9,padding:"10px 14px",display:"flex",alignItems:"center",gap:8}}>
              <span style={{color:"#f87171",fontSize:"0.9rem"}}>⚠</span>
              <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.78rem",color:"#f87171"}}>{error}</span>
            </div>
          )}

          <button
            onClick={tab==="signup"?handleSignup:handleLogin}
            disabled={loading}
            style={{
              background:loading?"rgba(255,255,255,0.05)":"linear-gradient(135deg,#FF6A00,#ff9a3c)",
              border:"none",borderRadius:12,color:loading?"rgba(255,255,255,0.3)":"#fff",
              padding:"14px",cursor:loading?"not-allowed":"pointer",
              fontFamily:"'Poppins',sans-serif",fontSize:"0.92rem",fontWeight:800,
              letterSpacing:"0.02em",transition:"all 0.22s",marginTop:4,
              boxShadow:loading?"none":"0 8px 24px rgba(255,106,0,0.35)",
            }}
          >
            {loading?"Please wait...":(tab==="signup"?"Create Account →":"Log In →")}
          </button>
        </div>

        {/* Switch */}
        <p style={{fontFamily:"'Poppins',sans-serif",fontSize:"0.72rem",color:"rgba(255,255,255,0.2)",textAlign:"center",marginTop:24,marginBottom:0}}>
          {tab==="signup"?"Already have an account? ":"Don't have an account? "}
          <button onClick={()=>{setTab(tab==="signup"?"login":"signup");setError("");setUsername("");setPassword("");}}
            style={{background:"none",border:"none",color:"#FF6A00",cursor:"pointer",fontFamily:"'Poppins',sans-serif",fontSize:"0.72rem",fontWeight:700,textDecoration:"underline",padding:0}}>
            {tab==="signup"?"Log in":"Sign up free"}
          </button>
        </p>
      </div>
    </div>
  );
}