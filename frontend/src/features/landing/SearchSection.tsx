import { SEARCH_CARDS } from "./content";
import { Icon } from "./icons";
import { Avatar, FredAvatar } from "./marks";
import { Reveal } from "./Reveal";
import { AccentHeading, Container } from "./ui";

const TINT = {
  pink: "bg-gradient-to-b from-[var(--mk-white)] to-[var(--mk-tint-pink)]",
  mint: "bg-gradient-to-b from-[var(--mk-white)] to-[var(--mk-tint-mint)]",
} as const;

const RESULTS = [
  { title: "Roadmap Planning", who: "Matt", date: "May 15", snippet: "…we agreed the mobile release slips to Q3…" },
  { title: "Pricing Review", who: "Priya", date: "Apr 2", snippet: "…annual plans get a 20% discount…" },
];

function SearchMock() {
  return (
    <div className="rounded-xl border border-[var(--mk-line)] bg-[var(--mk-white)] p-4 shadow-[0_12px_32px_var(--mk-shadow)]">
      <div className="flex items-center gap-2 rounded-lg border border-[var(--mk-line)] px-3 py-2 text-[13px] text-[var(--mk-ink)]">
        <Icon name="search" size={15} className="text-[var(--mk-muted)]" />
        mobile release date
      </div>
      <ul className="mt-3 space-y-2">
        {RESULTS.map((r, i) => (
          <li key={r.title} className={`flex gap-3 rounded-lg p-2.5 ${i === 0 ? "bg-[var(--mk-surface)]" : ""}`}>
            <Avatar name={r.who} tone={i === 0 ? 5 : 2} size={28} />
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-[var(--mk-ink)]">{r.title}</p>
              <p className="text-[11px] text-[var(--mk-muted)]">
                {r.who} · {r.date}
              </p>
              <p className="mt-1 truncate text-[12px] text-[var(--mk-body)]">
                <mark className="rounded bg-[var(--mk-violet-tint)] px-0.5 text-[var(--mk-ink)]">{r.snippet}</mark>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AskFredMock() {
  return (
    <div className="rounded-xl border border-[var(--mk-line)] bg-[var(--mk-white)] p-4 shadow-[0_12px_32px_var(--mk-shadow)]">
      <p className="ml-auto w-fit max-w-[85%] rounded-lg rounded-br-sm bg-[var(--mk-violet)] px-3 py-2 text-[12.5px] text-[var(--mk-white)]">
        What did Sam say about ad pricing?
      </p>
      <div className="mt-3 flex gap-2">
        <FredAvatar size={24} />
        <div>
          <p className="text-[11px] font-medium text-[var(--mk-ink)]">AskFred</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--mk-body)]">
            Sam said social ad pricing is more competitive this quarter, but cost per click has risen slightly.{" "}
            <span className="text-[var(--mk-link)]">14:02</span>
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-lg border border-[var(--mk-line)] px-3 py-2 text-[12.5px] text-[var(--mk-muted)]">
        <Icon name="sparkles" size={15} className="text-[var(--mk-tone-4)]" />
        Ask anything…
        <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-md bg-[var(--mk-violet)] text-[var(--mk-white)]">
          <Icon name="arrow-up" size={14} />
        </span>
      </div>
    </div>
  );
}

export function SearchSection() {
  return (
    <section aria-labelledby="search-title" className="bg-[var(--mk-white)] py-20 sm:py-28">
      <Container>
        <Reveal>
          <AccentHeading
            id="search-title"
            text={"*Remember* Every Conversation\nWith *AI Powered Search*"}
            className="text-center text-[32px] sm:text-[44px]"
          />
        </Reveal>
        <div className="mx-auto mt-14 grid max-w-[1000px] grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-2">
          {SEARCH_CARDS.map((card, i) => (
            <Reveal key={card.title} delay={i * 90}>
              <article className={`flex h-full flex-col rounded-2xl border border-[var(--mk-line)] p-5 sm:p-8 ${TINT[card.tint]}`}>
                {i === 0 ? <SearchMock /> : <AskFredMock />}
                <h3 className="mt-8 text-[20px] font-medium text-[var(--mk-ink)]">{card.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--mk-body)]">{card.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
