import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/site/LegalPage";
import { PRIVACY_UPDATED, PROVIDER } from "@/lib/site/legal";

export const metadata: Metadata = {
  title: "Datenschutz",
  robots: { index: false },
};

/**
 * `/datenschutz` (#378): short privacy notice for the app as it is today —
 * local data only, hosting logs at Render, no cookies, no tracking. The
 * full policy for login and sync follows with #330.
 */
export default function DatenschutzPage() {
  return (
    <LegalPage
      title="Datenschutzerklärung"
      intro="Privacy notice: your tasks stay in your browser; the host keeps standard server logs. No cookies, no tracking."
    >
      <h2>Verantwortlicher</h2>
      <p>
        {PROVIDER.name}, {PROVIDER.street}, {PROVIDER.city}, {PROVIDER.country} — E-Mail:{" "}
        <a href={`mailto:${PROVIDER.email}`}>{PROVIDER.email}</a> (siehe{" "}
        <Link href="/impressum">Impressum</Link>).
      </p>

      <h2>Deine Daten bleiben in deinem Browser</h2>
      <p>
        Aufgaben, Labels, Wiederholungen und Einstellungen speichert die App ausschließlich lokal in
        deinem Browser (IndexedDB und localStorage). Sie werden nicht an mich oder Dritte
        übertragen. Es gibt kein Konto und keine Anmeldung. Du kannst die Daten jederzeit in den
        Einstellungen exportieren oder löschen, oder über die Website-Daten deines Browsers
        entfernen.
      </p>
      <p>
        Damit die App offline funktioniert, legt ein Service Worker die Programmdateien der App im
        Browser-Cache ab. Dabei werden keine personenbezogenen Daten gespeichert.
      </p>

      <h2>Hosting und Server-Logs</h2>
      <p>
        Die Website wird bei Render Services, Inc. (USA) gehostet. Beim Aufruf einer Seite
        verarbeitet Render technisch notwendige Daten in Server-Logs, insbesondere IP-Adresse,
        Zeitpunkt, aufgerufene Adresse und Browser-Kennung (User-Agent). Rechtsgrundlage ist Art. 6
        Abs. 1 lit. f DSGVO — das berechtigte Interesse an einem sicheren und stabilen Betrieb der
        Website. Mit Render besteht ein Auftragsverarbeitungsvertrag (Data Processing Addendum);
        Render ist unter dem EU-US Data Privacy Framework zertifiziert.
      </p>

      <h2>Keine Cookies, kein Tracking</h2>
      <p>
        Die Website setzt keine Cookies und nutzt keine Analyse- oder Tracking-Dienste. Schriftarten
        werden von dieser Website selbst ausgeliefert, nicht von Google. Links zu GitHub und
        LinkedIn sind einfache Links: Erst wenn du sie anklickst, gelten die Datenschutzregeln
        dieser Anbieter.
      </p>

      <h2>Deine Rechte</h2>
      <p>Du hast das Recht auf</p>
      <ul>
        <li>Auskunft (Art. 15 DSGVO),</li>
        <li>Berichtigung (Art. 16 DSGVO),</li>
        <li>Löschung (Art. 17 DSGVO),</li>
        <li>Einschränkung der Verarbeitung (Art. 18 DSGVO),</li>
        <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO).</li>
      </ul>
      <p>
        Wende dich dafür an die oben genannte E-Mail-Adresse. Außerdem kannst du dich bei einer
        Datenschutz-Aufsichtsbehörde beschweren, zum Beispiel beim Landesbeauftragten für
        Datenschutz und Informationsfreiheit Mecklenburg-Vorpommern.
      </p>

      <p className="text-sm text-subtle">Stand: {PRIVACY_UPDATED}</p>
    </LegalPage>
  );
}
