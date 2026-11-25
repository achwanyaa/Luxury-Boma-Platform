import { describe, expect, it } from "vitest";
import { canMove, describeStatusError, moveLabel, publishCheck, STATUS_MOVES, type PublishInput } from "../src/lib/console/publish-rules";

const ready: PublishInput = {
  role: "lb_admin",
  siteVisitedOn: "2026-09-30",
  listings: [{ status: "active" }],
  media: [{ kind: "photo", is_main: true }],
  facts: [
    { key: "floor_area", name: "Warehouse floor area", label: "indicative", source: null, requiredToPublish: false },
    { key: "clear_height", name: "Clear height under truss", label: "from_drawings", source: "Drawing A-201, Sketch3D Ltd", requiredToPublish: true },
  ],
};

describe("status moves", () => {
  it("follows draft, in review, live, then paused or sold", () => {
    expect(canMove("draft", "in_review")).toBe(true);
    expect(canMove("in_review", "live")).toBe(true);
    expect(canMove("live", "paused")).toBe(true);
    expect(canMove("paused", "live")).toBe(true);
    expect(canMove("live", "sold_or_leased")).toBe(true);
  });

  it("never skips review on the way to live", () => {
    expect(canMove("draft", "live")).toBe(false);
    expect(canMove("sold_or_leased", "live")).toBe(false);
    expect(canMove("live", "draft")).toBe(false);
  });

  it("has a label for every move", () => {
    for (const [from, targets] of Object.entries(STATUS_MOVES)) {
      for (const to of targets) expect(moveLabel(from as never, to)).not.toBe(to);
    }
    expect(moveLabel("in_review", "live")).toBe("Publish");
    expect(moveLabel("paused", "live")).toBe("Put back live");
  });
});

describe("publish check", () => {
  it("lets a ready property through", () => {
    expect(publishCheck(ready)).toEqual({ blockers: [], warnings: [] });
  });

  it("blocks an editor, however ready the property is", () => {
    const { blockers } = publishCheck({ ...ready, role: "lb_editor" });
    expect(blockers).toEqual([expect.stringMatching(/reviewer or admin/)]);
  });

  it("names every missing piece at once", () => {
    const { blockers } = publishCheck({ ...ready, siteVisitedOn: null, listings: [{ status: "draft" }], media: [] });
    expect(blockers).toHaveLength(3);
    expect(blockers.join(" ")).toMatch(/site visit/);
    expect(blockers.join(" ")).toMatch(/active listing/);
    expect(blockers.join(" ")).toMatch(/main photo/);
  });

  it("needs the main photo, not just any media", () => {
    const tourOnly = publishCheck({ ...ready, media: [{ kind: "tour", is_main: false }, { kind: "photo", is_main: false }] });
    expect(tourOnly.blockers.join(" ")).toMatch(/main photo/);
  });

  it("blocks a drawings fact without its drawing", () => {
    const facts = [{ ...ready.facts[1], source: " " }];
    expect(publishCheck({ ...ready, facts }).blockers.join(" ")).toMatch(/Clear height.*drawing and author/);
  });

  it("only warns about unchecked required facts", () => {
    const facts = [...ready.facts, { key: "floor_load", name: "Floor load", label: "not_yet_checked", source: null, requiredToPublish: true }];
    const result = publishCheck({ ...ready, facts });
    expect(result.blockers).toEqual([]);
    expect(result.warnings.join(" ")).toMatch(/Floor load/);
  });

  it("warns when no fact has a value", () => {
    const facts = ready.facts.map((f) => ({ ...f, label: "not_yet_checked", requiredToPublish: false }));
    expect(publishCheck({ ...ready, facts }).warnings.join(" ")).toMatch(/No fact has a value/);
  });

  it("explains the database's refusals", () => {
    expect(describeStatusError({ code: "23514", message: 'check constraint "live_needs_site_visit"' })).toMatch(/site visit/);
    expect(describeStatusError({ code: "42501", message: "Only a LuxuryBoma reviewer" })).toMatch(/reviewer or admin/);
  });
});
