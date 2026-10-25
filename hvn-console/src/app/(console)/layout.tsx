import { Suspense } from "react";
import { NavDrawer, RoutedNavDrawer } from "@/components/shell/NavDrawer";
import { RoutedTopBar, TopBar } from "@/components/shell/TopBar";

// The drawer and top bar stay mounted across navigations; only the page area swaps.
export default function ConsoleLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="app">
      <Suspense fallback={<NavDrawer pathname={null} />}>
        <RoutedNavDrawer />
      </Suspense>
      <div className="content">
        <Suspense fallback={<TopBar pathname={null} />}>
          <RoutedTopBar />
        </Suspense>
        {children}
      </div>
    </div>
  );
}
