import { supabase } from "./supabase";

export async function loadExam(userId: string) {
  const { data, error } = await supabase
    .from("exam_store")
    .select("store, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("loadExam error:", error.message, error.code);
    return null;
  }
  if (!data || data.length === 0) return null;
  return data[0]?.store ?? null;
}

export async function saveExam(userId: string, store: any) {
  const payload = { user_id: userId, store, updated_at: new Date().toISOString() };

  // Avoid relying only on upsert(user_id): some databases may miss unique constraint
  // and can contain duplicate rows. Update existing rows first, else insert.
  const { data: existing, error: existingErr } = await supabase
    .from("exam_store")
    .select("user_id")
    .eq("user_id", userId)
    .limit(1);

  if (existingErr) {
    console.error("saveExam read error:", existingErr.message, existingErr.code);
    return { error: existingErr };
  }

  if (existing && existing.length > 0) {
    const { error } = await supabase.from("exam_store").update(payload).eq("user_id", userId);
    if (error) console.error("saveExam update error:", error.message, error.code);
    return { error };
  }

  const { error } = await supabase.from("exam_store").insert(payload);
  if (error) console.error("saveExam insert error:", error.message, error.code);
  return { error };
}
