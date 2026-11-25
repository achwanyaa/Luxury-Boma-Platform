"use client";

import { useRef, useState, useTransition } from "react";
import {
  citation,
  DOCUMENT_BUCKET,
  DOCUMENT_TYPES,
  documentFileProblem,
  documentPath,
  EMPTY_DOCUMENT,
  readDocumentForm,
  VISIBILITY_OPTIONS,
  type DocumentErrors,
  type DocumentField,
  type DocumentInput,
} from "@/lib/console/document-rules";
import { createClient } from "@/lib/supabase/client";
import { ui } from "../ui";
import { deleteDocument, discardDocumentUpload, recordDocument, updateDocument, type DocumentResult } from "./document-actions";

export type DocumentView = DocumentInput & { id: string; citedBy: number };

const VISIBILITY_TEXT = Object.fromEntries(VISIBILITY_OPTIONS.map((o) => [o.value, o.text]));

const dateText = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function DocumentsSection({
  propertyId,
  clientId,
  documents,
}: {
  propertyId: string;
  clientId: string;
  documents: DocumentView[];
}) {
  return (
    <section className="flex flex-col gap-3" aria-labelledby="documents-heading">
      <div className="flex flex-col gap-0.5">
        <h2 id="documents-heading" className={ui.h2}>
          Documents
        </h2>
        <p className="text-sm text-muted">
          Drawings, reports and certificates behind the facts. Files are private: only LuxuryBoma staff can open them,
          through a link that works for five minutes. A fact can cite a document as its source.
        </p>
      </div>
      <div className={`${ui.card} flex flex-col gap-5`}>
        {documents.length > 0 ? (
          <ul className="flex flex-col divide-y divide-line-soft">
            {documents.map((doc) => (
              <DocumentRow key={doc.id} propertyId={propertyId} doc={doc} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-body">No documents yet.</p>
        )}
        <AddDocument propertyId={propertyId} clientId={clientId} />
      </div>
    </section>
  );
}

function DocumentFields({ values, errors, prefix }: { values: DocumentInput; errors: DocumentErrors; prefix: string }) {
  const err = (name: DocumentField) =>
    errors[name] && (
      <span id={`${prefix}-${name}-error`} className="text-sm font-semibold text-fit-red">
        {errors[name]}
      </span>
    );
  const aria = (name: DocumentField) =>
    errors[name] ? { "aria-invalid": true as const, "aria-describedby": `${prefix}-${name}-error` } : {};
  const text = (name: DocumentField, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className={ui.field}>
      <span className={ui.label}>{label}</span>
      <input name={name} defaultValue={values[name]} className={ui.input} {...aria(name)} {...extra} />
      {err(name)}
    </label>
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {text("title", "Title", { required: true, placeholder: "Ground floor plan" })}
      {text("author", "Author", { required: true, placeholder: "Sketch3D Ltd" })}
      {text("number", "Number (optional)", { placeholder: "A-101" })}
      {text("revision", "Revision (optional)", { placeholder: "C" })}
      {text("document_date", "Date on the document (optional)", { type: "date" })}
      <label className={ui.field}>
        <span className={ui.label}>Who can open it</span>
        <select name="visibility" defaultValue={values.visibility} className={ui.input} {...aria("visibility")}>
          {VISIBILITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.text}
            </option>
          ))}
        </select>
        {err("visibility") ?? (
          <span className="text-sm text-muted">Keep drawings staff-only until the architect agrees to show them.</span>
        )}
      </label>
      <label className={`${ui.field} sm:col-span-2`}>
        <span className={ui.label}>Note (staff only)</span>
        <input name="note" defaultValue={values.note} className={ui.input} />
      </label>
    </div>
  );
}

function Result({ result }: { result: DocumentResult | null }) {
  if (!result) return null;
  return (
    <p role={result.ok ? "status" : "alert"} className={result.ok ? "text-sm font-semibold text-available" : ui.error}>
      {result.message}
    </p>
  );
}

