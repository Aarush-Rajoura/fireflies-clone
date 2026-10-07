// All marketing copy and content arrays live here so components stay presentational.
import type { IconName } from "./icons";

export const ROUTES = {
  login: "/login",
  signup: "/signup",
  pricing: "/pricing",
  enterprise: "/enterprise",
  home: "/",
} as const;

/** In-page anchors on the landing page; prefixed with "/" so they also work from /pricing. */
export const ANCHORS = {
  transcription: "/#transcription",
  summaries: "/#summaries",
  capture: "/#capture",
  search: "/#search",
  liveAssist: "/#live-assist",
  intelligence: "/#intelligence",
  integrations: "/#integrations",
  security: "/#security",
  pricing: "/#pricing-teaser",
  faq: "/#faq",
} as const;

export const ANNOUNCEMENT = {
  badge: "NEW",
  text: "AskFred now answers questions across all your meetings.",
  cta: "Learn more",
  href: ANCHORS.search,
};

/** Tone index into --mk-tone-1..8, used by placeholder marks and avatars. */
export type Tone = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface MegaLink {
  title: string;
  description: string;
  href: string;
}

export interface MegaMenuData {
  id: string;
  label: string;
  columns: MegaLink[];
  card: {
    visual: "tiles" | "glow";
    title: string;
    body: string;
    cta: string;
    href: string;
  };
}

export const MEGA_MENUS: MegaMenuData[] = [
  {
    id: "product",
    label: "Product",
    columns: [
      {
        title: "AI Notetaker",
        description: "Joins your calls, records and writes the notes for you.",
        href: ANCHORS.capture,
      },
      {
        title: "AI Summaries",
        description: "Overviews, bullet points and action items after every meeting.",
        href: ANCHORS.summaries,
      },
      {
        title: "AskFred",
        description: "Ask questions across every conversation your team has had.",
        href: ANCHORS.search,
      },
      {
        title: "Conversation Intelligence",
        description: "Talk time, sentiment and topic trackers for every call.",
        href: ANCHORS.intelligence,
      },
      {
        title: "Live Assist",
        description: "Real-time suggestions and answers while the meeting is happening.",
        href: ANCHORS.liveAssist,
      },
      {
        title: "Uploads",
        description: "Drop in audio and video files to transcribe and summarize them.",
        href: ANCHORS.capture,
      },
    ],
    card: {
      visual: "glow",
      title: "See your meetings work for you",
      body: "Transcripts, notes and tasks arrive minutes after the call ends, without anyone typing.",
      cta: "Explore the product",
      href: ANCHORS.transcription,
    },
  },
  {
    id: "solutions",
    label: "Solutions",
    columns: [
      {
        title: "Sales",
        description: "Log calls to your CRM and coach reps with real call data.",
        href: ANCHORS.intelligence,
      },
      {
        title: "Recruiting",
        description: "Focus on the candidate while interview notes write themselves.",
        href: ANCHORS.transcription,
      },
      {
        title: "Customer Success",
        description: "Capture every promise and surface churn signals early.",
        href: ANCHORS.summaries,
      },
      {
        title: "Engineering",
        description: "Turn stand-ups and design reviews into searchable decisions.",
        href: ANCHORS.search,
      },
      {
        title: "Education",
        description: "Searchable lecture transcripts and study notes for every class.",
        href: ANCHORS.transcription,
      },
      {
        title: "Consulting",
        description: "Keep client context in one place across every engagement.",
        href: ANCHORS.summaries,
      },
    ],
    card: {
      visual: "glow",
      title: "Built for every team",
      body: "Templates and trackers tuned for how sales, hiring and product teams actually meet.",
      cta: "Find your use case",
      href: ANCHORS.intelligence,
    },
  },
  {
    id: "integration",
    label: "Integration",
    columns: [
      {
        title: "Video Conferencing",
        description: "Record and transcribe calls from the meeting tools your team already uses.",
        href: ANCHORS.integrations,
      },
      {
        title: "Dialers",
        description: "Pull in and transcribe calls placed from your sales dialer.",
        href: ANCHORS.integrations,
      },
      {
        title: "Calendar",
        description: "Automatically join and record meetings scheduled on your calendar.",
        href: ANCHORS.integrations,
      },
      {
        title: "Audio Recording",
        description: "Transcribe and store recordings from cloud recording services.",
        href: ANCHORS.integrations,
      },
      {
        title: "Collaboration",
        description: "Post transcripts, notes and recordings straight to a team channel.",
        href: ANCHORS.integrations,
      },
      {
        title: "Project Management",
        description: "Create tasks in your tracker from what was said in the meeting.",
        href: ANCHORS.integrations,
      },
      {
        title: "CRM",
        description: "Log calls, transcripts and notes against the right deal.",
        href: ANCHORS.integrations,
      },
      {
        title: "Notes",
        description: "Send meeting notes and summaries to your note-taking app.",
        href: ANCHORS.integrations,
      },
    ],
    card: {
      visual: "tiles",
      title: "Connect Fireflies to your favorite tools",
      body: "Sync meetings, notes and insights across 100+ apps in your stack, from CRM to calendar.",
      cta: "Browse integrations",
      href: ANCHORS.integrations,
    },
  },
  {
    id: "resources",
    label: "Resources",
    columns: [
      {
        title: "Blog",
        description: "Playbooks and ideas for running meetings that move work forward.",
        href: ANCHORS.faq,
      },
      {
        title: "Help Center",
        description: "Step-by-step guides for setup, recording and sharing.",
        href: ANCHORS.faq,
      },
      {
        title: "API Docs",
        description: "Build on top of transcripts with our GraphQL-style API.",
        href: ANCHORS.capture,
      },
      {
        title: "Security",
        description: "How we protect your conversations and your data.",
        href: ANCHORS.security,
      },
      {
        title: "Community",
        description: "Swap templates and workflows with other teams.",
        href: ANCHORS.faq,
      },
      {
        title: "Webinars",
        description: "Live sessions on getting the most out of meeting AI.",
        href: ANCHORS.liveAssist,
      },
    ],
    card: {
      visual: "glow",
      title: "Learn from 1M+ teams",
      body: "Guides, templates and customer stories from teams who never take manual notes.",
      cta: "Read the FAQ",
      href: ANCHORS.faq,
    },
  },
];

