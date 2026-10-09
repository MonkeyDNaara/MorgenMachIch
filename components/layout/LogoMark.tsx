import { Sunrise } from "lucide-react";

/** The app's mark (#235): a sunrise ("Morgen") on the amber primary, with the gloss shadow. */
export default function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-[10px] bg-primary text-primary-content shadow-gloss"
      style={{ width: size, height: size }}
    >
      <Sunrise size={Math.round(size * 0.56)} strokeWidth={2.2} />
    </span>
  );
}
