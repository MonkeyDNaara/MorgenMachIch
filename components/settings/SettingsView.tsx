import DataSection from "@/components/settings/DataSection";
import ImportSection from "@/components/settings/ImportSection";
import DangerZoneSection from "@/components/settings/DangerZoneSection";
import AboutCard from "@/components/settings/AboutCard";
import PageHeader from "@/components/layout/PageHeader";

/**
 * /settings — data backup (export, import), a danger zone (delete all
 * data) and an about card. A server component composing the client
 * DataSection, in line with the other routes' *View components.
 */
export default function SettingsView() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <PageHeader
        className="pt-2 pb-2"
        title="Settings"
        meta="Your data stays in this browser unless you export it."
      />
      <DataSection />
      <ImportSection />
      <DangerZoneSection />
      <AboutCard />
    </div>
  );
}
