import { SummarySection } from "./SummarySection";

export function KeywordsSection({
  label,
  keywords,
}: {
  label: string;
  keywords: readonly string[];
}) {
  if (keywords.length === 0) return null;
  return (
    <SummarySection label={label}>
      <ul className="flex flex-wrap gap-1.5">
        {keywords.map((term, i) => (
          <li
            key={`${term}-${i}`}
            className="rounded-full border border-control bg-surface-2 px-2.5 py-0.5 text-caption text-secondary"
          >
            {term}
          </li>
        ))}
      </ul>
    </SummarySection>
  );
}
