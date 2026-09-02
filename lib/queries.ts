import { supabaseAdmin, supabasePublic } from "./supabase";
import type {
  Film,
  Restaurant,
  ScheduleItem,
  ScreeningWithDetails,
  Venue,
  VenueTravelTime,
  WatchItem,
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
  if (opts.section && opts.section !== "전체") q = q.eq("section", opts.section);
  const { data, error } = await q;
  if (error) throw error;
  return data as Film[];
}

export async function getFilmSections() {
  const { data, error } = await supabasePublic().from("filmlife_films").select("section");
  if (error) throw error;
  const set = new Set((data as { section: string | null }[]).map((r) => r.section).filter(Boolean));
  return Array.from(set) as string[];
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

export async function getWatchItemsForViewer(token: string): Promise<(WatchItem & { screening: ScreeningWithDetails })[]> {
  const { data, error } = await supabaseAdmin()
    .from("filmlife_watch_items")
    .select("*, screening:filmlife_screenings(*, film:filmlife_films(*), venue:filmlife_venues(*))")
    .eq("viewer_token", token)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as (WatchItem & { screening: ScreeningWithDetails })[];
}

export async function getWatchItemForScreening(token: string, screeningId: string) {
  const { data } = await supabaseAdmin()
    .from("filmlife_watch_items")
    .select("*")
    .eq("viewer_token", token)
    .eq("screening_id", screeningId)
    .maybeSingle();
  return data as WatchItem | null;
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

export async function getRestaurants(): Promise<Restaurant[]> {
  const { data, error } = await supabasePublic().from("filmlife_restaurants").select("*").order("name");
  if (error) throw error;
  return data as Restaurant[];
}
