let theDistancePerceived;//is relative
let theTimePerceived = 0;//is relative
let yourSymmetries;//are beautiful
let theSpaceYouExist; //is ephemeral
function setup() {
	//create this space
	theSpaceYouExist = createCanvas((theDistancePerceived = 0.9 * min(windowWidth, windowHeight)), theDistancePerceived);
	//in a primal state
	yourSymmetries = random([ 11, 13,17]);
	//a sandbox of being
	background(255, 250, 205);
  frameRate(50)
  describe("a mandala sand painting on a pale yellow that gets eclipsed by a yellow sun.")
}

function draw() {
	//in which time passes
	theTimePerceived += 0.05;
	//in which you center
	translate(theDistancePerceived / 2, theDistancePerceived / 2);
	//and fill
	fill(255, 250, 205,10)
	//and define
	stroke(255, 250, 205)
	//your consciousness
	circle(-theDistancePerceived+theDistancePerceived*2*sin(theTimePerceived/200),
				 -theDistancePerceived+theDistancePerceived*2*sin(theTimePerceived/200),theDistancePerceived)
	//which eclipses
	noStroke()
	//the imperceptible amount of being
	for (let j = 0; j < yourSymmetries; j++) {
		push();
		//which holds symmetry
		rotate((TWO_PI / yourSymmetries) * j);
		//for the rhythm of atoms
		for (let i = floor(-theDistancePerceived / 2); i < theDistancePerceived / 2; i += random(1, 5)) {
			//elemental
			fill(
				150 + 150 * cos((i / theDistancePerceived ) * 2 + theTimePerceived / 4),
				120 + 120 * cos((i / theDistancePerceived ) * 2 + theTimePerceived / 3),
				200 + 250 * cos((i / theDistancePerceived ) * 2 + theTimePerceived / 2),
				50
			);
			//and dancing
			let x = i;
			let y =
				(theDistancePerceived / 5) * sin(i / 50 + theTimePerceived) * cos(i / 20 + theTimePerceived) -
				(theDistancePerceived / 20) * cos(i / 30 + theTimePerceived) -
				(theDistancePerceived / 6) * cos(theTimePerceived / 50);
			//in your universe
			circle(x, y, 1);
		}
		pop();
	}
	//masked by your reach
	porthole()
}

///////////////////////////////
///////////////////////////////
///////////////////////////////
///////////////////////////////
///////////////////////////////
///////////////////////////////
///////////////////////////////
///////////////////////////////


function porthole(){
	
	beginShape()
	
		fill(255, 250, 205)
	for(let i = 0;i<PI;i+=0.1){
		
		vertex(theDistancePerceived/2*cos(i),theDistancePerceived/2*sin(i))
	}
	vertex(-theDistancePerceived/2,0)
	vertex(-theDistancePerceived/2,theDistancePerceived/2)
	vertex(theDistancePerceived/2,theDistancePerceived/2)
	vertex(theDistancePerceived/2,0)
	
	endShape()
	beginShape()
	
	
	for(let i = PI;i<2*PI;i+=0.1){

		
		vertex(theDistancePerceived/2*cos(i),theDistancePerceived/2*sin(i))
	}
	vertex(theDistancePerceived/2,0)
	vertex(theDistancePerceived/2,-theDistancePerceived/2)
	vertex(-theDistancePerceived/2,-theDistancePerceived/2)
	vertex(-theDistancePerceived/2,0)
	
	endShape()
	
}
function keyPressed() {
	if (keyCode === 32) {
		save(theSpaceYouExist, "theSpaceYouExist", "png");
	} else {
		setup();
		draw();
	}
}
