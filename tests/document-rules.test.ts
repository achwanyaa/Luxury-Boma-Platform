import { describe, expect, it } from "vitest";
import {
  citation,
  describeDocumentError,
  documentFileProblem,
  documentPath,
  documentPathBelongsTo,
  EMPTY_DOCUMENT,
  readDocumentForm,
  validateDocument,
  type DocumentInput,
} from "../src/lib/console/document-rules";

const TODAY = "2026-11-25";
const CLIENT = "8342d565-ad5d-42e6-8795-d48e669ebcd6";
const PROPERTY = "aaaaaaaa-0000-4000-8000-000000000001";
const FILE = "cccccccc-0000-4000-8000-000000000001";

const doc = (change: Partial<DocumentInput> = {}): DocumentInput => ({
  ...EMPTY_DOCUMENT,
  title: "Ground floor plan",
  author: "Sketch3D Ltd",
  ...change,
});

describe("documents: details", () => {
  it("needs a title and an author, and keeps new documents staff-only", () => {
    expect(EMPTY_DOCUMENT.visibility).toBe("staff");
    const result = validateDocument(EMPTY_DOCUMENT, TODAY);
    expect(!result.ok && Object.keys(result.errors).sort()).toEqual(["author", "title"]);
    expect(validateDocument(doc(), TODAY)).toEqual({
      ok: true,
      values: expect.objectContaining({ title: "Ground floor plan", number: null, visibility: "staff" }),
    });
  });

  it("refuses an unknown visibility and a future or malformed date", () => {
    expect(validateDocument(doc({ visibility: "everyone" }), TODAY).ok).toBe(false);
    expect(validateDocument(doc({ document_date: "2027-01-01" }), TODAY).ok).toBe(false);
    expect(validateDocument(doc({ document_date: "Jan 2026" }), TODAY).ok).toBe(false);
    expect(validateDocument(doc({ document_date: "2026-03-14" }), TODAY).ok).toBe(true);
  });

  it("reads and trims the form", () => {
    const form = new FormData();
    form.set("title", " Section A-A ");
    form.set("visibility", "public");
    expect(readDocumentForm(form)).toMatchObject({ title: "Section A-A", visibility: "public", number: "" });
  });
});

describe("documents: files", () => {
  it("takes PDFs and scans up to 50 MB", () => {
    expect(documentFileProblem({ name: "A-101.pdf", type: "application/pdf", size: 3_000_000 })).toBe(null);
    expect(documentFileProblem({ name: "scan.jpg", type: "image/jpeg", size: 900_000 })).toBe(null);
    expect(documentFileProblem({ name: "model.glb", type: "model/gltf-binary", size: 4_000_000 })).toMatch(/PDF/);
    expect(documentFileProblem({ name: "big.pdf", type: "application/pdf", size: 60 * 1024 * 1024 })).toMatch(/50 MB/);
  });

  it("stores each file in its property's folder and accepts only such paths", () => {
    const path = documentPath(CLIENT, PROPERTY, FILE, "application/pdf");
    expect(path).toBe(`${CLIENT}/${PROPERTY}/${FILE}.pdf`);
    expect(documentPathBelongsTo(path, CLIENT, PROPERTY)).toBe(true);
    expect(documentPathBelongsTo(path, CLIENT, "other")).toBe(false);
    expect(documentPathBelongsTo(`${CLIENT}/${PROPERTY}/${FILE}.mp4`, CLIENT, PROPERTY)).toBe(false);
    expect(documentPathBelongsTo(`${CLIENT}/${PROPERTY}/plan.pdf`, CLIENT, PROPERTY)).toBe(false);
  });
});

describe("documents: citing them in facts", () => {
  it("names the drawing and its author (rule 3)", () => {
    expect(citation({ title: "Ground floor plan", number: "A-101", revision: "C", author: "Sketch3D Ltd" })).toBe(
      "Ground floor plan, A-101 rev C, Sketch3D Ltd",
    );
    expect(citation({ title: "Structural report", number: null, revision: null, author: "Mwangi & Partners" })).toBe(
      "Structural report, Mwangi & Partners",
    );
  });

  it("explains why a cited document can't be removed", () => {
    expect(describeDocumentError({ code: "23503" })).toMatch(/Unlink it/);
    expect(describeDocumentError({ code: "XX000", message: "relation" })).not.toMatch(/relation/);
  });
});
