import webpush from "web-push";
import { supabaseAdmin } from "./supabase";

let vapidConfigured = false;
function ensureVapid() {
  if (vapidConfigured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  vapidConfigured = true;
}

type PushPayload = { title: string; body: string; url: string };

/** viewer_token 하나에 여러 기기가 구독돼 있을 수 있어 전부에 보낸다.
 * 구독이 만료됐으면(404/410) 조용히 정리한다 — 발송 실패가 댓글 작성 자체를 막으면 안 된다. */
async function sendToToken(viewerToken: string, payload: PushPayload) {
  const admin = supabaseAdmin();
  const { data: subs } = await admin
    .from("filmlife_push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("viewer_token", viewerToken);
  if (!subs || subs.length === 0) return;

  ensureVapid();
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload)
        );
      } catch (e: unknown) {
        const statusCode = (e as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("filmlife_push_subscriptions").delete().eq("id", s.id);
        } else {
          console.error("[push] 발송 실패", e);
        }
      }
    })
  );
}

/** 새 댓글이 달렸을 때 글쓴이 + (대댓글이면) 부모 댓글 작성자에게 알린다. 본인 글/댓글에는 안 보낸다.
 * 각 알림의 링크는 받는 사람 "본인" 토큰으로 만든다 — viewer_token이 곧 개인 링크 인증수단이라
 * 댓글 작성자의 토큰을 잘못 넣으면 안 된다. */
export async function notifyNewComment({
  commenterToken,
  postId,
  parentCommentId,
  commentBody,
}: {
  commenterToken: string;
  postId: string;
  parentCommentId: string | null;
  commentBody: string;
}) {
  const admin = supabaseAdmin();
  const recipients = new Set<string>();

  const { data: post } = await admin
    .from("filmlife_posts")
    .select("viewer_token, title")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return;
  if (post.viewer_token !== commenterToken) recipients.add(post.viewer_token);

  if (parentCommentId) {
    const { data: parent } = await admin
      .from("filmlife_comments")
      .select("viewer_token")
      .eq("id", parentCommentId)
      .maybeSingle();
    if (parent && parent.viewer_token !== commenterToken) recipients.add(parent.viewer_token);
  }

  const preview = commentBody.length > 60 ? `${commentBody.slice(0, 60)}…` : commentBody;
  await Promise.all(
    Array.from(recipients).map((recipientToken) =>
      sendToToken(recipientToken, {
        title: `"${post.title}"에 새 댓글`,
        body: preview,
        url: `/s/${recipientToken}/board/${postId}`,
      })
    )
  );
}
