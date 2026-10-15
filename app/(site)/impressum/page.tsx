import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/site/LegalPage";
import { PROVIDER } from "@/lib/site/legal";

export const metadata: Metadata = {
  title: "Impressum",
  robots: { index: false },
};

/** `/impressum` (#378): provider details required by § 5 DDG, in German. */
export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum" intro="Legal notice required for websites run from Germany.">
      <h2>Angaben gemäß § 5 DDG</h2>
      <address className="not-italic">
        {PROVIDER.name}
        <br />
        {PROVIDER.street}
        <br />
        {PROVIDER.city}
        <br />
        {PROVIDER.country}
      </address>

      <h2>Kontakt</h2>
      <p>
        E-Mail: <a href={`mailto:${PROVIDER.email}`}>{PROVIDER.email}</a>
      </p>

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>{PROVIDER.name}, Anschrift wie oben.</p>

      <h2>Hinweis</h2>
      <p>
        MorgenMachIch ist ein privates, nicht-kommerzielles Portfolio-Projekt. Externe Links (z. B.
        GitHub, LinkedIn) führen zu Inhalten Dritter, für die deren Anbieter verantwortlich sind.
        Wie mit Daten umgegangen wird, steht in der{" "}
        <Link href="/datenschutz">Datenschutzerklärung</Link>.
      </p>
    </LegalPage>
  );
}
