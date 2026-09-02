import { redirect } from "next/navigation";
import { generateViewerToken } from "@/lib/token";
import { supabaseAdmin } from "@/lib/supabase";

export default async function RootPage() {
  const token = generateViewerToken();
  const { error } = await supabaseAdmin().from("filmlife_viewers").insert({ token });
  if (error) {
    throw new Error(`개인 링크 발급 실패: ${error.message}`);
  }
  redirect(`/s/${token}`);
}
