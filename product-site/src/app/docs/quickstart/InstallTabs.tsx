"use client";

import { useState } from "react";
import { CopyButton } from "@/components/CopyButton";

// TODO: swap [CHART_REPO] for the published chart location (deployment/haven-platform).
const HELM = `helm install haven [CHART_REPO]/haven-platform \\
  --namespace haven --create-namespace`;
const PLUGIN = "claude plugin install hvn";

/** Install step with a Helm tab and a Claude Code tab. */
export function InstallTabs() {
  const [tab, setTab] = useState<"helm" | "agent">("helm");
  return (
    <div className="code">
      <div className="tabs" role="tablist" aria-label="Install method">
        <button role="tab" id="tab-helm" aria-controls="panel-install" aria-selected={tab === "helm"} onClick={() => setTab("helm")}>Helm</button>
        <button role="tab" id="tab-agent" aria-controls="panel-install" aria-selected={tab === "agent"} onClick={() => setTab("agent")}>With Claude Code</button>
        <span className="spacer" />
        <CopyButton text={tab === "helm" ? HELM : PLUGIN} small />
      </div>
      <div role="tabpanel" id="panel-install" aria-labelledby={tab === "helm" ? "tab-helm" : "tab-agent"}>
        {tab === "helm" ? (
          <pre>
            <span className="c"># Install the Haven platform into its own namespace</span>{"\n"}
            {HELM}
          </pre>
        ) : (
          <pre>
            <span className="c">$</span> {PLUGIN}{"\n"}
            <span className="c">›</span> install haven on my current kube context{"\n\n"}
            <span className="k">⏺ hvn</span> cluster install{"\n"}
            {"  "}<span className="s">✓</span> haven-platform installed in namespace haven{"\n"}
            {"  "}<span className="s">✓</span> cluster linked to your account
          </pre>
        )}
      </div>
    </div>
  );
}
