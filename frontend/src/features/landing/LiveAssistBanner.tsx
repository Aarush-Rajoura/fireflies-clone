import { INTEGRATIONS, LIVE_ASSIST, ROUTES } from "./content";
import { BrandMark, PlaceholderMark } from "./marks";
import { Reveal } from "./Reveal";
import { ButtonLink, Container } from "./ui";

/** Full-bleed black band with a painted gradient banner (no imagery). */
export function LiveAssistBanner() {
  return (
    <section
      id="live-assist"
      aria-labelledby="live-assist-title"
      className="scroll-mt-4 bg-[var(--mk-black)] py-12 sm:py-16"
    >
      <Container>
        <Reveal>
          <div className="mk-dusk relative overflow-hidden rounded-2xl px-5 py-10 text-center sm:px-12 sm:py-14">
            {/* Soft "hills" to echo the landscape feel of the original banner. */}
            <div
              aria-hidden="true"
              className="absolute -bottom-24 -left-20 h-56 w-[60%] rounded-[50%] bg-[var(--mk-navy)] opacity-70"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-28 -right-16 h-60 w-[55%] rounded-[50%] bg-[var(--mk-navy-deep)] opacity-80"
            />

            <div className="relative">
              <ul
                aria-label="Works in your meeting apps"
                className="mx-auto inline-flex max-w-full flex-wrap justify-center gap-1.5 rounded-xl border border-[var(--mk-white-14)] bg-[var(--mk-navy-deep)] p-1.5"
              >
                {INTEGRATIONS.slice(0, 8).map((it) => (
                  <li
                    key={it.name}
                    title={it.name}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--mk-white-08)]"
                  >
                    <PlaceholderMark shape={it.shape} tone={it.tone} size={18} />
                  </li>
                ))}
                <li className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--mk-white-08)]">
                  <BrandMark size={18} />
                </li>
              </ul>
              <h2
                id="live-assist-title"
                className="mk-display mx-auto mt-8 max-w-[780px] text-[26px] font-medium leading-tight text-[var(--mk-on-dark)] sm:text-[36px]"
              >
                {LIVE_ASSIST.title}
              </h2>
              <p className="mx-auto mt-4 max-w-[520px] text-[16px] leading-relaxed text-[var(--mk-on-dark)]">
                {LIVE_ASSIST.body}
              </p>
              <ButtonLink
                href={ROUTES.signup}
                arrow
                className="mt-8 ring-1 ring-[var(--mk-violet-soft)]"
              >
                {LIVE_ASSIST.cta}
              </ButtonLink>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
