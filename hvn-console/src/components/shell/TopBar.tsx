"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/ui";
import { useSession, useSignOut } from "@/lib/queries";
import { setTheme, useTheme } from "@/lib/theme";
import { parseConsolePath, projectHref } from "./routes";

export function RoutedTopBar() {
  return <TopBar pathname={usePathname()} />;
}

export function TopBar({ pathname }: { pathname: string | null }) {
  const theme = useTheme();
  const route = parseConsolePath(pathname);
  const router = useRouter();
  const signOut = useSignOut();
  const user = useSession().data?.user;

  return (
    <header className="topbar">
      <label className="search">
        <Icon name="search" />
        <span className="sr">Search</span>
        <input type="search" placeholder="Search projects, deploys or hostnames" />
        <span className="lm v">⌘K</span>
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {route.page !== "new" && (
          <Link className="btn filled" href="/projects/new">
            <Icon name="add" />
            Create
          </Link>
        )}
        <a className="ib" href="https://github.com" aria-label="Help">
          <Icon name="help" />
        </a>
        <button
          className="ib"
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Icon name={theme === "dark" ? "light_mode" : "dark_mode"} />
        </button>
        {route.page === "project" && (
          <Link className="btn tonal" href={`${projectHref(route.projectId, "settings")}#agents`}>
            <Icon name="terminal" />
            Agent
          </Link>
        )}
        <button
          className="ib"
          aria-label="Sign out"
          title="Sign out"
          disabled={signOut.isPending}
          onClick={() => signOut.mutate(undefined, { onSuccess: () => router.push("/signin") })}
        >
          <Icon name="logout" />
        </button>
        <button className="ib" aria-label={user ? `Account menu for ${user.name}` : "Account menu"} title={user?.email}>
          <span className="avatar">{initials(user?.name)}</span>
        </button>
      </div>
    </header>
  );
}

function initials(name?: string) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
