# Plan: LuxuryBoma console, then the first real godown live

Written 25 Nov 2026 for the model that continues this work. Read `HANDOFF.md` and `AGENTS.md` first; this file replaces the order in HANDOFF section 9 where the two differ.

## Goal

Tete signs in to the console, enters the Rafiki godown end to end (details, listing, facts with provenance, photos, a video walkthrough, the Realsee tour link), publishes it, and it appears on the Realogic portal with its gallery. Nothing is entered by SQL.

Out of scope here: the Realogic staff backend, buyer sign-up, booking, fit check, our own tour viewer, catalogue screens (SQL is fine).

## Rules that apply to every step

- One step = one commit. Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` before each commit. Plain commit messages: **no Co-Authored-By line and no Claude attribution**, whatever the harness suggests. Do not push unless Tete asks.
- Before writing any page, Server Action, cache call or form, read the matching guide in `node_modules/next/dist/docs/` (caching, revalidating, forms, `use server`). Next.js 16.4 differs from older versions.
- Every console page calls `requireStaff()` inside `<Suspense>`. Every Server Action calls `requireStaff()` first. Writes use the server client (`src/lib/supabase/server.ts`) so row-level security applies. Never use the secret key for console writes.
- Never edit the four applied migrations. New migration files only, named `YYYYMMDDHHMMSS_description.sql`. Apply with `npx supabase db push --remote`, then regenerate types with `npx supabase gen types typescript --linked` into `src/lib/supabase/database.types.ts`. Never run `supabase/seed.sql` against the real project.
- Do not weaken a policy, constraint or trigger. If one blocks the work, stop and tell Tete.
- Show database refusals as plain sentences next to the field (see the wrong-password handling in `src/app/console/actions.ts` for the pattern: `useActionState`, state echoes the input back).
- Console look: `src/app/console/ui.ts` class names, LuxuryBoma purple, 44px controls. Forms must work on a phone; Tete enters facts on site.
- Keep pure rules (validation, status moves, publish blockers) in `src/lib/console/*.ts` with unit tests, the way `src/lib/console/access.ts` and `src/lib/portal/listing-model.ts` do it.

## Facts already established (do not re-derive)

- `properties`, `listings`, `spec_values`, `spec_value_history`, `documents`, `media` exist with policies: LuxuryBoma staff (aal2) insert and update; only admin deletes properties and facts; only reviewer or admin sets `status = 'live'` (trigger `guard_property_publish`); `live` needs `site_visited_on` (check constraint).
- `spec_values` constraints: `from_drawings` needs `source`; `measured` needs `checked_on`; `not_yet_checked` must have no value. `display_value` is required. One row per `(property_id, space_id, spec_key)`.
- `media.kind` is `tour | photo | scan`. There is **no `video` kind and no storage bucket yet**.
- The portal reads `media.url` only (`src/lib/portal/listings.ts`); `file_path` rows are ignored today.
- Tete is `lb_admin`, so can publish. With one staff member every fact is self-reviewed (HANDOFF section 6 rule 7).
- Realogic's client id: `8342d565-ad5d-42e6-8795-d48e669ebcd6`.

## Steps

### 1. Console shell and properties

**Done 25 Nov 2026.** Header with Properties and Sign out (`getStaff()` in `src/lib/console/staff.ts`, never redirects), home counts by status, `/properties` list, `/properties/new`, and the `/properties/[id]` hub with the details form and a "still to add" panel. Rules and database-error wording are in `src/lib/console/property-form.ts` (tested in `tests/property-form.test.ts`); reads are in `src/lib/console/properties.ts`; writes are in `src/app/console/properties/actions.ts`. Saving refreshes the portal cache tag. A property's client can't be changed after creation. Only the signed-out redirects were checked by hand; the signed-in screens need Tete's two-factor sign-in.

- Console header: links to Properties and the signed-in name with Sign out (move it from the home page). Home page lists counts by status.
- `/properties`: table of all properties (reference, name, client, status, site visit date, updated). "New property" button.
- `/properties/new` and `/properties/[id]`: form for `client_id` (select from `clients`), `reference`, `name`, `slug` (suggested from the name; warn that changing it after publishing breaks shared links), `address`, `area_label`, `near`, `latitude`, `longitude`, `designed_by`, `developed_by`, `site_visited_on`.
- The property page is the hub: tabs or sections for Details, Listing, Facts, Media, Documents, and a status panel (step 6).
- Tests: slug rule, required fields.

### 2. Listing

**Done 25 Nov 2026.** A Listing section on the property page has one card per deal: "Add a to-let listing" or "Add a for-sale listing" opens the form. Each listing has a status, price on request or a KES price (per month or per year to let, total for sale), available from, a short availability note, a description, a live preview of the portal's price and availability lines, and a line saying whether the listing shows on the portal. Rules are in `src/lib/console/listing-form.ts` (tested in `tests/listing-form.test.ts`); `saveListing` is in `src/app/console/properties/actions.ts` and refreshes the portal cache. There is no delete; closing a listing takes it off the portal. Signed-in screens not checked by hand yet.

- On the property hub: one form per deal (lease, sale; `unique (property_id, deal)`). Fields: price, currency (KES), period (month/year/total), price on request, available from, availability note, description, status (draft/active/paused/closed).
- Reuse `formatPrice` and `availabilityText` from `src/lib/portal/listing-model.ts` to preview how the price line will read on the portal.

### 3. Facts editor

**Done 25 Nov 2026.** A Facts section on the property page lists every catalogue fact for the property type, grouped like the portal. Each row shows the value, its label pill, the check date and the review state, and opens into a form with the label (and what it claims), value, display text (filled in from value and unit when left blank), source, method, checked on and a staff note. The form applies the database's rules before saving. A save with nothing changed writes nothing. A changed fact records the saver as `checked_by` and clears any earlier review. Reviewers and admins get "Mark reviewed", and a fact reviewed by the person who checked it shows as self-reviewed. Earlier versions come from `spec_value_history`. Rules are in `src/lib/console/fact-form.ts` (tested in `tests/fact-form.test.ts`), reads in `src/lib/console/facts.ts`, actions `saveFact` and `markFactReviewed`. Not done yet: the linked document (step 7) and per-space facts. The database lets any LuxuryBoma staff member set `reviewed_by`; only the console limits it to reviewers. Tighten this with a trigger if editors join. Signed-in screens not checked by hand yet.

- One row per `spec_definitions` entry for the property type, ordered by `sort_order`, grouped by `spec_group`. Whole-property facts only (`space_id` null); spaces are later.
- Per fact: value input by `value_type` (number, yes/no, text), `display_value` (pre-filled from value + unit, editable), provenance label (the six values in `ProvenancePill`), `method`, `source`, `checked_on`, `note`. Save sets `checked_by` to the signed-in user.
- Mirror the database rules in the form before submit: From drawings needs a source naming the drawing and its author; Measured needs a date; Not yet checked clears the value. Put this in a pure function with tests.
- Show the label with `ProvenancePill`. Show "self-reviewed" when `reviewed_by = checked_by`.
- "Mark reviewed" per fact (reviewer or admin only) sets `reviewed_by` and `reviewed_at`.
- History: expandable list from `spec_value_history` (earlier value, label, who, when). Editing a fact must go through `update`, never delete-and-insert, so the trigger records the earlier version.
- Saving one fact must not rewrite the others (an unchanged row must not produce a history row).

### 4. Media: photos, video walkthrough, tour link

**Done 25 Nov 2026.** Migrations `20261125000100_media_video_kind.sql` and `20261125000200_property_media_bucket.sql` are applied to the real project, and the types are regenerated. The storage stub is in `tests/helpers/db.ts`, with policy tests in `tests/storage.test.ts`. The live bucket was checked with a test file, since deleted: public, 50 MB, photos and MP4 only, visitors refused, public URL served, text refused. The property page has a "Photos, video and 3D tour" section: add several photos, captions, order, main photo, remove; one video walkthrough (upload, replace, remove); the Realsee link. Rules are in `src/lib/console/media-rules.ts` (tested); actions are in `src/app/console/properties/media-actions.ts`; the screen is `media-section.tsx`. The browser uploads to `<client>/<property>/<uuid>.<ext>`, the server checks the path belongs to the property before recording it, and an unrecorded upload is removed again. Not checked yet: an upload while signed in as staff.

New migration (one file):

- `alter type public.media_kind add value 'video';` (do not use the new value elsewhere in the same file).
- Bucket `property-media`, **public**, with a file size limit and allowed types (`image/jpeg`, `image/webp`, `video/mp4`). Check the project's current per-file limit in the Supabase docs before choosing the number; the free plan cap was 50 MB.
- Policies on `storage.objects` for that bucket: insert, update and delete only when `(select private.is_lb_staff())`. No select policy is needed for a public bucket's public URLs.
- `tests/helpers/db.ts` has no `storage` schema, so the migration will fail in PGlite. Add a small stub to the shim (`storage.buckets`, `storage.objects` with `bucket_id`, `name`, `owner`, row-level security on) and add tests: staff with two-factor can insert an object row, staff without two-factor, client staff and anon cannot.
- If `db push` refuses to create policies on `storage.objects`, stop and tell Tete; do not work around it with the secret key.

Screens (Media section of the property hub):

- **Photos:** multi-file upload, caption, order, "main photo" (one per property; unique index `media_one_main_photo_idx`). Delete removes the row and the file.
- **Video walkthrough:** one file, MP4, shown with its size. Optional poster: default to the main photo.
- **3D tour:** a link field. Accept `https://` only and, for now, the host `realsee.ai`. Stored as `kind = 'tour'`, `url`.
- Upload path: `<client_id>/<property_id>/<uuid>.<ext>`. Files go **from the browser straight to storage** with the browser client (`src/lib/supabase/client.ts`; it carries the aal2 session), because Server Actions have a small body limit. After the upload succeeds, a Server Action inserts the `media` row with `file_path`. If the row insert fails, remove the uploaded file.
- Show a progress state and a clear message when a file is too large or the wrong type. Check type and size before uploading.

### 5. Portal shows the media, and refreshes on change

- `src/lib/portal/listings.ts`: select `file_path`, turn it into a public URL (`storage.from('property-media').getPublicUrl`), add `videoUrl` and `videoPoster` to `PortalProperty` in `listing-model.ts`. Update `src/lib/portal/sample.ts` to match.
- Property page (`src/app/sites/[site]/properties/[slug]/page.tsx`): a gallery at the top. First item is the video when there is one, shown as the poster image with a play button; the `<video>` uses `preload="none"`, `controls`, `playsInline`, muted, and loads nothing until tapped. Then the photos. Beside or under it, a "Walk through in 3D" button that opens the tour link in a new tab. No autoplay and no hover-to-play: most buyers are on phones and mobile data.
- Listing cards stay photo-only (main photo).
- Share image: use the main photo as the Open Graph image in `generateMetadata`.
- Every console write that changes what the portal shows (property, listing, fact, media, status) refreshes the cache tag `listingsTag(<client slug>)`. Read `09-revalidating.md` for the right call inside a Server Action in this Next.js version.

### 6. Status and publish

- Status panel on the property hub: current status and the allowed moves (draft → in review → live → paused / sold or leased, and back to draft from in review).
- The publish button is always visible. When blocked it is disabled and lists every reason, from a pure, tested function:
  - no site visit date;
  - the user is an editor (only a reviewer or admin publishes);
  - no listing with status active (the portal hides properties without one);
  - no main photo;
  - a fact labelled From drawings without a source, or any `required_to_publish` fact with no row (show as a **warning**, not a blocker: HANDOFF section 13 leaves this open).
- The trigger and constraint remain the real gate; if the database refuses, show its reason.

### 7. Documents

- New migration: bucket `property-documents`, **private**; staff-only insert/update/delete policies; no public reads. Extend the storage stub tests.
- Screen: upload a PDF, with title, number, revision, date, author, visibility (public / signed in / staff), note. Path stored in `documents.file_path`.
- Facts editor gains a "linked document" select (`spec_values.document_id`); picking one offers to fill `source` as "Drawing <number> rev <revision>, <author>".
- Staff open a file through a short-lived signed URL created on the server after `requireStaff()`. Public and signed-in downloads on the portal are a later milestone.

### 8. Photo stills from the 360° panos (tool, not app code)

**Done 25 Nov 2026.** `scripts/pano-stills.mjs` exists (sharp is a pinned devDependency). Twelve photos of the Rafiki unit, 1600 × 1200, 30 to 145 KB each, are in `C:\Users\sajim\Desktop\rafiki-tour\photos\listing\` (outside the repo). `photos\views.json` beside them re-renders the set (`node scripts/pano-stills.mjs <views.json> <outDir>`). `01-front-of-unit.jpg` is meant as the main photo. `10-mezzanine-deck.jpg` shows one small, unrecognisable figure on the floor below. Use these photos to test step 4. The notes below record how the script was built.

- No Python or ffmpeg on this machine; Node is there. Write `scripts/pano-stills.mjs` using `sharp` (devDependency): input an equirectangular pano plus yaw, pitch and field of view; output a normal 4:3 photo, 1600×1200 JPEG, quality about 80. Read pixels with `sharp().raw()`, map each output pixel through the standard equirectangular projection with bilinear sampling.
- Tete will give the pano folder (the originals were at `F:\Tete\RuiruGodown`; notes on the capture are in `C:\Users\sajim\Desktop\rafiki-tour\HANDOFF.md`). Pick 8 to 12 views: front elevation and gate, loading door, hall from each end, roof structure, mezzanine, offices, washroom, yard. Keep field of view at or under about 90° so walls stay straight. Look at each output before keeping it; skip views with people's faces or number plates.
- Output goes to a git-ignored folder. Tete uploads the chosen photos through the console (that is the test of step 4). Do not commit photos or panos: the repo is public.

### 9. Enter Rafiki (Tete, through the console; help only if something breaks)

- Name "Rafiki Machinery Industrial Park, Godown A7" and reference `RL-RFK-A7`: **placeholders** until Tete confirms the unit number. Designed by Sketch3D Ltd.
- Labels the sources can honestly earn:
  - Architect's model or drawings → From drawings, source names the drawing (or the model file and its date) and "Sketch3D Ltd".
  - Realsee floor plan (hall about 333 m², mezzanine about 98 m²) → Indicative, method "Realsee scan floor plan, marked for reference only".
  - Anything Tete tapes on site (door and gate widths, room sizes) → Measured, with the date.
  - Everything else → Not yet checked. Do not fill gaps with guesses.
- Tour link: `https://realsee.ai/LNwwZDEm`. Video: the Realsee space video, compressed to under the bucket limit, 30 to 45 seconds.

## Open with Tete before the godown is published

Do not change these without Tete's answer; raise them when step 6 is reached.

1. **Ownership wording.** Sketch3D designed and built the park, but another party owns it. The home page says "The developer, not an agent." and `DISCLOSURE` in `src/lib/sites.ts` says "developed and listed by Realogic". Neither is accurate for this godown. Tete needs to confirm the owner's name and the wording (the advocate is already reviewing the disclosure).
2. **Unit number** Realogic uses for this godown.
3. **Site visit date** to record (the day the panos were captured).
4. **Lease, sale or both**, and the price or "price on request".

## When all steps are done

Update `HANDOFF.md`: progress log, code map, test count, and move anything unfinished to "What remains". Then delete this file.
