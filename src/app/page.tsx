"use client";

import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import type { Easing } from "motion-utils";
import {
  Menu,
  X,
  ArrowRight,
  BrainCircuit,
  FileText,
  Building2,
  Bell,
  Users,
  BarChart3,
  Upload,
  Sparkles,
  CheckCircle2,
  Check,
  ChevronDown,
  ChevronUp,
  Shield,
  Clock,
  IndianRupee,
  AlertTriangle,
  Linkedin,
  Twitter,
  Mail,
  Phone,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as Easing },
  }),
};

const stagger: Variants = {
  visible: { transition: { staggerChildren: 0.1 } },
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */
const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const painPoints = [
  {
    icon: AlertTriangle,
    title: "Clients don't realize they need TP compliance",
    description:
      "Many multi-entity businesses operate without awareness that their intercompany transactions require transfer pricing documentation under Indian law.",
  },
  {
    icon: Clock,
    title: "Manual documentation takes weeks",
    description:
      "Preparing functional analysis, benchmarking studies, and local files manually consumes 40-60 hours per client, eating into your firm's capacity.",
  },
  {
    icon: Shield,
    title: "Compliance rules change frequently",
    description:
      "CBDT notifications, OECD guideline updates, and safe harbour rule revisions demand constant vigilance to stay current.",
  },
  {
    icon: IndianRupee,
    title: "Getting it wrong means penalties",
    description:
      "Non-compliance attracts penalties of 2% of transaction value under Section 271G, plus potential adjustments under Section 92C.",
  },
];

const features = [
  {
    icon: BrainCircuit,
    title: "Automated Functional Analysis",
    description:
      "AI-powered analysis of entity functions, risks, and assets. Our system maps the FAR profile of each entity in the group, identifying principal vs. limited-risk structures automatically.",
  },
  {
    icon: FileText,
    title: "Document Generation",
    description:
      "Generate Local Files, Master Files, CbCR summaries, and intragroup agreements in one click. All documents follow CBDT Rule 10DA/10DB formats and OECD Chapter V guidelines.",
  },
  {
    icon: Building2,
    title: "Entity Monitoring",
    description:
      "Real-time tracking of entity changes and intercompany transactions. Get alerts when new related-party transactions are recorded or entity structures change.",
  },
  {
    icon: Bell,
    title: "Compliance Alerts",
    description:
      "Automatic notifications for regulatory changes, filing deadlines, and safe harbour rule updates. Never miss a Section 92E certification deadline again.",
  },
  {
    icon: Users,
    title: "Multi-Client Management",
    description:
      "Manage all your TP clients from one unified dashboard. Track documentation status, filing deadlines, and compliance scores across your entire practice.",
  },
  {
    icon: BarChart3,
    title: "Benchmarking Analysis",
    description:
      "Arm's length pricing validation with comparable data from Indian and global databases. Automatic selection of the most appropriate method (CUP, TNMM, RPM, CPM, PSM).",
  },
];

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Onboard Your Client",
    description:
      "Add entities, upload financials, and map intercompany transactions. Our guided workflow takes approximately 20 minutes per client group.",
    detail: "~20 min setup",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "AI Generates Analysis",
    description:
      "TP Report runs automated functional analysis, selects the most appropriate TP method, conducts benchmarking, and generates compliant documentation.",
    detail: "Fully automated",
  },
  {
    number: "03",
    icon: CheckCircle2,
    title: "Review & Deliver",
    description:
      "Review AI-generated documentation, make adjustments if needed, add your firm's branding, and deliver polished reports to your client.",
    detail: "White-labeled output",
  },
];

const comparisonRows = [
  {
    metric: "Time to complete",
    tpreport: "2-3 hours",
    manual: "40-60 hours",
    bigFour: "2-4 weeks",
  },
  {
    metric: "Cost per client",
    tpreport: "From ~6,000/yr",
    manual: "Staff time + opportunity cost",
    bigFour: "3-15 lakhs",
  },
  {
    metric: "Document quality",
    tpreport: "Consistent, templated",
    manual: "Varies by preparer",
    bigFour: "High but generic",
  },
  {
    metric: "Ongoing monitoring",
    tpreport: "Real-time alerts",
    manual: "Annual review only",
    bigFour: "Quarterly at best",
  },
  {
    metric: "Regulatory updates",
    tpreport: "Auto-updated",
    manual: "Manual tracking",
    bigFour: "Periodic bulletins",
  },
];

