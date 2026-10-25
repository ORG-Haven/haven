"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ActionButton, Icon } from "@/components/ui";
import { errorMessage } from "@/lib/format";
import { useResendVerification } from "@/lib/queries";
import { AuthBrand } from "./parts";

export function VerifyEmailView() {
  const email = useSearchParams().get("email") ?? "";
  const resend = useResendVerification();

  return (
    <main className="auth-center">
      <div className="auth-col">
        <AuthBrand className="" />
        <div className="auth-hero"><Icon name="mail" size={30} /></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h1 className="auth-title">Verify your email</h1>
          <p className="v" style={{ margin: 0 }}>
            We sent a verification link{email ? " to the address below" : ""}. Open it to finish creating your account,
            then you can set up your first project.
          </p>
        </div>
        {email && (
          <div className="auth-chip">
            <Icon name="person" className="v" />
            <span style={{ overflowWrap: "anywhere" }}>{email}</span>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <ActionButton
            type="button"
            variant="outlined"
            className="social"
            pending={resend.isPending}
            disabled={!email || resend.isSuccess}
            onClick={() => resend.mutate(email)}
          >
            Resend email
          </ActionButton>
          {resend.isSuccess && (
            <span role="status" className="bs" style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--ok)" }}>
              <Icon name="check" size={16} />
              Sent again. It can take a minute to arrive — check spam too.
            </span>
          )}
          {resend.isError && <span className="err-text bs">{errorMessage(resend.error)}</span>}
        </div>
        <p className="v" style={{ margin: 0 }}>
          Wrong address? <Link href="/signup">Use a different email</Link>
        </p>
        <p className="v" style={{ margin: 0 }}>
          Already verified? <Link href="/signin">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
