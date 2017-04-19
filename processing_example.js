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
	}

}

new p5(sketch)
