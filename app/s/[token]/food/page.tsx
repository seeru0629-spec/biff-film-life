import { getRestaurants, getVenues } from "@/lib/queries";
import { FoodExplorer } from "@/components/FoodExplorer";
import { EmptyState } from "@/components/ui";

export default async function FoodPage() {
  const [restaurants, venues] = await Promise.all([getRestaurants(), getVenues()]);

  if (restaurants.length === 0) {
    return (
      <div className="px-4 pt-16">
        <EmptyState title="아직 등록된 맛집이 없어요" description="운영자가 맛집 목록을 준비 중입니다." />
      </div>
    );
  }

  return <FoodExplorer restaurants={restaurants} venues={venues} />;
}