export const NAV_LINKS = [
  { label: "Enterprise", href: ROUTES.enterprise },
  { label: "Pricing", href: ROUTES.pricing },
];

export const HERO = {
  title: "The #1 AI Assistant For Your Meetings",
  subtitle: "Transcribe, summarize, search and analyze every conversation your team has.",
  rating: "Rated 4.8 / 5",
  compliance: "GDPR, SOC 2, More",
};

/** Made-up company names for the social-proof strip; marks are abstract shapes. */
export const LOGO_STRIP: { name: string; tone: Tone; shape: number }[] = [
  { name: "Northbeam", tone: 1, shape: 0 },
  { name: "Quantico", tone: 5, shape: 1 },
  { name: "Lumora", tone: 2, shape: 2 },
  { name: "Vantage Labs", tone: 4, shape: 3 },
  { name: "Orbitly", tone: 3, shape: 4 },
  { name: "Hexaline", tone: 7, shape: 5 },
];

export interface Feature {
  icon: IconName;
  title: string;
  body: string;
}

export const TRANSCRIPTION_FEATURES: Feature[] = [
  {
    icon: "target",
    title: "95% Accurate",
    body: "Industry-leading accuracy, even with accents, jargon and crosstalk.",
  },
  {
    icon: "globe",
    title: "100+ Languages",
    body: "Transcribe in English, Spanish, French, Hindi, Japanese and many more.",
  },
  {
    icon: "users",
    title: "Speaker Recognition",
    body: "Knows who said what, in live meetings and uploaded files alike.",
  },
  {
    icon: "zap",
    title: "Auto-Language Detection",
    body: "Switches language from one meeting to the next on its own.",
  },
];

