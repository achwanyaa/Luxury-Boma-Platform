"use server";

import { refresh, revalidateTag } from "next/cache";
import {
  CAPTION_LIMIT,
  checkTourLink,
  MEDIA_BUCKET,
  movePhoto,
  nextSortOrder,
  pathBelongsTo,
  type UploadKind,
} from "@/lib/console/media-rules";
import { requireStaff } from "@/lib/console/staff";
import { listingsTag } from "@/lib/portal/listings";
import { createClient } from "@/lib/supabase/server";

// Photos, the video walkthrough and the 3D tour link of a property. Files are
// uploaded by the browser straight to Storage (Server Actions have a small
// body limit); these actions then record or change the media rows. Everything
// runs as the signed-in staff member, so row-level security applies.

export type MediaResult = { ok: boolean; message: string };

type Db = Awaited<ReturnType<typeof createClient>>;

async function loadProperty(supabase: Db, propertyId: string) {
  const { data } = await supabase
    .from("properties")
    .select("id, client_id, clients ( slug ), media ( id, kind, url, file_path, is_main, sort_order )")
    .eq("id", propertyId)
    .maybeSingle();
  return data;
}

type Loaded = NonNullable<Awaited<ReturnType<typeof loadProperty>>>;

function done(property: Loaded, message: string): MediaResult {
  if (property.clients?.slug) revalidateTag(listingsTag(property.clients.slug), "max");
  refresh();
  return { ok: true, message };
}

const fail = (message: string): MediaResult => ({ ok: false, message });
const GONE = "This property no longer exists, or your account can't change it.";

/** Records a file the browser has just uploaded. Removes the file again if the record can't be written. */
export async function recordUpload(propertyId: string, kind: UploadKind, path: string, caption: string): Promise<MediaResult> {
  await requireStaff();
  const supabase = await createClient();
  const property = await loadProperty(supabase, propertyId);
  if (!property) return fail(GONE);
  if (!pathBelongsTo(path, property.client_id, property.id, kind)) {
    return fail("That file isn't in this property's folder, so it wasn't added.");
  }

  const photos = property.media.filter((m) => m.kind === "photo");
  const oldVideos = property.media.filter((m) => m.kind === "video");
  const row = {
    client_id: property.client_id,
    property_id: property.id,
    kind,
    file_path: path,
    caption: caption.trim().slice(0, CAPTION_LIMIT) || null,
    sort_order: kind === "photo" ? nextSortOrder(photos) : 0,
    // The first photo becomes the main one (cards and the share image use it).
    is_main: kind === "photo" && !photos.some((p) => p.is_main),
  };
  const { error } = await supabase.from("media").insert(row);
  if (error) {
    await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    return fail("The file uploaded but couldn't be recorded, so it was removed again. Try once more.");
  }

  // One walkthrough per property: a new video replaces the old one.
  for (const old of oldVideos) {
    await supabase.from("media").delete().eq("id", old.id);
    if (old.file_path) await supabase.storage.from(MEDIA_BUCKET).remove([old.file_path]);
  }
  return done(property, kind === "video" ? "Video walkthrough saved." : "Photo added.");
}

/** Removes a file the browser uploaded when the upload itself failed part-way. */
export async function discardUpload(propertyId: string, kind: UploadKind, path: string): Promise<void> {
  await requireStaff();
  const supabase = await createClient();
  const property = await loadProperty(supabase, propertyId);
  if (!property || !pathBelongsTo(path, property.client_id, property.id, kind)) return;
  if (property.media.some((m) => m.file_path === path)) return; // recorded after all: keep it
  await supabase.storage.from(MEDIA_BUCKET).remove([path]);
}

export async function saveCaption(propertyId: string, mediaId: string, caption: string): Promise<MediaResult> {
  await requireStaff();
  const supabase = await createClient();
  const property = await loadProperty(supabase, propertyId);
  if (!property?.media.some((m) => m.id === mediaId)) return fail(GONE);
  const text = caption.trim();
  if (text.length > CAPTION_LIMIT) return fail(`Keep captions under ${CAPTION_LIMIT} characters.`);
  const { error } = await supabase.from("media").update({ caption: text || null }).eq("id", mediaId);
  if (error) return fail("Could not save the caption. Try again.");
  return done(property, "Caption saved.");
}

