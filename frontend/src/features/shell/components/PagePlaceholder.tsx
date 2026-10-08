import { ComingSoon } from "@/components/ui";

/** Stand-in for a page a later module owns, so every rail link lands somewhere real. */
export function PagePlaceholder({ title, message }: { title: string; message?: string }) {
  return (
    <section className="flex w-full justify-center px-6 py-16">
      <ComingSoon title={title} message={message} />
    </section>
  );
}
