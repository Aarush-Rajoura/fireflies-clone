import { JoinInvite } from "@/features/team";

export const metadata = { title: "Join team · Fireflies.ai Clone" };

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <JoinInvite token={token} />;
}
