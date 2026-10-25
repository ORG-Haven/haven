import Link from "next/link";
import { SIGN_IN_URL, SIGN_UP_URL, CONSOLE_URL } from "@/lib/links";
import { ThemeToggle } from "./ThemeToggle";
import { HarborLogo, Icon } from "./ui";

type Section = "home" | "pricing" | "docs";

const LINKS: { href: string; label: string; section?: Section }[] = [
  { href: "/#product", label: "Product" },
  { href: "/#agents", label: "Agents" },
  { href: "/pricing", label: "Pricing", section: "pricing" },
  { href: "/docs/quickstart", label: "Docs", section: "docs" },
];

/** Top bar shared by every page. The docs variant adds search and spans the full width. */
export function SiteHeader({ current }: { current: Section }) {
  const docs = current === "docs";
  return (
    <header className="hdr">
      <nav className={`wrap hdr-in${docs ? " full" : ""}`} aria-label="Main">
        <div className="hdr-l">
          <Link className="brand" href="/">
            <HarborLogo size={30} />
            Haven{docs && <span className="v" style={{ fontWeight: 400 }}>Docs</span>}
          </Link>
          <div className="hdr-links">
            {LINKS.map((l) => (
              <Link key={l.href} className="navlink" href={l.href} aria-current={l.section === current ? "page" : undefined}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        {docs && (
          <label className="search">
            <Icon name="search" />
            <span className="sr">Search the docs</span>
            <input type="search" placeholder="Search the docs" />
            <span className="kbd">⌘K</span>
          </label>
        )}
        <div className="hdr-r">
          <ThemeToggle />
          <a className="btn textb" href={SIGN_IN_URL}>Sign in</a>
          {docs ? (
            <a className="btn filled" href={CONSOLE_URL}>Open console</a>
          ) : (
            <a className="btn filled" href={SIGN_UP_URL}>Get started</a>
          )}
        </div>
      </nav>
    </header>
  );
}
