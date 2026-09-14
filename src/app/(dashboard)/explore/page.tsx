import type { Metadata } from "next";
import { ComingSoon } from "@/features/navigation/components/coming-soon";
import { ExploreIcon } from "@/features/navigation/components/nav-icons";

export const metadata: Metadata = { title: "Explore" };

export default function ExplorePage() {
  return (
    <ComingSoon
      icon={<ExploreIcon />}
      title="Explore"
      description="Browse AI-generated signals across every pair, filter by confidence, and follow the setups other traders are watching."
    />
  );
}
