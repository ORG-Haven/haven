import Link from "next/link";
import { HarborLogo } from "./ui";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  { title: "Product", links: [{ href: "/#product", label: "Features" }, { href: "/pricing", label: "Pricing" }, { href: "/#agents", label: "Agents" }] },
  { title: "Docs", links: [{ href: "/docs/quickstart", label: "Quickstart" }, { href: "/docs/quickstart#install", label: "Install on your cluster" }, { href: "/docs/quickstart#project", label: "hvn.yaml" }] },
  // TODO: point these at real pages once they exist.
  { title: "Company", links: [{ href: "#", label: "About" }, { href: "#", label: "Blog" }, { href: "#", label: "Contact" }] },
  { title: "Legal", links: [{ href: "#", label: "Privacy" }, { href: "#", label: "Terms" }, { href: "#", label: "Security" }] },
];

export function SiteFooter() {
  return (
    <footer className="foot">
      <div className="wrap foot-cols">
        <div className="stack" style={{ flex: "2 1 260px", gap: 12 }}>
          <span className="brand" style={{ fontSize: 20 }}><HarborLogo size={26} />Haven</span>
          <span className="v" style={{ maxWidth: 280 }}>Deploy your apps to a cluster you own — no Kubernetes required.</span>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title} className="foot-col">
            <span style={{ fontWeight: 500 }}>{col.title}</span>
            {col.links.map((l) => <Link key={l.label} href={l.href}>{l.label}</Link>)}
          </div>
        ))}
      </div>
      <div className="wrap foot-bar">
        <span>© 2026 Haven</span>
        <span>Made for teams who’d rather ship than run a platform.</span>
      </div>
    </footer>
  );
}
