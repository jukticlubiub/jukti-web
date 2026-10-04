/*
 * Hero backdrop: the eclipse from the homepage design.
 *
 * One full-screen pass draws, back to front:
 *   sky      charcoal at the top warming to burnt orange toward the horizon, brighter at the sides
 *   lava     domain-warped noise flowing along the planet's rim, blurred by construction (low frequency)
 *   planet   near-black disc with a warm inner rim and a thin rim line
 *   ribs     each vertical stripe acts as a small lens over everything above (fluted glass)
 *
 * Colors are sRGB values straight from the design and written to the screen as-is
 * (no tone mapping or color-space conversion in this material).
 */

export const eclipseVertex = /* glsl */ `
  void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const eclipseFragment = /* glsl */ `
  uniform vec2  uRes;     // canvas size, device px
  uniform float uViewH;   // hero height (canvas minus the tail), device px
  uniform vec3  uPlanet;  // centre x, top y (from canvas top), radius; device px
  uniform float uRib;     // rib width, device px
  uniform float uDpr;
  uniform vec2  uMouse;   // eased pointer, device px from canvas top-left
  uniform float uTime;
  uniform float uHeat;    // lava intensity, rises as the hero scrolls away

  const vec3 C_TOP      = vec3(0.082, 0.082, 0.082); // #151515
  const vec3 C_DUSK     = vec3(0.082, 0.059, 0.047); // #150F0C, just below the header
  const vec3 C_HORIZON  = vec3(0.298, 0.114, 0.031); // #4C1D08
  const vec3 C_EMBER_1  = vec3(0.259, 0.106, 0.031); // #421B08
  const vec3 C_EMBER_2  = vec3(0.400, 0.165, 0.067); // #662A11
  const vec3 C_LAVA     = vec3(0.784, 0.290, 0.102); // #C84A1A
  const vec3 C_FLARE    = vec3(0.961, 0.486, 0.282); // #F57C48
  const vec3 C_PLANET   = vec3(0.043, 0.016, 0.004); // #0B0401
  const vec3 C_RIM_IN   = vec3(0.310, 0.114, 0.034); // warm light inside the rim; with C_PLANET gives #5A210A
  const vec3 C_RIM_LINE = vec3(0.520, 0.205, 0.075);

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < OCTAVES; i++) {
      v += a * vnoise(p);
      p = m * p;
      a *= 0.5;
    }
    return v;
  }

  vec3 lavaRamp(float h) {
    vec3 c = mix(vec3(0.0), C_EMBER_1, smoothstep(0.0, 0.3, h));
    c = mix(c, C_EMBER_2, smoothstep(0.25, 0.55, h));
    c = mix(c, C_LAVA, smoothstep(0.5, 0.82, h));
    return mix(c, C_FLARE, smoothstep(0.8, 1.0, h));
  }

  vec3 scene(vec2 px) {
    float W = uRes.x;
    float H = uViewH;
    float R = uPlanet.z;
    vec2 centre = vec2(uPlanet.x, uPlanet.y + R);
    vec2 d = px - centre;
    float sd = length(d) - R;           // signed distance to the rim; > 0 outside the planet
    float outside = max(sd, 0.0);
    float inside = max(-sd, 0.0);
    float t = uTime;

    // Sky: neutral charcoal at the top, a warm dark under the header, then burnt orange
    // from a quarter of the way down (fit to the design's samples). Stronger at the sides.
    float ty = clamp((px.y - 0.1 * H) / (0.85 * H), 0.0, 1.0);
    float side = smoothstep(0.0, 0.5 * W, abs(d.x));
    vec3 sky = mix(C_TOP, C_DUSK, smoothstep(0.0, 0.25 * H, px.y));
    sky = mix(sky, C_HORIZON, smoothstep(0.25 * H, 0.85 * H, px.y) * (0.55 + 0.45 * side));
    sky += C_EMBER_1 * exp(-outside / (0.06 * W)) * (0.05 + 0.25 * side * side); // halo along the rim, toward the sides
    sky *= 1.0 - smoothstep(H, 1.3 * H, px.y);

    // Pointer light: the glow leans toward the cursor.
    float mouseLight = exp(-length(px - uMouse) / (0.32 * W));
    sky += C_LAVA * mouseLight * 0.08 * (0.25 + ty);

    // Lava: noise in rim-aligned coordinates so it flows along the arc and drifts upward.
    float along = atan(d.x, -d.y) * R / (0.16 * W);
    vec2 q = vec2(along, outside / (0.065 * W));
    float heat = 0.0;
    float band = exp(-outside / (0.045 * W)) * (0.15 + 0.7 * side * side);
    if (band > 0.004) {
      vec2 warp = vec2(fbm(q * 0.9 + vec2(0.0, -0.10 * t)),
                       fbm(q * 0.9 + vec2(4.7, 1.3) + vec2(0.07 * t, 0.0)));
      float lava = fbm(q + 2.2 * warp + vec2(0.035 * t, -0.08 * t));
      heat = smoothstep(0.36, 0.84, lava) * band * uHeat;
    }
    vec3 outsideCol = sky + lavaRamp(heat) * 0.6;

    // Planet body: warm just inside the rim, black toward the middle. The rim pulses with the lava.
    float rimHeat = 0.0;
    if (inside < 0.2 * W) rimHeat = smoothstep(0.35, 0.8, fbm(vec2(along * 1.3, t * 0.12)));
    vec3 body = mix(C_PLANET, vec3(0.0), smoothstep(0.1 * H, 0.6 * H, inside));
    float inner = inside / (0.057 * W);
    body += C_RIM_IN * exp(-inner * inner) * (0.95 + 0.3 * rimHeat * uHeat);

    vec3 col = mix(outsideCol, body, smoothstep(0.75 * uDpr, -0.75 * uDpr, sd));
    col += C_RIM_LINE * exp(-abs(sd) / (1.5 * uDpr)) * (0.5 + 0.5 * rimHeat * uHeat);
    return col;
  }

  void main() {
    vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);

    // Fluted glass: each rib shows a mirrored slice of what's behind it, and the slice
    // slides as the pointer moves across the screen.
    float local = fract(px.x / uRib);
    float lean = uMouse.x / uRes.x - 0.5;
    float lens = (local - 0.5) * uRib * (-0.28 + 0.5 * lean);
    vec3 col = scene(vec2(px.x + lens, px.y));

    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    float edge = smoothstep(0.07, 0.0, local) + 0.35 * smoothstep(0.93, 1.0, local);
    col += vec3(1.0, 0.72, 0.52) * edge * (0.012 + lum * 0.22);
    col *= 1.0 - 0.1 * smoothstep(0.6, 1.0, local);

    // Dither so the long dark gradients don't band.
    col += (hash(px + fract(uTime) * 91.7) - 0.5) * (1.5 / 255.0);
    gl_FragColor = vec4(col, 1.0);
  }
`;
