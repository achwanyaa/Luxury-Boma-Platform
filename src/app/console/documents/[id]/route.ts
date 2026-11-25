import { notFound, redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { DOCUMENT_BUCKET } from "@/lib/console/document-rules";
import { requireStaff } from "@/lib/console/staff";
import { createClient } from "@/lib/supabase/server";

// Opens a document for LuxuryBoma staff: checks the session, then sends the
// browser to a signed link that works for five minutes. The bucket is
// private, so this is the only way to read a document's file.
export async function GET(_request: NextRequest, ctx: RouteContext<"/console/documents/[id]">) {
  await requireStaff();
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data: doc } = await supabase.from("documents").select("file_path").eq("id", id).maybeSingle();
  if (!doc?.file_path) notFound();

  const { data, error } = await supabase.storage.from(DOCUMENT_BUCKET).createSignedUrl(doc.file_path, 300);
  if (error || !data) notFound();
  redirect(data.signedUrl);
}
