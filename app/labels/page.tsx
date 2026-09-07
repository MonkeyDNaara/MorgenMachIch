import type { Metadata } from "next";
import LabelsView from "@/components/label/LabelsView";

export const metadata: Metadata = {
  title: "Labels | MorgenMachIch",
};

export default function LabelsPage() {
  return <LabelsView />;
}
