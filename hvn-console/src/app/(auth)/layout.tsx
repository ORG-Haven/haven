// Sign-in and account pages: no drawer or top bar, just the page.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <div className="app">{children}</div>;
}
