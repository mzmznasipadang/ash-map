import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { legalMetadata } from "@/lib/locale-route";

export const metadata: Metadata = legalMetadata("id", "privacy");

export default function Page() {
  return <LegalPage locale="id" kind="privacy" />;
}