export interface TranscriptLine {
  speaker: string;
  tone: Tone;
  time: string;
  text: string;
}

export const TRANSCRIPT: TranscriptLine[] = [
  {
    speaker: "Sarah",
    tone: 4,
    time: "00:53",
    text: "We want onboarding to feel effortless, especially the chat and CRM integrations.",
  },
  {
    speaker: "Janice",
    tone: 3,
    time: "01:24",
    text: "Absolutely. Our solutions lead will pair with your admin so the rollout is smooth.",
  },
  {
    speaker: "Chris",
    tone: 2,
    time: "01:47",
    text: "I'll prepare the seat list and loop in the team leads before Thursday.",
  },
  {
    speaker: "Sarah",
    tone: 4,
    time: "02:19",
    text: "Great. Let's schedule weekly check-ins for the first month.",
  },
];

export const MEETING_NOTES = [
  {
    heading: "Use Case & Requirements",
    range: "00:00 - 10:12",
    bullets: [
      "Acme wants reps fully present on calls instead of typing notes",
      "Call notes should sync to the CRM automatically",
      "Managers plan to use recordings for call coaching",
    ],
  },
  {
    heading: "Metrics & Goals",
    range: "10:15 - 20:43",
    bullets: ["Rollout planned for 50 seats", "Target go-live within one week"],
  },
  {
    heading: "Next Steps",
    range: "20:50 - 34:52",
    bullets: ["Share the final user list by Thursday"],
  },
];

export type SummaryTabId = "overview" | "bullets" | "actions" | "custom";

export interface SummaryGroup {
  /** Speaker, topic or template heading; `range` is the time span it covers. */
  label: string;
  range?: string;
  items: { text: string; time?: string }[];
}

export interface SummaryTab {
  id: SummaryTabId;
  label: string;
  intro?: string;
  groups: SummaryGroup[];
}

