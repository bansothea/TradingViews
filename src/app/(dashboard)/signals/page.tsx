import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { getApiKeyStatus } from "@/features/profile/api-key-actions";
import { ScannerScreen } from "@/features/scanner/components/scanner-screen";

export const metadata: Metadata = { title: "Signals" };

export default async function SignalsPage() {
  await requireUser("/signals");
  // Only whether a key exists -- the key itself never leaves the server. Used
  // to decide whether to offer the written analysis, not to gate the scan.
  const apiKey = await getApiKeyStatus();

  return (
    // useSearchParams needs a Suspense boundary: the scan is driven by the URL
    // so the page can be streamed before the params resolve.
    <Suspense fallback={null}>
      <ScannerScreen hasApiKey={apiKey.configured} />
    </Suspense>
  );
}
