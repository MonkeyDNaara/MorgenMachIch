import BrowserFrame from "@/features/site/components/BrowserFrame";
import Screenshot from "@/features/site/components/Screenshot";

const ALT = "The Today view of MorgenMachIch, filled with the sample data";

/**
 * The hero's look at the app (#376): the real /today screenshot in the
 * theme the page is shown in. Both images are in the markup; CSS hides
 * one (theme-dark-only / theme-light-only in globals.css), and a hidden
 * lazy image is never downloaded.
 */
export default function HeroShot() {
  return (
    <BrowserFrame path="/today">
      <Screenshot view="today" theme="dark" alt={ALT} className="theme-dark-only" />
      <Screenshot view="today" theme="light" alt={ALT} className="theme-light-only" />
    </BrowserFrame>
  );
}