export const SUMMARY_TABS: SummaryTab[] = [
  {
    id: "overview",
    label: "Overview",
    intro:
      "The kickoff introduced the Northbeam and Acme teams. Acme will use the notetaker to cut manual note-taking, automate sales follow-ups and coach reps with real call data. Both sides agreed on a one-week rollout for 50 seats.",
    groups: [
      {
        label: "Key Takeaways",
        items: [
          { text: "50-seat rollout approved, targeting go-live within a week.", time: "04:12" },
          { text: "CRM sync and team-chat notifications are the top priorities.", time: "07:38" },
          { text: "Managers will review recordings weekly for call coaching.", time: "12:05" },
          { text: "Security review needs SSO and a 90-day retention policy.", time: "16:51" },
        ],
      },
      {
        label: "Next Steps",
        items: [
          { text: "Share the final user list for onboarding by Thursday.", time: "24:42" },
          { text: "Weekly feedback calls during the first month.", time: "28:10" },
          {
            text: "Pilot with the enterprise sales pod before company-wide launch.",
            time: "31:27",
          },
        ],
      },
    ],
  },
  {
    id: "bullets",
    label: "Bullet Points",
    groups: [
      {
        label: "Use Case & Requirements",
        range: "00:00 - 10:12",
        items: [
          { text: "Reps want to stay present on calls instead of typing notes.", time: "01:15" },
          { text: "Call notes should land in the CRM without manual entry.", time: "03:48" },
          { text: "Managers plan to use recordings for coaching.", time: "06:20" },
        ],
      },
      {
        label: "Metrics & Goals",
        range: "10:15 - 20:43",
        items: [
          { text: "Buying 50 seats for the initial rollout.", time: "11:02" },
          { text: "Implementation timeline is one week.", time: "13:36" },
          { text: "Success metric: 5 hours saved per rep each week.", time: "18:09" },
        ],
      },
      {
        label: "Integrations",
        range: "20:50 - 27:30",
        items: [
          { text: "Calendar auto-join for all external meetings.", time: "21:14" },
          { text: "Post summaries to the #sales-calls channel.", time: "23:02" },
        ],
      },
      {
        label: "Concerns",
        range: "27:31 - 34:52",
        items: [
          { text: "Legal asked about data residency in the EU.", time: "28:40" },
          { text: "Some customers may not want the bot to join.", time: "32:15" },
        ],
      },
    ],
  },
  {
    id: "actions",
    label: "Action Items",
    groups: [
      {
        label: "Chris",
        items: [
          {
            text: "Provide a final list of 50 users for initial training by Thursday.",
            time: "24:42",
          },
          { text: "Confirm SSO configuration with the IT team.", time: "17:05" },
        ],
      },
      {
        label: "Sarah",
        items: [
          {
            text: "Schedule training sessions for the team, with weekly feedback calls.",
            time: "02:19",
          },
          { text: "Draft the recording-consent message for external calls.", time: "32:40" },
        ],
      },
      {
        label: "Janice",
        items: [
          { text: "Connect the CRM sandbox and confirm field mapping.", time: "18:07" },
          { text: "Send the EU data residency documentation to legal.", time: "29:12" },
        ],
      },
    ],
  },
  {
    id: "custom",
    label: "Custom Notes",
    groups: [
      {
        label: "Pain Points",
        items: [
          { text: "Reps spend ~30 minutes after each call writing notes.", time: "02:44" },
          { text: "Follow-ups are inconsistent across the team.", time: "05:10" },
        ],
      },
      {
        label: "Budget & Timeline",
        items: [
          { text: "Budget approved for 50 seats this quarter.", time: "11:02" },
          { text: "Go-live targeted for the week of March 22.", time: "13:36" },
        ],
      },
      {
        label: "Decision Makers",
        items: [
          {
            text: "Sarah (VP Sales) owns the rollout; Janice signs off on security.",
            time: "15:20",
          },
        ],
      },
      {
        label: "Meeting Outcome",
        items: [
          { text: "Aligned on best practices for rolling out the AI notetaker.", time: "33:05" },
          { text: "Agreed guidelines for recording internal and client meetings.", time: "34:01" },
        ],
      },
    ],
  },
];

export const CAPTURE_HIGHLIGHTS = [
  {
    title: "AI Note Taker Bot",
    body: "Invite fred@notetaker.app to a live call, or let it auto-join every meeting on your calendar to record, transcribe and summarize.",
    tint: "lilac" as const,
  },
  {
    title: "Browser Extension",
    body: "Record browser-based calls in one click and follow along with a real-time transcript.",
    tint: "cream" as const,
  },
];

export const CAPTURE_FEATURES: Feature[] = [
  {
    icon: "phone",
    title: "Mobile App",
    body: "Record in-person conversations and get notes on the go.",
  },
  {
    icon: "monitor",
    title: "Desktop App",
    body: "Capture any call on your computer, no bot required.",
  },
  {
    icon: "code",
    title: "Dialers & API",
    body: "Bring in calls from your dialer or process audio with our API.",
  },
  {
    icon: "upload",
    title: "Audio & Video Files",
    body: "Upload MP3, MP4, WAV or M4A files for transcripts and summaries.",
  },
];

export const SEARCH_CARDS = [
  {
    title: "Meeting Search",
    body: "Find what was said months ago, down to the exact sentence and timestamp.",
    tint: "pink" as const,
  },
  {
    title: "AskFred",
    body: "Ask Fred anything about your meetings and get answers with sources in seconds.",
    tint: "mint" as const,
  },
];

