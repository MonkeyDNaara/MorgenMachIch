import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { FIELD_FOCUS } from "@/lib/styles/fieldFocus";
import { FIELD_LABEL } from "@/lib/styles/fieldLabel";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  /** Line under the field: a hint, or the strength bar. */
  below?: ReactNode;
  invalid?: boolean;
  inputClassName?: string;
};

/** Labelled input in the app's field style (#445). */
export default function TextField({
  label,
  below,
  invalid = false,
  inputClassName = "",
  ...input
}: TextFieldProps) {
  const id = useId();
  const belowId = `${id}-below`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </label>
      <input
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={below ? belowId : undefined}
        className={`input w-full ${FIELD_FOCUS} ${invalid ? "[--input-color:var(--color-error)]" : ""} ${inputClassName}`}
        {...input}
      />
      {below && <div id={belowId}>{below}</div>}
    </div>
  );
}
