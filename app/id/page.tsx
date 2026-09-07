import type { Metadata } from "next";
import { AshMapApp } from "@/components/ash-map-app";
import { localeMetadata } from "@/lib/locale-route";

export const metadata: Metadata = localeMetadata("id");

export default function Page() {
  return <AshMapApp locale="id" />;
}
