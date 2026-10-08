import { FileUp } from "lucide-react";

import { Button, ComingSoon } from "@/components/ui";

/** Speech-to-text is out of scope; point the user at the transcript path that works today. */
export function MediaComingSoon({ onUseTranscript }: { onUseTranscript: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <ComingSoon
        title="Upload audio or video"
        message="Fred will transcribe recordings soon. For now, upload or paste a transcript and Fred will write the summary and action items."
      />
      <Button
        variant="primary"
        leadingIcon={<FileUp strokeWidth={1.75} />}
        onClick={onUseTranscript}
      >
        Upload a transcript instead
      </Button>
    </div>
  );
}
