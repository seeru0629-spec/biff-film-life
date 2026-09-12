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

export async function addEventToSchedule(token: string, eventSessionId: string) {
  const admin = supabaseAdmin();
  // filmlife_schedule_items의 (viewer_token, event_session_id) 유니크 인덱스가 부분 인덱스라
  // upsert(onConflict)로 바로 타깃할 수 없어(screening_id/event_session_id 배타 체크 때문에
  // 컬럼 하나만으로는 매칭 안 됨) 존재 확인 후 삽입하는 방식으로 멱등하게 처리한다.
  const { data: existing } = await admin
    .from("filmlife_schedule_items")
    .select("id")
    .eq("viewer_token", token)
    .eq("event_session_id", eventSessionId)
    .maybeSingle();
  if (!existing) {
    const { error } = await admin
      .from("filmlife_schedule_items")
      .insert({ viewer_token: token, event_session_id: eventSessionId });
    if (error) throw new Error(error.message);
  }
  revalidatePath(`/s/${token}`);
  revalidatePath(`/s/${token}/schedule`);
}

export async function removeEventFromSchedule(token: string, eventSessionId: string) {
  const { error } = await supabaseAdmin()
    .from("filmlife_schedule_items")
    .delete()
    .eq("viewer_token", token)
    .eq("event_session_id", eventSessionId);
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

export async function rateFilm(token: string, filmId: string, formData: FormData) {
  const rating = Number(formData.get("rating"));
  if (!rating || rating < 0.5 || rating > 5) throw new Error("별점을 선택해주세요");
  const review = String(formData.get("review") ?? "").trim() || null;
  const nickname = String(formData.get("nickname") ?? "").trim();

  const admin = supabaseAdmin();
  const { data: viewer } = await admin.from("filmlife_viewers").select("nickname").eq("token", token).maybeSingle();
  if (!viewer?.nickname) {
    if (!nickname) throw new Error("닉네임을 입력해주세요");
    const { error: nickErr } = await admin.from("filmlife_viewers").update({ nickname }).eq("token", token);
    if (nickErr) throw new Error(nickErr.message);
  }

  const { error } = await admin
    .from("filmlife_ratings")
    .upsert(
      { viewer_token: token, film_id: filmId, rating, review, updated_at: new Date().toISOString() },
      { onConflict: "viewer_token,film_id" }
    );
  if (error) throw new Error(error.message);
  revalidatePath(`/s/${token}/films/${filmId}`);
  revalidatePath(`/s/${token}/ratings`);
}

