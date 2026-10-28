import TextField from "@/features/auth/components/TextField";
import { cleanCode } from "@/features/auth/lib/authInput";

/**
 * The 6-digit code from the email (#445): one field, large mono digits.
 * `autocomplete="one-time-code"` lets iOS and Android offer the code from
 * the mail; paste works ("483 921" too — no maxLength, cleanCode keeps six
 * digits); non-digits are dropped as you type.
 */
export default function CodeField({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}) {
  return (
    <TextField
      label="Code"
      name="code"
      required
      autoComplete="one-time-code"
      inputMode="numeric"
      pattern="[0-9]{6}"
      autoFocus
      value={value}
      invalid={invalid}
      onChange={(event) => onChange(cleanCode(event.target.value))}
      inputClassName="h-14 text-center font-mono text-2xl tracking-[0.5em] indent-[0.5em]"
    />
  );
}