export const LIVE_ASSIST = {
  title: "Get Real-Time Suggestions, Coaching, And Answers During Meetings.",
  body: "Live Assist listens alongside you and surfaces talking points, objection handling and answers while the call is still going.",
  cta: "Explore Live Assist",
};

export const INTELLIGENCE_POINTS: Feature[] = [
  {
    icon: "chart",
    title: "Talk-time analytics",
    body: "See who dominated the call and who barely spoke.",
  },
  {
    icon: "smile",
    title: "Sentiment",
    body: "Spot positive and negative moments across the conversation.",
  },
  {
    icon: "hash",
    title: "Topic trackers",
    body: "Track mentions of pricing, competitors or any keyword you choose.",
  },
  {
    icon: "question",
    title: "Questions asked",
    body: "Measure discovery quality by the questions reps actually ask.",
  },
];

export const TALK_TIME = [
  { name: "Sarah", share: 46, tone: 4 as Tone },
  { name: "Janice", share: 32, tone: 3 as Tone },
  { name: "Chris", share: 22, tone: 2 as Tone },
];

/** Generic integration tiles: invented names, abstract marks. */
export const INTEGRATIONS: { name: string; category: string; tone: Tone; shape: number }[] = [
  { name: "Meetly", category: "Video", tone: 5, shape: 1 },
  { name: "Callwave", category: "Dialer", tone: 4, shape: 3 },
  { name: "Datebook", category: "Calendar", tone: 1, shape: 0 },
  { name: "Pipewise", category: "CRM", tone: 6, shape: 4 },
  { name: "Threadly", category: "Chat", tone: 8, shape: 5 },
  { name: "Taskforge", category: "Projects", tone: 2, shape: 2 },
  { name: "Notebloom", category: "Notes", tone: 3, shape: 0 },
  { name: "Drivebox", category: "Storage", tone: 7, shape: 1 },
  { name: "Hookline", category: "Automation", tone: 1, shape: 3 },
  { name: "Ticketry", category: "Support", tone: 5, shape: 5 },
  { name: "Signalpad", category: "Analytics", tone: 4, shape: 2 },
  { name: "Roster", category: "Recruiting", tone: 6, shape: 4 },
];

export const SECURITY_BADGES: Feature[] = [
  {
    icon: "shield",
    title: "SOC 2 Type II",
    body: "Independently audited controls for security and availability.",
  },
  {
    icon: "lock",
    title: "GDPR",
    body: "Data processing agreements and EU data-subject rights built in.",
  },
  {
    icon: "key",
    title: "Encryption",
    body: "AES-256 at rest and TLS 1.2+ in transit for every recording.",
  },
  {
    icon: "eye-off",
    title: "Zero training on your data",
    body: "Your conversations are never used to train third-party models.",
  },
];

export type BillingCycle = "monthly" | "annual";

