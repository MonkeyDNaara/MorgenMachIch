import { ExternalLink } from "lucide-react";
import packageJson from "@/package.json";

const REPO_URL = "https://github.com/MonkeyDNaara/MorgenMachIch";

/**
 * Small "about" card on /settings (#161). A server component on purpose:
 * it reads the version straight from package.json at build time, so the
 * whole package.json never ships in the client bundle.
 */
export default function AboutCard() {
  return (
    <section className="flex flex-col gap-3 rounded-box bg-base-200 p-4 shadow-raised">
      <h2 className="text-sm font-semibold">About</h2>
      <div className="flex flex-col gap-1 text-sm text-base-content/70">
        <p>
          <span className="font-medium text-base-content">MorgenMachIch</span>{" "}
          <span className="font-mono text-xs text-base-content/50">v{packageJson.version}</span>
        </p>
        <p className="text-xs text-base-content/50">
          A local-first to-do app — your data stays in this browser unless you export it.
        </p>
      </div>
      <a
        href={REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 self-start text-xs text-primary hover:underline"
      >
        Source on GitHub
        <ExternalLink size={12} />
      </a>
    </section>
  );
}
