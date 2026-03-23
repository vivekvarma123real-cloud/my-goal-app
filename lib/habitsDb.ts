import { supabase } from "./supabase";

export async function fetchHabits(userId: string) {
  const { data: cats } = await supabase.from("habit_categories").select("*").eq("user_id", userId).order("position");
  const { data: completions } = await supabase.from("habit_completions").select("*").eq("user_id", userId);
  return { categories: cats || [], completions: completions || [] };
}

export async function upsertCategory(cat: any, userId: string) {
  await supabase.from("habit_categories").upsert({
    id: cat.id, user_id: userId, name: cat.name, icon: cat.icon, position: cat.position || 0,
  });
}

export async function deleteCategoryDb(catId: string) {
  await supabase.from("habit_categories").delete().eq("id", catId);
  await supabase.from("habit_completions").delete().eq("category_id", catId);
}

export async function upsertCompletion(comp: any, userId: string) {
  await supabase.from("habit_completions").upsert({
    id: comp.id, user_id: userId, category_id: comp.categoryId,
    habit_label: comp.habitLabel, date: comp.date, done: comp.done,
  });
}