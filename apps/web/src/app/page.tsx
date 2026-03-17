"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect, useCallback } from "react";
import { api, setSession } from "@/lib/api";

// ─── Smooth-scroll helper ───────────────────────────────────────────────────
function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

// ─── Navbar ──────────────────────────────────────────────────────────────────
function Navbar({ onAuthTab }: { onAuthTab: (tab: "login" | "register") => void }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-200 ${
        scrolled
          ? "border-b border-zinc-200 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <a href="#" className="flex items-center gap-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 dark:bg-zinc-100">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M2 11L5.5 7.5L7.5 9.5L12 4"
                stroke={undefined}
                className="stroke-white dark:stroke-zinc-900"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-sm font-bold tracking-tight">
            microlead<span className="text-zinc-400 dark:text-zinc-600">crm</span>
          </span>
        </a>

        {/* Nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {[
            { label: "Features", id: "features" },
            { label: "AI", id: "ai" },
            { label: "How it works", id: "how" },
            { label: "Get access", id: "auth" },
          ].map(({ label, id }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className="text-sm text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {label}
            </button>
          ))}
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              onAuthTab("login");
              scrollTo("auth");
            }}
            className="hidden rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 sm:block"
          >
            Sign in
          </button>
          <button
            onClick={() => {
              onAuthTab("register");
              scrollTo("auth");
            }}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Get started
          </button>
        </div>
      </div>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero({ onAuthTab }: { onAuthTab: (tab: "login" | "register") => void }) {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-50 px-6 pt-16 dark:bg-zinc-950">
      {/* Background grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #71717a 1px, transparent 1px), linear-gradient(to bottom, #71717a 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Radial glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-500/20" />

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3.5 py-1.5 text-xs font-medium text-violet-700 dark:border-violet-800/50 dark:bg-violet-950/50 dark:text-violet-300">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
          AI-Assisted Sales CRM — Built for lean teams
        </div>

        {/* Headline */}
        <h1 className="text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-6xl lg:text-7xl">
          Close More Deals.
          <br />
          <span className="ai-title-shimmer">Less Admin.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          Team-scoped CRM built for micro-SaaS founders, agencies, and lean sales teams.
          Pipeline, contacts, tasks, and AI workflows — in one TypeScript-native product.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => {
              onAuthTab("register");
              scrollTo("auth");
            }}
            className="rounded-xl bg-zinc-900 px-7 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-zinc-800 hover:shadow-xl dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Get started free →
          </button>
          <button
            onClick={() => {
              onAuthTab("login");
              scrollTo("auth");
            }}
            className="rounded-xl border border-zinc-300 bg-white px-7 py-3.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Sign in to your workspace
          </button>
        </div>

        {/* Product preview card */}
        <div className="mx-auto mt-16 max-w-3xl">
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-zinc-950/50">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
              </div>
              <div className="ml-2 flex-1 rounded bg-zinc-100 px-3 py-1 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500">
                app.microlead.io/app
              </div>
            </div>

            {/* Dashboard preview */}
            <div className="flex gap-0">
              {/* Sidebar */}
              <div className="hidden w-44 shrink-0 border-r border-zinc-100 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50 sm:block">
                <div className="mb-3 h-7 w-28 rounded-md bg-zinc-200 dark:bg-zinc-700" />
                {["Dashboard", "Pipeline", "Contacts", "Companies", "Tasks"].map((item) => (
                  <div
                    key={item}
                    className={`mb-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
                      item === "Pipeline"
                        ? "bg-zinc-200 font-medium text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200"
                        : "text-zinc-500 dark:text-zinc-500"
                    }`}
                  >
                    <div className="h-2.5 w-2.5 rounded bg-zinc-300 dark:bg-zinc-600" />
                    {item}
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div className="flex-1 p-4">
                {/* Stats row */}
                <div className="mb-4 grid grid-cols-3 gap-3">
                  {[
                    { label: "Open leads", val: "24" },
                    { label: "Companies", val: "12" },
                    { label: "Win rate", val: "68%" },
                  ].map(({ label, val }) => (
                    <div
                      key={label}
                      className="rounded-lg border border-zinc-100 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-800/50"
                    >
                      <p className="text-[10px] text-zinc-500">{label}</p>
                      <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{val}</p>
                    </div>
                  ))}
                </div>

                {/* Kanban columns */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { stage: "Prospecting", count: 5, color: "bg-blue-400" },
                    { stage: "Qualified", count: 8, color: "bg-violet-400" },
                    { stage: "Closed Won", count: 3, color: "bg-green-400" },
                  ].map(({ stage, count, color }) => (
                    <div
                      key={stage}
                      className="rounded-lg border border-zinc-100 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-800/30"
                    >
                      <div className="mb-2 flex items-center gap-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${color}`} />
                        <span className="text-[9px] font-medium text-zinc-600 dark:text-zinc-400">{stage}</span>
                        <span className="ml-auto text-[9px] text-zinc-400">{count}</span>
                      </div>
                      {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                        <div
                          key={i}
                          className="mb-1 h-5 rounded bg-white shadow-sm dark:bg-zinc-700/60"
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Social proof bar ─────────────────────────────────────────────────────────
function StatsBar() {
  const stats = [
    { value: "12", label: "API Modules" },
    { value: "7", label: "AI Endpoints" },
    { value: "100%", label: "TypeScript" },
    { value: "∞", label: "Team Tenants" },
  ];

  return (
    <section className="border-y border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="mx-auto grid max-w-5xl grid-cols-2 divide-x divide-y divide-zinc-100 dark:divide-zinc-800 md:grid-cols-4 md:divide-y-0">
        {stats.map(({ value, label }) => (
          <div key={label} className="flex flex-col items-center py-8 px-6 text-center">
            <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">{value}</span>
            <span className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Features grid ─────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="4" width="4" height="12" rx="1.5" className="fill-violet-200 dark:fill-violet-900" />
        <rect x="8" y="7" width="4" height="9" rx="1.5" className="fill-violet-400 dark:fill-violet-700" />
        <rect x="14" y="2" width="4" height="14" rx="1.5" className="fill-violet-600 dark:fill-violet-500" />
      </svg>
    ),
    title: "Pipeline & Kanban",
    desc: "Drag-and-drop kanban board with custom pipeline stages. Track every deal from prospect to close with full status history.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="7" r="4" className="fill-blue-200 dark:fill-blue-900" />
        <path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6" className="stroke-blue-500" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    title: "Contacts",
    desc: "Full contact profiles with linked companies, activity timeline, tasks, notes, and attachments all in one view.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="5" width="14" height="11" rx="2" className="fill-emerald-100 dark:fill-emerald-900/50" />
        <path d="M7 9h6M7 12h4" className="stroke-emerald-600 dark:stroke-emerald-400" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M7 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" className="stroke-emerald-500" strokeWidth="1.2" />
      </svg>
    ),
    title: "Companies",
    desc: "Account management with company profiles, linked contacts, and lead associations for full B2B context.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="3" width="16" height="14" rx="2" className="fill-amber-50 dark:fill-amber-900/30" />
        <path d="M5 8h10M5 11h6" className="stroke-amber-500 dark:stroke-amber-400" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="15" cy="14" r="3" className="fill-amber-400 dark:fill-amber-500" />
        <path d="M14 14h2M15 13v2" className="stroke-white" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    title: "Tasks",
    desc: "Polymorphic tasks linked to any lead, contact, or company. Prioritize, assign, and track work without leaving context.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="3" width="14" height="14" rx="2" className="fill-sky-100 dark:fill-sky-900/40" />
        <path d="M6 7h8M6 10h8M6 13h5" className="stroke-sky-500 dark:stroke-sky-400" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
    title: "Notes",
    desc: "Rich markdown notes on any record. Keep call recaps, meeting summaries, and strategy notes organised and searchable.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M5 4h7l3 3v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" className="fill-rose-100 dark:fill-rose-900/40" />
        <path d="M12 4v3h3" className="stroke-rose-400" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 10h6M7 13h4" className="stroke-rose-500 dark:stroke-rose-400" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    title: "Attachments",
    desc: "Upload PDF and DOCX files per record. AI automatically extracts text for use in lead summaries and action generation.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 3v3M10 14v3M3 10H6M14 10h3" className="stroke-orange-400" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="10" cy="10" r="3" className="fill-orange-200 dark:fill-orange-900/50" />
        <path d="M5.5 5.5l2 2M12.5 12.5l2 2M5.5 14.5l2-2M12.5 7.5l2-2" className="stroke-orange-400" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    title: "Activity Timeline",
    desc: "Auto-logged chronological history for every record. See every touch, status change, note, and task in one timeline.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="9" cy="9" r="5" className="fill-zinc-200 dark:fill-zinc-700" />
        <path d="M13.5 13.5l3 3" className="stroke-zinc-500 dark:stroke-zinc-400" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    title: "Global Search",
    desc: "Instant cross-entity search across leads, contacts, companies, and notes. A command bar puts it one keystroke away.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="7" cy="9" r="3.5" className="fill-teal-100 dark:fill-teal-900/40" />
        <circle cx="13" cy="9" r="3.5" className="fill-teal-200 dark:fill-teal-800/60" />
        <path d="M3 17c0-2 1.8-3.5 4-3.5M10 17c0-2 1.8-3.5 4-3.5" className="stroke-teal-500" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    title: "Teams & Invites",
    desc: "Multi-team workspace with role-based access control. Invite teammates by email and switch teams without re-logging in.",
  },
];

function FeaturesGrid() {
  return (
    <section id="features" className="bg-zinc-50 px-6 py-24 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 text-center">
          <h2 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Everything your team needs
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-zinc-500 dark:text-zinc-400">
            A complete CRM platform shipped as a single, cohesive product — no plugins, no integrations patchwork.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon, title, desc }) => (
            <div
              key={title}
              className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-100 bg-zinc-50 dark:border-zinc-700/50 dark:bg-zinc-800">
                {icon}
              </div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── AI spotlight ─────────────────────────────────────────────────────────────
const AI_CAPABILITIES = [
  { label: "Lead Summary", desc: "AI-generated briefing from all lead data and documents" },
  { label: "Next Best Actions", desc: "Personalised recommended steps based on deal context" },
  { label: "Outreach Draft", desc: "Tailored cold and warm email copy ready to send" },
  { label: "Actions → Tasks", desc: "Convert AI recommendations into tasks with one click" },
  { label: "Send Draft Email", desc: "Dispatch AI-composed emails directly from the CRM" },
  { label: "LinkedIn Intent", desc: "Log outreach intent on LinkedIn directly from any lead" },
  { label: "Win Probability", desc: "Confidence score derived from pipeline stage and engagement" },
];

function AISpotlight() {
  return (
    <section
      id="ai"
      className="relative overflow-hidden bg-zinc-950 px-6 py-24"
    >
      {/* Gradient blobs */}
      <div className="pointer-events-none absolute left-0 top-0 h-64 w-64 rounded-full bg-violet-700/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative mx-auto max-w-6xl">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-700/50 bg-violet-950/60 px-3 py-1.5 text-xs font-medium text-violet-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
          Powered by OpenAI GPT-4o · Azure OpenAI
        </div>

        <h2 className="mt-2 max-w-2xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Your AI Sales{" "}
          <span className="ai-title-shimmer">Co-pilot</span>
        </h2>
        <p className="mt-5 max-w-xl text-base text-zinc-400">
          Every lead carries its own AI context — summaries, action plans, draft emails, and win scores,
          generated from your pipeline data, notes, and uploaded documents.
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {AI_CAPABILITIES.map(({ label, desc }) => (
            <div
              key={label}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-violet-700/50 hover:bg-zinc-900"
            >
              <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-900/50">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M7 1l1.5 4H13l-3.5 2.5 1 4L7 9l-3.5 2.5 1-4L1 5h4.5z"
                    fill="none"
                    stroke="rgb(167,139,250)"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="text-sm font-semibold text-zinc-100">{label}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Create your team",
      desc: "Register in seconds. Create a workspace, invite teammates by email, and assign roles — Owner, Admin, or Member.",
    },
    {
      num: "02",
      title: "Build your pipeline",
      desc: "Add companies, contacts, and leads. Configure custom pipeline stages and move deals through your kanban board.",
    },
    {
      num: "03",
      title: "Let AI do the heavy lifting",
      desc: "Ask AI for a lead summary, generate outreach emails, score win probability, and convert recommendations into tasks.",
    },
  ];

  return (
    <section id="how" className="bg-white px-6 py-24 dark:bg-zinc-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <h2 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Up and running in minutes
          </h2>
          <p className="mt-4 text-base text-zinc-500 dark:text-zinc-400">
            No lengthy onboarding. No sales calls. Just sign up and start closing.
          </p>
        </div>

        <div className="relative grid gap-8 md:grid-cols-3">
          {/* Connector line */}
          <div className="pointer-events-none absolute top-8 left-1/3 right-1/3 hidden h-px bg-gradient-to-r from-zinc-200 via-violet-300 to-zinc-200 dark:from-zinc-800 dark:via-violet-700 dark:to-zinc-800 md:block" />

          {steps.map(({ num, title, desc }) => (
            <div key={num} className="relative flex flex-col items-center text-center">
              <div className="z-10 flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-xl font-bold text-zinc-900 shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                {num}
              </div>
              <h3 className="mt-5 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Auth section ─────────────────────────────────────────────────────────────
function AuthForms({ activeTab, setActiveTab }: { activeTab: "login" | "register"; setActiveTab: (t: "login" | "register") => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginErr, setLoginErr] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Register state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regErr, setRegErr] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginErr(null);
    setLoginLoading(true);
    try {
      const res = await api<{ accessToken: string; user: { preferredTeamId: string | null } }>(
        "/auth/login",
        { method: "POST", body: JSON.stringify({ email: loginEmail, password: loginPassword }) },
      );
      setSession(res.accessToken, res.user.preferredTeamId);
      router.replace(next?.startsWith("/") ? next : "/app");
    } catch (ex) {
      setLoginErr(ex instanceof Error ? ex.message : "Login failed");
    } finally {
      setLoginLoading(false);
    }
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegErr(null);
    setRegLoading(true);
    try {
      const res = await api<{ accessToken: string; user: { preferredTeamId: string | null } }>(
        "/auth/register",
        { method: "POST", body: JSON.stringify({ email: regEmail, password: regPassword, name: regName || undefined }) },
      );
      setSession(res.accessToken, res.user.preferredTeamId);
      router.replace(next?.startsWith("/") ? next : "/app");
    } catch (ex) {
      setRegErr(ex instanceof Error ? ex.message : "Registration failed");
    } finally {
      setRegLoading(false);
    }
  }

  const inputCls =
    "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-violet-800/40";
  const labelCls = "text-xs font-medium text-zinc-600 dark:text-zinc-400";

  return (
    <div className="w-full max-w-sm">
      {/* Tab switcher */}
      <div className="mb-6 flex rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-700 dark:bg-zinc-800">
        {(["login", "register"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
              activeTab === tab
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
            }`}
          >
            {tab === "login" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      {activeTab === "login" ? (
        <form onSubmit={onLogin} className="space-y-4">
          <div>
            <label className={labelCls}>Email</label>
            <input
              type="email"
              required
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="you@company.com"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Password</label>
            <input
              type="password"
              required
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="••••••••"
              className={inputCls}
            />
          </div>
          {loginErr && <p className="text-sm text-red-500">{loginErr}</p>}
          <button
            type="submit"
            disabled={loginLoading}
            className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {loginLoading ? "Signing in…" : "Sign in →"}
          </button>
          <p className="text-center text-sm text-zinc-500">
            No account?{" "}
            <button
              type="button"
              onClick={() => setActiveTab("register")}
              className="font-medium text-violet-600 hover:underline dark:text-violet-400"
            >
              Create one free
            </button>
          </p>
        </form>
      ) : (
        <form onSubmit={onRegister} className="space-y-4">
          <div>
            <label className={labelCls}>Full name</label>
            <input
              type="text"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder="Alex Johnson"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input
              type="email"
              required
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              placeholder="you@company.com"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Password (min 8 characters)</label>
            <input
              type="password"
              required
              minLength={8}
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              placeholder="••••••••"
              className={inputCls}
            />
          </div>
          {regErr && <p className="text-sm text-red-500">{regErr}</p>}
          <button
            type="submit"
            disabled={regLoading}
            className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
          >
            {regLoading ? "Creating account…" : "Start for free →"}
          </button>
          <p className="text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => setActiveTab("login")}
              className="font-medium text-violet-600 hover:underline dark:text-violet-400"
            >
              Sign in
            </button>
          </p>
        </form>
      )}
    </div>
  );
}

function AuthSection({ activeTab, setActiveTab }: { activeTab: "login" | "register"; setActiveTab: (t: "login" | "register") => void }) {
  const perks = [
    "Unlimited leads and contacts",
    "AI lead summaries and outreach drafts",
    "Kanban pipeline with custom stages",
    "Team invite and role management",
    "PDF/DOCX attachment extraction",
    "Activity timeline on every record",
  ];

  return (
    <section id="auth" className="bg-zinc-50 px-6 py-24 dark:bg-zinc-950">
      <div className="mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-900/8 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="grid lg:grid-cols-2">
            {/* Left: copy */}
            <div className="bg-zinc-900 p-10 dark:bg-zinc-950">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                Free to start · No credit card required
              </div>
              <h2 className="text-3xl font-bold text-white">
                Start closing smarter deals today.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                Join founders and sales teams who use microlead-crm to stay organised,
                follow up faster, and let AI handle the heavy research.
              </p>

              <ul className="mt-8 space-y-3">
                {perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600/20">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2 2 4-4" stroke="rgb(167,139,250)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span className="text-sm text-zinc-300">{perk}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-10 border-t border-zinc-800 pt-6">
                <p className="text-xs text-zinc-600">
                  Already have a workspace?{" "}
                  <Link href="/app" className="text-zinc-400 hover:text-zinc-300 underline">
                    Open the app →
                  </Link>
                </p>
              </div>
            </div>

            {/* Right: form */}
            <div className="flex items-center justify-center p-10">
              <Suspense
                fallback={
                  <div className="w-full max-w-sm animate-pulse rounded-xl bg-zinc-100 p-8 dark:bg-zinc-800" />
                }
              >
                <AuthForms activeTab={activeTab} setActiveTab={setActiveTab} />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Tech stack banner ────────────────────────────────────────────────────────
function TechStack() {
  const tech = [
    "Next.js 15",
    "NestJS 10",
    "PostgreSQL",
    "Prisma 6",
    "OpenAI / Azure",
    "BullMQ + Redis",
    "TypeScript 5.7",
    "Tailwind CSS",
  ];

  return (
    <section className="border-t border-zinc-100 bg-white py-12 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto max-w-5xl px-6">
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Built on a production-grade TypeScript stack
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {tech.map((t) => (
            <span
              key={t}
              className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-1.5 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white px-6 py-12 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-900 dark:bg-zinc-100">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path
                  d="M2 11L5.5 7.5L7.5 9.5L12 4"
                  className="stroke-white dark:stroke-zinc-900"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-sm font-bold">microlead<span className="text-zinc-400 dark:text-zinc-600">crm</span></span>
          </div>

          <nav className="flex flex-wrap justify-center gap-6 text-sm text-zinc-500 dark:text-zinc-400">
            <button onClick={() => scrollTo("features")} className="hover:text-zinc-900 dark:hover:text-zinc-100 transition">Features</button>
            <button onClick={() => scrollTo("ai")} className="hover:text-zinc-900 dark:hover:text-zinc-100 transition">AI</button>
            <button onClick={() => scrollTo("how")} className="hover:text-zinc-900 dark:hover:text-zinc-100 transition">How it works</button>
            <Link href="/app" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition">Open app</Link>
          </nav>

          <p className="text-xs text-zinc-400 dark:text-zinc-600">
            © {new Date().getFullYear()} microlead-crm. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Root page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [authTab, setAuthTab] = useState<"login" | "register">("register");

  const handleAuthTab = useCallback((tab: "login" | "register") => {
    setAuthTab(tab);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navbar onAuthTab={handleAuthTab} />
      <Hero onAuthTab={handleAuthTab} />
      <StatsBar />
      <FeaturesGrid />
      <AISpotlight />
      <HowItWorks />
      <TechStack />
      <AuthSection activeTab={authTab} setActiveTab={setAuthTab} />
      <Footer />
    </div>
  );
}
