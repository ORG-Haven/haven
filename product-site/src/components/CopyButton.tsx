"use client";

import { useEffect, useState } from "react";
import { Icon } from "./ui";

export function CopyButton({ text, small }: { text: string; small?: boolean }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <button
      className={`ib${small ? " s" : ""}`}
      aria-label={copied ? "Copied" : "Copy to clipboard"}
      onClick={() => navigator.clipboard.writeText(text).then(() => setCopied(true), () => {})}
    >
      <Icon name={copied ? "check" : "content_copy"} />
    </button>
  );
}
