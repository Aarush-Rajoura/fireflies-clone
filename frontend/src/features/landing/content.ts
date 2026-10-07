// All marketing copy and content arrays live here so components stay presentational.
import type { IconName } from "./icons";

export const ROUTES = {
  login: "/login",
  signup: "/signup",
  pricing: "/pricing",
  enterprise: "/enterprise",
  home: "/",
} as const;

export const ANNOUNCEMENT = {
  badge: "NEW",
  text: "Meet Fireflies Voice: dictate notes and follow-ups anywhere you type.",
  cta: "See what's new",
  href: ROUTES.signup,
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
      { title: "AI Notetaker", description: "Joins your calls, records and writes the notes for you.", href: ROUTES.signup },
      { title: "AI Summaries", description: "Overviews, bullet points and action items after every meeting.", href: ROUTES.signup },
      { title: "AskFred", description: "Ask questions across every conversation your team has had.", href: ROUTES.signup },
      { title: "Conversation Intelligence", description: "Talk time, sentiment and topic trackers for every call.", href: ROUTES.signup },
      { title: "Live Assist", description: "Real-time suggestions and answers while the meeting is happening.", href: ROUTES.signup },
      { title: "Uploads", description: "Drop in audio and video files to transcribe and summarize them.", href: ROUTES.signup },
    ],
    card: {
      visual: "glow",
      title: "See your meetings work for you",
      body: "Transcripts, notes and tasks arrive minutes after the call ends, without anyone typing.",
      cta: "Explore the product",
      href: ROUTES.signup,
    },
  },
  {
    id: "solutions",
    label: "Solutions",
    columns: [
      { title: "Sales", description: "Log calls to your CRM and coach reps with real call data.", href: ROUTES.signup },
      { title: "Recruiting", description: "Focus on the candidate while interview notes write themselves.", href: ROUTES.signup },
      { title: "Customer Success", description: "Capture every promise and surface churn signals early.", href: ROUTES.signup },
      { title: "Engineering", description: "Turn stand-ups and design reviews into searchable decisions.", href: ROUTES.signup },
      { title: "Education", description: "Searchable lecture transcripts and study notes for every class.", href: ROUTES.signup },
      { title: "Consulting", description: "Keep client context in one place across every engagement.", href: ROUTES.signup },
    ],
    card: {
      visual: "glow",
      title: "Built for every team",
      body: "Templates and trackers tuned for how sales, hiring and product teams actually meet.",
      cta: "Find your use case",
      href: ROUTES.signup,
    },
  },
  {
    id: "integration",
    label: "Integration",
    columns: [
      { title: "Video Conferencing", description: "Record and transcribe calls from the meeting tools your team already uses.", href: ROUTES.signup },
      { title: "Dialers", description: "Pull in and transcribe calls placed from your sales dialer.", href: ROUTES.signup },
      { title: "Calendar", description: "Automatically join and record meetings scheduled on your calendar.", href: ROUTES.signup },
      { title: "Audio Recording", description: "Transcribe and store recordings from cloud recording services.", href: ROUTES.signup },
      { title: "Collaboration", description: "Post transcripts, notes and recordings straight to a team channel.", href: ROUTES.signup },
      { title: "Project Management", description: "Create tasks in your tracker from what was said in the meeting.", href: ROUTES.signup },
      { title: "CRM", description: "Log calls, transcripts and notes against the right deal.", href: ROUTES.signup },
      { title: "Notes", description: "Send meeting notes and summaries to your note-taking app.", href: ROUTES.signup },
    ],
    card: {
      visual: "tiles",
      title: "Connect Fireflies to your favorite tools",
      body: "Sync meetings, notes and insights across 100+ apps in your stack, from CRM to calendar.",
      cta: "Browse integrations",
      href: ROUTES.signup,
    },
  },
  {
    id: "resources",
    label: "Resources",
    columns: [
      { title: "Blog", description: "Playbooks and ideas for running meetings that move work forward.", href: ROUTES.home },
      { title: "Help Center", description: "Step-by-step guides for setup, recording and sharing.", href: ROUTES.home },
      { title: "API Docs", description: "Build on top of transcripts with our GraphQL-style API.", href: ROUTES.home },
      { title: "Security", description: "How we protect your conversations and your data.", href: ROUTES.home },
      { title: "Community", description: "Swap templates and workflows with other teams.", href: ROUTES.home },
      { title: "Webinars", description: "Live sessions on getting the most out of meeting AI.", href: ROUTES.home },
    ],
    card: {
      visual: "glow",
      title: "Learn from 1M+ teams",
      body: "Guides, templates and customer stories from teams who never take manual notes.",
      cta: "Visit the blog",
      href: ROUTES.home,
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
  { icon: "target", title: "95% Accurate", body: "Industry-leading accuracy, even with accents, jargon and crosstalk." },
  { icon: "globe", title: "100+ Languages", body: "Transcribe in English, Spanish, French, Hindi, Japanese and many more." },
  { icon: "users", title: "Speaker Recognition", body: "Knows who said what, in live meetings and uploaded files alike." },
  { icon: "zap", title: "Auto-Language Detection", body: "Switches language from one meeting to the next on its own." },
];

export interface TranscriptLine {
  speaker: string;
  tone: Tone;
  time: string;
  text: string;
}

export const TRANSCRIPT: TranscriptLine[] = [
  { speaker: "Sarah", tone: 4, time: "00:53", text: "We want onboarding to feel effortless, especially the chat and CRM integrations." },
  { speaker: "Janice", tone: 3, time: "01:24", text: "Absolutely. Our solutions lead will pair with your admin so the rollout is smooth." },
  { speaker: "Chris", tone: 2, time: "01:47", text: "I'll prepare the seat list and loop in the team leads before Thursday." },
  { speaker: "Sarah", tone: 4, time: "02:19", text: "Great. Let's schedule weekly check-ins for the first month." },
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

export interface SummaryTab {
  id: SummaryTabId;
  label: string;
  heading: string;
  /** Either paragraphs or bullet rows; `owner` groups action items by person. */
  items: { text: string; time?: string; owner?: string }[];
  style: "paragraph" | "bullets";
}

export const SUMMARY_TABS: SummaryTab[] = [
  {
    id: "overview",
    label: "Overview",
    heading: "Overview",
    style: "paragraph",
    items: [
      { text: "The kickoff introduced the Northbeam and Acme teams. Acme will use Fireflies to cut manual note-taking, automate sales follow-ups and coach reps with real call data." },
      { text: "Both sides agreed on a one-week rollout for 50 seats, with weekly check-ins during the first month." },
    ],
  },
  {
    id: "bullets",
    label: "Bullet Points",
    heading: "Shorthand Bullets",
    style: "bullets",
    items: [
      { text: "📈 50-seat rollout approved, live within a week", time: "04:12" },
      { text: "🔗 CRM and chat integrations are the top priority", time: "07:38" },
      { text: "🎯 Managers will review recordings for coaching", time: "12:05" },
      { text: "🗓️ Weekly feedback calls for the first month", time: "21:44" },
    ],
  },
  {
    id: "actions",
    label: "Action Items",
    heading: "Action Items",
    style: "bullets",
    items: [
      { owner: "Chris", text: "Send the final list of 50 users for training by Thursday.", time: "24:42" },
      { owner: "Sarah", text: "Schedule onboarding sessions and weekly feedback calls.", time: "02:19" },
      { owner: "Janice", text: "Connect the CRM sandbox and confirm field mapping.", time: "18:07" },
    ],
  },
  {
    id: "custom",
    label: "Custom Notes",
    heading: "Meeting Outcome",
    style: "bullets",
    items: [
      { text: "Team aligned on best practices for rolling out the AI note-taker." },
      { text: "Clear guidelines agreed for recording internal and client meetings." },
      { text: "Calendar auto-join, CRM sync and transcript sharing were demoed." },
    ],
  },
];

export const CAPTURE_HIGHLIGHTS = [
  {
    title: "AI Note Taker Bot",
    body: "Invite fred@fireflies.ai to a live call, or let it auto-join every meeting on your calendar to record, transcribe and summarize.",
    tint: "lilac" as const,
  },
  {
    title: "Browser Extension",
    body: "Record browser-based calls in one click and follow along with a real-time transcript.",
    tint: "cream" as const,
  },
];

export const CAPTURE_FEATURES: Feature[] = [
  { icon: "phone", title: "Mobile App", body: "Record in-person conversations and get notes on the go." },
  { icon: "monitor", title: "Desktop App", body: "Capture any call on your computer, no bot required." },
  { icon: "code", title: "Dialers & API", body: "Bring in calls from your dialer or process audio with our API." },
  { icon: "upload", title: "Audio & Video Files", body: "Upload MP3, MP4, WAV or M4A files for transcripts and summaries." },
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
  { icon: "chart", title: "Talk-time analytics", body: "See who dominated the call and who barely spoke." },
  { icon: "smile", title: "Sentiment", body: "Spot positive and negative moments across the conversation." },
  { icon: "hash", title: "Topic trackers", body: "Track mentions of pricing, competitors or any keyword you choose." },
  { icon: "question", title: "Questions asked", body: "Measure discovery quality by the questions reps actually ask." },
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
  { icon: "shield", title: "SOC 2 Type II", body: "Independently audited controls for security and availability." },
  { icon: "lock", title: "GDPR", body: "Data processing agreements and EU data-subject rights built in." },
  { icon: "key", title: "Encryption", body: "AES-256 at rest and TLS 1.2+ in transit for every recording." },
  { icon: "eye-off", title: "Zero training on your data", body: "Your conversations are never used to train third-party models." },
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
    features: ["Unlimited transcription", "Limited AI summaries", "800 mins of storage per seat", "AskFred basics"],
  },
  {
    id: "pro",
    name: "Pro",
    blurb: "For small teams that meet every day.",
    monthly: 18,
    annual: 10,
    cta: "Get Pro",
    href: ROUTES.signup,
    features: ["Everything in Free", "Unlimited AI summaries", "8,000 mins of storage per seat", "Integrations with CRM and chat", "Download transcripts"],
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
    features: ["Everything in Pro", "Unlimited storage", "Conversation intelligence", "Video recording", "Team analytics"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    blurb: "For organizations with advanced security needs.",
    monthly: null,
    annual: 39,
    cta: "Talk to sales",
    href: ROUTES.enterprise,
    features: ["Everything in Business", "SSO and SCIM", "Custom data retention", "Dedicated account manager", "HIPAA support"],
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
      { label: "AI Notetaker", href: ROUTES.signup },
      { label: "AskFred", href: ROUTES.signup },
      { label: "Live Assist", href: ROUTES.signup },
      { label: "Pricing", href: ROUTES.pricing },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Enterprise", href: ROUTES.enterprise },
      { label: "Security", href: ROUTES.home },
      { label: "Careers", href: ROUTES.home },
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
  { icon: "shield", title: "Enterprise-grade security", body: "SSO, SCIM provisioning, audit logs and custom data retention." },
  { icon: "users", title: "Dedicated success team", body: "A named account manager and onboarding tailored to your rollout." },
  { icon: "chart", title: "Org-wide insights", body: "Conversation intelligence across every team and region." },
  { icon: "code", title: "Private storage & API", body: "Bring your own storage bucket and build on our API." },
];

export const CHAT_GREETING = [
  "Hi, I'm Fred, an AI assistant here to answer your questions about Fireflies. For account help, use the chat inside the app.",
  "How can I help you today? 👋",
];

export const CHAT_QUICK_REPLIES = [
  {
    id: "pricing",
    label: "How much does it cost?",
    answer: "There's a Free plan forever. Pro starts at $10 per seat per month billed annually, and Business at $19. See the Pricing page for details.",
  },
  {
    id: "integrations",
    label: "Which apps do you integrate with?",
    answer: "Fireflies works with 100+ apps: video conferencing, calendars, CRMs, dialers, chat and project tools. Connect them from Integrations in the app.",
  },
  {
    id: "security",
    label: "Is my data secure?",
    answer: "Yes. Data is encrypted at rest and in transit, we're SOC 2 Type II and GDPR compliant, and we never train third-party models on your meetings.",
  },
];

export const CHAT_FALLBACK =
  "Thanks for the question! I'm a demo assistant with a few scripted answers. Try one of the suggestions below, or request a demo and our team will follow up.";
