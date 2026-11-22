/* WebGL „aurora“ glow – převzato z jonasrech.com (SiteFooter), přepsané do čitelné podoby.
   Vlní se pomalu, na kurzor reaguje zvednutím záře, při reduced-motion vykreslí jeden statický snímek. */

const MAX_STOPS = 5;
const MAX_LAYERS = 3;

const FRAG = `#version 300 es
precision highp float;
precision highp int;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uStops[${MAX_STOPS}];
uniform int uStopCount;
uniform float uAmplitude;
uniform float uBlend;
uniform float uHeight;
uniform float uScale;
uniform float uGlow;
uniform float uBrightness;
uniform int uLayers;
uniform float uFlip;
uniform vec3 uPointer;
uniform float uReveal;
uniform float uOpacity;
out vec4 outColor;

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float smootherstep(float e0, float e1, float x) {
  float t = clamp((x - e0) / (e1 - e0), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

vec3 oklabToLinear(vec3 c) {
  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  l = l * l * l; m = m * m * m; s = s * s * s;
  return vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  );
}

vec3 toSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

vec3 ramp(float t) {
  float x = clamp(t, 0.0, 1.0) * float(uStopCount - 1);
  int i = int(min(floor(x), float(uStopCount - 2)));
  float f = x - float(i);
  f = f * f * (3.0 - 2.0 * f);
  vec3 lch = mix(uStops[i], uStops[i + 1], f);
  return toSrgb(oklabToLinear(vec3(lch.x, lch.y * cos(lch.z), lch.y * sin(lch.z))));
}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  float y = 1.0 - frag.y / uResolution.y;
  y = mix(y, 1.0 - y, uFlip);
  float u = frag.x / uResolution.x;
  float X = (frag.x - uResolution.x * 0.5) / uResolution.y;
  float t = uTime;
  float reach = uPointer.z * exp(-pow((X - uPointer.x) / 0.38, 2.0));

  vec3 glow = vec3(0.0);
  float cover = 0.0;
  for (int k = 0; k < ${MAX_LAYERS}; k++) {
    if (k >= uLayers) break;
    float layer = float(k);
    float seed = layer * 13.7;
    float pace = t * (1.0 - layer * 0.18);
    float warp = snoise(vec2(X * 0.45 * uScale + pace * 0.02 + seed, pace * 0.05 + seed));
    float wave = snoise(vec2(X * 0.75 * uScale + warp * 0.35 - pace * 0.03 + seed, pace * 0.07 - seed)) * 0.72
      + snoise(vec2(X * 1.6 * uScale + warp * 0.5 + pace * 0.04 - seed, pace * 0.1 + seed * 0.5)) * 0.28;
    float hem = uHeight + layer * 0.07 + wave * 0.15 * uAmplitude;
    hem += reach * 0.08 * (layer < 0.5 ? 1.0 : 0.4);
    hem = mix(-0.25, hem, uReveal);

    float soft = (0.04 + uBlend * 0.16) * (1.0 + layer * 0.9);
    float rise = hem - y;
    float low = -soft - uGlow * 0.14;
    float high = 0.26 + soft * 0.6;
    float body = pow(smootherstep(low, high, rise), 1.5 + uGlow * 0.6);
    float lobes = 0.86 + 0.14 * snoise(vec2(X * 0.9 * uScale - pace * 0.025 + seed, y * 0.3 + pace * 0.04));
    float alpha = body * lobes * (layer < 0.5 ? 1.0 : 0.32 / layer);
    alpha = clamp(alpha * (1.0 + reach * 0.25 * smootherstep(0.9, 0.0, abs(y - hem))), 0.0, 1.0);

    vec3 tint = ramp(u + 0.05 * sin(pace * 0.08 + layer * 2.3) + layer * 0.1 + max(rise, 0.0) * 0.05);
    glow = 1.0 - (1.0 - glow) * (1.0 - tint * alpha);
    cover = 1.0 - (1.0 - cover) * (1.0 - alpha);
  }

  float fade = smootherstep(0.0, 0.7, uReveal) * uOpacity;
  float strength = clamp(uBrightness, 0.0, 2.0);
  glow *= fade * min(strength, 1.0);
  cover *= fade * min(strength, 1.0);
  glow = 1.0 - pow(1.0 - glow, vec3(max(strength, 1.0)));
  float dither = (hash(frag) - 0.5) / 255.0;
  outColor = vec4(glow + dither, clamp(cover + dither, 0.0, 1.0));
}`;

const VERT = `#version 300 es
in vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }`;

export interface AuroraOptions {
  colorStops?: string[];
  amplitude?: number;
  blend?: number;
  height?: number;
  speed?: number;
  glow?: number;
  scale?: number;
  brightness?: number;
  layers?: number;
  direction?: 'top' | 'bottom';
  mouseInteraction?: boolean;
  intro?: boolean;
  opacity?: number;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function cssColorToRgb(color: string): [number, number, number] {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!ctx) return [1, 1, 1];
  ctx.fillStyle = '#ffffff';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
}

/* sRGB → OKLCH (L, C, h) */
function rgbToOklch(rgb: [number, number, number]): [number, number, number] {
  const [r, g, b] = rgb.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), Math.atan2(B, A)];
}

/* odstíny „rozbalí“ tak, aby interpolace šla kratší cestou po kruhu */
function unwrapHues(stops: [number, number, number][]) {
  const first = stops.findIndex((s) => s[1] > 0.02);
  let prev = first === -1 ? 0 : stops[first][2];
  return stops.map((s) => {
    let h = s[1] > 0.02 ? s[2] : prev;
    while (h - prev > Math.PI) h -= Math.PI * 2;
    while (h - prev < -Math.PI) h += Math.PI * 2;
    prev = h;
    return [s[0], s[1], h] as [number, number, number];
  });
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

function createProgram(gl: WebGL2RenderingContext) {
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.bindAttribLocation(program, 0, 'aPosition');
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  const uniforms: Record<string, WebGLUniformLocation | null> = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    if (info) uniforms[info.name.replace('[0]', '')] = gl.getUniformLocation(program, info.name);
  }
  return { program, uniforms };
}

