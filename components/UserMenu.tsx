"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function UserMenu() {
  const [open, setOpen]         = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = session.user.user_metadata?.username || session.user.email?.split("@")[0] || "User";
        setUsername(u);
      }
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (!username) return null;

  return (
    <div style={{ position:"relative" }}>
      <button onClick={() => setOpen(!open)} style={{
        display:"flex", alignItems:"center", gap:8,
        background:"rgba(255,255,255,0.05)", border:"1px solid #1e1e1e",
        borderRadius:8, padding:"5px 12px 5px 6px", cursor:"pointer", transition:"all 0.18s",
      }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#FF6A00"}
        onMouseLeave={e => { if(!open)(e.currentTarget as HTMLElement).style.borderColor = "#1e1e1e"; }}
      >
        <div style={{
          width:26, height:26, borderRadius:"50%",
          background:"linear-gradient(135deg,#FF6A00,#ff9a3c)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontFamily:"'Poppins',sans-serif", fontWeight:800, fontSize:"0.75rem", color:"#fff",
        }}>{username[0].toUpperCase()}</div>
        <span style={{ fontFamily:"'Poppins',sans-serif", fontSize:"0.72rem", fontWeight:600, color:"#aaa" }}>@{username}</span>
        <span style={{ color:"#555", fontSize:"0.55rem" }}>▼</span>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position:"fixed", inset:0, zIndex:90 }}/>
          <div style={{
            position:"absolute", top:"calc(100% + 8px)", right:0, zIndex:100,
            background:"#0d0d0d", border:"1px solid #1e1e1e", borderRadius:10,
            padding:6, minWidth:170,
            boxShadow:"0 8px 32px rgba(0,0,0,0.6)",
          }}>
            <div style={{ padding:"8px 12px", borderBottom:"1px solid #1a1a1a", marginBottom:4 }}>
              <div style={{ fontFamily:"'Poppins',sans-serif", fontSize:"0.75rem", fontWeight:700, color:"#fff" }}>@{username}</div>
              <div style={{ fontFamily:"'Poppins',sans-serif", fontSize:"0.62rem", color:"#444", marginTop:1 }}>Logged in</div>
            </div>
            <button onClick={() => { setOpen(false); window.location.href="/choose"; }} style={{
              width:"100%", background:"none", border:"none", cursor:"pointer",
              padding:"8px 12px", borderRadius:6, textAlign:"left",
              fontFamily:"'Poppins',sans-serif", fontSize:"0.75rem", color:"#888", transition:"all 0.15s",
              display:"flex", alignItems:"center", gap:8,
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.color="#fff"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="none"; (e.currentTarget as HTMLElement).style.color="#888"; }}
            >⊞ Switch System</button>
            <button onClick={handleSignOut} style={{
              width:"100%", background:"none", border:"none", cursor:"pointer",
              padding:"8px 12px", borderRadius:6, textAlign:"left",
              fontFamily:"'Poppins',sans-serif", fontSize:"0.75rem", color:"#f87171", transition:"all 0.15s",
              display:"flex", alignItems:"center", gap:8,
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background="rgba(248,113,113,0.08)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background="none"}
            >→ Log Out</button>
          </div>
        </>
      )}
    </div>
  );
}