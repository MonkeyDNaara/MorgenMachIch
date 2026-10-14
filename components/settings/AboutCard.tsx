import Link from "next/link";
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
    <section className="flex flex-col gap-3 surface-panel p-4">
      <h2 className="font-mono text-eyebrow text-muted uppercase">About</h2>
      <div className="flex flex-col gap-1 text-sm text-base-content/70">
        <p>
          <span className="font-medium text-base-content">MorgenMachIch</span>{" "}
          <span className="font-mono text-xs text-subtle">v{packageJson.version}</span>
        </p>
        <p className="text-xs text-subtle">
          A local-first to-do app — your data stays in this browser unless you export it.
        </p>
      </div>
      <Link href="/?landing" className="self-start text-xs text-accent hover:underline">
        About this project
      </Link>
      <a
        href={REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 self-start text-xs text-accent hover:underline"
      >
        Source on GitHub
        <ExternalLink size={12} />
      </a>
    </section>
  );
}
