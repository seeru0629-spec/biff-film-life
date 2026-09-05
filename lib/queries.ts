import { rawSectionsInGroup, sectionGroupOf } from "./sections";
import { supabaseAdmin, supabasePublic } from "./supabase";
import type {
  CommentWithMeta,
  Film,
  FilmWithLikes,
  FilmWithRating,
  PostCategory,
  PostWithMeta,
  Rating,
  RatingSummary,
  RatingWithMeta,
  Restaurant,
  ScheduleItem,
  ScreeningWithDetails,
  Venue,
  VenueTravelTime,
} from "./types";

export async function ensureViewer(token: string) {
  const admin = supabaseAdmin();
  const { data: existing } = await admin
    .from("filmlife_viewers")
    .select("token")
    .eq("token", token)
    .maybeSingle();
  if (existing) {
    await admin.from("filmlife_viewers").update({ last_seen_at: new Date().toISOString() }).eq("token", token);
    return;
  }
  await admin.from("filmlife_viewers").insert({ token });
}

export async function getFilms(opts: { search?: string; section?: string } = {}) {
  let q = supabasePublic().from("filmlife_films").select("*").order("title_kor", { ascending: true });
  if (opts.search) {
    const term = opts.search.replace(/[%,]/g, "");
    q = q.or(`title_kor.ilike.%${term}%,title_eng.ilike.%${term}%,director.ilike.%${term}%`);
  }
  if (opts.section && opts.section !== "전체") q = q.in("section", rawSectionsInGroup(opts.section));
  const { data, error } = await q;
  if (error) throw error;
  return data as Film[];
}

/** 상단 필터 칩 목록 — 원본 section을 그룹으로 묶어서 보여줌(개별 영화 배지는 원본 그대로 유지, lib/sections.ts 참고) */
export async function getFilmSections() {
  const { data, error } = await supabasePublic().from("filmlife_films").select("section");
  if (error) throw error;
  const rawSet = new Set((data as { section: string | null }[]).map((r) => r.section).filter(Boolean) as string[]);
  const groupSet = new Set(Array.from(rawSet).map(sectionGroupOf));
  return Array.from(groupSet);
}

export async function getFilm(id: string) {
  const { data, error } = await supabasePublic().from("filmlife_films").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Film;
}

export async function getScreeningsForFilm(filmId: string): Promise<ScreeningWithDetails[]> {
  const { data, error } = await supabasePublic()
    .from("filmlife_screenings")
    .select("*, film:filmlife_films(*), venue:filmlife_venues(*)")
    .eq("film_id", filmId)
    .order("screen_date", { ascending: true })
    .order("start_time", { ascending: true });
  if (error) throw error;
  return data as unknown as ScreeningWithDetails[];
}

export async function getScreeningsByDate(date: string): Promise<ScreeningWithDetails[]> {
  const { data, error } = await supabasePublic()
    .from("filmlife_screenings")
    .select("*, film:filmlife_films(*), venue:filmlife_venues(*)")
    .eq("screen_date", date)
    .order("start_time", { ascending: true });
  if (error) throw error;
  return data as unknown as ScreeningWithDetails[];
}

export async function getScheduleForViewer(token: string): Promise<(ScheduleItem & { screening: ScreeningWithDetails })[]> {
  const { data, error } = await supabaseAdmin()
    .from("filmlife_schedule_items")
    .select("*, screening:filmlife_screenings(*, film:filmlife_films(*), venue:filmlife_venues(*))")
    .eq("viewer_token", token);
  if (error) throw error;
  return data as unknown as (ScheduleItem & { screening: ScreeningWithDetails })[];
}

export async function isScreeningInSchedule(token: string, screeningId: string) {
  const { data } = await supabaseAdmin()
    .from("filmlife_schedule_items")
    .select("id")
    .eq("viewer_token", token)
    .eq("screening_id", screeningId)
    .maybeSingle();
  return !!data;
}

export async function getFilmLikeCounts(): Promise<Map<string, number>> {
  const { data, error } = await supabasePublic().rpc("filmlife_film_like_counts");
  if (error) throw error;
  return new Map((data as { film_id: string; like_count: number }[]).map((r) => [r.film_id, Number(r.like_count)]));
}

