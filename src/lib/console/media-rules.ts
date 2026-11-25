// Pure rules for a property's photos, video walkthrough and 3D tour link:
// what may be uploaded, where it is stored, and how photos are ordered.
// Shared by the browser upload and the server actions. Unit-tested.

export const MEDIA_BUCKET = "property-media";

export type UploadKind = "photo" | "video";

const MB = 1024 * 1024;

/** Per kind. The bucket itself allows 50 MB, the most a free Supabase project allows. */
export const UPLOAD_RULES: Record<UploadKind, { types: Record<string, string>; maxBytes: number; describe: string }> = {
  photo: {
    types: { "image/jpeg": "jpg", "image/webp": "webp", "image/png": "png" },
    maxBytes: 10 * MB,
    describe: "JPEG, WebP or PNG, up to 10 MB",
  },
  video: {
    types: { "video/mp4": "mp4" },
    maxBytes: 50 * MB,
    describe: "MP4, up to 50 MB",
  },
};

export function sizeText(bytes: number): string {
  return bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Why this file can't be uploaded as this kind, or null when it can. */
export function uploadProblem(kind: UploadKind, file: { name: string; type: string; size: number }): string | null {
  const rule = UPLOAD_RULES[kind];
  if (!(file.type in rule.types)) return `${file.name} isn't a ${rule.describe.split(",")[0]} file. Use ${rule.describe}.`;
  if (file.size === 0) return `${file.name} is empty.`;
  if (file.size > rule.maxBytes) {
    return `${file.name} is ${sizeText(file.size)}. The limit is ${sizeText(rule.maxBytes)}${
      kind === "video" ? "; compress it or shorten it to 30 to 45 seconds." : "; export it smaller."
    }`;
  }
  return null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Where a new file goes: <client>/<property>/<random id>.<ext>. Unguessable, so drafts stay private enough. */
export function storagePath(clientId: string, propertyId: string, fileId: string, mimeType: string, kind: UploadKind): string {
  const ext = UPLOAD_RULES[kind].types[mimeType];
  if (!ext) throw new Error(`Unsupported type ${mimeType}`);
  return `${clientId}/${propertyId}/${fileId}.${ext}`;
}

/**
 * A path the server will accept for this property: inside its own folder, a
 * random id, and an extension allowed for the kind. Stops a crafted request
 * from attaching another property's (or another client's) file.
 */
export function pathBelongsTo(path: string, clientId: string, propertyId: string, kind: UploadKind): boolean {
  const parts = path.split("/");
  if (parts.length !== 3 || parts[0] !== clientId || parts[1] !== propertyId) return false;
  const [id, ext, ...rest] = parts[2].split(".");
  return rest.length === 0 && UUID.test(id) && Object.values(UPLOAD_RULES[kind].types).includes(ext);
}

/** Hosts a 3D tour link may point at. Realsee only for now. */
export const TOUR_HOSTS = ["realsee.ai", "www.realsee.ai"];

export function checkTourLink(text: string): { ok: true; url: string } | { ok: false; error: string } {
  let url: URL;
  try {
    url = new URL(text.trim());
  } catch {
    return { ok: false, error: "Paste the full link, starting with https://" };
  }
  if (url.protocol !== "https:") return { ok: false, error: "Use the https:// link." };
  if (!TOUR_HOSTS.includes(url.hostname)) return { ok: false, error: "Only Realsee tour links (realsee.ai) are accepted for now." };
  if (url.pathname === "/" || url.pathname === "") return { ok: false, error: "That's Realsee's home page, not a tour link." };
  return { ok: true, url: url.toString() };
}

export const CAPTION_LIMIT = 120;

type Ordered = { id: string; sort_order: number };

/**
 * New sort orders after moving one photo up or down. Returns only the rows
 * whose order changes (none at the ends). Orders are renumbered 10, 20, 30…
 * so gaps and ties from earlier edits are cleaned up as a side effect.
 */
export function movePhoto(photos: Ordered[], id: string, direction: "up" | "down"): Ordered[] {
  const list = photos.toSorted((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
  const from = list.findIndex((p) => p.id === id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= list.length) return [];
  [list[from], list[to]] = [list[to], list[from]];
  return list
    .map((p, i) => ({ id: p.id, sort_order: (i + 1) * 10 }))
    .filter((p) => photos.find((q) => q.id === p.id)!.sort_order !== p.sort_order);
}

/** Sort order for a photo added after the existing ones. */
export function nextSortOrder(photos: Ordered[]): number {
  return photos.reduce((max, p) => Math.max(max, p.sort_order), 0) + 10;
}
