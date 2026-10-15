import Image from "next/image";
import { Check, CircleDashed } from "lucide-react";
import {
  CAREER,
  CERTIFICATES,
  PROFILE,
  SITE_LINKS,
  SKILL_GROUPS,
} from "@/features/site/lib/content";

/**
 * "Built by" (#375), for employers: photo, availability, career path from
 * the CV, skills (the ones used in this app marked) and certificates.
 * Contact goes through LinkedIn — no email, phone or address on the page.
 */
export default function BuiltBy() {
  return (
    <section id="about" aria-labelledby="about-heading" className="scroll-mt-20 pb-16 sm:pb-20">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="site-glow grid gap-8 surface-panel p-6 sm:p-9 lg:grid-cols-[16rem_1fr] lg:gap-10">
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-[2rem] bg-[conic-gradient(from_210deg,var(--color-primary),var(--color-accent),var(--color-primary))] p-1.5 shadow-overlay">
              <Image
                src={PROFILE.photo}
                alt={PROFILE.name}
                width={220}
                height={220}
                unoptimized
                className="size-40 rounded-[1.75rem] bg-sunken object-cover sm:size-[13.75rem]"
              />
            </div>
            <p className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-base-300 px-3 py-1.5 font-mono text-meta shadow-raised-sm">
              <span
                className="size-2 rounded-full bg-success motion-safe:animate-pulse"
                aria-hidden
              />
              {PROFILE.badge}
            </p>
            <p className="-mt-2 text-center font-mono text-[11px] text-subtle">
              {PROFILE.location}
            </p>
          </div>

          <div className="min-w-0">
            <p className="font-mono text-eyebrow text-muted uppercase">Built by</p>
            <h2
              id="about-heading"
              className="mt-1.5 text-[clamp(2rem,4vw,2.75rem)] leading-tight font-bold tracking-tight"
            >
              {PROFILE.name}
            </h2>
            <p className="font-mono text-meta text-accent">{PROFILE.role}</p>
            <p className="mt-4 mb-6 max-w-2xl text-muted">{PROFILE.about}</p>

            <h3 className="sr-only">Career path</h3>
            <ol className="mb-6 grid gap-2.5 sm:grid-cols-2">
              {CAREER.map((step) => (
                <li
                  key={step.years}
                  className={`flex gap-3 rounded-xl border p-3.5 surface-sunken ${
                    step.current ? "border-primary/40" : "border-line"
                  }`}
                >
                  <span
                    className={`pt-0.5 font-mono text-[11px] whitespace-nowrap ${
                      step.current ? "text-primary" : "text-faint"
                    }`}
                  >
                    {step.years}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{step.title}</p>
                    <p className="text-meta text-muted">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mb-2.5 flex items-center justify-between">
              <h3 className="font-mono text-eyebrow text-muted uppercase">Skills</h3>
              <p className="inline-flex items-center gap-1.5 font-mono text-[11px] text-subtle">
                <span className="size-1.5 rounded-full bg-accent" aria-hidden />
                used in this app
              </p>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {SKILL_GROUPS.map((group) => (
                <div key={group.name} className="rounded-xl border border-line p-3 surface-sunken">
                  <div className="mb-2.5 flex items-center gap-2">
                    <span className="grid size-6 place-items-center rounded-md bg-base-300 text-accent shadow-raised-sm">
                      <group.icon size={14} strokeWidth={1.8} aria-hidden />
                    </span>
                    <h4 className="text-sm font-semibold">{group.name}</h4>
                    <span className="ml-auto font-mono text-[11px] text-faint">
                      {String(group.skills.length).padStart(2, "0")}
                    </span>
                  </div>
                  <ul className="flex flex-wrap gap-1.5">
                    {group.skills.map((skill) => (
                      <li
                        key={skill.name}
                        className={`inline-flex items-center gap-1.5 rounded-lg border bg-base-300 px-2.5 py-1 text-[12.5px] shadow-raised-sm ${
                          skill.usedHere ? "border-accent/40" : "border-line text-base-content/80"
                        }`}
                      >
                        {skill.usedHere && (
                          <span className="size-1.5 rounded-full bg-accent" aria-hidden />
                        )}
                        {skill.name}
                        {skill.usedHere && <span className="sr-only"> (used in this app)</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <h3 className="mr-1 font-mono text-eyebrow text-muted uppercase">Certificates</h3>
              {CERTIFICATES.map((cert) => (
                <span
                  key={cert.name}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-meta ${
                    cert.done
                      ? "border border-accent/50 bg-accent/10 text-accent"
                      : "border border-dashed border-line-strong text-muted"
                  }`}
                >
                  {cert.done ? (
                    <Check size={13} aria-hidden />
                  ) : (
                    <CircleDashed size={13} aria-hidden />
                  )}
                  {cert.name}
                  <span className="text-[10.5px] opacity-75">{cert.note}</span>
                </span>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap gap-2.5">
              <a
                href={SITE_LINKS.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary cursor-pointer rounded-full px-5 shadow-gloss"
              >
                Connect on LinkedIn
              </a>
              <a
                href={SITE_LINKS.github}
                target="_blank"
                rel="noopener noreferrer"
                className="btn cursor-pointer rounded-full border-line-strong px-5 surface-raised"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
