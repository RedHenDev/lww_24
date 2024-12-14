AFRAME.registerComponent('snow-system', {
    schema: {
      count: {type: 'number', default: 10000},
      flakeSize: {type: 'number', default: 0.08},
      range: {type: 'number', default: 25},
      height: {type: 'number', default: 30},
      snowing: {type: 'boolean', default: false}
    },
  
    init: function() {
      // Create geometry for all particles.
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(this.data.count * 3);
      const velocities = [];
      
      for (let i = 0; i < this.data.count; i++) {
        // Random starting positions.
        positions[i * 3] = (Math.random() - 0.5) * this.data.range;
        positions[i * 3 + 1] = Math.random() * this.data.height;
        positions[i * 3 + 2] = (Math.random() - 0.5) * this.data.range;
        
        // Random velocities.
        velocities.push({
          y: -(Math.random() * 2 + 1),
          x: Math.random() * 0.5 - 0.25
        });
      }
      
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      // Create material with custom texture
      const texture = new THREE.TextureLoader().load(
        'flake_1.png'
      );
        // 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAD1JREFUeNpiYGBg2AvE/6H0PiCGsfdCxRgYoYL7kRTsB2EmJPZ+JAUwMXQF+6GaGJEl0E0gIAtkS4AEGAAj5QgXdpY9tQAAAABJRU5ErkJggg=='
    //   );
  
      // Size of 0.025 is pretty good. Trying 0.08.
      const material = new THREE.PointsMaterial({
        size: 0.08,
        map: texture,
        transparent: true,
        opacity: 0.9,
        vertexColors: false,
        blending: THREE.AdditiveBlending
      });
  
      this.points = new THREE.Points(geometry, material);
      this.el.setObject3D('particle-system', this.points);

      this.bod=this.el.object3D;
      
      this.velocities = velocities;

      // Grab the player.
      this.pl = document.querySelector('#player').object3D;

    },
  
    tick: function(time, deltaTime) {

        
        if (!this.data.snowing) {
            this.el.object3D.visible=false;
            //this.el.object3D.position=this.pl.position;
            return;
        }
        this.el.object3D.visible=true;

        // Pursue player.
        this.bod.position.x += (this.pl.position.x - this.bod.position.x) * 0.02;
        this.bod.position.z += (this.pl.position.z - this.bod.position.z) * 0.02;
        this.bod.position.y += (this.pl.position.y - this.bod.position.y) * 0.02;


      const positions = this.points.geometry.attributes.position.array;
      const dt = deltaTime*0.001;

      for (let i = 0; i < this.data.count; i++) {
        // Update positions.
        positions[i * 3 + 1] += this.velocities[i].y * dt;
        positions[i * 3] += this.velocities[i].x * dt;
        
        // Reset particles that fall below ground.
        if (positions[i * 3 + 1]+this.pl.position.y <= -12) {
          positions[i * 3] = (Math.random() - 0.5) * this.data.range;
          positions[i * 3 + 1] = this.data.height;
          positions[i * 3 + 2] = (Math.random() - 0.5) * this.data.range;
        }
      }
      
      this.points.geometry.attributes.position.needsUpdate = true;
    },
  
    remove: function() {
      this.el.removeObject3D('particle-system');
    }
  });