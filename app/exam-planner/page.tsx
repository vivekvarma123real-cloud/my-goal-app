"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { loadExam, saveExam } from "../../lib/examDb";

// ─── Types ────────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).substr(2, 9);
const STORAGE_KEY = "lifestack-exam";
const today = () => new Date().toISOString().split("T")[0];

type Chapter = { id: string; name: string; done: boolean; };
type Subject = {
  id: string; name: string; deadline: string;
  chapters: Chapter[]; color: string;
  dpps?: boolean; pyqs?: boolean; notes?: boolean; shortnotes?: boolean; lec?: boolean; test?: boolean; revs?: number; subjectDone?: boolean;
};

type DailyLog = {
  date: string; hours: number; dpps: number; journal: string;
};
type TestScore = {
  id: string; date: string; subjectId: string; testType: string;
  score: number; maxScore: number;
};
type WeekPlan = {
  id: string; weekStart: string; // Monday YYYY-MM-DD
  targetHours: number; targetDpps: number;
  chapterTargets: { subjectId: string; chapIds: string[] }[];
  notes: string;
};
type MonthPlan = {
  id: string; month: string; // YYYY-MM
  subjectTargets: { subjectId: string; chapCount: number }[];
  notes: string;
};
type ExamStore = {
  examName: string; examDate: string; targetHours: number;
  subjects: Subject[]; dailyLogs: DailyLog[]; testScores: TestScore[];
  weekPlans: WeekPlan[]; monthPlans: MonthPlan[];
};

const DEFAULT_STORE: ExamStore = {
  examName: "", examDate: "", targetHours: 8,
  subjects: [], dailyLogs: [], testScores: [],
  weekPlans: [], monthPlans: []
};