function AddDocument({ propertyId, clientId }: { propertyId: string; clientId: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DocumentResult | null>(null);
  const [values, setValues] = useState(EMPTY_DOCUMENT);
  const [formKey, setFormKey] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);

  if (!open) {
    return (
      <div className="flex flex-col gap-2">
        <Result result={result} />
        <button type="button" onClick={() => setOpen(true)} className={`${ui.button} w-fit`}>
          Add a document
        </button>
      </div>
    );
  }

  async function submit(form: HTMLFormElement) {
    const input = readDocumentForm(new FormData(form));
    setValues(input);
    const file = fileInput.current?.files?.[0];
    if (!file) return setResult({ ok: false, message: "Choose the file to upload.", errors: { file: "Choose a file." } });
    const problem = documentFileProblem(file);
    if (problem) return setResult({ ok: false, message: problem, errors: { file: problem } });

    setBusy(true);
    setResult({ ok: true, message: `Uploading ${file.name}…` });
    const path = documentPath(clientId, propertyId, crypto.randomUUID(), file.type);
    const { error } = await createClient()
      .storage.from(DOCUMENT_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      await discardDocumentUpload(propertyId, path);
      setBusy(false);
      return setResult({ ok: false, message: `${file.name} didn't upload: ${error.message}. Check you're still signed in.` });
    }
    const saved = await recordDocument(propertyId, path, input);
    setBusy(false);
    setResult(saved);
    if (saved.ok) {
      setValues(EMPTY_DOCUMENT);
      setFormKey((k) => k + 1);
      setOpen(false);
    }
  }

  return (
    <form
      key={formKey}
      className="flex flex-col gap-4 rounded-control border border-line bg-page p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(e.currentTarget);
      }}
    >
      <h3 className="font-lb font-bold text-lb-deep">Add a document</h3>
      <label className={ui.field}>
        <span className={ui.label}>File</span>
        <input
          ref={fileInput}
          type="file"
          accept={Object.keys(DOCUMENT_TYPES).join(",")}
          className="text-sm text-body file:mr-3 file:h-11 file:rounded-control file:border file:border-line-strong file:bg-white file:px-4 file:font-semibold file:text-lb-deep"
        />
        <span className="text-sm text-muted">PDF, or a JPEG or PNG scan, up to 50 MB.</span>
      </label>
      <DocumentFields values={values} errors={result?.errors ?? {}} prefix="new-doc" />
      <Result result={result} />
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className={ui.button}>
          {busy ? "Uploading…" : "Upload document"}
        </button>
        <button type="button" disabled={busy} onClick={() => setOpen(false)} className={ui.secondaryButton}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function DocumentRow({ propertyId, doc }: { propertyId: string; doc: DocumentView }) {
  const [editing, setEditing] = useState(false);
  const [result, setResult] = useState<DocumentResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <li className="flex flex-col gap-3 py-3 first:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-semibold text-lb-deep">
            {citation({ title: doc.title, number: doc.number || null, revision: doc.revision || null, author: doc.author })}
          </span>
          <span className="text-sm text-muted">
            {[
              doc.document_date ? dateText(doc.document_date) : null,
              VISIBILITY_TEXT[doc.visibility],
              doc.citedBy > 0 ? `cited by ${doc.citedBy} ${doc.citedBy === 1 ? "fact" : "facts"}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <a href={`/documents/${doc.id}`} target="_blank" rel="noopener noreferrer" className={`${ui.secondaryButton} flex items-center`}>
            Open ↗
          </a>
          <button type="button" onClick={() => setEditing((e) => !e)} className={ui.secondaryButton}>
            {editing ? "Close" : "Edit"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (confirm(`Remove “${doc.title}”? The file is deleted and can't be brought back.`)) {
                start(async () => setResult(await deleteDocument(propertyId, doc.id)));
              }
            }}
            className="min-h-11 px-2 text-sm font-semibold text-fit-red hover:underline"
          >
            Remove
          </button>
        </div>
      </div>
      {editing && (
        <form
          className="flex flex-col gap-4 rounded-control border border-line bg-page p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const input = readDocumentForm(new FormData(e.currentTarget));
            start(async () => {
              const saved = await updateDocument(propertyId, doc.id, input);
              setResult(saved);
              if (saved.ok) setEditing(false);
            });
          }}
        >
          <DocumentFields values={doc} errors={result?.errors ?? {}} prefix={doc.id} />
          <button type="submit" disabled={pending} className={`${ui.button} w-fit`}>
            {pending ? "Saving…" : "Save details"}
          </button>
        </form>
      )}
      <Result result={result} />
    </li>
  );
}
