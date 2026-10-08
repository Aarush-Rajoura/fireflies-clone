import { notFound } from "next/navigation";

import { NotepadView } from "@/features/meeting";

type SearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function MeetingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const meetingId = Number(id);
  if (!Number.isSafeInteger(meetingId) || meetingId <= 0) notFound();
  return <NotepadView meetingId={meetingId} t={first(query.t)} edit={first(query.edit) === "1"} />;
}