const EXAM_PRESETS = ["GATE","JEE","UPSC","CA","NEET","GMAT","CAT","CET","CLAT","Custom"];
const SUBJECT_COLORS = ["#C36BFF","#4A90FF","#28D7FF","#9e7dff","#ff6b6b","#ffa94d","#69db7c","#4dabf7","#f783ac","#a9e34b"];
const TEST_TYPES = ["Weekly Test","Mock Test","Full Mock","Surprise Test","DPP Quiz","Unit Test"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS_SHORT = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function daysLeft(dateStr: string) {
  if (!dateStr) return 0;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function dateKey(d: Date) { return d.toISOString().split("T")[0]; }

function getWeekDates() {
  const now = new Date();
  const dow = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dow + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function getLast30Days() {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d;
  });
}

// ─── Mini SVG Charts ──────────────────────────────────────────────────────────
function WeeklyBarChart({ logs }: { logs: DailyLog[] }) {
  const weekDates = getWeekDates();
  const data = weekDates.map(d => {
    const ds = dateKey(d);
    return { label: DAYS_SHORT[weekDates.indexOf(d)], hours: logs.find(l => l.date === ds)?.hours || 0 };
  });
  const maxH = Math.max(...data.map(d => d.hours), 1);
  const W = 420, H = 150, PB = 36, PT = 10, PL = 28, PR = 8;
  const gH = H - PB - PT, gW = W - PL - PR;
  const n = data.length, slotW = gW / n, barW = Math.min(slotW * 0.55, 38);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id="wbg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C36BFF" />
          <stop offset="100%" stopColor="#4A90FF" />
        </linearGradient>
      </defs>
      {[0, 2, 4, 6, 8].map(v => {
        const y = PT + gH - (v / (maxH > 8 ? maxH : 8)) * gH;
        return (
          <g key={v}>
            <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={PL - 4} y={y + 4} fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="end" fontFamily="Poppins,sans-serif">{v}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const x = PL + slotW * i + slotW / 2;
        const barH = (d.hours / (maxH > 8 ? maxH : 8)) * gH;
        const barY = PT + gH - barH;
        const isToday = weekDates[i] && dateKey(weekDates[i]) === today();
        return (
          <g key={i}>
            <rect x={x - barW / 2} y={PT} width={barW} height={gH} fill="rgba(255,255,255,0.03)" rx="5" />
            {barH > 0 && <rect x={x - barW / 2} y={barY} width={barW} height={barH} fill="url(#wbg)" rx="5" opacity={isToday ? 1 : 0.7} />}
            {d.hours > 0 && <text x={x} y={barY - 5} fill="#C36BFF" fontSize="10" fontWeight="700" textAnchor="middle" fontFamily="Poppins,sans-serif">{d.hours}h</text>}
            <text x={x} y={H - 8} fill={isToday ? "#C36BFF" : "rgba(255,255,255,0.4)"} fontSize="10" fontWeight={isToday ? "700" : "400"} textAnchor="middle" fontFamily="Poppins,sans-serif">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function MonthlyLineChart({ logs }: { logs: DailyLog[] }) {
  const days = getLast30Days();
  const data = days.map(d => logs.find(l => l.date === dateKey(d))?.hours || 0);
  const maxH = Math.max(...data, 1);
  const W = 460, H = 130, PT = 10, PB = 28, PL = 28, PR = 8;
  const gW = W - PL - PR, gH = H - PT - PB, n = data.length;
  const pts = data.map((v, i) => ({ x: PL + (i / (n - 1)) * gW, y: PT + gH - (v / maxH) * gH }));
  const lp = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const ap = `M${pts[0].x},${PT + gH} ${pts.map(p => `L${p.x},${p.y}`).join(" ")} L${pts[n - 1].x},${PT + gH} Z`;
  const todayIdx = days.findIndex(d => dateKey(d) === today());
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id="mlg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#C36BFF" /><stop offset="50%" stopColor="#4A90FF" /><stop offset="100%" stopColor="#28D7FF" />
        </linearGradient>
        <linearGradient id="mag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4A90FF" stopOpacity="0.18" /><stop offset="100%" stopColor="#4A90FF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={ap} fill="url(#mag)" />
      <path d={lp} fill="none" stroke="url(#mlg)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {todayIdx >= 0 && <circle cx={pts[todayIdx].x} cy={pts[todayIdx].y} r="5" fill="#C36BFF" />}
      {[0, 3, 4, 6, 8].filter(v => v <= maxH).map(v => {
        const y = PT + gH - (v / maxH) * gH;
        return <text key={v} x={PL - 4} y={y + 4} fill="rgba(255,255,255,0.3)" fontSize="8" textAnchor="end" fontFamily="Poppins,sans-serif">{v}</text>;
      })}
      {[0, 6, 13, 20, 29].map(i => <text key={i} x={PL + (i / (n - 1)) * gW} y={H - 4} fill="rgba(255,255,255,0.3)" fontSize="8" textAnchor="middle" fontFamily="Poppins,sans-serif">{MONTHS[days[i].getMonth()]} {days[i].getDate()}</text>)}
    </svg>
  );
}

function HeatMapChart({ logs }: { logs: DailyLog[] }) {
  const COLS = 13; // ~13 weeks
  const ROWS = 7;  // days Mon–Sun
  const cellSize = 13, gap = 3;
  const totalDays = COLS * ROWS; // 91 days
  const days: { date: string; hours: number }[] = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    days.push({ date: ds, hours: logs.find(l => l.date === ds)?.hours || 0 });
  }
  const maxH = Math.max(...days.map(d => d.hours), 1);
  const colorFor = (h: number) => {
    if (h === 0) return 'rgba(255,255,255,0.04)';
    const t = h / maxH;
    if (t < 0.3) return 'rgba(74,144,255,0.25)';
    if (t < 0.6) return 'rgba(121,168,255,0.55)';
    if (t < 0.85) return 'rgba(195,107,255,0.75)';
    return '#C36BFF';
  };
  const W = COLS * (cellSize + gap);
  const H = ROWS * (cellSize + gap) + 28;
  // Month labels
  const monthLabels: { x: number; label: string }[] = [];
  let lastMonth = -1;
  days.forEach((d, idx) => {
    const col = Math.floor(idx / ROWS);
    const m = new Date(d.date).getMonth();
    if (m !== lastMonth) { monthLabels.push({ x: col * (cellSize + gap), label: MONTHS[m] }); lastMonth = m; }
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%' }}>
      {monthLabels.map((ml, i) => <text key={i} x={ml.x} y={10} fill="rgba(255,255,255,0.35)" fontSize="8" fontFamily="Poppins,sans-serif">{ml.label}</text>)}
      {days.map((d, idx) => {
        const col = Math.floor(idx / ROWS);
        const row = idx % ROWS;
        const x = col * (cellSize + gap);
        const y = 16 + row * (cellSize + gap);
        return (
          <rect key={idx} x={x} y={y} width={cellSize} height={cellSize} rx="2"
            fill={colorFor(d.hours)}
            opacity={d.date === new Date().toISOString().split('T')[0] ? 1 : 0.9}
          >
            <title>{d.date}: {d.hours}h</title>
          </rect>
        );
      })}
    </svg>
  );
}

// ─── Setup Wizard ─────────────────────────────────────────────────────────────
function SetupWizard({ onDone }: { onDone: (s: ExamStore) => void }) {
  const [examName, setExamName] = useState("GATE");
  const [customName, setCustomName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [targetHours, setTargetHours] = useState(8);
  const finalName = examName === "Custom" ? customName : examName;
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "var(--font)" }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .ep-preset:hover{border-color:#C36BFF!important;background:rgba(195,107,255,0.12)!important;color:#C36BFF!important}
      `}</style>
      <div style={{ maxWidth: 540, width: "100%", animation: "fadeUp 0.5s ease both" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg,#C36BFF,#4A90FF)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 8px 32px rgba(195,107,255,0.4)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
          </div>
          <h1 style={{ fontWeight: 900, fontSize: "2rem", color: "var(--text)", margin: "0 0 8px", letterSpacing: "-0.02em" }}>Exam Planner</h1>
          <p style={{ color: "var(--text-sub)", fontSize: "0.88rem" }}>Your personalised competitive exam command center</p>
        </div>

        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 32 }}>
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: "block", color: "var(--text-sub)", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Choose your exam</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {EXAM_PRESETS.map(e => (
                <button key={e} className="ep-preset" onClick={() => setExamName(e)} style={{
                  fontFamily: "var(--font)", fontSize: "0.8rem", fontWeight: 700, padding: "8px 16px", borderRadius: 8,
                  border: "1px solid", cursor: "pointer", transition: "all 0.18s",
                  borderColor: examName === e ? "#C36BFF" : "var(--border)",
                  background: examName === e ? "rgba(195,107,255,0.14)" : "transparent",
                  color: examName === e ? "#C36BFF" : "var(--text-muted)"
                }}>{e}</button>
              ))}
            </div>
            {examName === "Custom" && (
              <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Enter your exam name..." style={{ marginTop: 12, width: "100%", padding: "10px 14px", background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontFamily: "var(--font)", fontSize: "0.9rem" }} />
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
            <div>
              <label style={{ display: "block", color: "var(--text-sub)", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Exam Date</label>
              <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} style={{ width: "100%", padding: "10px 14px", background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontFamily: "var(--font)", fontSize: "0.9rem" }} />
            </div>
            <div>
              <label style={{ display: "block", color: "var(--text-sub)", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Daily Target (hrs)</label>
              <input type="number" min="1" max="20" value={targetHours} onChange={e => setTargetHours(Number(e.target.value))} style={{ width: "100%", padding: "10px 14px", background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontFamily: "var(--font)", fontSize: "0.9rem" }} />
            </div>
          </div>

          <button onClick={() => { if (!finalName || !examDate) return; onDone({ ...DEFAULT_STORE, examName: finalName, examDate, targetHours }); }}
            disabled={!finalName || !examDate}
            style={{ width: "100%", padding: "14px", background: finalName && examDate ? "linear-gradient(135deg,#C36BFF,#4A90FF)" : "var(--bg-subtle)", color: finalName && examDate ? "#fff" : "var(--text-muted)", border: "none", borderRadius: 10, fontFamily: "var(--font)", fontWeight: 800, fontSize: "1rem", cursor: finalName && examDate ? "pointer" : "not-allowed", transition: "all 0.2s", boxShadow: finalName && examDate ? "0 6px 24px rgba(195,107,255,0.35)" : "none" }}>
            Start Tracking →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Countdown Timer ──────────────────────────────────────────────────────────
function Countdown({ examDate }: { examDate: string }) {
  const days = daysLeft(examDate);
  const weeks = Math.floor(days / 7);
  const rem = days % 7;
  const urgency = days < 30 ? "#ff6b6b" : days < 90 ? "#ffa94d" : "#C36BFF";
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <div style={{ textAlign: "center", background: "rgba(195,107,255,0.07)", border: "1px solid rgba(195,107,255,0.2)", borderRadius: 10, padding: "8px 16px", minWidth: 70 }}>
        <div style={{ fontSize: "2rem", fontWeight: 900, color: urgency, lineHeight: 1 }}>{days}</div>
        <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>DAYS</div>
      </div>
      <div style={{ textAlign: "center", background: "rgba(74,144,255,0.07)", border: "1px solid rgba(74,144,255,0.15)", borderRadius: 10, padding: "8px 14px", minWidth: 60 }}>
        <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#4A90FF", lineHeight: 1 }}>{weeks}</div>
        <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>WEEKS</div>
      </div>
      <div style={{ textAlign: "center", background: "rgba(40,215,255,0.07)", border: "1px solid rgba(40,215,255,0.15)", borderRadius: 10, padding: "8px 14px", minWidth: 50 }}>
        <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#28D7FF", lineHeight: 1 }}>{rem}</div>
        <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>+DAYS</div>
      </div>
    </div>
  );
}

// DashboardSubjectRow removed in favor of direct Subject table

// ─── Subject Card ─────────────────────────────────────────────────────────────
// removed DashboardSubjectRow

function SubjectCard({ sub, onToggleChapter, onDelete }: {
  sub: Subject;
  onToggleChapter: (chId: string) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const done = sub.chapters.filter(c => c.done).length;
  const total = sub.chapters.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const dl = daysLeft(sub.deadline);
  const deadlineColor = dl < 7 ? "#ff6b6b" : dl < 21 ? "#ffa94d" : "var(--text-sub)";
  return (
    <div style={{ background: "var(--bg-card)", border: `1px solid var(--border)`, borderRadius: 12, overflow: "hidden", borderTop: `3px solid ${sub.color}` }}>
      <div onClick={() => setExpanded(e => !e)} style={{ padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: sub.color, boxShadow: `0 0 10px ${sub.color}88`, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text)" }}>{sub.name}</div>
            <div style={{ fontSize: "0.7rem", color: deadlineColor, fontWeight: 600, marginTop: 2 }}>📅 Due: {sub.deadline || "No deadline"} · {dl}d left</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: sub.color }}>{pct}%</div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{done}/{total} ch</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", flexShrink: 0 }}><path d="M6 9l6 6 6-6" /></svg>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: "var(--bg-subtle)" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${sub.color},${sub.color}88)`, transition: "width 0.4s ease" }} />
      </div>

      {expanded && (
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
          {sub.chapters.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontStyle: "italic" }}>No chapters added yet.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 6 }}>
              {sub.chapters.map(ch => (
                <label key={ch.id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "6px 10px", borderRadius: 7, background: ch.done ? `${sub.color}12` : "var(--bg-subtle)", transition: "background 0.15s" }}>
                  <div onClick={() => onToggleChapter(ch.id)} style={{ width: 17, height: 17, borderRadius: 5, border: `2px solid ${ch.done ? sub.color : "var(--border-act)"}`, background: ch.done ? sub.color : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.18s" }}>
                    {ch.done && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </div>
                  <span style={{ fontSize: "0.8rem", color: ch.done ? "var(--text-sub)" : "var(--text)", textDecoration: ch.done ? "line-through" : "none", fontWeight: ch.done ? 400 : 500, flex: 1 }}>{ch.name}</span>
                </label>
              ))}
            </div>
          )}
          <button onClick={onDelete} style={{ marginTop: 12, background: "none", border: "1px solid rgba(255,100,100,0.2)", borderRadius: 6, color: "rgba(255,100,100,0.6)", padding: "4px 10px", cursor: "pointer", fontSize: "0.72rem", fontFamily: "var(--font)", fontWeight: 600 }}>Delete Subject</button>
        </div>
      )}
    </div>
  );
}

// ─── Add Subject Modal ────────────────────────────────────────────────────────
function AddSubjectModal({ onAdd, onClose }: { onAdd: (s: Subject) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [color, setColor] = useState(SUBJECT_COLORS[0]);
  const [chapters, setChapters] = useState<string[]>([]);
  const [chapInput, setChapInput] = useState("");

  const addChap = () => {
    const val = chapInput.trim();
    if (val && !chapters.includes(val)) setChapters(p => [...p, val]);
    setChapInput("");
  };
  const removeChap = (ch: string) => setChapters(p => p.filter(c => c !== ch));

  const handleChapKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addChap(); }
    if (e.key === "Backspace" && !chapInput && chapters.length) setChapters(p => p.slice(0, -1));
  };

  const submit = () => {
    if (!name.trim()) return;
    onAdd({ id: uid(), name: name.trim().toUpperCase(), deadline, color, dpps: false, pyqs: false, notes: false, shortnotes: false, lec: false, test: false, revs: 0, subjectDone: false, chapters: chapters.map(n => ({ id: uid(), name: n, done: false })) });
    onClose();
  };

  const colorNames: Record<string, string> = {
    "#C36BFF": "Purple", "#4A90FF": "Blue", "#28D7FF": "Cyan",
    "#9e7dff": "Indigo", "#ff6b6b": "Red", "#ffa94d": "Orange",
    "#69db7c": "Green", "#4dabf7": "Sky", "#f783ac": "Pink", "#a9e34b": "Lime"
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--bg-card)", border: "1px solid rgba(195,107,255,0.3)", borderRadius: 18, width: "100%", maxWidth: 480, overflowY: "auto", maxHeight: "calc(100vh - 32px)", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: `linear-gradient(135deg,${color},${color}99)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>📚</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text)" }}>Add Subject</div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 1 }}>Chapters become individual checkboxes</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text-muted)", cursor: "pointer", fontSize: "0.85rem", padding: "4px 10px", fontWeight: 600 }}>✕ Close</button>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 22px 22px" }}>

          {/* Name */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Subject Name <span style={{ color: "#ff6b6b" }}>*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Engineering Mathematics, DSA, Calculus..."
              autoFocus
              style={{ width: "100%", padding: "10px 13px", background: "var(--bg-subtle)", border: `1px solid ${name ? color : "var(--border)"}`, borderRadius: 8, color: "var(--text)", fontFamily: "var(--font)", fontSize: "0.92rem", fontWeight: 600, outline: "none", boxSizing: "border-box" }} />
          </div>

          {/* Color + Deadline in a row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Color <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>({colorNames[color]})</span></label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {SUBJECT_COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)} title={colorNames[c]}
                    style={{ width: 26, height: 26, borderRadius: "50%", background: c, cursor: "pointer", border: color === c ? "3px solid white" : "3px solid transparent", boxShadow: color === c ? `0 0 10px ${c}` : "none", transition: "all 0.15s", flexShrink: 0 }} />
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Finish By <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontFamily: "var(--font)", fontSize: "0.88rem", boxSizing: "border-box" }} />
            </div>
          </div>

          {/* Chapters chip input */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7 }}>
              Chapters / Topics {chapters.length > 0 && <span style={{ color, fontWeight: 800 }}>({chapters.length})</span>}
            </label>
            <div style={{ background: "var(--bg-subtle)", border: `1px solid ${chapters.length > 0 ? color + "44" : "var(--border)"}`, borderRadius: 8, padding: "8px 10px", minHeight: 46, display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
              {chapters.map(ch => (
                <span key={ch} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: `${color}22`, color: color, border: `1px solid ${color}44`, borderRadius: 100, padding: "3px 9px 3px 10px", fontSize: "0.78rem", fontWeight: 600, lineHeight: 1.4 }}>
                  {ch}
                  <span onClick={() => removeChap(ch)} style={{ cursor: "pointer", fontWeight: 800, fontSize: "0.9rem", marginLeft: 2, opacity: 0.7 }}>×</span>
                </span>
              ))}
              <input value={chapInput} onChange={e => setChapInput(e.target.value)} onKeyDown={handleChapKey}
                placeholder={chapters.length === 0 ? "Type chapter name → press Enter to add" : "Add another..."}
                style={{ border: "none", background: "transparent", color: "var(--text)", fontFamily: "var(--font)", fontSize: "0.85rem", outline: "none", flexGrow: 1, minWidth: 140 }} />
            </div>
            <div style={{ marginTop: 5, fontSize: "0.68rem", color: "var(--text-muted)" }}>
              Press <strong>Enter</strong> or <strong>,</strong> to add each chapter · <strong>Backspace</strong> to remove last
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "11px", background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-muted)", fontFamily: "var(--font)", fontWeight: 700, cursor: "pointer", fontSize: "0.88rem" }}>Cancel</button>
            <button onClick={submit} disabled={!name.trim()}
              style={{ flex: 2, padding: "11px", background: name.trim() ? `linear-gradient(135deg,${color},#4A90FF)` : "var(--bg-subtle)", border: "none", borderRadius: 8, color: name.trim() ? "#fff" : "var(--text-muted)", fontFamily: "var(--font)", fontWeight: 800, cursor: name.trim() ? "pointer" : "not-allowed", fontSize: "0.88rem", boxShadow: name.trim() ? `0 4px 16px ${color}44` : "none", transition: "all 0.2s" }}>
              {name.trim() ? `Add "${name.trim().toUpperCase()}"${chapters.length ? ` (${chapters.length} ch)` : ""}` : "Add Subject"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}


// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExamPlannerPage() {
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#05050f",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Poppins',sans-serif",
        padding: "24px",
        textAlign: "center",
      }}>
        <div style={{ maxWidth: 560 }}>
          <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)", marginBottom: 12 }}>
            Exam Planner
          </h1>
          <p style={{ color: "rgba(255,255,255,0.65)", marginBottom: 20 }}>
            Coming soon. We are polishing this feature for a better experience.
          </p>
          <button
            onClick={() => { window.location.href = "/choose"; }}
            style={{
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.06)",
              color: "#fff",
              borderRadius: 10,
              padding: "10px 16px",
              cursor: "pointer",
              fontFamily: "'Poppins',sans-serif",
              fontWeight: 600,
            }}
          >
            Back to Choose
          </button>
        </div>
      </div>
    );
  }

  const [store, setStore] = useState<ExamStore>(DEFAULT_STORE);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "subjects" | "daily" | "tests" | "plans">("dashboard");
  const [selDate, setSelDate] = useState(today());
  const [showAddSub, setShowAddSub] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Plan state
  const [planView, setPlanView] = useState<"weekly" | "monthly">("weekly");
  const [showAddWeek, setShowAddWeek] = useState(false);
  const [showAddMonth, setShowAddMonth] = useState(false);
  // Week plan form
  const [wpWeekStart, setWpWeekStart] = useState(() => { const d = new Date(); d.setDate(d.getDate()-((d.getDay()+6)%7)); return d.toISOString().split('T')[0]; });
  const [wpTargetHours, setWpTargetHours] = useState(0);
  const [wpTargetDpps, setWpTargetDpps] = useState(0);
  const [wpNotes, setWpNotes] = useState("");
  const [wpChapSel, setWpChapSel] = useState<Record<string,Set<string>>>({});
  // Month plan form
  const [mpMonth, setMpMonth] = useState(() => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; });
  const [mpSubTargets, setMpSubTargets] = useState<{subjectId:string;chapCount:number}[]>([]);
  const [mpNotes, setMpNotes] = useState("");
  const [newTestSubId, setNewTestSubId] = useState("");
  const [newTestType, setNewTestType] = useState(TEST_TYPES[0]);
  const [newTestScore, setNewTestScore] = useState("");
  const [newTestMax, setNewTestMax] = useState("100");

  useEffect(() => {
    try {
      const t = localStorage.getItem("ht-theme") as "dark" | "light";
      if (t === "light" || t === "dark") { setTheme(t); document.documentElement.setAttribute("data-theme", t); }
    } catch (e) {}

    let channel: any = null;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setLoading(false); setShowSetup(true); return; }
      const uid_str = session.user.id;
      setUserId(uid_str);
      const userKey = STORAGE_KEY + "-" + uid_str;

      loadExam(uid_str).then(dbStore => {
        if (dbStore && dbStore.examName) {
          setStore(dbStore as ExamStore);
          try { localStorage.setItem(userKey, JSON.stringify(dbStore)); } catch (e) {}
        } else {
          try {
            const raw = localStorage.getItem(userKey);
            if (raw) { const ls = JSON.parse(raw); setStore(ls); saveExam(uid_str, ls); }
            else setShowSetup(true);
          } catch (e) { setShowSetup(true); }
        }
        setLoading(false);
      });

      channel = supabase.channel("exam-sync")
        .on("postgres_changes", { event: "*", schema: "public", table: "exam_store", filter: `user_id=eq.${uid_str}` }, (payload: any) => {
          if (payload.new?.store) {
            setStore(payload.new.store);
            try { localStorage.setItem(STORAGE_KEY + "-" + uid_str, JSON.stringify(payload.new.store)); } catch (e) {}
          }
        }).subscribe();
    });
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  const updateStore = useCallback((fn: (s: ExamStore) => ExamStore) => {
    setStore(p => {
      const next = fn(p);
      const key = userId ? STORAGE_KEY + "-" + userId : STORAGE_KEY;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch (e) {}
      if (userId) saveExam(userId, next);
      return next;
    });
  }, [userId]);

  const toggleTheme = useCallback(() => {
    setTheme(p => {
      const n = p === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", n);
      try { localStorage.setItem("ht-theme", n); } catch (e) {}
      return n;
    });
  }, []);

  if (loading) return <div style={{ height: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text)", fontFamily: "var(--font)", fontSize: "0.9rem", letterSpacing: "0.05em" }}>Loading...</div>;

  if (showSetup || !store.examName) {
    return <SetupWizard onDone={s => { setStore(s); setShowSetup(false); updateStore(() => s); }} />;
  }

  // ── Computed Stats ──
  const todayLog = store.dailyLogs.find(l => l.date === selDate) || { date: selDate, hours: 0, dpps: 0, journal: "" };
  const weekDates = getWeekDates();
  const totalChaps = store.subjects.reduce((a, s) => a + s.chapters.length, 0);
  const doneChaps = store.subjects.reduce((a, s) => a + s.chapters.filter(c => c.done).length, 0);
  const sylPct = totalChaps === 0 ? 0 : Math.round((doneChaps / totalChaps) * 100);
  const weekLogs = weekDates.map(d => store.dailyLogs.find(l => l.date === dateKey(d)));
  const weekHrs = weekLogs.reduce((a, l) => a + (l?.hours || 0), 0);
  const avgDailyHrs = store.dailyLogs.length ? (store.dailyLogs.reduce((a, l) => a + l.hours, 0) / store.dailyLogs.length).toFixed(1) : "0.0";
  const totalDpps = store.dailyLogs.reduce((a, l) => a + l.dpps, 0);
  const allScores = store.testScores;
  const avgTestScore = allScores.length ? Math.round(allScores.reduce((a, t) => a + (t.score / t.maxScore) * 100, 0) / allScores.length) : 0;
  const dl = daysLeft(store.examDate);
  const urgencyGrad = dl < 30 ? "linear-gradient(135deg,#ff6b6b,#ffa94d)" : dl < 90 ? "linear-gradient(135deg,#ffa94d,#C36BFF)" : "linear-gradient(135deg,#C36BFF,#4A90FF)";

  const setDayField = (field: keyof DailyLog, val: any) => {
    updateStore(s => {
      const idx = s.dailyLogs.findIndex(l => l.date === selDate);
      const newLog = { ...todayLog, [field]: val };
      if (idx >= 0) { const nl = [...s.dailyLogs]; nl[idx] = newLog; return { ...s, dailyLogs: nl }; }
      return { ...s, dailyLogs: [...s.dailyLogs, newLog] };
    });
  };

  const addSubject = (sub: Subject) => updateStore(s => ({ ...s, subjects: [...s.subjects, sub] }));
  const updateChapter = (subId: string, chId: string, updates: Partial<Chapter>) => {
    updateStore(s => ({
      ...s,
      subjects: s.subjects.map(sub => {
        if (sub.id !== subId) return sub;
        return {
          ...sub,
          chapters: sub.chapters.map(ch => ch.id === chId ? { ...ch, ...updates } : ch)
        };
      })
    }));
  };

  const updateSubject = (id: string, updates: Partial<Subject>) => {
    updateStore(s => ({
      ...s,
      subjects: s.subjects.map(sub => sub.id === id ? { ...sub, ...updates } : sub)
    }));
  };

  const deleteSubject = (id: string) => updateStore(s => ({ ...s, subjects: s.subjects.filter(sub => sub.id !== id) }));
  const toggleChapter = (subId: string, chId: string) => {
    updateStore(s => ({ ...s, subjects: s.subjects.map(sub => sub.id !== subId ? sub : { ...sub, chapters: sub.chapters.map(ch => ch.id !== chId ? ch : { ...ch, done: !ch.done }) }) }));
  };
  const addTestScore = () => {
    if (!newTestSubId || !newTestScore) return;
    updateStore(s => ({ ...s, testScores: [...s.testScores, { id: uid(), date: today(), subjectId: newTestSubId, testType: newTestType, score: Number(newTestScore), maxScore: Number(newTestMax) }] }));
    setNewTestScore("");
  };

  const tabs: { id: typeof activeTab; label: string; icon: string }[] = [
    { id: "dashboard", label: "Dashboard", icon: "⚡" },
    { id: "subjects", label: "Subjects", icon: "📚" },
    { id: "daily", label: "Daily Log", icon: "📝" },
    { id: "tests", label: "Test Scores", icon: "🏆" },
    { id: "plans", label: "Planner", icon: "🗓" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--font)", color: "var(--text)" }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulseGlow{0%,100%{box-shadow:0 0 20px rgba(195,107,255,0.3)}50%{box-shadow:0 0 40px rgba(195,107,255,0.6)}}
        .ep-tab:hover{color:var(--text)!important}
        .ep-stat:hover{border-color:rgba(195,107,255,0.4)!important;transform:translateY(-2px)}
        .ep-sub-btn:hover{border-color:#C36BFF!important;color:#C36BFF!important}
        .ep-input:focus{border-color:rgba(195,107,255,0.5)!important;outline:none!important}
      `}</style>

      {/* ── Header ── */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, padding: "12px 20px", background: "var(--bg-card)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={() => window.location.href = "/choose"} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text-muted)", padding: "5px 12px", cursor: "pointer", fontFamily: "var(--font)", fontSize: "0.72rem", fontWeight: 600, transition: "all 0.18s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#C36BFF"; (e.currentTarget as HTMLElement).style.color = "#C36BFF"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}>
              ← Home
            </button>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontWeight: 900, fontSize: "1.3rem", background: "linear-gradient(90deg,#C36BFF,#4A90FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{store.examName}</span>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Exam Planner</span>
              </div>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <span>📅 {store.examDate}</span>
                <span>·</span>
                <span>🎯 {store.targetHours}h/day target</span>
                <span>·</span>
                <span style={{ color: sylPct >= 80 ? "#69db7c" : sylPct >= 50 ? "#ffa94d" : "#C36BFF" }}>{sylPct}% syllabus done</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Countdown examDate={store.examDate} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button onClick={toggleTheme} style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "0.9rem" }}>
                {theme === "dark" ? "☀️" : "🌙"}
              </button>
              <button onClick={() => setShowSetup(true)} title="Change Exam" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "0.85rem" }}>⚙</button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginTop: 12, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
          {tabs.map(t => (
            <button key={t.id} className="ep-tab" onClick={() => setActiveTab(t.id)} style={{
              background: "none", border: "none", fontFamily: "var(--font)", fontSize: "0.82rem", fontWeight: 700,
              padding: "9px 16px", cursor: "pointer", transition: "all 0.18s", borderBottom: activeTab === t.id ? "2px solid #C36BFF" : "2px solid transparent",
              color: activeTab === t.id ? "#C36BFF" : "var(--text-muted)", marginBottom: -1
            }}>
              <span style={{ marginRight: 6 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </header>

      <main style={{ width: "100%", padding: "20px 16px 80px" }}>

        {/* ── DASHBOARD ── */}
        {activeTab === "dashboard" && (
          <div style={{ animation: "fadeUp 0.4s ease both" }}>

            {/* ── ROW 1: Stats (all 6 in one row) ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10, marginBottom: 14 }}>
              {[
                { label: "Days Left", val: daysLeft(store.examDate), unit: "days", color: "#C36BFF", icon: "⏳" },
                { label: "This Week", val: weekHrs.toFixed(1), unit: "hrs", color: "#4A90FF", icon: "📅" },
                { label: "Avg Daily", val: avgDailyHrs, unit: "hrs", color: "#28D7FF", icon: "⏱" },
                { label: "Total DPPs", val: totalDpps, unit: "qs", color: "#9e7dff", icon: "📋" },
                { label: "Syllabus", val: sylPct, unit: "%", color: "#69db7c", icon: "📚" },
                { label: "Test Avg", val: avgTestScore, unit: "%", color: "#ffa94d", icon: "🏆" },
              ].map(s => (
                <div key={s.label} className="ep-stat" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 12px", display: "flex", alignItems: "center", gap: 10, transition: "all 0.2s", cursor: "default", minWidth: 0 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: `${s.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>{s.icon}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "0.58rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{s.label}</div>
                    <div style={{ fontSize: "1.35rem", fontWeight: 900, color: s.color, lineHeight: 1.1 }}>{s.val}<span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", marginLeft: 3 }}>{s.unit}</span></div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── ROW 2: 3 Charts side-by-side ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 14px 10px" }}>
                <div style={{ marginBottom: 8, display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text)" }}>This Week</span>
                  <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>· daily hours</span>
                </div>
                <div style={{ height: 148 }}><WeeklyBarChart logs={store.dailyLogs} /></div>
              </div>
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 14px 10px" }}>
                <div style={{ marginBottom: 8, display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text)" }}>Last 30 Days</span>
                  <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>· consistency</span>
                </div>
                <div style={{ height: 148 }}><MonthlyLineChart logs={store.dailyLogs} /></div>
              </div>
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 14px 10px" }}>
                <div style={{ marginBottom: 8, display: "flex", alignItems: "baseline", gap: 6, justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text)" }}>Activity</span>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>· 91 day heatmap</span>
                  </div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <span style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>less</span>
                    {['rgba(255,255,255,0.04)','rgba(74,144,255,0.25)','rgba(195,107,255,0.5)','#C36BFF'].map((c,i) => <div key={i} style={{ width: 9, height: 9, borderRadius: 2, background: c }} />)}
                    <span style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>more</span>
                  </div>
                </div>
                <div style={{ height: 148 }}><HeatMapChart logs={store.dailyLogs} /></div>
              </div>
            </div>

            {/* Syllabus Progress Overview */}
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontWeight: 700, fontSize: "1rem" }}>Syllabus Overview</span>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{doneChaps}/{totalChaps} chapters done</span>
              </div>
              {store.subjects.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)", fontSize: "0.85rem" }}>No subjects added yet. Go to Subjects tab to add some!</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>
                        <th style={{ textAlign: "left", padding: "10px 8px", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" }}>Subject</th>
                        <th style={{ textAlign: "center", padding: "10px 8px", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" }}>Lec</th>
                        <th style={{ textAlign: "center", padding: "10px 8px", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" }}>Notes</th>
                        <th style={{ textAlign: "center", padding: "10px 8px", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" }}>Short Notes</th>
                        <th style={{ textAlign: "center", padding: "10px 8px", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" }}>DPP</th>
                        <th style={{ textAlign: "center", padding: "10px 8px", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" }}>PYQs</th>
                        <th style={{ textAlign: "center", padding: "10px 8px", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" }}>Test</th>
                        <th style={{ textAlign: "center", padding: "10px 8px", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" }}>Rev</th>
                        <th style={{ textAlign: "center", padding: "10px 8px", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" }}>Done</th>
                      </tr>
                    </thead>
                    <tbody>
                      {store.subjects.map(sub => (
                        <tr key={sub.id} style={{ borderBottom: "1px solid var(--border)", background: sub.subjectDone ? "rgba(105,219,122,0.05)" : "transparent", transition: "background 0.2s" }}>
                          <td style={{ padding: "12px 8px", fontSize: "0.85rem", fontWeight: sub.subjectDone ? 500 : 700, color: sub.subjectDone ? "var(--text-muted)" : "var(--text)", textDecoration: sub.subjectDone ? "line-through" : "none", display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: sub.color, flexShrink: 0 }} />
                            {sub.name}
                          </td>
                          
                          {['lec', 'notes', 'shortnotes', 'dpps', 'pyqs', 'test'].map(field => {
                            const isChecked = !!sub[field as keyof Subject];
                            return (
                              <td key={field} style={{ textAlign: "center", padding: "12px 8px" }}>
                                <div onClick={() => updateSubject(sub.id, { [field]: !isChecked })} style={{ width: 18, height: 18, margin: "0 auto", borderRadius: 5, border: `2px solid ${isChecked ? sub.color : "var(--border-act)"}`, background: isChecked ? sub.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s" }}>
                                  {isChecked && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                </div>
                              </td>
                            );
                          })}
                          
                          <td style={{ textAlign: "center", padding: "12px 8px" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--bg-subtle)", padding: "2px", borderRadius: 6, border: "1px solid var(--border)" }}>
                              <button onClick={() => updateSubject(sub.id, { revs: Math.max(0, (sub.revs || 0) - 1) })} style={{ width: 22, height: 22, borderRadius: 4, background: "var(--bg-card)", border: "none", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "1rem" }}>-</button>
                              <span style={{ fontSize: "0.8rem", fontWeight: 700, width: 14, textAlign: "center" }}>{sub.revs || 0}</span>
                              <button onClick={() => updateSubject(sub.id, { revs: (sub.revs || 0) + 1 })} style={{ width: 22, height: 22, borderRadius: 4, background: "var(--bg-card)", border: "none", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "1rem" }}>+</button>
                            </div>
                          </td>
                          
                          <td style={{ textAlign: "center", padding: "12px 8px" }}>
                            <div onClick={() => updateSubject(sub.id, { subjectDone: !sub.subjectDone })} style={{ width: 20, height: 20, margin: "0 auto", borderRadius: 6, border: `2px solid ${sub.subjectDone ? "#69db7c" : "var(--border-act)"}`, background: sub.subjectDone ? "#69db7c" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s" }}>
                              {sub.subjectDone && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent Test Scores */}
            {store.testScores.length > 0 && (
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 20 }}>
                <div style={{ fontWeight: 700, marginBottom: 14 }}>Recent Tests</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[...store.testScores].reverse().slice(0, 5).map(ts => {
                    const sub = store.subjects.find(s => s.id === ts.subjectId);
                    const pct = Math.round((ts.score / ts.maxScore) * 100);
                    return (
                      <div key={ts.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--bg-subtle)", borderRadius: 9 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{ts.testType}</div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{sub?.name || "Unknown"} · {ts.date}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "0.9rem", fontWeight: 700 }}>{ts.score}/{ts.maxScore}</div>
                          <div style={{ fontSize: "0.75rem", fontWeight: 800, color: pct >= 70 ? "#69db7c" : pct >= 40 ? "#ffa94d" : "#ff6b6b" }}>{pct}%</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SUBJECTS ── */}
        {activeTab === "subjects" && (
          <div style={{ animation: "fadeUp 0.4s ease both" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontWeight: 800, fontSize: "1.2rem" }}>Your Subjects</h2>
                <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>{store.subjects.length} subjects · {doneChaps}/{totalChaps} chapters done · {sylPct}% complete</p>
              </div>
              <button onClick={() => setShowAddSub(true)} style={{ display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#C36BFF,#4A90FF)", border: "none", borderRadius: 9, color: "#fff", padding: "10px 20px", cursor: "pointer", fontFamily: "var(--font)", fontWeight: 700, fontSize: "0.85rem", boxShadow: "0 4px 20px rgba(195,107,255,0.35)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                Add Subject
              </button>
            </div>

            {store.subjects.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--text-muted)" }}>
                <div style={{ fontSize: "3rem", marginBottom: 16 }}>📚</div>
                <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: 8, color: "var(--text-sub)" }}>No subjects yet</div>
                <div style={{ fontSize: "0.85rem" }}>Add your exam subjects with chapters and set completion deadlines</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {store.subjects.map(sub => (
                  <SubjectCard key={sub.id} sub={sub}
                    onToggleChapter={chId => toggleChapter(sub.id, chId)}
                    onDelete={() => deleteSubject(sub.id)} />
                ))}
              </div>
            )}

          </div>
        )}

        {/* ── DAILY LOG ── */}
        {activeTab === "daily" && (
          <div style={{ animation: "fadeUp 0.4s ease both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, background: "var(--bg-card)", padding: "14px 20px", borderRadius: 12, border: "1px solid var(--border)" }}>
              <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>📅 Logging for:</span>
              <input type="date" value={selDate} onChange={e => setSelDate(e.target.value)} style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", padding: "8px 14px", borderRadius: 8, color: "var(--text)", fontFamily: "var(--font)", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer" }} />
              <button onClick={() => setSelDate(today())} style={{ marginLeft: "auto", background: "none", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text-muted)", padding: "7px 14px", cursor: "pointer", fontFamily: "var(--font)", fontSize: "0.75rem", fontWeight: 600 }}>Today</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              {/* Study Hours */}
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>⏱ Study Hours</div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 20 }}>Target: {store.targetHours}h/day</div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <input type="number" step="0.5" min="0" max="24"
                    value={todayLog.hours || ""}
                    onChange={e => setDayField("hours", Number(e.target.value))}
                    placeholder="0.0"
                    className="ep-input"
                    style={{ width: 90, padding: "14px", background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text)", fontFamily: "var(--font)", fontSize: "2rem", fontWeight: 900, textAlign: "center", transition: "border-color 0.2s" }} />
                  <div>
                    <span style={{ fontSize: "1.1rem", color: "var(--text-sub)", fontWeight: 600 }}>hours</span>
                    {todayLog.hours > 0 && (
                      <div style={{ marginTop: 6, fontSize: "0.75rem", color: todayLog.hours >= store.targetHours ? "#69db7c" : todayLog.hours >= store.targetHours * 0.7 ? "#ffa94d" : "#ff6b6b", fontWeight: 700, background: todayLog.hours >= store.targetHours ? "rgba(105,219,122,0.1)" : "rgba(255,107,107,0.1)", borderRadius: 6, padding: "3px 8px" }}>
                        {todayLog.hours >= store.targetHours ? "✅ Target reached!" : `${(store.targetHours - todayLog.hours).toFixed(1)}h left`}
                      </div>
                    )}
                  </div>
                </div>
                {/* Progress bar */}
                <div style={{ marginTop: 16, height: 6, background: "var(--bg-subtle)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, (todayLog.hours / store.targetHours) * 100)}%`, background: "linear-gradient(90deg,#C36BFF,#4A90FF)", borderRadius: 3, transition: "width 0.4s" }} />
                </div>
              </div>

              {/* DPP Count */}
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>📋 DPPs / Practice</div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 20 }}>Questions solved today</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button onClick={() => setDayField("dpps", Math.max(0, todayLog.dpps - 1))} style={{ width: 36, height: 36, borderRadius: 8, background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)", cursor: "pointer", fontSize: "1.2rem", fontWeight: 700 }}>-</button>
                  <input type="number" min="0" value={todayLog.dpps}
                    onChange={e => setDayField("dpps", Number(e.target.value))}
                    className="ep-input"
                    style={{ width: 80, padding: "10px", background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text)", fontFamily: "var(--font)", fontSize: "2rem", fontWeight: 900, textAlign: "center", transition: "border-color 0.2s" }} />
                  <button onClick={() => setDayField("dpps", todayLog.dpps + 1)} style={{ width: 36, height: 36, borderRadius: 8, background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)", cursor: "pointer", fontSize: "1.2rem", fontWeight: 700 }}>+</button>
                  <span style={{ fontSize: "1rem", color: "var(--text-sub)", fontWeight: 600 }}>qs</span>
                </div>
                <div style={{ marginTop: 14, fontSize: "0.78rem", color: "var(--text-muted)" }}>Total DPPs all time: <strong style={{ color: "#9e7dff" }}>{totalDpps}</strong></div>
              </div>
            </div>

            {/* Journal */}
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>📖 Daily Journal</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 16 }}>What did you study today? Topics covered, struggles, breakthroughs...</div>
              <textarea
                value={todayLog.journal}
                onChange={e => setDayField("journal", e.target.value)}
                placeholder={`Day's reflection — e.g.:\n• Completed Limits & Derivatives from Calculus\n• Solved 25 DPPs on Integration — struggling with substitution method\n• Revised Probability formulas\n• Need to revisit Graph Theory tomorrow`}
                rows={8}
                className="ep-input"
                style={{ width: "100%", padding: "14px", background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text)", fontFamily: "var(--font)", fontSize: "0.88rem", lineHeight: 1.7, resize: "vertical", transition: "border-color 0.2s" }}
              />
              <div style={{ marginTop: 8, fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "right" }}>{todayLog.journal.length} chars</div>
            </div>

            {/* Past Logs */}
            {store.dailyLogs.filter(l => l.journal || l.hours > 0).length > 1 && (
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, marginTop: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 14 }}>📚 Past Entries</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
                  {[...store.dailyLogs].filter(l => l.date !== selDate && (l.journal || l.hours > 0)).reverse().slice(0, 10).map(l => (
                    <div key={l.date} onClick={() => setSelDate(l.date)} style={{ padding: "12px 16px", background: "var(--bg-subtle)", borderRadius: 9, cursor: "pointer", transition: "background 0.15s" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(195,107,255,0.08)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-subtle)"}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{l.date}</span>
                        <div style={{ display: "flex", gap: 12, fontSize: "0.78rem" }}>
                          <span style={{ color: "#4A90FF" }}>⏱ {l.hours}h</span>
                          <span style={{ color: "#9e7dff" }}>📋 {l.dpps} qs</span>
                        </div>
                      </div>
                      {l.journal && <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.journal}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TEST SCORES ── */}
        {activeTab === "tests" && (
          <div style={{ animation: "fadeUp 0.4s ease both" }}>
            <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 20, alignItems: "start" }}>

              {/* Log Form */}
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, position: "sticky", top: 140 }}>
                <div style={{ fontWeight: 800, fontSize: "1rem", marginBottom: 20 }}>📝 Log a Test Score</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 7 }}>Subject</label>
                    <select value={newTestSubId} onChange={e => setNewTestSubId(e.target.value)} className="ep-input" style={{ width: "100%", padding: "10px 14px", background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontFamily: "var(--font)", fontSize: "0.9rem", transition: "border-color 0.2s" }}>
                      <option value="">Select subject...</option>
                      {store.subjects.map(s => <option key={s.id} value={s.id} style={{ background: "var(--bg-card)" }}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 7 }}>Test Type</label>
                    <select value={newTestType} onChange={e => setNewTestType(e.target.value)} className="ep-input" style={{ width: "100%", padding: "10px 14px", background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontFamily: "var(--font)", fontSize: "0.9rem", transition: "border-color 0.2s" }}>
                      {TEST_TYPES.map(t => <option key={t} value={t} style={{ background: "var(--bg-card)" }}>{t}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "center" }}>
                    <div>
                      <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 7 }}>Score</label>
                      <input type="number" min="0" value={newTestScore} onChange={e => setNewTestScore(e.target.value)} placeholder="75" className="ep-input" style={{ width: "100%", padding: "10px 14px", background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontFamily: "var(--font)", fontSize: "1rem", fontWeight: 700, textAlign: "center", transition: "border-color 0.2s" }} />
                    </div>
                    <span style={{ color: "var(--text-muted)", fontWeight: 700, fontSize: "1.2rem", paddingTop: 20 }}>/</span>
                    <div>
                      <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 7 }}>Max</label>
                      <input type="number" min="1" value={newTestMax} onChange={e => setNewTestMax(e.target.value)} className="ep-input" style={{ width: "100%", padding: "10px 14px", background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontFamily: "var(--font)", fontSize: "1rem", fontWeight: 700, textAlign: "center", transition: "border-color 0.2s" }} />
                    </div>
                  </div>
                  {newTestScore && newTestMax && (
                    <div style={{ textAlign: "center", padding: "10px", background: "var(--bg-subtle)", borderRadius: 8, fontSize: "1.2rem", fontWeight: 800, color: (Number(newTestScore) / Number(newTestMax) * 100) >= 70 ? "#69db7c" : (Number(newTestScore) / Number(newTestMax) * 100) >= 40 ? "#ffa94d" : "#ff6b6b" }}>
                      {Math.round(Number(newTestScore) / Number(newTestMax) * 100)}%
                    </div>
                  )}
                  <button onClick={addTestScore} disabled={!newTestSubId || !newTestScore} style={{ padding: "12px", background: newTestSubId && newTestScore ? "linear-gradient(135deg,#C36BFF,#4A90FF)" : "var(--bg-subtle)", color: newTestSubId && newTestScore ? "#fff" : "var(--text-muted)", border: "none", borderRadius: 9, fontFamily: "var(--font)", fontWeight: 800, fontSize: "0.9rem", cursor: newTestSubId && newTestScore ? "pointer" : "not-allowed", boxShadow: newTestSubId && newTestScore ? "0 4px 20px rgba(195,107,255,0.35)" : "none", transition: "all 0.2s" }}>
                    Log Score →
                  </button>
                </div>
              </div>

              {/* Scores History */}
              <div>
                <div style={{ fontWeight: 800, fontSize: "1rem", marginBottom: 16 }}>🏆 All Test Scores ({store.testScores.length})</div>
                {store.testScores.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "60px", background: "var(--bg-card)", borderRadius: 14, border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📊</div>
                    <div>No test scores logged yet.</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[...store.testScores].reverse().map(ts => {
                      const sub = store.subjects.find(s => s.id === ts.subjectId);
                      const pct = Math.round((ts.score / ts.maxScore) * 100);
                      const grade = pct >= 80 ? { color: "#69db7c", label: "Excellent" } : pct >= 60 ? { color: "#4A90FF", label: "Good" } : pct >= 40 ? { color: "#ffa94d", label: "Average" } : { color: "#ff6b6b", label: "Below Avg" };
                      return (
                        <div key={ts.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
                          <div style={{ width: 48, height: 48, borderRadius: 12, background: `${sub?.color || "#C36BFF"}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: sub?.color || "#C36BFF" }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{ts.testType}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 3, display: "flex", gap: 10 }}>
                              <span>{sub?.name || "Unknown Subject"}</span>
                              <span>·</span>
                              <span>📅 {ts.date}</span>
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>{ts.score}<span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>/{ts.maxScore}</span></div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                              <span style={{ fontSize: "1rem", fontWeight: 900, color: grade.color }}>{pct}%</span>
                              <span style={{ fontSize: "0.65rem", background: `${grade.color}18`, color: grade.color, border: `1px solid ${grade.color}44`, borderRadius: 100, padding: "2px 8px", fontWeight: 700 }}>{grade.label}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ── PLANS ── */}
        {activeTab === "plans" && (
          <div style={{ animation: "fadeUp 0.4s ease both" }}>
            {/* Toggle bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ display: "flex", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: 3, gap: 2 }}>
                {(["weekly","monthly"] as const).map(v => (
                  <button key={v} onClick={() => setPlanView(v)} style={{ fontFamily: "var(--font)", fontWeight: 700, fontSize: "0.82rem", padding: "7px 18px", borderRadius: 8, border: "none", cursor: "pointer", transition: "all 0.18s", background: planView===v ? "linear-gradient(135deg,#C36BFF,#4A90FF)" : "transparent", color: planView===v ? "#fff" : "var(--text-muted)" }}>
                    {v === "weekly" ? "📅 Weekly" : "🗓 Monthly"}
                  </button>
                ))}
              </div>
              <button onClick={() => planView==="weekly" ? setShowAddWeek(true) : setShowAddMonth(true)}
                style={{ display: "flex", alignItems: "center", gap: 7, background: "linear-gradient(135deg,#C36BFF,#4A90FF)", border: "none", borderRadius: 9, color: "#fff", padding: "10px 18px", cursor: "pointer", fontFamily: "var(--font)", fontWeight: 700, fontSize: "0.82rem", boxShadow: "0 4px 18px rgba(195,107,255,0.35)" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                Add {planView === "weekly" ? "Week Plan" : "Month Plan"}
              </button>
            </div>

            {/* ─── WEEKLY VIEW ─── */}
            {planView === "weekly" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {(store.weekPlans ?? []).length === 0 && (
                  <div style={{ textAlign: "center", padding: "60px", background: "var(--bg-card)", borderRadius: 14, border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📅</div>
                    <div style={{ fontWeight: 700, marginBottom: 6, color: "var(--text-sub)" }}>No weekly plans yet</div>
                    <div style={{ fontSize: "0.85rem" }}>Create week-by-week chapter targets and hour goals</div>
                  </div>
                )}
                {[...(store.weekPlans ?? [])].reverse().map(wp => {
                  const wEnd = new Date(wp.weekStart); wEnd.setDate(wEnd.getDate()+6);
                  const wLogs = store.dailyLogs.filter(l => l.date >= wp.weekStart && l.date <= dateKey(wEnd));
                  const actualHrs = wLogs.reduce((a,l)=>a+l.hours,0);
                  const actualDpps = wLogs.reduce((a,l)=>a+l.dpps,0);
                  const hrPct = wp.targetHours>0 ? Math.min(100,Math.round((actualHrs/wp.targetHours)*100)) : 0;
                  const dppPct = wp.targetDpps>0 ? Math.min(100,Math.round((actualDpps/wp.targetDpps)*100)) : 0;
                  // Chapter progress
                  const chapDoneCount = wp.chapterTargets.flatMap(ct => ct.chapIds.filter(chId => store.subjects.find(s=>s.id===ct.subjectId)?.chapters.find(c=>c.id===chId)?.done)).length;
                  const chapTotalCount = wp.chapterTargets.reduce((a,ct)=>a+ct.chapIds.length,0);
                  return (
                    <div key={wp.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
                      {/* Header */}
                      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: "1rem" }}>Week of {wp.weekStart} → {dateKey(wEnd)}</div>
                          {wp.notes && <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 3 }}>{wp.notes}</div>}
                        </div>
                        <button onClick={() => updateStore(s=>({...s, weekPlans:(s.weekPlans??[]).filter(w=>w.id!==wp.id)}))} style={{ background:"none", border:"1px solid rgba(255,100,100,0.2)", color:"rgba(255,100,100,0.6)", padding:"4px 10px", borderRadius:6, cursor:"pointer", fontSize:"0.72rem", fontFamily:"var(--font)", fontWeight:600 }}>Delete</button>
                      </div>
                      {/* Stats */}
                      <div style={{ padding: "14px 20px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, borderBottom: "1px solid var(--border)" }}>
                        <div>
                          <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Study Hours</div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                            <span style={{ fontSize: "1.3rem", fontWeight: 900, color: hrPct>=100?"#69db7c":"#4A90FF" }}>{actualHrs.toFixed(1)}</span>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>/ {wp.targetHours}h</span>
                          </div>
                          <div style={{ height: 5, background: "var(--bg-subtle)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${hrPct}%`, background: hrPct>=100 ? "#69db7c" : "linear-gradient(90deg,#4A90FF,#C36BFF)", borderRadius: 3 }} />
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>DPPs</div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                            <span style={{ fontSize: "1.3rem", fontWeight: 900, color: dppPct>=100?"#69db7c":"#9e7dff" }}>{actualDpps}</span>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>/ {wp.targetDpps} qs</span>
                          </div>
                          <div style={{ height: 5, background: "var(--bg-subtle)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${dppPct}%`, background: dppPct>=100 ? "#69db7c" : "linear-gradient(90deg,#9e7dff,#C36BFF)", borderRadius: 3 }} />
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Chapters Done</div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                            <span style={{ fontSize: "1.3rem", fontWeight: 900, color: chapDoneCount>=chapTotalCount && chapTotalCount>0 ? "#69db7c" : "#28D7FF" }}>{chapDoneCount}</span>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>/ {chapTotalCount} planned</span>
                          </div>
                          <div style={{ height: 5, background: "var(--bg-subtle)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${chapTotalCount>0?Math.min(100,Math.round(chapDoneCount/chapTotalCount*100)):0}%`, background: chapDoneCount>=chapTotalCount && chapTotalCount>0 ? "#69db7c" : "linear-gradient(90deg,#28D7FF,#4A90FF)", borderRadius: 3 }} />
                          </div>
                        </div>
                      </div>
                      {/* Chapter targets */}
                      {wp.chapterTargets.length > 0 && (
                        <div style={{ padding: "12px 20px" }}>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Chapter Targets</div>
                          {wp.chapterTargets.map(ct => {
                            const sub = store.subjects.find(s=>s.id===ct.subjectId);
                            if (!sub) return null;
                            const chs = ct.chapIds.map(cid => sub.chapters.find(c=>c.id===cid)).filter(Boolean) as Chapter[];
                            return (
                              <div key={ct.subjectId} style={{ marginBottom: 10 }}>
                                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                                  <div style={{ width:7,height:7,borderRadius:"50%",background:sub.color }} />
                                  <span style={{ fontWeight:700, fontSize:"0.82rem" }}>{sub.name}</span>
                                  <span style={{ fontSize:"0.72rem", color:"var(--text-muted)", marginLeft:"auto" }}>{chs.filter(c=>c.done).length}/{chs.length} done</span>
                                </div>
                                <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                                  {chs.map(ch => (
                                    <span key={ch.id} style={{ fontSize:"0.72rem", padding:"3px 9px", borderRadius:100, fontWeight:600, background: ch.done ? `${sub.color}22` : "var(--bg-subtle)", color: ch.done ? sub.color : "var(--text-muted)", border:`1px solid ${ch.done ? sub.color+"44":"var(--border)"}`, textDecoration: ch.done ? "line-through" : "none" }}>{ch.name}</span>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ─── MONTHLY VIEW ─── */}
            {planView === "monthly" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {(store.monthPlans ?? []).length === 0 && (
                  <div style={{ textAlign: "center", padding: "60px", background: "var(--bg-card)", borderRadius: 14, border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🗓</div>
                    <div style={{ fontWeight: 700, marginBottom: 6, color: "var(--text-sub)" }}>No monthly plans yet</div>
                    <div style={{ fontSize: "0.85rem" }}>Set which subjects and how many chapters you'll cover each month</div>
                  </div>
                )}
                {[...(store.monthPlans ?? [])].reverse().map(mp => {
                  const [yr, mo] = mp.month.split("-").map(Number);
                  const monthStart = `${mp.month}-01`;
                  const nextMo = new Date(yr, mo, 1);
                  const monthEnd = dateKey(new Date(nextMo.getTime()-86400000));
                  const monthLogs = store.dailyLogs.filter(l => l.date >= monthStart && l.date <= monthEnd);
                  const totalHrs = monthLogs.reduce((a,l)=>a+l.hours,0);
                  const totalDpps = monthLogs.reduce((a,l)=>a+l.dpps,0);
                  return (
                    <div key={mp.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
                      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: "1rem" }}>📅 {MONTHS[mo-1]} {yr}</div>
                          {mp.notes && <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 3 }}>{mp.notes}</div>}
                        </div>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <div style={{ textAlign: "right", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                            <div>⏱ {totalHrs.toFixed(1)}h · 📋 {totalDpps} qs this month</div>
                          </div>
                          <button onClick={() => updateStore(s=>({...s, monthPlans:(s.monthPlans??[]).filter(m=>m.id!==mp.id)}))} style={{ background:"none", border:"1px solid rgba(255,100,100,0.2)", color:"rgba(255,100,100,0.6)", padding:"4px 10px", borderRadius:6, cursor:"pointer", fontSize:"0.72rem", fontFamily:"var(--font)", fontWeight:600 }}>Delete</button>
                        </div>
                      </div>
                      <div style={{ padding: "14px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                        {mp.subjectTargets.map(st => {
                          const sub = store.subjects.find(s=>s.id===st.subjectId);
                          if(!sub) return null;
                          const doneCh = sub.chapters.filter(c=>c.done).length;
                          const pct = sub.chapters.length>0 ? Math.round((doneCh/sub.chapters.length)*100) : 0;
                          return (
                            <div key={st.subjectId} style={{ display:"flex", alignItems:"center", gap:12 }}>
                              <div style={{ width:8,height:8,borderRadius:"50%",background:sub.color,flexShrink:0 }} />
                              <div style={{ flex:1 }}>
                                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                                  <span style={{ fontWeight:700,fontSize:"0.88rem" }}>{sub.name}</span>
                                  <span style={{ fontSize:"0.75rem",color:"var(--text-muted)" }}>Target: {st.chapCount} ch · Done: {doneCh}/{sub.chapters.length}</span>
                                </div>
                                <div style={{ height:5,background:"var(--bg-subtle)",borderRadius:3,overflow:"hidden" }}>
                                  <div style={{ height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${sub.color},${sub.color}88)`,borderRadius:3,transition:"width 0.4s" }} />
                                </div>
                              </div>
                              <span style={{ fontSize:"0.82rem",fontWeight:800,color:doneCh>=st.chapCount?"#69db7c":sub.color,minWidth:36,textAlign:"right" }}>{pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

// Modals moved to root level

          </div>
        )}

      </main>

      {/* Sticky Overall Progress Bar */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "10px 20px", background: "var(--bg-card)", backdropFilter: "blur(12px)", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 16, zIndex: 40 }}>
        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>{store.examName} · {daysLeft(store.examDate)} days left</span>
        <div style={{ flex: 1, height: 4, background: "var(--bg-subtle)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${sylPct}%`, background: "linear-gradient(90deg,#C36BFF,#4A90FF,#28D7FF)", borderRadius: 2, transition: "width 0.5s" }} />
        </div>
        <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#C36BFF", whiteSpace: "nowrap" }}>{sylPct}% syllabus · {doneChaps}/{totalChaps} ch</span>
      </div>
      {/* Modal — rendered at root level to avoid header stacking context */}
      {showAddSub && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
          onClick={e => e.target === e.currentTarget && setShowAddSub(false)}>
          <AddSubjectModal onAdd={addSubject} onClose={() => setShowAddSub(false)} />
        </div>
      )}

      {/* ─── ADD WEEK PLAN MODAL ─── */}
      {showAddWeek && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",backdropFilter:"blur(8px)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
          <div style={{ background:"var(--bg-card)",border:"1px solid var(--border-act)",borderRadius:16,padding:28,width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto" }}>
            <h3 style={{ fontFamily:"var(--font)",fontWeight:800,color:"var(--text)",marginBottom:20 }}>📅 New Weekly Plan</h3>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:16 }}>
              <div>
                <label style={{ display:"block",color:"var(--text-muted)",fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6 }}>Week Start (Mon)</label>
                <input type="date" value={wpWeekStart} onChange={e=>setWpWeekStart(e.target.value)} style={{ width:"100%",padding:"9px 12px",background:"var(--bg-subtle)",border:"1px solid var(--border)",borderRadius:8,color:"var(--text)",fontFamily:"var(--font)" }} />
              </div>
              <div>
                <label style={{ display:"block",color:"var(--text-muted)",fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6 }}>Hour Target</label>
                <input type="number" value={wpTargetHours} onChange={e=>setWpTargetHours(Number(e.target.value))} placeholder="50" style={{ width:"100%",padding:"9px 12px",background:"var(--bg-subtle)",border:"1px solid var(--border)",borderRadius:8,color:"var(--text)",fontFamily:"var(--font)" }} />
              </div>
              <div>
                <label style={{ display:"block",color:"var(--text-muted)",fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6 }}>DPP Target</label>
                <input type="number" value={wpTargetDpps} onChange={e=>setWpTargetDpps(Number(e.target.value))} placeholder="100" style={{ width:"100%",padding:"9px 12px",background:"var(--bg-subtle)",border:"1px solid var(--border)",borderRadius:8,color:"var(--text)",fontFamily:"var(--font)" }} />
              </div>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block",color:"var(--text-muted)",fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6 }}>Select Chapters to Cover This Week</label>
              {store.subjects.length === 0 ? <div style={{ color:"var(--text-muted)",fontSize:"0.85rem",padding:"12px",background:"var(--bg-subtle)",borderRadius:8 }}>Add subjects first in the Subjects tab.</div> :
                store.subjects.map(sub => (
                  <div key={sub.id} style={{ marginBottom:12 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:6 }}>
                      <div style={{ width:7,height:7,borderRadius:"50%",background:sub.color }} />
                      <span style={{ fontWeight:700,fontSize:"0.85rem" }}>{sub.name}</span>
                    </div>
                    <div style={{ display:"flex",flexWrap:"wrap",gap:5 }}>
                      {sub.chapters.map(ch => {
                        const sel = wpChapSel[sub.id]?.has(ch.id) ?? false;
                        return (
                          <button key={ch.id} onClick={() => {
                            setWpChapSel(prev => {
                              const ns = new Set(prev[sub.id] ?? []);
                              sel ? ns.delete(ch.id) : ns.add(ch.id);
                              return {...prev,[sub.id]:ns};
                            });
                          }} style={{ fontSize:"0.72rem",padding:"4px 10px",borderRadius:100,cursor:"pointer",fontFamily:"var(--font)",fontWeight:600,border:`1px solid ${sel?sub.color:"var(--border)"}`,background:sel?`${sub.color}22`:"transparent",color:sel?sub.color:"var(--text-muted)",transition:"all 0.15s" }}>{ch.name}</button>
                        );
                      })}
                    </div>
                  </div>
                ))
              }
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block",color:"var(--text-muted)",fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6 }}>Notes (optional)</label>
              <input value={wpNotes} onChange={e=>setWpNotes(e.target.value)} placeholder="e.g. Focus on Linear Algebra revision + Integration" style={{ width:"100%",padding:"9px 12px",background:"var(--bg-subtle)",border:"1px solid var(--border)",borderRadius:8,color:"var(--text)",fontFamily:"var(--font)" }} />
            </div>
            <div style={{ display:"flex",gap:10 }}>
              <button onClick={()=>setShowAddWeek(false)} style={{ flex:1,padding:"11px",background:"var(--bg-subtle)",border:"1px solid var(--border)",borderRadius:8,color:"var(--text-muted)",fontFamily:"var(--font)",fontWeight:700,cursor:"pointer" }}>Cancel</button>
              <button onClick={() => {
                const chapterTargets = Object.entries(wpChapSel).filter(([,s])=>s.size>0).map(([subjectId,s])=>({subjectId,chapIds:[...s]}));
                const newPlan: WeekPlan = { id:uid(), weekStart:wpWeekStart, targetHours:wpTargetHours, targetDpps:wpTargetDpps, chapterTargets, notes:wpNotes };
                updateStore(s=>({...s,weekPlans:[...(s.weekPlans??[]),newPlan]}));
                setShowAddWeek(false); setWpChapSel({}); setWpNotes("");
              }} style={{ flex:2,padding:"11px",background:"linear-gradient(135deg,#C36BFF,#4A90FF)",border:"none",borderRadius:8,color:"#fff",fontFamily:"var(--font)",fontWeight:800,cursor:"pointer",boxShadow:"0 4px 18px rgba(195,107,255,0.35)" }}>Create Week Plan</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD MONTH PLAN MODAL ─── */}
      {showAddMonth && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",backdropFilter:"blur(8px)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
          <div style={{ background:"var(--bg-card)",border:"1px solid var(--border-act)",borderRadius:16,padding:28,width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto" }}>
            <h3 style={{ fontFamily:"var(--font)",fontWeight:800,color:"var(--text)",marginBottom:20 }}>🗓 New Monthly Plan</h3>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block",color:"var(--text-muted)",fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6 }}>Month</label>
              <input type="month" value={mpMonth} onChange={e=>setMpMonth(e.target.value)} style={{ width:"100%",padding:"9px 12px",background:"var(--bg-subtle)",border:"1px solid var(--border)",borderRadius:8,color:"var(--text)",fontFamily:"var(--font)" }} />
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block",color:"var(--text-muted)",fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8 }}>Subject Targets (how many chapters per subject)</label>
              {store.subjects.length === 0 ? <div style={{ color:"var(--text-muted)",fontSize:"0.85rem",padding:"12px",background:"var(--bg-subtle)",borderRadius:8 }}>Add subjects first in the Subjects tab.</div> :
                store.subjects.map(sub => {
                  const existing = mpSubTargets.find(t=>t.subjectId===sub.id);
                  return (
                    <div key={sub.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"var(--bg-subtle)",borderRadius:9,marginBottom:8 }}>
                      <div style={{ width:8,height:8,borderRadius:"50%",background:sub.color,flexShrink:0 }} />
                      <span style={{ flex:1,fontWeight:600,fontSize:"0.88rem" }}>{sub.name}</span>
                      <span style={{ fontSize:"0.75rem",color:"var(--text-muted)" }}>{sub.chapters.length} ch total</span>
                      <input type="number" min="0" max={sub.chapters.length} placeholder="0" value={existing?.chapCount ?? ""}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setMpSubTargets(prev => {
                            const others = prev.filter(t=>t.subjectId!==sub.id);
                            return val > 0 ? [...others,{subjectId:sub.id,chapCount:val}] : others;
                          });
                        }}
                        style={{ width:56,padding:"6px 8px",background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:7,color:"var(--text)",fontFamily:"var(--font)",fontWeight:700,textAlign:"center" }}
                      />
                      <span style={{ fontSize:"0.75rem",color:"var(--text-muted)" }}>ch</span>
                    </div>
                  );
                })
              }
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ display:"block",color:"var(--text-muted)",fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6 }}>Notes (optional)</label>
              <input value={mpNotes} onChange={e=>setMpNotes(e.target.value)} placeholder="e.g. Complete Maths + Networks, start Data Structures" style={{ width:"100%",padding:"9px 12px",background:"var(--bg-subtle)",border:"1px solid var(--border)",borderRadius:8,color:"var(--text)",fontFamily:"var(--font)" }} />
            </div>
            <div style={{ display:"flex",gap:10 }}>
              <button onClick={()=>setShowAddMonth(false)} style={{ flex:1,padding:"11px",background:"var(--bg-subtle)",border:"1px solid var(--border)",borderRadius:8,color:"var(--text-muted)",fontFamily:"var(--font)",fontWeight:700,cursor:"pointer" }}>Cancel</button>
              <button onClick={() => {
                const newPlan: MonthPlan = { id:uid(), month:mpMonth, subjectTargets:mpSubTargets, notes:mpNotes };
                updateStore(s=>({...s,monthPlans:[...(s.monthPlans??[]),newPlan]}));
                setShowAddMonth(false); setMpSubTargets([]); setMpNotes("");
              }} style={{ flex:2,padding:"11px",background:"linear-gradient(135deg,#C36BFF,#4A90FF)",border:"none",borderRadius:8,color:"#fff",fontFamily:"var(--font)",fontWeight:800,cursor:"pointer",boxShadow:"0 4px 18px rgba(195,107,255,0.35)" }}>Create Month Plan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