export async function makeMainPhoto(propertyId: string, mediaId: string): Promise<MediaResult> {
  await requireStaff();
  const supabase = await createClient();
  const property = await loadProperty(supabase, propertyId);
  const photo = property?.media.find((m) => m.id === mediaId && m.kind === "photo");
  if (!property || !photo) return fail(GONE);
  if (photo.is_main) return { ok: true, message: "Already the main photo." };

  // One main photo per property (a unique index): clear the old one first.
  const { error: clearError } = await supabase
    .from("media")
    .update({ is_main: false })
    .eq("property_id", property.id)
    .eq("is_main", true);
  if (clearError) return fail("Could not change the main photo. Try again.");
  const { error } = await supabase.from("media").update({ is_main: true }).eq("id", mediaId);
  if (error) return fail("Could not change the main photo. Try again.");
  return done(property, "Main photo changed.");
}

export async function reorderPhoto(propertyId: string, mediaId: string, direction: "up" | "down"): Promise<MediaResult> {
  await requireStaff();
  const supabase = await createClient();
  const property = await loadProperty(supabase, propertyId);
  if (!property) return fail(GONE);
  const changes = movePhoto(
    property.media.filter((m) => m.kind === "photo"),
    mediaId,
    direction,
  );
  for (const change of changes) {
    const { error } = await supabase.from("media").update({ sort_order: change.sort_order }).eq("id", change.id);
    if (error) return fail("Could not move the photo. Reload and try again.");
  }
  return done(property, "Order saved.");
}

export async function deleteMedia(propertyId: string, mediaId: string): Promise<MediaResult> {
  await requireStaff();
  const supabase = await createClient();
  const property = await loadProperty(supabase, propertyId);
  const item = property?.media.find((m) => m.id === mediaId);
  if (!property || !item) return fail(GONE);

  const { error } = await supabase.from("media").delete().eq("id", mediaId);
  if (error) return fail("Could not remove it. Try again.");
  if (item.file_path) await supabase.storage.from(MEDIA_BUCKET).remove([item.file_path]);

  // Keep a main photo while any photo is left.
  if (item.is_main) {
    const next = property.media
      .filter((m) => m.kind === "photo" && m.id !== mediaId)
      .toSorted((a, b) => a.sort_order - b.sort_order)[0];
    if (next) await supabase.from("media").update({ is_main: true }).eq("id", next.id);
  }
  return done(property, item.kind === "photo" ? "Photo removed." : item.kind === "video" ? "Video removed." : "Removed.");
}

export async function saveTourLink(propertyId: string, _prev: MediaResult | undefined, formData: FormData): Promise<MediaResult> {
  await requireStaff();
  const supabase = await createClient();
  const property = await loadProperty(supabase, propertyId);
  if (!property) return fail(GONE);
  const existing = property.media.find((m) => m.kind === "tour");
  const text = String(formData.get("tour_url") ?? "").trim();

  if (text === "") {
    if (!existing) return { ok: true, message: "No tour link to remove." };
    const { error } = await supabase.from("media").delete().eq("id", existing.id);
    if (error) return fail("Could not remove the tour link. Try again.");
    return done(property, "Tour link removed.");
  }

  const checked = checkTourLink(text);
  if (!checked.ok) return fail(checked.error);
  if (existing?.url === checked.url) return { ok: true, message: "Nothing changed." };
  const { error } = existing
    ? await supabase.from("media").update({ url: checked.url }).eq("id", existing.id)
    : await supabase
        .from("media")
        .insert({ client_id: property.client_id, property_id: property.id, kind: "tour", url: checked.url });
  if (error) return fail("Could not save the tour link. Try again.");
  return done(property, "Tour link saved.");
}