export async function getLikedFilmIdsForViewer(token: string): Promise<Set<string>> {
  const { data, error } = await supabaseAdmin().from("filmlife_film_likes").select("film_id").eq("viewer_token", token);
  if (error) throw error;
  return new Set((data as { film_id: string }[]).map((r) => r.film_id));
}

export async function isFilmLiked(token: string, filmId: string) {
  const { data } = await supabaseAdmin()
    .from("filmlife_film_likes")
    .select("id")
    .eq("viewer_token", token)
    .eq("film_id", filmId)
    .maybeSingle();
  return !!data;
}

export async function getPopularFilms(): Promise<FilmWithLikes[]> {
  const [films, counts] = await Promise.all([getFilms(), getFilmLikeCounts()]);
  return films
    .map((f) => ({ ...f, likeCount: counts.get(f.id) ?? 0 }))
    .filter((f) => f.likeCount > 0)
    .sort((a, b) => b.likeCount - a.likeCount);
}

export async function getLikedFilms(token: string): Promise<FilmWithLikes[]> {
  const [films, counts, likedIds] = await Promise.all([getFilms(), getFilmLikeCounts(), getLikedFilmIdsForViewer(token)]);
  return films.filter((f) => likedIds.has(f.id)).map((f) => ({ ...f, likeCount: counts.get(f.id) ?? 0 }));
}

export async function getVenueTravelTimes(): Promise<VenueTravelTime[]> {
  const { data, error } = await supabasePublic().from("filmlife_venue_travel_times").select("*");
  if (error) throw error;
  return data as VenueTravelTime[];
}

export async function getVenues(): Promise<Venue[]> {
  const { data, error } = await supabasePublic().from("filmlife_venues").select("*");
  if (error) throw error;
  return data as Venue[];
}

export async function getPosts(category: PostCategory, token: string): Promise<PostWithMeta[]> {
  const { data, error } = await supabaseAdmin()
    .from("filmlife_posts")
    .select("id, category, title, body, viewer_token, created_at")
    .eq("category", category)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const posts = data as (PostWithMeta & { viewer_token: string })[];
  if (posts.length === 0) return [];

  const { data: comments, error: cErr } = await supabaseAdmin()
    .from("filmlife_comments")
    .select("post_id")
    .in(
      "post_id",
      posts.map((p) => p.id)
    );
  if (cErr) throw cErr;
  const countByPost = new Map<string, number>();
  for (const c of comments as { post_id: string }[]) {
    countByPost.set(c.post_id, (countByPost.get(c.post_id) ?? 0) + 1);
  }

  return posts.map(({ viewer_token, ...p }) => ({
    ...p,
    isMine: viewer_token === token,
    commentCount: countByPost.get(p.id) ?? 0,
  }));
}

