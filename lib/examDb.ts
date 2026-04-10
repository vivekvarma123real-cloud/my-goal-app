import { supabase } from "./supabase";

export async function loadExam(userId: string) {
  const { data, error } = await supabase
    .from("exam_store")
    .select("store")
    .eq("user_id", userId)
    .single();
  if (error) { console.error("loadExam error:", error.message); return null; }
  return data?.store ?? null;
}

export async function saveExam(userId: string, store: any) {
  const { error } = await supabase
    .from("exam_store")
    .upsert(
      { user_id: userId, store, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  if (error) console.error("saveExam error:", error.message, error.code);
  return { error };
}
