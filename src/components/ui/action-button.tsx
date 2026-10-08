"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { IDLE, type ActionState } from "@/lib/actions";

import { buttonClass } from "./button";

function Btn({ label, variant }: { label: string; variant: "primary" | "secondary" | "danger" | "ghost" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass(variant, "sm")}>
      {pending ? "Working…" : label}
    </button>
  );
}

/** One-click action (e.g. "End assignment") with hidden fields and an inline result message. */
export function ActionButton({
  action,
  fields,
  label,
  variant = "secondary",
  confirm,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  fields: Record<string, string>;
  label: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  confirm?: string;
}) {
  const [state, formAction] = useActionState(action, IDLE);
  return (
    <form
      action={formAction}
      className="inline-flex flex-col items-start gap-1"
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <Btn label={label} variant={variant} />
      {state.message ? (
        <span role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "text-xs text-rose-800" : "text-xs text-sage-800"}>
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