export async function getPost(id: string, token: string): Promise<PostWithMeta | null> {
  const { data, error } = await supabaseAdmin()
    .from("filmlife_posts")
    .select("id, category, title, body, viewer_token, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { count } = await supabaseAdmin()
    .from("filmlife_comments")
    .select("id", { count: "exact", head: true })
    .eq("post_id", id);
  const { viewer_token, ...post } = data as PostWithMeta & { viewer_token: string };
  return { ...post, isMine: viewer_token === token, commentCount: count ?? 0 };
}

export async function isPostOwner(id: string, token: string) {
  const { data } = await supabaseAdmin().from("filmlife_posts").select("id").eq("id", id).eq("viewer_token", token).maybeSingle();
  return !!data;
}

export async function isCommentOwner(id: string, token: string) {
  const { data } = await supabaseAdmin().from("filmlife_comments").select("id").eq("id", id).eq("viewer_token", token).maybeSingle();
  return !!data;
}

type CommentRow = { id: string; post_id: string; parent_comment_id: string | null; body: string; viewer_token: string; created_at: string };

function buildCommentTree(rows: CommentRow[], token: string): CommentWithMeta[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  function topAncestorId(row: (typeof rows)[number]): string {
    let cur = row;
    while (cur.parent_comment_id) {
      const parent = byId.get(cur.parent_comment_id);
      if (!parent) break;
      cur = parent;
    }
    return cur.id;
  }
  const toMeta = (r: (typeof rows)[number]): CommentWithMeta => ({
    id: r.id,
    post_id: r.post_id,
    parent_comment_id: r.parent_comment_id,
    body: r.body,
    created_at: r.created_at,
    isMine: r.viewer_token === token,
    replies: [],
  });

  const tops = new Map<string, CommentWithMeta>();
  const order: string[] = [];
  for (const r of rows) {
    if (!r.parent_comment_id) {
      tops.set(r.id, toMeta(r));
      order.push(r.id);
    }
  }
  for (const r of rows) {
    if (r.parent_comment_id) {
      const top = tops.get(topAncestorId(r));
      top?.replies.push(toMeta(r));
    }
  }
  return order.map((id) => tops.get(id)!);
}

export async function getCommentsForPost(postId: string, token: string): Promise<CommentWithMeta[]> {
  const { data, error } = await supabaseAdmin()
    .from("filmlife_comments")
    .select("id, post_id, parent_comment_id, body, viewer_token, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return buildCommentTree(data as CommentRow[], token);
}

export async function getViewerNickname(token: string): Promise<string | null> {
  const { data } = await supabaseAdmin().from("filmlife_viewers").select("nickname").eq("token", token).maybeSingle();
  return (data as { nickname: string | null } | null)?.nickname ?? null;
}

export async function getMyRating(token: string, filmId: string): Promise<Rating | null> {
  const { data } = await supabaseAdmin()
    .from("filmlife_ratings")
    .select("id, film_id, rating, review, created_at")
    .eq("viewer_token", token)
    .eq("film_id", filmId)
    .maybeSingle();
  return data as Rating | null;
}

export async function getRatingSummary(filmId: string): Promise<RatingSummary> {
  const { data, error } = await supabaseAdmin().from("filmlife_ratings").select("rating").eq("film_id", filmId);
  if (error) throw error;
  const rows = data as { rating: number }[];
  if (rows.length === 0) return { avg: 0, count: 0 };
  const sum = rows.reduce((acc, r) => acc + Number(r.rating), 0);
  return { avg: sum / rows.length, count: rows.length };
}

export async function getRatingSummaries(): Promise<Map<string, RatingSummary>> {
  const { data, error } = await supabaseAdmin().from("filmlife_ratings").select("film_id, rating");
  if (error) throw error;
  const byFilm = new Map<string, number[]>();
  for (const r of data as { film_id: string; rating: number }[]) {
    byFilm.set(r.film_id, [...(byFilm.get(r.film_id) ?? []), Number(r.rating)]);
  }
  const summaries = new Map<string, RatingSummary>();
  for (const [filmId, ratings] of byFilm) {
    summaries.set(filmId, { avg: ratings.reduce((a, b) => a + b, 0) / ratings.length, count: ratings.length });
  }
  return summaries;
}

export async function getFilmReviews(filmId: string, token: string): Promise<RatingWithMeta[]> {
  const { data, error } = await supabaseAdmin()
    .from("filmlife_ratings")
    .select("id, film_id, rating, review, created_at, viewer_token, viewer:filmlife_viewers(nickname)")
    .eq("film_id", filmId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as (Rating & { viewer_token: string; viewer: { nickname: string | null } | null })[]).map((r) => ({
    id: r.id,
    film_id: r.film_id,
    rating: r.rating,
    review: r.review,
    created_at: r.created_at,
    nickname: r.viewer?.nickname ?? "익명",
    isMine: r.viewer_token === token,
  }));
}

export async function getMyRatings(token: string): Promise<FilmWithRating[]> {
  const { data, error } = await supabaseAdmin()
    .from("filmlife_ratings")
    .select("id, film_id, rating, review, created_at, film:filmlife_films(*)")
    .eq("viewer_token", token)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as (Rating & { film: Film })[]).map((r) => ({
    ...r.film,
    myRating: { id: r.id, film_id: r.film_id, rating: r.rating, review: r.review, created_at: r.created_at },
  }));
}

export async function getRestaurants(): Promise<Restaurant[]> {
  const { data, error } = await supabasePublic().from("filmlife_restaurants").select("*").order("name");
  if (error) throw error;
  return data as Restaurant[];
}
