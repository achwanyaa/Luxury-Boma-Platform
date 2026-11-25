import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { anon, as, createDatabase, rows, user } from "./helpers/db";

// The property-media bucket: only LuxuryBoma staff with two-factor write, list
// or remove files. Runs against the storage stub in tests/helpers/db.ts, so it
// proves the policies, not Supabase Storage itself.

const CLIENT = "aaaaaaaa-0000-4000-8000-000000000000";
const LB_ADMIN = "11111111-0000-4000-8000-000000000001";
const LB_EDITOR = "11111111-0000-4000-8000-000000000002";
const CLIENT_STAFF = "22222222-0000-4000-8000-00000000000a";
const STRANGER = "33333333-0000-4000-8000-00000000000a";
const FILE = "cccccccc-0000-4000-8000-000000000001";

let db: PGlite;

beforeAll(async () => {
  db = await createDatabase();
  await db.exec(`
    insert into auth.users (id) values ('${LB_ADMIN}'), ('${LB_EDITOR}'), ('${CLIENT_STAFF}'), ('${STRANGER}');
    insert into public.clients (id, slug, name) values ('${CLIENT}', 'client-a', 'Client A');
    insert into public.staff_members (user_id, client_id, role) values
      ('${LB_ADMIN}', null, 'lb_admin'),
      ('${LB_EDITOR}', null, 'lb_editor'),
      ('${CLIENT_STAFF}', '${CLIENT}', 'client_staff');
    insert into storage.objects (id, bucket_id, name) values
      ('${FILE}', 'property-media', '${CLIENT}/p/existing.jpg');
  `);
});

const upload = (name: string, bucket = "property-media") =>
  `insert into storage.objects (bucket_id, name) values ('${bucket}', '${name}')`;

describe("property-media bucket", () => {
  it("is public, capped at 50 MB, and takes photos and MP4 video only", async () => {
    const [bucket] = await rows<{ public: boolean; file_size_limit: string; allowed_mime_types: string[] }>(
      db,
      "select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'property-media'",
    );
    expect(bucket.public).toBe(true);
    expect(Number(bucket.file_size_limit)).toBe(50 * 1024 * 1024);
    expect(bucket.allowed_mime_types.sort()).toEqual(["image/jpeg", "image/png", "image/webp", "video/mp4"]);
  });

  it("lets LuxuryBoma staff with two-factor upload, list, replace and remove", async () => {
    for (const id of [LB_ADMIN, LB_EDITOR]) {
      const staff = user(id, { twoFactor: true });
      await as(db, staff, async (tx) => {
        await tx.query(upload(`${CLIENT}/p/new.jpg`));
        expect((await rows(tx, "select id from storage.objects where bucket_id = 'property-media'")).length).toBe(2);
        const replaced = await tx.query(`update storage.objects set metadata = '{}' where id = '${FILE}'`);
        expect(replaced.affectedRows).toBe(1);
        const removed = await tx.query(`delete from storage.objects where id = '${FILE}'`);
        expect(removed.affectedRows).toBe(1);
      });
    }
  });

  it.each([
    ["staff without two-factor", user(LB_ADMIN)],
    ["client staff", user(CLIENT_STAFF, { twoFactor: true })],
    ["a signed-in stranger", user(STRANGER)],
  ])("refuses uploads from %s and shows them nothing to change", async (_who, caller) => {
    await expect(as(db, caller, (tx) => tx.query(upload(`${CLIENT}/p/x.jpg`)))).rejects.toThrow(/row-level security/);
    const changed = await as(db, caller, async (tx) => {
      const listed = await rows(tx, "select id from storage.objects");
      const updated = await tx.query(`update storage.objects set name = 'moved.jpg' where id = '${FILE}'`);
      const removed = await tx.query(`delete from storage.objects where id = '${FILE}'`);
      return listed.length + (updated.affectedRows ?? 0) + (removed.affectedRows ?? 0);
    });
    expect(changed).toBe(0);
  });

  it("refuses anonymous uploads", async () => {
    await expect(as(db, anon, (tx) => tx.query(upload(`${CLIENT}/p/x.jpg`)))).rejects.toThrow();
  });

  it("gives staff no rights in any other bucket", async () => {
    await db.exec("insert into storage.buckets (id, name) values ('other', 'other') on conflict do nothing");
    await expect(
      as(db, user(LB_ADMIN, { twoFactor: true }), (tx) => tx.query(upload("x.jpg", "other"))),
    ).rejects.toThrow(/row-level security/);
  });

  it("knows video as a kind of media", async () => {
    const [{ kinds }] = await rows<{ kinds: string }>(
      db,
      "select array_to_string(enum_range(null::public.media_kind), ',') as kinds",
    );
    expect(kinds.split(",")).toContain("video");
  });
});
