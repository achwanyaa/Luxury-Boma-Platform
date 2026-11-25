// Cuts ordinary photos out of 360° panoramas (equirectangular JPEGs).
//
//   node scripts/pano-stills.mjs <views.json> <outDir>
//
// views.json is a list of views:
//   [{ "pano": "F:/.../IMG_..._414.jpg", "name": "01-shutter-door",
//      "yaw": 95, "pitch": 0, "fov": 80 }]
// yaw: degrees right of the pano's centre (0 = centre, 90 = right, -90 = left)
// pitch: degrees up (negative looks down); fov: horizontal field of view.
// Optional per view: "width" and "height" (default 1600 × 1200, 4:3).
//
// Output is a JPEG per view. Keep fov at or under about 90° so walls stay
// straight. Photos and panos are client material: write them outside this
// repo (it is public), never commit them.

import { mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Panos are read at this width; enough for 1600 px output at fov ≥ 70°.
const PANO_WIDTH = 8192;

const [, , viewsFile, outDir] = process.argv;
if (!viewsFile || !outDir) {
  console.error("usage: node scripts/pano-stills.mjs <views.json> <outDir>");
  process.exit(1);
}

const views = JSON.parse(await readFile(viewsFile, "utf8"));
mkdirSync(outDir, { recursive: true });

const rad = (d) => (d * Math.PI) / 180;

async function loadPano(file) {
  const { data, info } = await sharp(file)
    .resize({ width: PANO_WIDTH })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function render(pano, { yaw = 0, pitch = 0, fov = 80, width = 1600, height = 1200 }) {
  const out = Buffer.alloc(width * height * 3);
  const f = width / 2 / Math.tan(rad(fov) / 2);
  const cy = Math.cos(rad(yaw)), sy = Math.sin(rad(yaw));
  const cp = Math.cos(rad(pitch)), sp = Math.sin(rad(pitch));
  const { data, width: PW, height: PH } = pano;

  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      // Camera ray: x right, y up, z forward.
      const x = (i + 0.5 - width / 2) / f;
      const y = -(j + 0.5 - height / 2) / f;
      // Tilt by pitch (about x), then turn by yaw (about y).
      const y1 = y * cp + sp;
      const z1 = -y * sp + cp;
      const dx = x * cy + z1 * sy;
      const dz = -x * sy + z1 * cy;
      const lon = Math.atan2(dx, dz);
      const lat = Math.atan2(y1, Math.hypot(dx, dz));

      // Pano pixel, bilinear, wrapping left-right.
      const u = (lon / (2 * Math.PI) + 0.5) * PW - 0.5;
      const v = Math.min(Math.max((0.5 - lat / Math.PI) * PH - 0.5, 0), PH - 1);
      const u0 = Math.floor(u), v0 = Math.floor(v);
      const fu = u - u0, fv = v - v0;
      const ua = ((u0 % PW) + PW) % PW, ub = (ua + 1) % PW;
      const va = v0, vb = Math.min(v0 + 1, PH - 1);
      const o = (j * width + i) * 3;
      for (let c = 0; c < 3; c++) {
        const p00 = data[(va * PW + ua) * 3 + c], p10 = data[(va * PW + ub) * 3 + c];
        const p01 = data[(vb * PW + ua) * 3 + c], p11 = data[(vb * PW + ub) * 3 + c];
        out[o + c] = Math.round(
          (p00 * (1 - fu) + p10 * fu) * (1 - fv) + (p01 * (1 - fu) + p11 * fu) * fv,
        );
      }
    }
  }
  return { out, width, height };
}

// Load each pano once, however many views come from it.
const byPano = Map.groupBy(views, (v) => v.pano);
for (const [file, list] of byPano) {
  const pano = await loadPano(file);
  for (const view of list) {
    const { out, width, height } = render(pano, view);
    const target = path.join(outDir, `${view.name}.jpg`);
    await sharp(out, { raw: { width, height, channels: 3 } })
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(target);
    console.log(target);
  }
}
