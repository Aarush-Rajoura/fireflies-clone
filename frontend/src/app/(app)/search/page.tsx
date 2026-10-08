import { PagePlaceholder } from "@/features/shell";

export const metadata = { title: "Search · Fireflies.ai Clone" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q)?.trim() ?? "";
  return (
    <PagePlaceholder
      title={query ? `Results for “${query}”` : "Search"}
      message="Full-text search across titles and transcripts is coming with the search module."
    />
  );
}
