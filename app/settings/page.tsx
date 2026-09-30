import type { Metadata } from "next";
import SettingsView from "@/components/settings/SettingsView";

export const metadata: Metadata = {
  title: "Settings | MorgenMachIch",
};

export default function SettingsPage() {
  return <SettingsView />;
}
