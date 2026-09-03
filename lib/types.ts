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

export type ScheduleItem = {
  id: string;
  viewer_token: string;
  screening_id: string;
  created_at: string;
};

export type FilmLike = {
  id: string;
  film_id: string;
  viewer_token: string;
  created_at: string;
};

export type FilmWithLikes = Film & { likeCount: number };

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
