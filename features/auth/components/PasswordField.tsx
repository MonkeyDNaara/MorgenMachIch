import TextField from "@/features/auth/components/TextField";
import { MIN_PASSWORD_LENGTH, passwordStrength } from "@/features/auth/lib/password";

type PasswordFieldProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  /** "new-password" shows the rule and the strength bar. */
  autoComplete: "current-password" | "new-password";
  invalid?: boolean;
};

/**
 * Password input; for a new password with the 12-character rule and a strength
 * bar (#445). The rule is checked by the form (passwordProblem) with our own
 * message, not by the browser's `minLength` bubble.
 */
export default function PasswordField({
  label = "Password",
  value,
  onChange,
  autoComplete,
  invalid,
}: PasswordFieldProps) {
  const isNew = autoComplete === "new-password";
  const strength = passwordStrength(value);
  return (
    <TextField
      label={label}
      type="password"
      name="password"
      required
      autoComplete={autoComplete}
      value={value}
      invalid={invalid}
      onChange={(event) => onChange(event.target.value)}
      below={
        isNew ? (
          <div className="flex flex-col gap-1.5">
            <div aria-hidden className="flex gap-1">
              {[1, 2, 3, 4].map((level) => (
                <span
                  key={level}
                  className={`h-1 flex-1 rounded-full ${strength >= level ? "bg-accent" : "bg-track"}`}
                />
              ))}
            </div>
            <span className="text-xs text-subtle">At least {MIN_PASSWORD_LENGTH} characters.</span>
          </div>
        ) : undefined
      }
    />
  );
}
