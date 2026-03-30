// ─── Parameters ───────────────────────────────────────────────────────────────
const n = 10;        // base font size (px)
const x = 8;         // horizontal char spacing (px)
const y = 10;        // vertical line spacing (px)
const r = 110;       // mouse influence radius (px)
const s = 4.5;       // max scale at epicenter
const t = 1.6;       // jitter duration (seconds)
const SPREAD_R = 22; // neighbor infection radius (px)

// ─── Kafka — The Metamorphosis (public domain, 1915) ──────────────────────────
const kafkaText = `One morning, when Gregor Samsa woke from troubled dreams, he found himself transformed in his bed into a horrible vermin. He lay on his armour-like back, and if he lifted his head a little he could see his brown belly, slightly domed and divided by arches into stiff sections. The bedding was hardly able to cover it and seemed ready to slide off any moment. His many legs, pitifully thin compared with the size of the rest of him, were waving helplessly as he looked. What has happened to me he thought. It was not a dream. His room, a proper human room although a little too small, lay peacefully between its four familiar walls. A collection of textile samples lay spread out on the table. Samsa was a travelling salesman. Above it there hung a picture that he had recently cut out of an illustrated magazine and housed in a nice gilded frame. It showed a lady fitted out with a fur hat and fur boa who sat upright raising a heavy fur muff that covered the whole of her lower arm towards the viewer. Gregor then turned to look out the window at the dull weather. His mother called him from one side and his father from the other each beseeching him to open the door but he could not decide with the door still locked whether to open it. Something had to change in his life. He was not free. He was trapped in his room trapped in his body trapped in a world that would not accept what he had become.`;

// ─── State ────────────────────────────────────────────────────────────────────
let img;
let chars = [];

// ─── CharCell ─────────────────────────────────────────────────────────────────
class CharCell {
  constructor(px, py, ch) {
    this.px = px;
    this.py = py;
    this.ch = ch;

    // Each char gets a unique noise seed so they move independently
    this.noiseOff = random(10000);

    // Single deformation value drives everything (0 = pristine, 1 = transformed)
    this.deform   = 0;
    this.rotation = 0;    // radians, accumulated
    this.jitterEnd = -1;

    this.neighbors = [];  // filled by buildCharGrid
  }

  // Push deformation upward (never resets)
  touch(amount) {
    this.deform = min(1, this.deform + amount);
    if (amount > 0.004) {
      this.jitterEnd = millis() + t * 1000;
    }
  }

  update(mx, my) {
    const d = dist(mx, my, this.px, this.py);

    // Mouse influence — 1.3 power: punchy center, still reaches the edge
    if (d < r) {
      const inf = pow(1 - d / r, 1.3);
      this.touch(inf * 0.15);          // 3× faster deform
      this.rotation += inf * 0.10;     // faster spin
    }

    // Idle drift — deformed chars keep rotating, noticeably
    if (this.deform > 0) {
      this.rotation += 0.0015 * this.deform;
    }

    // Infection spread — faster bleed to neighbors
    if (this.deform > 0.15 && random() < 0.025) {
      for (const nb of this.neighbors) {
        if (nb.deform < this.deform - 0.04) {
          nb.touch(this.deform * 0.012);
        }
      }
    }
  }

  draw() {
    const jittering = millis() < this.jitterEnd;
    let jx = 0, jy = 0;

    if (this.deform > 0) {
      // Perlin noise idle sway — always on for deformed chars
      const ns   = 0.014;
      const sAmp = 1.8 * this.deform;
      jx = (noise(this.noiseOff,       frameCount * ns) - 0.5) * sAmp;
      jy = (noise(this.noiseOff + 500, frameCount * ns) - 0.5) * sAmp;

      // Extra turbulence during jitter window
      if (jittering) {
        const jAmp = 9 * this.deform;
        jx += (noise(this.noiseOff + 1000, frameCount * 0.08) - 0.5) * jAmp;
        jy += (noise(this.noiseOff + 1500, frameCount * 0.08) - 0.5) * jAmp;
      }
    }

    const sc   = 1 + (s - 1) * this.deform;
    const bold = this.deform > 0.1;

    // Color: warm near-black (#16100a) → deep rust (#8b3512)
    const baseC   = color(22, 16, 10);
    const deformC = color(139, 53, 18);
    const fillC   = lerpColor(baseC, deformC, pow(this.deform, 0.55));

    push();
    translate(this.px + jx, this.py + jy);
    rotate(this.rotation);
    scale(sc);
    textAlign(CENTER, CENTER);
    textSize(n);
    textStyle(bold ? BOLD : NORMAL);
    fill(fillC);
    noStroke();
    text(this.ch, 0, 0);
    pop();
  }
}

