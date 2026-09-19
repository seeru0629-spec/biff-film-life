import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

type PushSubscriptionJSON = { endpoint: string; keys?: { p256dh?: string; auth?: string } };

export async function POST(req: NextRequest) {
  const body = await req.json();
  const token = typeof body.token === "string" ? body.token : null;
  const sub = body.subscription as PushSubscriptionJSON | undefined;
  if (!token || !sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const { error } = await supabaseAdmin()
    .from("filmlife_push_subscriptions")
    .upsert(
      { viewer_token: token, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      { onConflict: "endpoint" }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const endpoint = typeof body.endpoint === "string" ? body.endpoint : null;
  if (!endpoint) return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });

  const { error } = await supabaseAdmin().from("filmlife_push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
