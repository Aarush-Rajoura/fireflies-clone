import { Sparkles } from "lucide-react";

import { Button, EmptyState } from "@/components/ui";

export function SummaryEmpty({
  onGenerate,
  isGenerating,
}: {
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  return (
    <EmptyState
      className="py-8"
      icon={<Sparkles strokeWidth={1.75} />}
      title="No summary yet"
      description="Generate an AI summary with keywords, an outline and bullet-point notes from the transcript."
      action={
        <Button variant="primary" loading={isGenerating} onClick={onGenerate}>
          Generate summary
        </Button>
      }
    />
  );
}
