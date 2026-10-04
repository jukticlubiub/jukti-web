// Copies MapLibre's web worker (and the chunk it imports) into public/, so the Contact
// map can load it from this site. Next's bundler can't follow the dynamic URL MapLibre
// uses to find its worker. Runs before `dev` and `build`, so it always matches the
// installed version. The output folder is git-ignored.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules/maplibre-gl/dist");
const to = join(root, "public/vendor/maplibre");

mkdirSync(to, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(join(from, file), join(to, file));
}
