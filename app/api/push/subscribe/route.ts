import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const { token, subscription } = await req.json();
  if (!token || !subscription) {
    return NextResponse.json({ error: "token, subscription 필요" }, { status: 400 });
  }
  const { error } = await supabaseAdmin()
    .from("filmlife_watch_items")
    .update({ push_subscription: subscription })
    .eq("viewer_token", token)
    .eq("status", "감시중");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
