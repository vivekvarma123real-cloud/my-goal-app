import { supabase } from "./supabase";

export async function loadIntrospection(userId: string) {
  const { data, error } = await supabase
    .from("introspection")
    .select("blocks")
    .eq("user_id", userId)
    .single();
  if (error || !data) return null;
  return data.blocks;
}

export async function saveIntrospection(userId: string, blocks: any[]) {
  const { error } = await supabase
    .from("introspection")
    .upsert({ user_id: userId, blocks, updated_at: new Date().toISOString() },
             { onConflict: "user_id" });
  return { error };
}