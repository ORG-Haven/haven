import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Icon } from "@/components/ui";
import { CONTACT_URL, SIGN_UP_URL } from "@/lib/links";
import { PricingPlans } from "./PricingPlans";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Pay for Haven, not for compute. Your apps run on your own cloud account, billed by your provider at cost.",
};

// true = included, false = not included, string = shown as written.
type Cell = boolean | string;
const MATRIX: { group: string; rows: [string, Cell, Cell, Cell][] }[] = [
  {
    group: "Deploy",
    rows: [
      ["Connected clusters", "1", "Unlimited", "Unlimited"],
      ["Projects", "[N]", "Unlimited", "Unlimited"],
      ["Push-to-deploy from GitHub", true, true, true],
      ["Environments per project", "3", "Unlimited", "Unlimited"],
      ["Redeploy and rollback", true, true, true],
    ],
  },
  {
    group: "Promote",
    rows: [
      ["Automatic promotion gates", true, true, true],
      ["Manual gates with accept and reject", false, true, true],
      ["Custom domains and automatic TLS", true, true, true],
    ],
  },
  {
    group: "Agents and observability",
    rows: [
      ["hvn plugin for Claude Code", true, true, true],
      ["Scoped agent access per project", false, true, true],
      ["Plain-language issues and fix prompts", "Basic", true, true],
    ],
  },
  {
    group: "Security and support",
    rows: [
      ["SAML SSO and SCIM", false, false, true],
      ["Audit log", false, "[N] days", "Unlimited"],
      ["Support", "Community", "Email", "SLA, named engineer"],
    ],
  },
];

const FAQ = [
  { q: "Do I need to know Kubernetes?", a: "No. You install Haven on a cluster once — most providers let you create one in a few clicks — and from then on you work with projects, environments and releases." },
  { q: "What counts as a seat?", a: "Anyone on your team who can sign in to the console. Coding agents you connect don’t take a seat." },
  { q: "Can I bring my own domain?", a: "Yes, on every plan. Add the DNS records Haven shows you and certificates are issued and renewed automatically." },
  { q: "What happens to my apps if I stop paying?", a: "They keep running. Everything lives on your cluster, so you can move to the Hobby plan or remove Haven without a migration." },
  { q: "Do you offer discounts for open source or education?", a: "[POLICY] — tell us about your project and we’ll get back to you." },
];

function MatrixCell({ value }: { value: Cell }) {
  if (value === true) return <><Icon name="check" /><span className="sr">Included</span></>;
  if (value === false) return <><Icon name="remove" className="no" /><span className="sr">Not included</span></>;
  return <>{value}</>;
}

export default function PricingPage() {
  return (
    <>
      <SiteHeader current="pricing" />
      <main>
        <section className="wrap p-hero" style={{ paddingBottom: 0 }}>
          <span className="eyebrow">Pricing</span>
          <h1 className="display-s" style={{ maxWidth: 820 }}>Pay for Haven, not for compute.</h1>
          <p className="lead-l">Your apps run on servers in your own cloud account, billed by your provider at cost. Haven is one simple plan on top.</p>
        </section>

        <PricingPlans />

        <section className="wrap" style={{ paddingBottom: 96 }}>
          <div className="card-f note">
            <span className="feat-ic"><Icon name="receipt_long" /></span>
            <div>
              <span className="tm">Where do my servers get billed?</span>
              <span className="v bl">By your cloud provider, directly. Haven never resells compute, bandwidth or storage, so there’s no markup and no surprise usage bill from us.</span>
            </div>
            <Link className="btn outlined" href="/docs/quickstart#install">How Haven runs on your cluster</Link>
          </div>
        </section>

        <section className="wrap stack" style={{ gap: 32, paddingBottom: 112 }}>
          <h2 className="hm">Compare plans</h2>
          <div className="card-o scroll">
            <table className="mx">
              <thead>
                <tr>
                  <th scope="col" style={{ width: "40%" }}><span className="v">Feature</span></th>
                  <th scope="col">Hobby</th>
                  <th scope="col" style={{ color: "var(--pri)" }}>Team</th>
                  <th scope="col">Enterprise</th>
                </tr>
              </thead>
              {MATRIX.map((g) => (
                <tbody key={g.group}>
                  <tr className="grp"><th scope="colgroup" colSpan={4}>{g.group}</th></tr>
                  {g.rows.map(([label, ...cells]) => (
                    <tr key={label}>
                      <td>{label}</td>
                      {cells.map((c, i) => <td key={i}><MatrixCell value={c} /></td>)}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        </section>

        <section className="band">
          <div className="wrap faq-wrap">
            <div>
              <h2 className="hm">Questions</h2>
              <p className="bl v">Can’t find your answer? <a href={CONTACT_URL}>Talk to us</a>.</p>
            </div>
            <div className="card-o faq">
              {FAQ.map((f, i) => (
                <details key={f.q} open={i === 0}>
                  <summary>{f.q}<Icon name="expand_more" /></summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="wrap center-cta">
          <h2 className="hs">Ready to set sail?</h2>
          <p className="lead">Connect a repo and ship your first release today.</p>
          <div className="btn-row">
            <a className="btn filled lg" href={SIGN_UP_URL}><Icon name="rocket_launch" />Start deploying</a>
            <Link className="btn outlined lg" href="/docs/quickstart">Read the quickstart</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
