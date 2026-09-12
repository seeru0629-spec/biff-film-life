export type Film = {
  id: string;
  title_kor: string;
  title_eng: string | null;
  director: string | null;
  country: string | null;
  section: string | null;
  synopsis: string | null;
  runtime_min: number | null;
  release_year: number | null;
  is_imported: boolean;
  import_distributor: string | null;
  wp_status: string | null;
  still_image_url: string | null;
  source_url: string | null;
};

export type Venue = {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
};

export type VenueTravelTime = {
  from_venue_id: string;
  to_venue_id: string;
  travel_min: number;
};

export type Screening = {
  id: string;
  film_id: string;
  venue_id: string;
  screen_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string | null;
  has_gv: boolean;
  is_sold_out: boolean;
  source_url: string | null;
};

export type ScreeningWithDetails = Screening & {
  film: Film;
  venue: Venue;
};

export type EventCategory = "행사안내" | "커뮤니티비프";

export type Event = {
  id: string;
  category: EventCategory;
  section: string | null;
  title: string;
  host: string | null;
  synopsis: string | null;
  still_image_url: string | null;
  source_url: string | null;
};

export type EventSession = {
  id: string;
  event_id: string;
  venue_id: string | null;
  venue_name: string | null;
  session_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string | null;
  booking_code: string | null;
  source_url: string | null;
};

export type EventSessionWithDetails = EventSession & {
  event: Event;
  venue: Venue | null;
};

export type ScheduleItem = {
  id: string;
  viewer_token: string;
  screening_id: string | null;
  event_session_id: string | null;
  created_at: string;
};

/**
 * 시간표 렌더링(lib/timetable.ts, lib/travel.ts, ScheduleBlock, SaveImageSheet)이
 * 영화 회차와 행사 세션을 동일하게 다룰 수 있도록 정규화한 공통 항목.
 * screen_date/start_time/end_time/venue_id 등 이름은 ScreeningWithDetails와 맞춘다.
 */
export type TimetableItem = {
  id: string; // screening.id 또는 event_session.id
  kind: "film" | "event";
  title: string;
  subtitle: string | null; // 필름: venue만 표시, 행사: venue만 표시(현재 동일하나 확장 여지로 분리)
  venue_id: string | null;
  venue_name: string;
  screen_date: string;
  start_time: string;
  end_time: string | null;
  runtime_min: number | null;
  still_image_url: string | null;
  has_gv: boolean;
  source: ScreeningWithDetails | EventSessionWithDetails;
};

export function toTimetableItem(item: ScreeningWithDetails | EventSessionWithDetails): TimetableItem {
  if ("film" in item) {
    return {
      id: item.id,
      kind: "film",
      title: item.film.title_kor,
      subtitle: null,
      venue_id: item.venue_id,
      venue_name: item.venue.name,
      screen_date: item.screen_date,
      start_time: item.start_time,
      end_time: item.end_time,
      runtime_min: item.film.runtime_min,
      still_image_url: item.film.still_image_url,
      has_gv: item.has_gv,
      source: item,
    };
  }
  return {
    id: item.id,
    kind: "event",
    title: item.event.title,
    subtitle: null,
    venue_id: item.venue_id,
    venue_name: item.venue?.name ?? item.venue_name ?? "",
    screen_date: item.session_date,
    start_time: item.start_time,
    end_time: item.end_time,
    runtime_min: null,
    still_image_url: item.event.still_image_url,
    has_gv: false,
    source: item,
  };
}

export type FilmLike = {
  id: string;
  film_id: string;
  viewer_token: string;
  created_at: string;
};

export type FilmWithLikes = Film & { likeCount: number };

export type RatingSummary = { avg: number; count: number };

export type Rating = {
  id: string;
  film_id: string;
  rating: number;
  review: string | null;
  created_at: string;
};

export type RatingWithMeta = Rating & { nickname: string; isMine: boolean };

export type FilmWithRating = Film & { myRating: Rating };

export type PostCategory = "자유" | "양도";

export type Post = {
  id: string;
  category: PostCategory;
  title: string;
  body: string;
  created_at: string;
};

export type PostWithMeta = Post & { commentCount: number; isMine: boolean };

export type Comment = {
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  body: string;
  created_at: string;
};

export type CommentWithMeta = Comment & { isMine: boolean; replies: CommentWithMeta[] };

export type Restaurant = {
  id: string;
  name: string;
  category: string | null;
  lat: number;
  lng: number;
  google_map_url: string | null;
  walk_note: string | null;
};
