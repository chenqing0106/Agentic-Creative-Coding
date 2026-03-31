function setup() {
  createCanvas(600, 600);
  colorMode(HSB, 360, 100, 100, 1);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(12);
  textFont('serif');
}

let theTimePerceived;
let yourSymmetries = [7, 11, 13, 17];
let theSpaceYouExist;
let particles = [];
let grassLayers = [];
let noiseScale = 0.01;
let rustGradient;

function draw() {
  if (!theTimePerceived) theTimePerceived = millis();
  theTimePerceived = millis();
  
  // Background: azure-blue sky (luminous but thin)
  background(210, 15, 95);
  
  // Horizon line
  let horizonY = height * 0.65;
  let pulse = map(sin(theTimePerceived * 0.0003), -1, 1, -5, 5);
  let horizonPulse = horizonY + pulse;
  
  // Rust-red gradient toward bottom (time settling)
  rustGradient = drawingContext.createLinearGradient(0, 0, 0, height);
  rustGradient.addColorStop(0, color(0, 0, 0, 0));
  rustGradient.addColorStop(0.7, color(0, 0, 0, 0));
  rustGradient.addColorStop(0.85, color(10, 60, 40, 0.15));
  rustGradient.addColorStop(1, color(10, 80, 10, 0.4));
  drawingContext.fillStyle = rustGradient;
  drawingContext.fillRect(0, horizonPulse, width, height - horizonPulse);
  
  // Grass layers with Perlin tremor
  for (let i = 0; i < 5; i++) {
    let layerY = horizonPulse + i * 15 + map(noise(theTimePerceived * 0.0005 + i * 10), 0, 1, -2, 2);
    let layerHeight = 8 + map(noise(theTimePerceived * 0.0003 + i * 7), 0, 1, -1.5, 1.5);
    fill(120, 30, 70 + i * 3);
    noStroke();
    rect(0, layerY, width, layerHeight);
  }
  
  // Literary text bleed — weathered paper texture + corroded typographic infection
  push();
  translate(width / 2, horizonPulse + 60);
  let txt = "grassland breathes time rusts silence";
  for (let i = 0; i < txt.length; i++) {
    let xOff = (i - txt.length / 2) * 12 + map(noise(theTimePerceived * 0.0002 + i * 0.3), 0, 1, -3, 3);
    let yOff = map(noise(theTimePerceived * 0.0004 + i * 0.7), 0, 1, -2, 2);
    let alpha = map(sin(theTimePerceived * 0.0008 + i), -1, 1, 0.1, 0.35);
    fill(30, 15, 30, alpha);
    text(txt[i], xOff, yOff);
  }
  pop();
  
  // Mandala dots on prime-numbered axes
  let centerX = width / 2;
  let centerY = horizonPulse * 0.7;
  let baseRadius = 80 + sin(theTimePerceived * 0.0002) * 15;
  
  for (let p of yourSymmetries) {
    for (let i = 0; i < 200; i++) {
      let angle = (i / 200) * TWO_PI * p + theTimePerceived * 0.0001;
      let radius = baseRadius + sin(theTimePerceived * 0.0003 + i * 0.1) * 20;
      let x = centerX + cos(angle) * radius;
      let y = centerY + sin(angle) * radius;
      
      // Perlin tremor
      let tx = map(noise(x * noiseScale + theTimePerceived * 0.0005), 0, 1, -1.5, 1.5);
      let ty = map(noise(y * noiseScale + theTimePerceived * 0.0007), 0, 1, -1.5, 1.5);
      x += tx;
      y += ty;
      
      // Color: soft saturation, high luminance, blue-purple-magenta cycling
      let hue = map(sin(theTimePerceived * 0.0004 + i * 0.05), -1, 1, 220, 300);
      let sat = 20 + map(cos(theTimePerceived * 0.0003 + i * 0.03), -1, 1, 0, 25);
      let lum = 85 + map(sin(theTimePerceived * 0.0006 + i * 0.07), -1, 1, -10, 10);
      fill(hue, sat, lum, 0.7);
      
      // Dot size pulsing
      let size = 0.8 + map(sin(theTimePerceived * 0.0008 + i * 0.09), -1, 1, 0, 1.2);
      ellipse(x, y, size, size);
    }
  }
  
  // Radial pulsing breath effect centered at horizon
  let breathRadius = map(sin(theTimePerceived * 0.00015), -1, 1, 100, 140);
  noFill();
  stroke(210, 10, 90, 0.2);
  strokeWeight(0.5);
  ellipse(centerX, horizonPulse, breathRadius * 2, breathRadius * 2);
  
  // Virus-like deformation spreading across lower region
  let deformIntensity = map(sin(theTimePerceived * 0.0001), -1, 1, 0, 0.3);
  for (let y = horizonPulse; y < height; y += 10) {
    for (let x = 0; x < width; x += 10) {
      let n = noise(x * 0.02 + y * 0.02 + theTimePerceived * 0.0003);
      if (n > 0.7) {
        let dx = map(noise(x * 0.03 + y * 0.03 + theTimePerceived * 0.0005), 0, 1, -deformIntensity * 5, deformIntensity * 5);
        let dy = map(noise(x * 0.03 + y * 0.03 + theTimePerceived * 0.0007), 0, 1, -deformIntensity * 5, deformIntensity * 5);
        // Visual hint: subtle rust speckle
        fill(10, 70, 30, 0.15);
        ellipse(x + dx, y + dy, 1.5, 1.5);
      }
    }
  }
}