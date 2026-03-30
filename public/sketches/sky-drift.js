let particles;

function setup() {
	createCanvas(windowWidth, windowHeight);
	background(66, 170, 245);
	clouds = [];
	particles = [];
	for(let i = 0; i < 20; i++) {
		clouds.push(new Cloud(random(width), random(height)));
	}
	for(let i = 0; i < 100; i++) {
		particles.push(new Particle());
	}
}

function draw() {
	{
		for(let i = 0; i < clouds.length; i++) {
			background(66, 170, 245);
			clouds[i].display();
		}
	}
	background(66, 170, 245);
	{
		for(let i = 0; i < particles.length; i++) {
			particles[i].move();
			particles[i].display();
		}
	}
	
	particles.filter((that) => {
		return that.x > 0 && that.x < width && that.y > 0 && that.y < height
	});
}