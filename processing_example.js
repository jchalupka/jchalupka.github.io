const sketch = (p) => {
	let vehicles = [];
	let beaver_img = p.loadImage('beaver4.png');


	p.setup = () => {
		p.createCanvas(600, 400);

		for (let i = 0; i < 10; i++) {
			vehicles[i] = new Vehicle(p.random(p.width), p.random(p.height));
		}
	}

	p.draw = () => {
		p.background(51)

		for (let i = 0; i < vehicles.length; i++) {
			vehicles[i].run();
		}
		//p.rect(p.width/2, p.height/2, 200, 200);
	}
	class Vehicle {
		constructor(x, y) {
				this.acceleration = p.createVector(0, 0);
				this.velocity = p5.Vector.random2D();
				this.position = p.createVector(x, y);
				this.r = 3.0;
				this.maxspeed = 3;
				this.maxforce = 0.05;
		}

		run() {
			this.update();
			this.seekMouse();
			this.flock();
			this.borders();
			this.render();
		}

		applyForce(force) {
			this.acceleration.add(force);
		}

		update() {
			this.velocity.add(this.acceleration);
			this.velocity.limit(this.maxspeed);
			this.position.add(this.velocity);
			// Reset acceleration to 0 each cycle
			this.acceleration.mult(0);
		}

		borders() {
			if (this.position.x < -this.r) this.position.x = p.width + this.r;
			if (this.position.y < -this.r) this.position.y = p.height + this.r;
			if (this.position.x > p.width + this.r) this.position.x = -this.r;
			if (this.position.y > p.height + this.r) this.position.y = -this.r;

		}

		render() {
			p.fill(127, 127);
			p.stroke(200);
			//p.ellipse(this.position.x, this.position.y, 16, 16);
			p.image(beaver_img, this.position.x, this.position.y, 50, 50)
		}

		seekMouse() {
			const mouse_pos = p.createVector(p.mouseX, p.mouseY);

			const seek_force = this.seek(mouse_pos);
			this.applyForce(seek_force);

		}

		seek(target) {
			let desired = p5.Vector.sub(target, this.position);
			desired.normalize();
			desired.mult(this.maxspeed);

			let steer = p5.Vector.sub(desired, this.velocity);
			steer.limit(this.maxforce);

			return steer;
		}

		flock() {
			let sep = this.seperate();
			let ali = this.align();
			let coh = this.cohesion();

			sep.mult(2.5);
			ali.mult(1.0);
			coh.mult(1.0);

			this.applyForce(sep);
			this.applyForce(ali);
			this.applyForce(coh);
		}

		seperate() {
			let desired = 50;
			let steer = p.createVector(0, 0);
			let count = 0;
			for (let i = 0; i < vehicles.length; i++) {
				let d = p5.Vector.dist(this.position, vehicles[i].position);
				
				if ((d > 0) && (d < desired)) {
					// Calculate vector pointing away from neighbor
					var diff = p5.Vector.sub(this.position, vehicles[i].position);
					diff.normalize();
					diff.div(d); // Weight by distance
					steer.add(diff);
					count++; // Keep track of how many
				}
			}
			if (count > 0) {
				steer.div(count);
			}

			if (steer.mag() > 0) {
				// Implement Reynolds: Steering = Desired - Velocity
				steer.normalize();
				steer.mult(this.maxspeed);
				steer.sub(this.velocity);
				steer.limit(this.maxforce);
			}
			return steer;
		}

		align() {
			var neighbordist = 50;
			var sum = p.createVector(0, 0);
			var count = 0;
			for (var i = 0; i < vehicles.length; i++) {
				var d = p5.Vector.dist(this.position, vehicles[i].position);
				if ((d > 0) && (d < neighbordist)) {
				sum.add(vehicles[i].velocity);
				count++;
				}
			}
			if (count > 0) {
				sum.div(count);
				sum.normalize();
				sum.mult(this.maxspeed);
				var steer = p5.Vector.sub(sum, this.velocity);
				steer.limit(this.maxforce);
				return steer;
			} else {
				return p.createVector(0, 0);
			}
		}

		cohesion() {
			var neighbordist = 50;
			var sum = p.createVector(0, 0); // Start with empty vector to accumulate all locations
			var count = 0;
			for (var i = 0; i < vehicles.length; i++) {
				var d = p5.Vector.dist(this.position, vehicles[i].position);
				if ((d > 0) && (d < neighbordist)) {
				sum.add(vehicles[i].position); // Add location
				count++;
				}
			}
			if (count > 0) {
				sum.div(count);
				return this.seek(sum); // Steer towards the location
			} else {
				return p.createVector(0, 0);
			}
		}
	}

}

new p5(sketch)
