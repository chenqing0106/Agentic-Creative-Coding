function setup() {
  createCanvas(600, 600);
  colorMode(HSB, 360, 100, 100, 1);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(14);
  
  // Philosophical variables
  horizon_drift = 0;
  threshold_density = 0.35;
  lamplight_lament = 0;
  brick_entropy = 0.62;
  
  // Precompute radial symmetry axes (7 prime-numbered)
  symmetry_axes = [];
  for (let i = 0; i < 7; i++) {
    symmetry_axes.push((i * TWO_PI) / 7 + random(-0.05, 0.05));
  }
  
  // Particle system
  particles = [];
  const particleCount = floor(map(threshold_density, 0, 1, 80, 220));
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: random(width),
      y: random(height),
      size: random(0.8, 2.4),
      hue: random() > 0.5 ? 10 : 270, // rust-red (10) or blue-purple (270)
      sat: random(60, 90),
      bri: random(40, 85),
      phase: random(TWO_PI),
      freq: random(0.002, 0.008),
      amp: random(3, 12),
      orbitCenterX: random(width * 0.25, width * 0.75),
      orbitCenterY: random(height * 0.3, height * 0.65),
      orbitRadius: random(15, 45),
      orbitSpeed: random(0.003, 0.012),
      noiseOffset: random(1000)
    });
  }
  
  // Typography grid anchors
  typography = [];
  const cols = 5;
  const rows = 4;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = map(c, 0, cols - 1, 60, width - 60);
      const y = map(r, 0, rows - 1, 80, height - 80);
      const phrase = ['EXIT', 'STOP', 'WET PAINT', 'NO ENTRY', 'CLOSING', 'OPEN', '1973', 'VOID', 'FADING', 'LAMENT'][floor(random(10))];
      typography.push({ x, y, phrase, scale: 0.7 + random(-0.15, 0.25) });
    }
  }
}

function draw() {
  // Breathing background atmosphere
  horizon_drift += 0.0015;
  const skyHue = map(sin(horizon_drift), -1, 1, 200, 220); // azure drift
  const skySat = 75 - 20 * sin(horizon_drift * 0.7);
  const skyBri = 85 - 15 * cos(horizon_drift * 0.4);
  
  // Gradient top (azure/beige layer)
  for (let y = 0; y < height * 0.45; y++) {
    const t = map(y, 0, height * 0.45, 0, 1);
    const lerpHue = lerp(skyHue, 40, t * t * 0.7); // beige (40) bleeding in
    const lerpSat = lerp(skySat, 25, t * t * 0.5);
    const lerpBri = lerp(skyBri, 92, t * t * 0.6);
    fill(lerpHue, lerpSat, lerpBri);
    rect(0, y, width, 1);
  }
  
  // Near-black voids (alleyways/thresholds)
  fill(0, 0, 12);
  beginShape();
  vertex(0, height * 0.45);
  bezierVertex(
    width * 0.2, height * 0.55,
    width * 0.8, height * 0.55,
    width, height * 0.45
  );
  vertex(width, height);
  vertex(0, height);
  endShape(CLOSE);
  
  // Crumbling brick facade — pale yellow bleeding into rust-red
  const brickRows = 12;
  const brickCols = 20;
  for (let r = 0; r < brickRows; r++) {
    for (let c = 0; c < brickCols; c++) {
      const x = map(c, 0, brickCols - 1, 50, width - 50);
      const y = map(r, 0, brickRows - 1, height * 0.45, height * 0.85);
      const brickWidth = width / brickCols * 0.9;
      const brickHeight = (height * 0.4) / brickRows * 0.8;
      
      // Bleed gradient across row: yellow (50) → rust (10)
      const bleedT = map(c, 0, brickCols - 1, 0, 1);
      const brickHue = lerp(50, 10, pow(bleedT, 2) * brick_entropy);
      const brickSat = 70 - 20 * sin(r * 0.3 + frameCount * 0.01);
      const brickBri = 40 + 15 * cos(c * 0.2 + r * 0.15);
      
      fill(brickHue, brickSat, brickBri, 0.85);
      rect(x, y, brickWidth, brickHeight);
      
      // Subtle mortar lines
      if (r < brickRows - 1 || c < brickCols - 1) {
        fill(0, 0, 25, 0.3);
        if (c < brickCols - 1) rect(x + brickWidth, y, 2, brickHeight);
        if (r < brickRows - 1) rect(x, y + brickHeight, brickWidth, 2);
      }
    }
  }
  
  // Lampposts & fire escapes (structural anchors)
  push();
  stroke(0, 0, 95, 0.6);
  strokeWeight(1.8);
  // Lampposts
  for (let i = 0; i < 4; i++) {
    const x = map(i, 0, 3, 100, width - 100);
    const baseY = height * 0.45;
    const poleHeight = 120 + 20 * sin(frameCount * 0.003 + i);
    line(x, baseY, x, baseY - poleHeight);
    // Lamp glow
    noFill();
    stroke(50, 90, 98, 0.2);
    ellipse(x, baseY - poleHeight, 40 + 10 * sin(frameCount * 0.01 + i), 40 + 10 * cos(frameCount * 0.008 + i));
  }
  // Fire escape
  const fx = width * 0.85;
  const fy = height * 0.5;
  for (let s = 0; s < 6; s++) {
    const sy = fy + s * 25;
    strokeWeight(s === 0 ? 2.5 : 1.2);
    line(fx, sy, fx + 30, sy);
    if (s > 0) line(fx + 30, sy, fx + 30, sy - 25);
  }
  pop();
  
  // Particles — orbiting & trembling
  lamplight_lament += 0.005;
  for (let p of particles) {
    p.phase += p.freq;
    const orbitX = p.orbitCenterX + cos(p.phase) * p.orbitRadius;
    const orbitY = p.orbitCenterY + sin(p.phase * 0.7) * p.orbitRadius * 0.6;
    
    // Perlin tremble
    const tx = noise(p.noiseOffset + frameCount * 0.005, 0) * p.amp;
    const ty = noise(p.noiseOffset + 100, frameCount * 0.005) * p.amp;
    
    const x = orbitX + tx;
    const y = orbitY + ty;
    
    // Color pulse
    const pulse = sin(frameCount * 0.02 + p.noiseOffset) * 0.3 + 0.7;
    fill(p.hue, p.sat, p.bri * pulse, 0.85);
    circle(x, y, p.size);
  }
  
  // Typography grid — anchored, subtly fractured
  for (let t of typography) {
    push();
    translate(t.x, t.y);
    for (let a of symmetry_axes) {
      push();
      rotate(a);
      fill(0, 0, 15, 0.65);
      scale(t.scale);
      text(t.phrase, 0, 0);
      pop();
    }
    pop();
  }
  
  // Fading overlay to unify atmosphere
  fill(0, 0, 15, 0.03);
  rect(0, 0, width, height);
}