import { TeamView } from "@/features/team";

export const metadata = { title: "Team · Fireflies.ai Clone" };

type SearchParams = Record<string, string | string[] | undefined>;

export default async function TeamPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { invite } = await searchParams;
  return <TeamView inviteRequested={invite === "1"} />;
}
