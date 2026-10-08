"use client";

import { createContext, use, useActionState, useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { IDLE, type ActionState } from "@/lib/actions";
import { cn } from "@/lib/utils";

import { buttonClass } from "./button";

const FormStateContext = createContext<ActionState>(IDLE);

type ServerAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * A <form> wired to a Server Action with useActionState.
 * Fields inside it (<Field name="...">) show the action's validation errors automatically.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  hideSuccessMessage = false,
  ...props
}: Omit<ComponentProps<"form">, "action"> & {
  action: ServerAction;
  resetOnSuccess?: boolean;
  hideSuccessMessage?: boolean;
}) {
  const [state, formAction] = useActionState(action, IDLE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state.status === "success") formRef.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <FormStateContext value={state}>
      <form ref={formRef} action={formAction} className={cn("flex flex-col gap-4", className)} noValidate {...props}>
        {state.status === "error" && state.message ? (
          <p role="alert" className="rounded-lg border border-rose-600/40 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {state.message}
          </p>
        ) : null}
        {state.status === "success" && state.message && !hideSuccessMessage ? (
          <p role="status" className="rounded-lg border border-sage-600/40 bg-sage-50 px-3 py-2 text-sm text-sage-800">
            {state.message}
          </p>
        ) : null}
        {children}
      </form>
    </FormStateContext>
  );
}

export function useFieldError(name: string): string | undefined {
  const state = use(FormStateContext);
  return state.fieldErrors?.[name]?.[0];
}

const controlClass =
  "w-full rounded-lg border border-line bg-white px-3 text-[15px] text-ink-800 placeholder:text-ink-300 focus:border-ink-500 aria-[invalid=true]:border-rose-600";

/** Label + control + hint + error. Pass the control as children. */
export function Field({
  label,
  name,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  name: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const error = useFieldError(name);
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={name} className="text-sm font-bold text-ink-700">
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-ink-400">{hint}</p> : null}
      {error ? (
        <p id={`${name}-error`} className="text-xs font-bold text-rose-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ name, className, ...props }: ComponentProps<"input"> & { name: string }) {
  const error = useFieldError(name);
  return (
    <input
      id={props.id ?? name}
      name={name}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${name}-error` : undefined}
      className={cn(controlClass, "h-11", className)}
      {...props}
    />
  );
}

export function Textarea({ name, className, rows = 3, ...props }: ComponentProps<"textarea"> & { name: string }) {
  const error = useFieldError(name);
  return (
    <textarea
      id={props.id ?? name}
      name={name}
      rows={rows}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${name}-error` : undefined}
      className={cn(controlClass, "py-2 leading-6", className)}
      {...props}
    />
  );
}

export function Select({ name, className, children, ...props }: ComponentProps<"select"> & { name: string }) {
  const error = useFieldError(name);
  return (
    <select
      id={props.id ?? name}
      name={name}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${name}-error` : undefined}
      className={cn(controlClass, "h-11", className)}
      {...props}
    >
      {children}
    </select>
  );
}

export function Checkbox({ name, label, ...props }: ComponentProps<"input"> & { name: string; label: string }) {
  return (
    <label className="flex min-h-11 items-center gap-2 text-[15px]">
      <input type="checkbox" name={name} className="h-5 w-5 accent-ink-600" {...props} />
      {label}
    </label>
  );
}

export function SubmitButton({
  children,
  pendingText = "Saving…",
  variant = "primary",
  size = "md",
  className,
  disabled,
}: {
  children: ReactNode;
  disabled?: boolean;
  pendingText?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className={buttonClass(variant, size, className)}>
      {pending ? pendingText : children}
    </button>
  );
}
