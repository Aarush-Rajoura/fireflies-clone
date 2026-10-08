import type { Metadata } from "next";
import {
  AccentHeading,
  Container,
  ENTERPRISE_BENEFITS,
  EnterpriseDemo,
  FeatureItem,
  LogoStrip,
} from "@/features/landing";

export const metadata: Metadata = {
  title: "Enterprise | Fireflies.ai Clone",
  description: "Security, control and org-wide conversation intelligence for large teams.",
};

export default function EnterprisePage() {
  return (
    <>
      <section aria-labelledby="enterprise-title" className="mk-starfield py-16 sm:py-24">
        <Container className="grid items-start gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
          <div>
            <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-[var(--mk-violet-soft)]">
              Fireflies Enterprise
            </p>
            <AccentHeading
              as="h1"
              id="enterprise-title"
              dark
              text={"Meeting AI Your\n*Security Team* Will Love"}
              className="mt-4 text-[36px] sm:text-[52px]"
            />
            <p className="mt-5 max-w-[520px] text-[17px] leading-relaxed text-[var(--mk-on-dark-muted)] sm:text-[19px]">
              Roll out an AI notetaker across thousands of seats with the controls, compliance and
              support large organizations need.
            </p>
            <div className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2">
              {ENTERPRISE_BENEFITS.map((b) => (
                <FeatureItem key={b.title} feature={b} dark />
              ))}
            </div>
          </div>
          <EnterpriseDemo />
        </Container>
        <Container className="text-center">
          <LogoStrip />
        </Container>
      </section>
    </>
  );
}
