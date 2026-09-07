import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { detectLocale } from "@/lib/i18n";

// The app lives at /en and /id so each language has an address hreflang can
// point at. "/" is not a third copy of it — that would be duplicate content
// competing with the pages it duplicates — so it forwards to whichever
// language the request asks for.
export default async function RootRedirect() {
  const accept = (await headers()).get("accept-language") ?? "";
  // "id-ID,id;q=0.9,en;q=0.8" -> ["id-ID", "id", "en"], preference order kept.
  const languages = accept
    .split(",")
    .map((part) => part.split(";")[0].trim())
    .filter(Boolean);

  redirect(`/${detectLocale(languages)}`);
}
