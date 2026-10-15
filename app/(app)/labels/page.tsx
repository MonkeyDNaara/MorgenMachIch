import type { Metadata } from "next";
import LabelsView from "@/features/labels/components/LabelsView";

export const metadata: Metadata = {
  title: "Labels",
};

export default function LabelsPage() {
  return <LabelsView />;
}
