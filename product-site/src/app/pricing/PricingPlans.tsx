"use client";

import { useState } from "react";
import { Icon } from "@/components/ui";
import { CONTACT_URL, SIGN_UP_URL } from "@/lib/links";

// TODO: replace the placeholders once pricing is decided.
const TEAM_PRICE = { monthly: "[PRICE]", yearly: "[YEARLY PRICE]" };
const YEARLY_SAVING = "[SAVING]";

const PLANS = [
  {
    name: "Hobby",
    blurb: "For side projects and trying Haven out.",
    cta: { label: "Start free", href: SIGN_UP_URL, variant: "tonal" },
    features: ["1 connected cluster", "[N] projects", "dev, staging and prod environments", "Custom domains with automatic TLS", "hvn plugin for Claude Code", "Community support"],
  },
  {
    name: "Team",
    blurb: "For teams shipping to production together.",
    cta: { label: "Start a 14-day trial", href: SIGN_UP_URL, variant: "filled" },
    features: ["Everything in Hobby, plus", "Unlimited clusters and projects", "Manual promotion gates and approvals", "Agent access with per-project scopes", "Observability with fix prompts", "Email support"],
  },
  {
    name: "Enterprise",
    blurb: "For organisations with compliance needs.",
    cta: { label: "Talk to us", href: CONTACT_URL, variant: "outlined" },
    features: ["Everything in Team, plus", "SAML SSO and SCIM", "Audit log of every promotion", "Air-gapped and on-prem installs", "Support SLA and a named engineer"],
  },
] as const;

/** Billing period switch and the three plan cards it prices. */
export function PricingPlans() {
  const [yearly, setYearly] = useState(false);
  return (
    <section className="wrap plans">
      <div className="seg" role="group" aria-label="Billing period">
        <button aria-pressed={!yearly} onClick={() => setYearly(false)}>Monthly</button>
        <button aria-pressed={yearly} onClick={() => setYearly(true)}>Yearly<span className="tag t-ok">{YEARLY_SAVING}</span></button>
      </div>
      <div className="grid">
        {PLANS.map((p) => {
          const team = p.name === "Team";
          return (
            <div key={p.name} className={`card-o plan${team ? " hl" : ""}`}>
              <div className="stack" style={{ gap: 8 }}>
                <span className="plan-name">
                  {p.name}
                  {team && <span className="tag t-p"><Icon name="star" />Most teams</span>}
                </span>
                <span className="v">{p.blurb}</span>
              </div>
              <div className="plan-price">
                {p.name === "Hobby" && <><b>Free</b><span className="v">forever</span></>}
                {team && <><b>{yearly ? TEAM_PRICE.yearly : TEAM_PRICE.monthly}</b><span className="v">per seat / month{yearly && ", billed yearly"}</span></>}
                {p.name === "Enterprise" && <b>Custom</b>}
              </div>
              <a className={`btn lg ${p.cta.variant}`} href={p.cta.href}>{p.cta.label}</a>
              <ul className="feat">
                {p.features.map((f) => <li key={f}><Icon name="check" />{f}</li>)}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