export interface PricingTier {
  id: string;
  name: string;
  blurb: string;
  monthly: number | null;
  annual: number | null;
  cta: string;
  href: string;
  highlight?: boolean;
  features: string[];
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "free",
    name: "Free",
    blurb: "For individuals trying out meeting AI.",
    monthly: 0,
    annual: 0,
    cta: "Start for free",
    href: ROUTES.signup,
    features: [
      "Unlimited transcription",
      "Limited AI summaries",
      "800 mins of storage per seat",
      "AskFred basics",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    blurb: "For small teams that meet every day.",
    monthly: 18,
    annual: 10,
    cta: "Get Pro",
    href: ROUTES.signup,
    features: [
      "Everything in Free",
      "Unlimited AI summaries",
      "8,000 mins of storage per seat",
      "Integrations with CRM and chat",
      "Download transcripts",
    ],
  },
  {
    id: "business",
    name: "Business",
    blurb: "For growing teams that run on meetings.",
    monthly: 29,
    annual: 19,
    cta: "Get Business",
    href: ROUTES.signup,
    highlight: true,
    features: [
      "Everything in Pro",
      "Unlimited storage",
      "Conversation intelligence",
      "Video recording",
      "Team analytics",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    blurb: "For organizations with advanced security needs.",
    monthly: null,
    annual: 39,
    cta: "Talk to sales",
    href: ROUTES.enterprise,
    features: [
      "Everything in Business",
      "SSO and SCIM",
      "Custom data retention",
      "Dedicated account manager",
      "HIPAA support",
    ],
  },
];

export const FAQ = [
  {
    q: "How does Fireflies join my meetings?",
    a: "Connect your calendar and the Fireflies bot auto-joins the meetings you choose. You can also invite it to any live call or upload a recording afterwards.",
  },
  {
    q: "Which languages are supported?",
    a: "Transcription works in 100+ languages, and Fireflies detects the spoken language automatically so you don't have to switch settings between calls.",
  },
  {
    q: "Is my meeting data secure?",
    a: "Yes. Recordings are encrypted at rest and in transit, access is role-based, and your conversations are never used to train third-party AI models.",
  },
  {
    q: "Can I try it for free?",
    a: "The Free plan includes unlimited transcription and limited AI summaries, with no credit card required. Upgrade any time from the app.",
  },
  {
    q: "Does it work with my CRM and chat tools?",
    a: "Fireflies syncs notes, action items and recordings to 100+ apps, including popular CRMs, chat tools, project trackers and note-taking apps.",
  },
];

export const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "AI Notetaker", href: ANCHORS.capture },
      { label: "AskFred", href: ANCHORS.search },
      { label: "Live Assist", href: ANCHORS.liveAssist },
      { label: "Pricing", href: ROUTES.pricing },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Enterprise", href: ROUTES.enterprise },
      { label: "Security", href: ANCHORS.security },
      { label: "FAQ", href: ANCHORS.faq },
      { label: "Contact", href: ROUTES.enterprise },
    ],
  },
  {
    title: "Get started",
    links: [
      { label: "Sign up", href: ROUTES.signup },
      { label: "Log in", href: ROUTES.login },
      { label: "Open App", href: ROUTES.login },
      { label: "Request Demo", href: ROUTES.enterprise },
    ],
  },
];

export const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-1,000", "1,000+"];

export const ENTERPRISE_BENEFITS: Feature[] = [
  {
    icon: "shield",
    title: "Enterprise-grade security",
    body: "SSO, SCIM provisioning, audit logs and custom data retention.",
  },
  {
    icon: "users",
    title: "Dedicated success team",
    body: "A named account manager and onboarding tailored to your rollout.",
  },
  {
    icon: "chart",
    title: "Org-wide insights",
    body: "Conversation intelligence across every team and region.",
  },
  {
    icon: "code",
    title: "Private storage & API",
    body: "Bring your own storage bucket and build on our API.",
  },
];

export const CHAT_GREETING = [
  "Hi, I'm Fred, an AI assistant here to answer your questions about Fireflies. For account help, use the chat inside the app.",
  "How can I help you today?",
];

export const CHAT_QUICK_REPLIES = [
  {
    id: "pricing",
    label: "How much does it cost?",
    answer:
      "There's a Free plan forever. Pro starts at $10 per seat per month billed annually, and Business at $19. See the Pricing page for details.",
  },
  {
    id: "integrations",
    label: "Which apps do you integrate with?",
    answer:
      "Fireflies works with 100+ apps: video conferencing, calendars, CRMs, dialers, chat and project tools. Connect them from Integrations in the app.",
  },
  {
    id: "security",
    label: "Is my data secure?",
    answer:
      "Yes. Data is encrypted at rest and in transit, we're SOC 2 Type II and GDPR compliant, and we never train third-party models on your meetings.",
  },
];

export const CHAT_FALLBACK =
  "Thanks for the question! I'm a demo assistant with a few scripted answers. Try one of the suggestions below, or request a demo and our team will follow up.";
