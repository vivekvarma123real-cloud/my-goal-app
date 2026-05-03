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
  const { error } = await supabase.from("exam_store").upsert(payload, { onConflict: "user_id" });
  if (error) console.error("saveExam upsert error:", error.message, error.code);
  return { error };
}
