import { SummarySection } from "./SummarySection";

export function OverviewSection({ label, overview }: { label: string; overview: string }) {
  const paragraphs = overview
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return null;
  return (
    <SummarySection label={label}>
      {paragraphs.map((p, i) => (
        <p key={i} className="whitespace-pre-line text-body text-primary">
          {p}
        </p>
      ))}
    </SummarySection>
  );
}
