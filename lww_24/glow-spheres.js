AFRAME.registerComponent('sphere-generator', {
    schema: {
        interval: {type: 'number', default: 2000}, // Time between sphere spawns in ms
        maxSpheres: {type: 'number', default: 50}, // Maximum number of spheres
        minRadius: {type: 'number', default: 0.2},
        maxRadius: {type: 'number', default: 12},
        life: {type: 'number', default: 4} // Lifetime in seconds.
    },

    init: function() {
        this.spheres = [];
        this.time = 0;
        
        // Create a glow material.
        this.glowMaterial = new THREE.ShaderMaterial({
            uniforms: {
                c: { type: "f", value: 0.2 },
                p: { type: "f", value: 4.5 },
                glowColor: { type: "c", value: new THREE.Color(0x00ffff) }
            },
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vPositionNormal;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }`,
            fragmentShader: `
                uniform vec3 glowColor;
                uniform float c;
                uniform float p;
                varying vec3 vNormal;
                varying vec3 vPositionNormal;
                void main() {
                    float intensity = pow(c - dot(vNormal, vPositionNormal), p);
                    gl_FragColor = vec4(glowColor, intensity);
                }`,
            side: THREE.FrontSide,
            blending: THREE.AdditiveBlending,
            transparent: true
        });
    },

    createSphere: function() {
        // Create the main sphere
        const radius = this.data.minRadius + Math.random() * (this.data.maxRadius - this.data.minRadius);
        const geometry = new THREE.SphereGeometry(radius, 32, 32);
        const material = new THREE.MeshStandardMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 4,
            metalness: 0.8,
            roughness: 0.2
        });
        const sphere = new THREE.Mesh(geometry, material);

        // Create the glow effect
        const glowGeometry = new THREE.SphereGeometry(radius * 1.2, 32, 32);
        const glowMesh = new THREE.Mesh(glowGeometry, this.glowMaterial);
        sphere.add(glowMesh);

        // Random position within bounds
        sphere.position.set(
            (Math.random() - 0.5) * 100,
            20 + Math.random() * 30,
            (Math.random() - 0.5) * 100
        );

        /*
        // Attempt to make light...
        const entity = document.createElement('a-light');
        entity.setAttribute('position', `${sphere.position.x} ${sphere.position.y+3} ${sphere.position.z}`);
        entity.setAttribute('type','point');
        entity.setAttribute('color', '#880');
        sphere.appendChild(entity);
        //setTimeout(document.querySelector('a-scene').removeChild(entity), 5000);
        */

        // Add random velocity
        sphere.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            Math.random() * 2,
            (Math.random() - 0.5) * 2
        );

        this.el.object3D.add(sphere);
        this.spheres.push({
            mesh: sphere,
            life: this.data.life // Life in seconds.
        });
    },

    tick: function(time, delta) {
        this.time += delta;
        const ds = delta * 0.001; // Converts delta to seconds.

        // Create new sphere if interval has passed and under max
        if (this.time > this.data.interval && this.spheres.length < this.data.maxSpheres) {
            this.createSphere();
            this.time = 0;
        }

        // Update spheres
        for (let i = this.spheres.length - 1; i >= 0; i--) {
            const sphere = this.spheres[i];
            sphere.life -= ds;

            if (sphere.life <= 0) {
                // Remove sphere
                this.el.object3D.remove(sphere.mesh);
                this.spheres.splice(i, 1);
            } else {
                // Update position
                const velocity = sphere.mesh.userData.velocity;
                sphere.mesh.position.add(velocity.clone().multiplyScalar(ds));
                velocity.y -= 9.8 * ds; // Simple gravity
            }
        }
    }
});