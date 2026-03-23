import { supabase } from "./supabase";

export async function loadHabits(userId: string) {
  const { data, error } = await supabase
    .from("habits_store")
    .select("store")
    .eq("user_id", userId)
    .single();
  if (error || !data) return null;
  return data.store;
}

export async function saveHabits(userId: string, store: any) {
  const { error } = await supabase
    .from("habits_store")
    .upsert({ user_id: userId, store, updated_at: new Date().toISOString() },
             { onConflict: "user_id" });
  return { error };
}