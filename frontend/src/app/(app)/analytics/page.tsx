import { AnalyticsView, DEFAULT_RANGE, isAnalyticsRange } from "@/features/analytics";

export const metadata = { title: "Analytics · Fireflies.ai Clone" };

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { range } = await searchParams;
  return <AnalyticsView initialRange={isAnalyticsRange(range) ? range : DEFAULT_RANGE} />;
}
