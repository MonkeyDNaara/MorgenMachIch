import AppearanceSection from "@/features/theme/components/AppearanceSection";
import InstallSection from "@/features/pwa/components/InstallSection";
import DataSection from "@/features/settings/components/DataSection";
import ImportSection from "@/features/settings/components/ImportSection";
import DangerZoneSection from "@/features/settings/components/DangerZoneSection";
import AboutCard from "@/features/settings/components/AboutCard";
import PageHeader from "@/components/ui/PageHeader";

/**
 * /settings — appearance (theme, #266), installing the app (#82), data backup (export, import),
 * a danger zone (delete all data) and an about card. A server component composing the client
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
      <AppearanceSection />
      <InstallSection />
      <DataSection />
      <ImportSection />
      <DangerZoneSection />
      <AboutCard />
    </div>
  );
}
