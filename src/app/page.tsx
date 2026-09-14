import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_AUTHED_ROUTE } from "@/lib/routes";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? DEFAULT_AUTHED_ROUTE : "/auth/login");
}