/** Vloží canvas s aurorou do `host`. Vrací funkci pro úklid, nebo null (bez WebGL2). */
export function mountAurora(host: HTMLElement, opts: AuroraOptions = {}) {
  const stopsIn = (opts.colorStops ?? ['#c93b00', '#5e0a00', '#ff6027']).slice(0, MAX_STOPS);
  const cfg = {
    stops: stopsIn.length >= 2 ? stopsIn : [stopsIn[0] ?? '#fff', stopsIn[0] ?? '#fff'],
    amplitude: Math.max(0, opts.amplitude ?? 1),
    blend: clamp(opts.blend ?? 0.5, 0, 1),
    speed: opts.speed ?? 1,
    height: clamp(opts.height ?? 0.45, 0, 1),
    scale: Math.max(0.1, opts.scale ?? 1),
    glow: Math.max(0, opts.glow ?? 0.6),
    brightness: Math.max(0, opts.brightness ?? 1),
    layers: clamp(Math.round(opts.layers ?? 1), 1, MAX_LAYERS),
    flip: opts.direction === 'bottom' ? 1 : 0,
    mouse: opts.mouseInteraction ?? true,
    intro: opts.intro ?? true,
    opacity: clamp(opts.opacity ?? 1, 0, 1),
  };

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
  if (!gl) return null;
  const prog = createProgram(gl);
  if (!prog) return null;
  host.append(canvas);

  const u = prog.uniforms;
  const buffer = gl.createBuffer();
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stops = new Float32Array(MAX_STOPS * 3);
  unwrapHues(cfg.stops.map((c) => rgbToOklch(cssColorToRgb(c)))).forEach((s, i) => stops.set(s, i * 3));

  const size = { width: 1, height: 1 };
  const pointer = { x: 0, y: 0, inside: false };
  const st = { clock: 0, px: 0, py: 0.5, reach: 0, reveal: cfg.intro && !reduce ? 0 : 1 };
  let raf = 0;
  let last = 0;
  let visible = true;

  const draw = () => {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(prog.program);
    gl.bindVertexArray(vao);
    gl.uniform2f(u.uResolution, canvas.width, canvas.height);
    gl.uniform1f(u.uTime, st.clock);
    gl.uniform3fv(u.uStops, stops);
    gl.uniform1i(u.uStopCount, cfg.stops.length);
    gl.uniform1f(u.uAmplitude, cfg.amplitude);
    gl.uniform1f(u.uBlend, cfg.blend);
    gl.uniform1f(u.uHeight, cfg.height);
    gl.uniform1f(u.uScale, cfg.scale);
    gl.uniform1f(u.uGlow, cfg.glow);
    gl.uniform1f(u.uBrightness, cfg.brightness);
    gl.uniform1i(u.uLayers, cfg.layers);
    gl.uniform1f(u.uFlip, cfg.flip);
    gl.uniform3f(u.uPointer, st.px, st.py, st.reach);
    gl.uniform1f(u.uReveal, 1 - (1 - st.reveal) ** 3);
    gl.uniform1f(u.uOpacity, cfg.opacity);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const frame = (now: number) => {
    raf = 0;
    if (!visible || document.hidden) return;
    const dt = last ? clamp((now - last) / 1000, 0.0005, 0.05) : 1 / 60;
    last = now;
    if (reduce) {
      draw();
      last = 0;
      return;
    }
    st.clock += dt * cfg.speed;
    const active = cfg.mouse && pointer.inside;
    const k = 1 - Math.exp(-dt / 0.6);
    if (active) {
      const tx = (pointer.x - size.width / 2) / size.height;
      const ty = cfg.flip ? 1 - pointer.y / size.height : pointer.y / size.height;
      st.px += (tx - st.px) * k;
      st.py += (ty - st.py) * k;
    }
    st.reach += ((active ? 1 : 0) - st.reach) * (1 - Math.exp(-dt / (active ? 0.9 : 1.4)));
    if (st.reveal < 1) st.reveal = Math.min(1, st.reveal + dt / 2.4);
    draw();
    raf = requestAnimationFrame(frame);
  };

  const start = () => {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
  };

  const resize = () => {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    size.width = w;
    size.height = h;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    draw();
    start();
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const r = host.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
    const was = pointer.inside;
    pointer.inside = pointer.x >= 0 && pointer.y >= 0 && pointer.x <= r.width && pointer.y <= r.height;
    if (pointer.inside && !was) {
      st.px = (pointer.x - r.width / 2) / Math.max(1, r.height);
      st.py = cfg.flip ? 1 - pointer.y / Math.max(1, r.height) : pointer.y / Math.max(1, r.height);
    }
  };
  const onLeave = () => (pointer.inside = false);
  const onVisibility = () => {
    last = 0;
    start();
  };

  const ro = new ResizeObserver(resize);
  ro.observe(host);
  const io = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    if (visible) {
      last = 0;
      start();
    }
  });
  io.observe(host);
  if (cfg.mouse && !reduce) {
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
  }
  document.addEventListener('visibilitychange', onVisibility);
  resize();

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
    window.removeEventListener('pointermove', onMove);
    document.documentElement.removeEventListener('pointerleave', onLeave);
    document.removeEventListener('visibilitychange', onVisibility);
    gl.deleteProgram(prog.program);
    gl.deleteBuffer(buffer);
    gl.deleteVertexArray(vao);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    canvas.remove();
  };
}