const pricingTiers = [
  {
    name: "Starter",
    price: "9,999",
    period: "/mo",
    description: "For individual CAs getting started with TP practice",
    features: [
      "Up to 3 client groups",
      "Basic TP documentation (Local File)",
      "Single-user access",
      "Standard benchmarking",
      "Email support",
      "CBDT-compliant templates",
    ],
    cta: "Start Free Trial",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "29,999",
    period: "/mo",
    description: "For growing CA firms with an active TP practice",
    features: [
      "Up to 15 client groups",
      "Full suite (Local + Master + CbCR)",
      "Up to 5 team members",
      "Advanced benchmarking with global data",
      "Priority support",
      "White-label document branding",
      "Intragroup agreement templates",
      "Compliance calendar & alerts",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large firms and TP-specialist practices",
    features: [
      "Unlimited client groups",
      "Full suite + API access",
      "Unlimited team members",
      "Custom benchmarking databases",
      "Dedicated account manager",
      "Custom integrations (Tally, SAP)",
      "On-premise deployment option",
      "Training & onboarding sessions",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

const faqs = [
  {
    question: "What is transfer pricing?",
    answer:
      "Transfer pricing refers to the rules and methods for pricing transactions between related enterprises (such as companies within the same group). Under Indian tax law (Sections 92-92F of the Income Tax Act), these transactions must be conducted at arm's length price to prevent profit shifting between jurisdictions.",
  },
  {
    question: "Who needs TP documentation in India?",
    answer:
      "Any person who has entered into an international transaction or specified domestic transaction with an associated enterprise, where the aggregate value exceeds INR 1 crore (for international transactions) or INR 20 crores (for specified domestic transactions), is required to maintain TP documentation under Section 92D.",
  },
  {
    question: "How does TP Report generate documents?",
    answer:
      "TP Report uses AI to analyze the financial data, intercompany transactions, and entity profiles you provide. It automatically performs functional analysis (FAR analysis), selects the most appropriate TP method, conducts benchmarking using comparable company data, and generates documentation that complies with CBDT Rule 10DA/10DB formats.",
  },
  {
    question: "Is the documentation CBDT/OECD compliant?",
    answer:
      "Yes. All documentation generated by TP Report follows the formats prescribed under CBDT Rules 10DA (Local File) and 10DB (Master File), as well as OECD Transfer Pricing Guidelines Chapter V. Our templates are reviewed and updated regularly by practicing transfer pricing professionals.",
  },
  {
    question: "Can I white-label documents for my clients?",
    answer:
      "Absolutely. On the Professional and Enterprise plans, you can add your firm's logo, branding, and letterhead to all generated documents. Your clients will receive polished, professional reports that appear as your firm's own work product.",
  },
  {
    question: "What if my client's entity structure changes mid-year?",
    answer:
      "TP Report's Entity Monitoring feature tracks structural changes in real time. When a new entity is added, an existing entity is restructured, or intercompany transaction patterns change, the system alerts you and automatically updates the functional analysis and documentation drafts.",
  },
  {
    question: "How secure is my client data?",
    answer:
      "We take data security extremely seriously. All data is encrypted at rest (AES-256) and in transit (TLS 1.3). We maintain SOC 2 Type II compliance, and our infrastructure is hosted on AWS Mumbai region to ensure data residency within India. Role-based access controls ensure only authorized team members can view client data.",
  },
  {
    question: "Do you offer training for CAs?",
    answer:
      "Yes. All plans include access to our knowledge base and video tutorials. Professional and Enterprise plans include live onboarding sessions. Enterprise customers receive dedicated training workshops for their team, covering both the platform and transfer pricing concepts.",
  },
];

/* ------------------------------------------------------------------ */
/*  Components                                                         */
/* ------------------------------------------------------------------ */

function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-white">TP</span>
          </div>
          <span className="text-xl font-bold text-foreground">TP Report</span>
        </a>

        {/* Desktop links */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-3 md:flex">
          <a
            href="/dashboard"
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            Sign In
          </a>
          <a
            href="#pricing"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-dark"
          >
            Get Started
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-border bg-background px-4 pb-4 md:hidden">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-3 text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
          <div className="mt-3 flex flex-col gap-2">
            <a
              href="/dashboard"
              className="rounded-lg border border-border px-4 py-2 text-center text-sm font-medium text-foreground"
            >
              Sign In
            </a>
            <a
              href="#pricing"
              className="rounded-lg bg-primary px-4 py-2 text-center text-sm font-medium text-white"
            >
              Get Started
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left – Copy */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="max-w-xl"
          >
            <motion.div
              variants={fadeUp}
              custom={0}
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary"
            >
              <Sparkles size={14} />
              Built for Indian Chartered Accountants
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl"
            >
              Transfer Pricing Compliance,{" "}
              <span className="text-primary">Automated</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="mt-6 text-lg leading-relaxed text-muted"
            >
              Built for Indian CAs managing multi-entity clients. Generate
              compliant documentation, functional analysis, and intragroup
              agreements&nbsp;&mdash; without the Big&nbsp;Four price tag.
            </motion.p>

            <motion.div
              variants={fadeUp}
              custom={3}
              className="mt-8 flex flex-wrap gap-4"
            >
              <a
                href="#pricing"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-primary-dark hover:shadow-lg"
              >
                Start Free Trial
                <ArrowRight size={16} />
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-6 py-3 text-sm font-semibold text-foreground shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
              >
                Book a Demo
              </a>
            </motion.div>

            <motion.div
              variants={fadeUp}
              custom={4}
              className="mt-8 flex items-center gap-6 text-sm text-muted"
            >
              <span className="flex items-center gap-1.5">
                <Check size={16} className="text-success" />
                14-day free trial
              </span>
              <span className="flex items-center gap-1.5">
                <Check size={16} className="text-success" />
                No credit card required
              </span>
            </motion.div>
          </motion.div>

          {/* Right – Abstract shape */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="hidden lg:block"
          >
            <div className="relative mx-auto aspect-square max-w-md">
              {/* Concentric gradient rings */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/10 via-accent/10 to-primary-light/10" />
              <div className="absolute inset-6 rounded-3xl bg-gradient-to-tr from-surface-alt to-surface shadow-lg" />
              <div className="absolute inset-12 rounded-2xl border border-border bg-surface p-6 shadow-sm">
                {/* Faux dashboard content */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText size={20} className="text-primary" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">
                        TP Documentation
                      </div>
                      <div className="text-[11px] text-muted">
                        Auto-generated
                      </div>
                    </div>
                    <span className="ml-auto rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                      Complete
                    </span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <BrainCircuit size={20} className="text-accent" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">
                        Functional Analysis
                      </div>
                      <div className="text-[11px] text-muted">
                        FAR Profiling
                      </div>
                    </div>
                    <span className="ml-auto rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                      Complete
                    </span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary-light/10 flex items-center justify-center">
                      <BarChart3 size={20} className="text-primary-light" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">
                        Benchmarking
                      </div>
                      <div className="text-[11px] text-muted">
                        TNMM - 12 comparables
                      </div>
                    </div>
                    <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      In Progress
                    </span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                      <Bell size={20} className="text-success" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">
                        Compliance Status
                      </div>
                      <div className="text-[11px] text-muted">
                        FY 2025-26
                      </div>
                    </div>
                    <span className="ml-auto rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                      On Track
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <section className="py-20 sm:py-28" id="problem">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
          className="text-center"
        >
          <motion.p
            variants={fadeUp}
            className="text-sm font-semibold uppercase tracking-wider text-primary"
          >
            The challenge
          </motion.p>
          <motion.h2
            variants={fadeUp}
            custom={1}
            className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            The Hidden Problem with Multi-Entity Clients
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={2}
            className="mx-auto mt-4 max-w-2xl text-muted"
          >
            Most CA firms discover transfer pricing issues too late. Here is
            what we see across hundreds of multi-entity groups in India.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
          className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {painPoints.map((p, i) => (
            <motion.div
              key={p.title}
              variants={fadeUp}
              custom={i}
              className="group rounded-2xl border border-border bg-surface p-6 shadow-sm transition-all hover:border-primary/20 hover:shadow-md"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-danger/10 text-danger transition-colors group-hover:bg-danger/15">
                <p.icon size={24} />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                {p.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {p.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="bg-surface-alt py-20 sm:py-28" id="features">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
          className="text-center"
        >
          <motion.p
            variants={fadeUp}
            className="text-sm font-semibold uppercase tracking-wider text-primary"
          >
            Features
          </motion.p>
          <motion.h2
            variants={fadeUp}
            custom={1}
            className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            Everything You Need for TP Compliance
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={2}
            className="mx-auto mt-4 max-w-2xl text-muted"
          >
            From functional analysis to document generation, TP Report covers the
            entire transfer pricing workflow so you can serve more clients with
            less effort.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={stagger}
          className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              custom={i}
              className="group rounded-2xl border border-border bg-surface p-6 shadow-sm transition-all hover:border-primary/20 hover:shadow-md"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                <f.icon size={24} />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {f.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section className="py-20 sm:py-28" id="how-it-works">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
          className="text-center"
        >
          <motion.p
            variants={fadeUp}
            className="text-sm font-semibold uppercase tracking-wider text-primary"
          >
            How It Works
          </motion.p>
          <motion.h2
            variants={fadeUp}
            custom={1}
            className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            Three Steps to Compliant Documentation
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={2}
            className="mx-auto mt-4 max-w-2xl text-muted"
          >
            Go from raw financials to polished, client-ready TP documentation in
            hours, not weeks.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
          className="relative mt-16 grid gap-8 lg:grid-cols-3"
        >
          {/* Connector line (desktop) */}
          <div className="pointer-events-none absolute top-24 right-0 left-0 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent lg:block" />

          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              variants={fadeUp}
              custom={i}
              className="relative text-center"
            >
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
                <s.icon size={28} />
              </div>
              <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-primary/60">
                Step {s.number}
              </span>
              <h3 className="text-xl font-semibold text-foreground">
                {s.title}
              </h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">
                {s.description}
              </p>
              <span className="mt-4 inline-block rounded-full bg-surface-alt px-3 py-1 text-xs font-medium text-primary">
                {s.detail}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function ComparisonSection() {
  return (
    <section className="bg-surface-alt py-20 sm:py-28" id="comparison">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
          className="text-center"
        >
          <motion.p
            variants={fadeUp}
            className="text-sm font-semibold uppercase tracking-wider text-primary"
          >
            Comparison
          </motion.p>
          <motion.h2
            variants={fadeUp}
            custom={1}
            className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            See How TP Report Stacks Up
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeUp}
          className="mt-12 overflow-x-auto"
        >
          <table className="w-full min-w-[600px] border-separate border-spacing-0 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            <thead>
              <tr className="text-left">
                <th className="border-b border-border px-6 py-4 text-sm font-semibold text-muted">
                  Metric
                </th>
                <th className="border-b border-border bg-primary/5 px-6 py-4 text-sm font-semibold text-primary">
                  TP Report
                </th>
                <th className="border-b border-border px-6 py-4 text-sm font-semibold text-muted">
                  Manual Process
                </th>
                <th className="border-b border-border px-6 py-4 text-sm font-semibold text-muted">
                  Big Four
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((r, i) => (
                <tr
                  key={r.metric}
                  className={
                    i < comparisonRows.length - 1
                      ? "border-b border-border"
                      : ""
                  }
                >
                  <td className="border-b border-border/50 px-6 py-4 text-sm font-medium text-foreground">
                    {r.metric}
                  </td>
                  <td className="border-b border-border/50 bg-primary/5 px-6 py-4 text-sm font-semibold text-primary">
                    {r.tpreport}
                  </td>
                  <td className="border-b border-border/50 px-6 py-4 text-sm text-muted">
                    {r.manual}
                  </td>
                  <td className="border-b border-border/50 px-6 py-4 text-sm text-muted">
                    {r.bigFour}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section className="py-20 sm:py-28" id="pricing">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
          className="text-center"
        >
          <motion.p
            variants={fadeUp}
            className="text-sm font-semibold uppercase tracking-wider text-primary"
          >
            Pricing
          </motion.p>
          <motion.h2
            variants={fadeUp}
            custom={1}
            className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            Simple, Transparent Pricing
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={2}
            className="mx-auto mt-4 max-w-2xl text-muted"
          >
            All plans include a 14-day free trial. No credit card required.
            Pricing in INR, billed monthly.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={stagger}
          className="mt-14 grid gap-8 lg:grid-cols-3"
        >
          {pricingTiers.map((t, i) => (
            <motion.div
              key={t.name}
              variants={fadeUp}
              custom={i}
              className={`relative rounded-2xl border p-8 shadow-sm transition-shadow hover:shadow-md ${
                t.highlighted
                  ? "border-primary bg-surface shadow-md ring-1 ring-primary/20"
                  : "border-border bg-surface"
              }`}
            >
              {t.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-white">
                  Most Popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-foreground">
                {t.name}
              </h3>
              <p className="mt-1 text-sm text-muted">{t.description}</p>
              <div className="mt-6 flex items-baseline gap-1">
                {t.price !== "Custom" && (
                  <span className="text-lg text-muted">&#8377;</span>
                )}
                <span className="text-4xl font-bold text-foreground">
                  {t.price}
                </span>
                {t.period && (
                  <span className="text-sm text-muted">{t.period}</span>
                )}
              </div>
              <ul className="mt-8 space-y-3">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <Check
                      size={16}
                      className="mt-0.5 shrink-0 text-success"
                    />
                    <span className="text-muted">{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href="#"
                className={`mt-8 block rounded-lg py-3 text-center text-sm font-semibold transition-colors ${
                  t.highlighted
                    ? "bg-primary text-white hover:bg-primary-dark"
                    : "border border-border bg-surface text-foreground hover:border-primary/30"
                }`}
              >
                {t.cta}
              </a>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-border">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="text-sm font-semibold text-foreground sm:text-base">
          {question}
        </span>
        {isOpen ? (
          <ChevronUp size={18} className="shrink-0 text-muted" />
        ) : (
          <ChevronDown size={18} className="shrink-0 text-muted" />
        )}
      </button>
      <motion.div
        initial={false}
        animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="overflow-hidden"
      >
        <p className="pb-5 text-sm leading-relaxed text-muted">{answer}</p>
      </motion.div>
    </div>
  );
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="bg-surface-alt py-20 sm:py-28" id="faq">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
          className="text-center"
        >
          <motion.p
            variants={fadeUp}
            className="text-sm font-semibold uppercase tracking-wider text-primary"
          >
            FAQ
          </motion.p>
          <motion.h2
            variants={fadeUp}
            custom={1}
            className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            Frequently Asked Questions
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={2}
            className="mx-auto mt-4 max-w-xl text-muted"
          >
            Everything you need to know about TP Report and transfer pricing
            compliance in India.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={fadeUp}
          className="mt-12 rounded-2xl border border-border bg-surface p-2 shadow-sm sm:p-6"
        >
          {faqs.map((faq, i) => (
            <FAQItem
              key={faq.question}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function CTABanner() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
          className="relative overflow-hidden rounded-3xl bg-secondary px-8 py-16 text-center shadow-xl sm:px-16"
        >
          <div className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-accent/20 blur-3xl" />

          <h2 className="relative text-3xl font-bold text-white sm:text-4xl">
            Ready to Automate Your TP Practice?
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-base text-white/70">
            Join hundreds of Indian CA firms already using TP Report to deliver
            faster, more accurate transfer pricing documentation.
          </p>
          <div className="relative mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-primary-dark hover:shadow-lg"
            >
              Start Free Trial
              <ArrowRight size={16} />
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10"
            >
              Schedule a Demo
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-white">TP</span>
              </div>
              <span className="text-xl font-bold text-foreground">
                TP Report
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Automated transfer pricing compliance for Indian Chartered
              Accountants. Generate documentation, analysis, and agreements
              effortlessly.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <a
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-primary/30 hover:text-primary"
                aria-label="LinkedIn"
              >
                <Linkedin size={16} />
              </a>
              <a
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-primary/30 hover:text-primary"
                aria-label="Twitter"
              >
                <Twitter size={16} />
              </a>
              <a
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-primary/30 hover:text-primary"
                aria-label="Email"
              >
                <Mail size={16} />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">Product</h4>
            <ul className="mt-4 space-y-2.5">
              {["Features", "Pricing", "How It Works", "Integrations", "API"].map(
                (link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-muted transition-colors hover:text-foreground"
                    >
                      {link}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">Resources</h4>
            <ul className="mt-4 space-y-2.5">
              {[
                "Documentation",
                "Blog",
                "TP Knowledge Base",
                "Webinars",
                "Case Studies",
              ].map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-sm text-muted transition-colors hover:text-foreground"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">Company</h4>
            <ul className="mt-4 space-y-2.5">
              {["About Us", "Careers", "Contact", "Partners"].map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-sm text-muted transition-colors hover:text-foreground"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <div className="flex items-center gap-2 text-sm text-muted">
                <Phone size={14} />
                <span>+91 80 4567 8900</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-muted">
                <Mail size={14} />
                <span>hello@tp.report</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-xs text-muted">
            &copy; {new Date().getFullYear()} TP Report. All rights reserved.
          </p>
          <div className="flex gap-6">
            {["Privacy Policy", "Terms of Service", "Cookie Policy"].map(
              (link) => (
                <a
                  key={link}
                  href="#"
                  className="text-xs text-muted transition-colors hover:text-foreground"
                >
                  {link}
                </a>
              )
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <ProblemSection />
        <FeaturesSection />
        <HowItWorksSection />
        <ComparisonSection />
        <PricingSection />
        <FAQSection />
        <CTABanner />
      </main>
      <Footer />
    </>
  );
}
