"use server";

import { refresh } from "next/cache";
import {
  describeDocumentError,
  DOCUMENT_BUCKET,
  documentPathBelongsTo,
  validateDocument,
  type DocumentErrors,
  type DocumentInput,
} from "@/lib/console/document-rules";
import { requireStaff } from "@/lib/console/staff";
import { createClient } from "@/lib/supabase/server";

// A property's documents. The browser uploads the file straight to the private
// bucket; these actions record, change or remove the documents row. They run
// as the signed-in staff member, so row-level security applies.

export type DocumentResult = { ok: boolean; message: string; errors?: DocumentErrors };

const GONE = "This property no longer exists, or your account can't change it.";
const today = () => new Date().toISOString().slice(0, 10);

async function loadProperty(propertyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select("id, client_id, documents ( id, file_path )")
    .eq("id", propertyId)
    .maybeSingle();
  return { supabase, property: data };
}

/** Records a document whose file the browser has just uploaded. Removes the file again if the record can't be written. */
export async function recordDocument(propertyId: string, path: string, input: DocumentInput): Promise<DocumentResult> {
  await requireStaff();
  const { supabase, property } = await loadProperty(propertyId);
  if (!property) return { ok: false, message: GONE };
  if (!documentPathBelongsTo(path, property.client_id, property.id)) {
    return { ok: false, message: "That file isn't in this property's folder, so it wasn't added." };
  }
  const checked = validateDocument(input, today());
  if (!checked.ok) {
    await supabase.storage.from(DOCUMENT_BUCKET).remove([path]);
    return { ok: false, message: "Check the highlighted fields.", errors: checked.errors };
  }
  const { error } = await supabase
    .from("documents")
    .insert({ ...checked.values, file_path: path, client_id: property.client_id, property_id: property.id });
  if (error) {
    await supabase.storage.from(DOCUMENT_BUCKET).remove([path]);
    return { ok: false, message: describeDocumentError(error) };
  }
  refresh();
  return { ok: true, message: "Document added." };
}

/** Removes a file whose upload or record failed part-way. Leaves recorded files alone. */
export async function discardDocumentUpload(propertyId: string, path: string): Promise<void> {
  await requireStaff();
  const { supabase, property } = await loadProperty(propertyId);
  if (!property || !documentPathBelongsTo(path, property.client_id, property.id)) return;
  if (property.documents.some((d) => d.file_path === path)) return;
  await supabase.storage.from(DOCUMENT_BUCKET).remove([path]);
}

export async function updateDocument(propertyId: string, documentId: string, input: DocumentInput): Promise<DocumentResult> {
  await requireStaff();
  const { supabase, property } = await loadProperty(propertyId);
  if (!property?.documents.some((d) => d.id === documentId)) return { ok: false, message: GONE };
  const checked = validateDocument(input, today());
  if (!checked.ok) return { ok: false, message: "Check the highlighted fields.", errors: checked.errors };
  const { error } = await supabase.from("documents").update(checked.values).eq("id", documentId);
  if (error) return { ok: false, message: describeDocumentError(error) };
  refresh();
  return { ok: true, message: "Saved. Facts that cite it keep the source text they were saved with." };
}

export async function deleteDocument(propertyId: string, documentId: string): Promise<DocumentResult> {
  await requireStaff();
  const { supabase, property } = await loadProperty(propertyId);
  const doc = property?.documents.find((d) => d.id === documentId);
  if (!property || !doc) return { ok: false, message: GONE };
  // The database refuses while any fact cites it (and tells us so).
  const { error } = await supabase.from("documents").delete().eq("id", documentId);
  if (error) return { ok: false, message: describeDocumentError(error) };
  if (doc.file_path) await supabase.storage.from(DOCUMENT_BUCKET).remove([doc.file_path]);
  refresh();
  return { ok: true, message: "Document removed." };
}
