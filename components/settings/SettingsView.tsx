import DataSection from "@/components/settings/DataSection";
import ImportSection from "@/components/settings/ImportSection";
import DangerZoneSection from "@/components/settings/DangerZoneSection";
import AboutCard from "@/components/settings/AboutCard";

/**
 * /settings — data backup (export, import), a danger zone (delete all
 * data) and an about card. A server component composing the client
 * DataSection, in line with the other routes' *View components.
 */
export default function SettingsView() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">Settings</h1>
      <DataSection />
      <ImportSection />
      <DangerZoneSection />
      <AboutCard />
    </div>
  );
}
