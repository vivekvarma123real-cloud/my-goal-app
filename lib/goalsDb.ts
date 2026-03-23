import { supabase } from "./supabase";

export type DbGoal = {
  id: string; user_id: string; title: string; category: string;
  deadline: string; why: string; priority: boolean; collapsed: boolean; created_at: string;
};
export type DbMilestone = {
  id: string; goal_id: string; user_id: string; text: string;
  done: boolean; done_at: string; position: number;
};
export type DbDailyLog = {
  id: string; goal_id: string; user_id: string; date: string;
  date_label: string; hours: number; topic: string; mood: string;
};

// ── Goals ──────────────────────────────────────────────────────────────────
export async function fetchGoals(userId: string) {
  const { data: goals } = await supabase.from("goals").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  const { data: milestones } = await supabase.from("milestones").select("*").eq("user_id", userId).order("position");
  const { data: logs } = await supabase.from("daily_logs").select("*").eq("user_id", userId);

  return (goals || []).map((g: DbGoal) => ({
    id: g.id, title: g.title, category: g.category, deadline: g.deadline,
    why: g.why, priority: g.priority, collapsed: g.collapsed, createdAt: g.created_at,
    milestones: (milestones || []).filter((m: DbMilestone) => m.goal_id === g.id).map((m: DbMilestone) => ({
      id: m.id, text: m.text, done: m.done, doneAt: m.done_at,
    })),
    logs: (logs || []).filter((l: DbDailyLog) => l.goal_id === g.id).map((l: DbDailyLog) => ({
      id: l.id, date: l.date, dateLabel: l.date_label, hours: l.hours, topic: l.topic, mood: l.mood,
    })),
  }));
}

export async function upsertGoal(goal: any, userId: string) {
  await supabase.from("goals").upsert({
    id: goal.id, user_id: userId, title: goal.title, category: goal.category,
    deadline: goal.deadline, why: goal.why, priority: goal.priority,
    collapsed: goal.collapsed, created_at: goal.createdAt || new Date().toISOString(),
  });
}

export async function deleteGoalDb(goalId: string) {
  await supabase.from("goals").delete().eq("id", goalId);
}

export async function upsertMilestones(goalId: string, milestones: any[], userId: string) {
  // Delete removed milestones
  const { data: existing } = await supabase.from("milestones").select("id").eq("goal_id", goalId);
  const existingIds = (existing || []).map((m: any) => m.id);
  const newIds = milestones.map((m: any) => m.id);
  const toDelete = existingIds.filter((id: string) => !newIds.includes(id));
  if (toDelete.length > 0) await supabase.from("milestones").delete().in("id", toDelete);

  // Upsert all
  if (milestones.length > 0) {
    await supabase.from("milestones").upsert(
      milestones.map((m, i) => ({
        id: m.id, goal_id: goalId, user_id: userId,
        text: m.text, done: m.done, done_at: m.doneAt || null, position: i,
      }))
    );
  }
}

export async function upsertLog(goalId: string, log: any, userId: string) {
  await supabase.from("daily_logs").upsert({
    id: log.id, goal_id: goalId, user_id: userId,
    date: log.date, date_label: log.dateLabel,
    hours: log.hours || 0, topic: log.topic, mood: log.mood,
  });
}

export async function deleteLogDb(logId: string) {
  await supabase.from("daily_logs").delete().eq("id", logId);
}