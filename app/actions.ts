"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import type { PostCategory } from "@/lib/types";

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

export async function likeFilm(token: string, filmId: string) {
  const { error } = await supabaseAdmin()
    .from("filmlife_film_likes")
    .upsert({ viewer_token: token, film_id: filmId }, { onConflict: "viewer_token,film_id" });
  if (error) throw new Error(error.message);
  revalidatePath(`/s/${token}/films`);
  revalidatePath(`/s/${token}/films/${filmId}`);
  revalidatePath(`/s/${token}/popular`);
}

export async function unlikeFilm(token: string, filmId: string) {
  const { error } = await supabaseAdmin()
    .from("filmlife_film_likes")
    .delete()
    .eq("viewer_token", token)
    .eq("film_id", filmId);
  if (error) throw new Error(error.message);
  revalidatePath(`/s/${token}/films`);
  revalidatePath(`/s/${token}/films/${filmId}`);
  revalidatePath(`/s/${token}/popular`);
}

export async function createPost(token: string, category: PostCategory, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!title || !body) throw new Error("제목과 내용을 입력해주세요");

  const { data, error } = await supabaseAdmin()
    .from("filmlife_posts")
    .insert({ viewer_token: token, category, title, body })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath(`/s/${token}/board`);
  redirect(`/s/${token}/board/${data.id}`);
}

export async function deletePost(token: string, postId: string, category: PostCategory) {
  const { error } = await supabaseAdmin().from("filmlife_posts").delete().eq("id", postId).eq("viewer_token", token);
  if (error) throw new Error(error.message);
  revalidatePath(`/s/${token}/board`);
  redirect(`/s/${token}/board?category=${encodeURIComponent(category)}`);
}

export async function createComment(token: string, postId: string, parentCommentId: string | null, formData: FormData) {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  const { error } = await supabaseAdmin()
    .from("filmlife_comments")
    .insert({ viewer_token: token, post_id: postId, parent_comment_id: parentCommentId, body });
  if (error) throw new Error(error.message);
  revalidatePath(`/s/${token}/board/${postId}`);
}

export async function deleteComment(token: string, postId: string, commentId: string) {
  const { error } = await supabaseAdmin().from("filmlife_comments").delete().eq("id", commentId).eq("viewer_token", token);
  if (error) throw new Error(error.message);
  revalidatePath(`/s/${token}/board/${postId}`);
}

