import { ensureViewer } from "@/lib/queries";
import { BottomNav } from "@/components/BottomNav";

export default async function ViewerLayout({
  children,
  params,
}: LayoutProps<"/s/[token]">) {
  const { token } = await params;
  await ensureViewer(token);

  return (
    <div className="min-h-full bg-surface pb-[96px]">
      {children}
      <BottomNav token={token} />
    </div>
  );
}
