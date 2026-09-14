"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "./avatar";
import { saveAvatarUrl, updateProfile } from "../actions";
import {
  AVATAR_MAX_BYTES,
  AVATAR_MIME_TYPES,
  type ProfileFormState,
} from "../schemas";

function SaveButton({ label = "Save changes" }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

function Status({ state }: { state: ProfileFormState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-sm text-down">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p role="status" className="text-sm text-up">
        {state.message}
      </p>
    );
  }
  return null;
}

export function ProfileForm({
  userId,
  email,
  fullName,
  avatarUrl,
  tier,
}: {
  userId: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  tier: string | null;
}) {
  const [details, detailsAction] = useActionState<ProfileFormState, FormData>(
    updateProfile,
    {}
  );

  const fileRef = useRef<HTMLInputElement>(null);
  // Preview the chosen file immediately; waiting for a round trip to show the
  // user their own picture feels broken.
  const [preview, setPreview] = useState<string | null>(null);
  const [photo, setPhoto] = useState<ProfileFormState>({});
  const [uploading, setUploading] = useState(false);

  /**
   * Uploads straight from the browser to Supabase Storage, then tells the
   * server the URL. The storage policies restrict writes to this user's own
   * folder, so going direct costs nothing in safety -- and it sidesteps the
   * 1 MB Server Action body cap that any real photo exceeds.
   */
  async function onFileChosen(file: File) {
    if (!AVATAR_MIME_TYPES.includes(file.type)) {
      setPhoto({ error: "Use a JPEG, PNG or WebP image." });
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setPhoto({ error: "Image must be 2 MB or smaller." });
      return;
    }

    setPhoto({});
    setPreview(URL.createObjectURL(file));
    setUploading(true);

    const supabase = createClient();
    const extension = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
    // The storage policy keys off the first path segment, so the user's id has
    // to be the folder. The timestamp busts the CDN cache on re-upload.
    const path = `${userId}/avatar-${Date.now()}.${extension}`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (error) {
      setPreview(null);
      setUploading(false);
      setPhoto({ error: "Could not upload the image. Please try again." });
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);

    setPhoto(await saveAvatarUrl(publicUrl));
    setUploading(false);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-line bg-panel p-5">
        <h2 className="text-sm font-semibold text-fg">Photo</h2>
        <p className="mt-1 text-xs text-fg-subtle">
          JPEG, PNG or WebP, up to 2 MB.
        </p>

        <div className="mt-4 flex items-center gap-4">
          <Avatar
            src={preview ?? avatarUrl}
            name={fullName}
            email={email}
            size={64}
          />

          <div className="space-y-2">
            <input
              ref={fileRef}
              type="file"
              name="avatar"
              accept={AVATAR_MIME_TYPES.join(",")}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                // Upload on choose: a separate "now press save" step is a
                // pointless extra decision.
                if (file) void onFileChosen(file);
                // Clear the input so re-picking the same file still fires.
                event.target.value = "";
              }}
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex h-9 items-center rounded-lg border border-line bg-panel-2 px-3 text-sm font-medium text-fg transition-colors hover:bg-panel-3 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading
                  ? "Uploading…"
                  : avatarUrl || preview
                    ? "Change photo"
                    : "Upload photo"}
              </button>
            </div>
            <Status state={photo} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-panel p-5">
        <h2 className="text-sm font-semibold text-fg">Details</h2>

        <form action={detailsAction} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="fullName"
              className="block text-xs font-medium text-fg-muted"
            >
              Display name
            </label>
            <input
              id="fullName"
              name="fullName"
              defaultValue={fullName ?? ""}
              maxLength={80}
              autoComplete="name"
              placeholder="How should we address you?"
              className="h-11 w-full rounded-lg border border-line bg-panel-2 px-3.5 text-sm text-fg outline-none transition-colors placeholder:text-fg-faint focus:border-brand"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-fg-muted">
              Email
            </label>
            <p
              className={cn(
                "flex h-11 items-center rounded-lg border border-line bg-panel px-3.5",
                "text-sm text-fg-subtle"
              )}
            >
              {email ?? "—"}
            </p>
            <p className="text-xs text-fg-faint">
              Your email is how you sign in and cannot be changed here.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <SaveButton />
            <Status state={details} />
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-line bg-panel p-5">
        <h2 className="text-sm font-semibold text-fg">Plan &amp; security</h2>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center rounded-md bg-panel-2 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-fg-muted">
            {tier ?? "free"} plan
          </span>
          <Link
            href="/account/password"
            className="text-sm font-medium text-brand hover:text-brand-hover"
          >
            Change password
          </Link>
        </div>
      </section>
    </div>
  );
}