// ─── p5 lifecycle ─────────────────────────────────────────────────────────────
function preload() {
  img = loadImage(
    'imgs/bug.png',
    () => {},
    () => {
      noLoop();
      document.body.innerHTML =
        '<div style="font-family:monospace;padding:2rem;color:#c00">' +
        'Cannot load image via file:// protocol.<br>' +
        'Run: <code>python3 -m http.server 8080</code><br>' +
        'Then open <a href="http://localhost:8080">http://localhost:8080</a></div>';
    } 
  );
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('Special Elite');
  buildCharGrid();
}

function buildCharGrid() {
  chars = [];
  let textIndex = 0;

  // Fit image to viewport
  const sc = min(width / img.width, height / img.height) * 0.96;
  const iw = img.width  * sc;
  const ih = img.height * sc;
  const ox = (width  - iw) / 2;
  const oy = (height - ih) / 2;

  img.loadPixels();

  for (let cy = oy + y; cy < oy + ih - y; cy += y) {
    for (let cx = ox + x * 0.5; cx < ox + iw - x; cx += x) {
      const ix   = floor((cx - ox) / iw * img.width);
      const iy   = floor((cy - oy) / ih * img.height);
      const pidx = (iy * img.width + ix) * 4;
      const bri  = (img.pixels[pidx] + img.pixels[pidx + 1] + img.pixels[pidx + 2]) / 3;

      if (bri < 128) {
        // Skip whitespace from source text — always place a visible glyph
        let ch;
        do {
          ch = kafkaText[textIndex % kafkaText.length];
          textIndex++;
        } while (ch === ' ' || ch === '\n');
        chars.push(new CharCell(cx, cy, ch));
      }
    }
  }

  // Precompute neighbors using spatial hash (O(n) instead of O(n²))
  const cellSize = SPREAD_R;
  const grid = new Map();

  for (let i = 0; i < chars.length; i++) {
    const col = Math.floor(chars[i].px / cellSize);
    const row = Math.floor(chars[i].py / cellSize);
    const key = col * 100000 + row;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(i);
  }

  const R2 = SPREAD_R * SPREAD_R;
  for (let i = 0; i < chars.length; i++) {
    const col = Math.floor(chars[i].px / cellSize);
    const row = Math.floor(chars[i].py / cellSize);
    chars[i].neighbors = [];
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        const bucket = grid.get((col + dc) * 100000 + (row + dr));
        if (!bucket) continue;
        for (const j of bucket) {
          if (i === j) continue;
          const dx = chars[i].px - chars[j].px;
          const dy = chars[i].py - chars[j].py;
          if (dx * dx + dy * dy < R2) {
            chars[i].neighbors.push(chars[j]);
          }
        }
      }
    }
  }
}

function draw() {
  background(244, 238, 228); // warm paper

  for (const c of chars) {
    c.update(mouseX, mouseY);
    c.draw();
  }
}

// Click: instant explosion burst — chars near mouse get slammed
function mousePressed() {
  const burstR = r * 1.4;
  for (const c of chars) {
    const d = dist(mouseX, mouseY, c.px, c.py);
    if (d < burstR) {
      const inf = pow(1 - d / burstR, 1.5);
      c.touch(inf * 0.7);           // massive instant deform
      c.rotation += inf * 0.8;      // snap rotation
      c.jitterEnd = millis() + t * 1000;
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  buildCharGrid();
}
