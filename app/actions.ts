"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";

export async function addToSchedule(token: string, screeningId: string) {
  const { error } = await supabaseAdmin()
    .from("filmlife_schedule_items")
    .upsert({ viewer_token: token, screening_id: screeningId }, { onConflict: "viewer_token,screening_id" });
  if (error) throw new Error(error.message);
  revalidatePath(`/s/${token}`);
  revalidatePath(`/s/${token}/schedule`);
}

export async function removeFromSchedule(token: string, screeningId: string) {
  const { error } = await supabaseAdmin()
    .from("filmlife_schedule_items")
    .delete()
    .eq("viewer_token", token)
    .eq("screening_id", screeningId);
  if (error) throw new Error(error.message);
  revalidatePath(`/s/${token}`);
  revalidatePath(`/s/${token}/schedule`);
}

export async function addWatch(token: string, screeningId: string) {
  const { error } = await supabaseAdmin()
    .from("filmlife_watch_items")
    .upsert(
      { viewer_token: token, screening_id: screeningId, status: "감시중" },
      { onConflict: "viewer_token,screening_id" }
    );
  if (error) throw new Error(error.message);
  revalidatePath(`/s/${token}/watchlist`);
}

export async function unwatch(token: string, screeningId: string) {
  const { error } = await supabaseAdmin()
    .from("filmlife_watch_items")
    .update({ status: "해제됨", updated_at: new Date().toISOString() })
    .eq("viewer_token", token)
    .eq("screening_id", screeningId);
  if (error) throw new Error(error.message);
  revalidatePath(`/s/${token}/watchlist`);
}

export async function savePushSubscription(token: string, screeningId: string, subscription: unknown) {
  const { error } = await supabaseAdmin()
    .from("filmlife_watch_items")
    .update({ push_subscription: subscription })
    .eq("viewer_token", token)
    .eq("screening_id", screeningId);
  if (error) throw new Error(error.message);
}
