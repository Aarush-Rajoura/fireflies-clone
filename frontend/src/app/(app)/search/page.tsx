import { SearchResultsPage } from "@/features/search";

export const metadata = { title: "Search · Fireflies.ai Clone" };

type SearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const query = await searchParams;
  const q = first(query.q)?.trim() ?? "";
  const page = Number(first(query.page));
  return <SearchResultsPage q={q} page={Number.isSafeInteger(page) && page > 0 ? page : 1} />;
}
