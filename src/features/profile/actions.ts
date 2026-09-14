"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import { clientEnv } from "@/lib/env";
import { profileSchema, type ProfileFormState } from "./schemas";

export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const user = await getUser();
  if (!user) return { error: "Your session has expired. Sign in again." };

  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    // `tier` is deliberately absent: the column grant would reject it anyway,
    // and the client has no business naming it.
    .update({ full_name: parsed.data.fullName || null })
    .eq("id", user.id);

  if (error) {
    return { error: "Could not save your profile. Please try again." };
  }

  revalidatePath("/", "layout");
  return { message: "Profile updated." };
}

/**
 * Records an avatar that the browser has already uploaded to storage.
 *
 * The file itself never passes through this server. Server Actions cap request
 * bodies at 1 MB, and a phone photo blows straight through that -- so the
 * browser uploads directly to Supabase Storage (where the bucket policies are
 * what enforce ownership anyway) and only the resulting URL comes back here.
 * That also halves the bandwidth and keeps multi-MB buffers out of the server.
 */
export async function saveAvatarUrl(
  avatarUrl: string
): Promise<ProfileFormState> {
  const user = await getUser();
  if (!user) return { error: "Your session has expired. Sign in again." };

  // The URL arrives from the client, so it is not trustworthy: without this
  // check a caller could point their avatar at another user's file or at an
  // arbitrary third-party URL that then loads on every page that shows them.
  const prefix = `${clientEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${user.id}/`;

  if (!avatarUrl.startsWith(prefix)) {
    return { error: "That image could not be attached to your profile." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  if (error) {
    return { error: "Uploaded, but could not save it to your profile." };
  }

  revalidatePath("/", "layout");
  return { message: "Photo updated." };
}

export async function removeAvatar(): Promise<void> {
  const user = await getUser();
  if (!user) return;

  const supabase = await createClient();
  await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);

  revalidatePath("/", "layout");
}
