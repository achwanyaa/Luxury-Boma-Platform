// Pure rules for a property's documents: drawings, reports and certificates
// that facts cite. Files live in the private property-documents bucket.
// Shared by the browser upload and the server actions. Unit-tested.

export const DOCUMENT_BUCKET = "property-documents";

const MB = 1024 * 1024;
export const DOCUMENT_MAX_BYTES = 50 * MB;
export const DOCUMENT_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export type Visibility = "public" | "signed_in" | "staff";

export const VISIBILITY_OPTIONS: { value: Visibility; text: string; help: string }[] = [
  { value: "staff", text: "LuxuryBoma staff only", help: "Never shown outside the console." },
  { value: "signed_in", text: "Signed-in buyers", help: "Buyers who have signed up can open it (once buyer sign-in exists)." },
  { value: "public", text: "Anyone", help: "Anyone viewing the live listing can open it." },
];

export type DocumentInput = {
  title: string;
  number: string;
  revision: string;
  document_date: string;
  author: string;
  visibility: string;
  note: string;
};

export type DocumentField = keyof DocumentInput;
export type DocumentErrors = Partial<Record<DocumentField | "file", string>>;

export type DocumentValues = {
  title: string;
  number: string | null;
  revision: string | null;
  document_date: string | null;
  author: string;
  visibility: Visibility;
  note: string | null;
};

export const EMPTY_DOCUMENT: DocumentInput = {
  title: "",
  number: "",
  revision: "",
  document_date: "",
  author: "",
  // Drawings belong to their architect; keep them inside until permission to show them is confirmed.
  visibility: "staff",
  note: "",
};

export function readDocumentForm(form: { get(name: string): unknown }): DocumentInput {
  const text = (name: DocumentField) => {
    const raw = form.get(name);
    return typeof raw === "string" ? raw.trim() : "";
  };
  return {
    title: text("title"),
    number: text("number"),
    revision: text("revision"),
    document_date: text("document_date"),
    author: text("author"),
    visibility: text("visibility"),
    note: text("note"),
  };
}

const DATE_RULE = /^\d{4}-\d{2}-\d{2}$/;

export function validateDocument(
  input: DocumentInput,
  today: string,
): { ok: true; values: DocumentValues } | { ok: false; errors: DocumentErrors } {
  const errors: DocumentErrors = {};
  if (!input.title) errors.title = "Enter the title, for example Ground floor plan.";
  if (!input.author) errors.author = "Enter who made it, for example Sketch3D Ltd.";
  if (!VISIBILITY_OPTIONS.some((o) => o.value === input.visibility)) errors.visibility = "Choose who can open it.";
  if (input.document_date) {
    if (!DATE_RULE.test(input.document_date) || Number.isNaN(Date.parse(input.document_date))) {
      errors.document_date = "Enter a date.";
    } else if (input.document_date > today) {
      errors.document_date = "The document's date can't be in the future.";
    }
  }
  if (input.title.length > 160) errors.title = "Keep the title under 160 characters.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const orNull = (s: string) => (s === "" ? null : s);
  return {
    ok: true,
    values: {
      title: input.title,
      number: orNull(input.number),
      revision: orNull(input.revision),
      document_date: orNull(input.document_date),
      author: input.author,
      visibility: input.visibility as Visibility,
      note: orNull(input.note),
    },
  };
}

/** Why this file can't be uploaded, or null when it can. */
export function documentFileProblem(file: { name: string; type: string; size: number }): string | null {
  if (!(file.type in DOCUMENT_TYPES)) return `${file.name} isn't a PDF, JPEG or PNG file.`;
  if (file.size === 0) return `${file.name} is empty.`;
  if (file.size > DOCUMENT_MAX_BYTES) return `${file.name} is over 50 MB. Save a smaller copy, for example by printing it to PDF.`;
  return null;
}

export function documentPath(clientId: string, propertyId: string, fileId: string, mimeType: string): string {
  const ext = DOCUMENT_TYPES[mimeType];
  if (!ext) throw new Error(`Unsupported type ${mimeType}`);
  return `${clientId}/${propertyId}/${fileId}.${ext}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for a path inside this property's folder, with a random id and an allowed extension. */
export function documentPathBelongsTo(path: string, clientId: string, propertyId: string): boolean {
  const parts = path.split("/");
  if (parts.length !== 3 || parts[0] !== clientId || parts[1] !== propertyId) return false;
  const [id, ext, ...rest] = parts[2].split(".");
  return rest.length === 0 && UUID.test(id) && Object.values(DOCUMENT_TYPES).includes(ext);
}

/**
 * How a fact cites this document as its source, e.g.
 * "Ground floor plan, A-101 rev C, Sketch3D Ltd". Rule 3: name the drawing and its author.
 */
export function citation(doc: { title: string; number: string | null; revision: string | null; author: string }): string {
  const id = [doc.number, doc.revision ? `rev ${doc.revision}` : null].filter(Boolean).join(" ");
  return [doc.title, id || null, doc.author].filter(Boolean).join(", ");
}

export function describeDocumentError(error: { code?: string; message?: string }): string {
  if (error.code === "23503") return "Facts cite this document. Unlink it from those facts first, then remove it.";
  if (error.code === "42501") return "Your account isn't allowed to make this change.";
  return "Could not save just now. Try again in a minute.";
}
