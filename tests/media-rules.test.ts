import { describe, expect, it } from "vitest";
import {
  checkTourLink,
  movePhoto,
  nextSortOrder,
  pathBelongsTo,
  sizeText,
  storagePath,
  uploadProblem,
} from "../src/lib/console/media-rules";

const CLIENT = "8342d565-ad5d-42e6-8795-d48e669ebcd6";
const PROPERTY = "aaaaaaaa-0000-4000-8000-000000000001";
const FILE = "cccccccc-0000-4000-8000-000000000001";
const MB = 1024 * 1024;

describe("media: what may be uploaded", () => {
  it("takes JPEG, WebP and PNG photos up to 10 MB", () => {
    expect(uploadProblem("photo", { name: "front.jpg", type: "image/jpeg", size: 140_000 })).toBe(null);
    expect(uploadProblem("photo", { name: "a.webp", type: "image/webp", size: 2 * MB })).toBe(null);
    expect(uploadProblem("photo", { name: "big.jpg", type: "image/jpeg", size: 11 * MB })).toMatch(/11\.0 MB.*10\.0 MB/);
    expect(uploadProblem("photo", { name: "scan.heic", type: "image/heic", size: MB })).toMatch(/isn't a JPEG/);
    expect(uploadProblem("photo", { name: "walk.mp4", type: "video/mp4", size: MB })).toMatch(/isn't/);
  });

  it("takes one MP4 video up to 50 MB and says how to shrink a bigger one", () => {
    expect(uploadProblem("video", { name: "walk.mp4", type: "video/mp4", size: 38 * MB })).toBe(null);
    expect(uploadProblem("video", { name: "walk.mp4", type: "video/mp4", size: 80 * MB })).toMatch(/30 to 45 seconds/);
    expect(uploadProblem("video", { name: "walk.mov", type: "video/quicktime", size: MB })).toMatch(/MP4/);
    expect(uploadProblem("video", { name: "empty.mp4", type: "video/mp4", size: 0 })).toMatch(/empty/);
  });

  it("writes sizes people can read", () => {
    expect(sizeText(140_000)).toBe("137 KB");
    expect(sizeText(38 * MB)).toBe("38.0 MB");
  });
});

describe("media: where files are stored", () => {
  it("puts each file in its property's folder under a random name", () => {
    expect(storagePath(CLIENT, PROPERTY, FILE, "image/jpeg", "photo")).toBe(`${CLIENT}/${PROPERTY}/${FILE}.jpg`);
    expect(storagePath(CLIENT, PROPERTY, FILE, "video/mp4", "video")).toBe(`${CLIENT}/${PROPERTY}/${FILE}.mp4`);
    expect(() => storagePath(CLIENT, PROPERTY, FILE, "video/mp4", "photo")).toThrow();
  });

  it("accepts only a path inside this property's folder", () => {
    const good = `${CLIENT}/${PROPERTY}/${FILE}.jpg`;
    expect(pathBelongsTo(good, CLIENT, PROPERTY, "photo")).toBe(true);
    expect(pathBelongsTo(good, CLIENT, PROPERTY, "video")).toBe(false);
    expect(pathBelongsTo(`${CLIENT}/other/${FILE}.jpg`, CLIENT, PROPERTY, "photo")).toBe(false);
    expect(pathBelongsTo(`${CLIENT}/${PROPERTY}/../x/${FILE}.jpg`, CLIENT, PROPERTY, "photo")).toBe(false);
    expect(pathBelongsTo(`${CLIENT}/${PROPERTY}/front.jpg`, CLIENT, PROPERTY, "photo")).toBe(false);
    expect(pathBelongsTo(`${CLIENT}/${PROPERTY}/${FILE}.jpg.exe`, CLIENT, PROPERTY, "photo")).toBe(false);
  });
});

describe("media: the 3D tour link", () => {
  it("accepts a Realsee tour link", () => {
    expect(checkTourLink(" https://realsee.ai/LNwwZDEm ")).toEqual({ ok: true, url: "https://realsee.ai/LNwwZDEm" });
  });

  it("refuses other sites, plain http, junk and Realsee's home page", () => {
    expect(checkTourLink("https://example.com/tour").ok).toBe(false);
    expect(checkTourLink("http://realsee.ai/LNwwZDEm").ok).toBe(false);
    expect(checkTourLink("realsee.ai/LNwwZDEm").ok).toBe(false);
    expect(checkTourLink("https://realsee.ai/").ok).toBe(false);
    expect(checkTourLink("https://realsee.ai.evil.com/x").ok).toBe(false);
  });
});

describe("media: photo order", () => {
  const photos = [
    { id: "a", sort_order: 10 },
    { id: "b", sort_order: 20 },
    { id: "c", sort_order: 30 },
  ];

  it("swaps a photo with its neighbour and changes only those two", () => {
    expect(movePhoto(photos, "c", "up")).toEqual([
      { id: "c", sort_order: 20 },
      { id: "b", sort_order: 30 },
    ]);
  });

  it("does nothing at the ends", () => {
    expect(movePhoto(photos, "a", "up")).toEqual([]);
    expect(movePhoto(photos, "c", "down")).toEqual([]);
  });

  it("cleans up ties and gaps left by earlier edits", () => {
    const messy = [
      { id: "a", sort_order: 0 },
      { id: "b", sort_order: 0 },
      { id: "c", sort_order: 55 },
    ];
    expect(movePhoto(messy, "b", "down").map((p) => p.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("puts a new photo after the rest", () => {
    expect(nextSortOrder(photos)).toBe(40);
    expect(nextSortOrder([])).toBe(10);
  });
});
