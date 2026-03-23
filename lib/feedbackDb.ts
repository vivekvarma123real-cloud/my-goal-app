import { supabase } from "./supabase";

export type Feedback = {
  id: string;
  name: string;
  message: string;
  rating: number;
  feature: string;
  created_at: string;
};

export async function submitFeedback(data: {
  name: string;
  message: string;
  rating: number;
  feature: string;
}) {
  const { error } = await supabase.from("feedback").insert([data]);
  if (error) console.error("Submit error:", error);
  return { error };
}

export async function fetchFeedback(): Promise<Feedback[]> {
  const { data, error } = await supabase
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Fetch feedback error:", error.message, error.code, error.details, error.hint);
    return [];
  }
  return (data ?? []) as Feedback[];
}