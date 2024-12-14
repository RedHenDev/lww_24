AFRAME.registerComponent('grass-system', {
    schema: {
        count: { type: 'number', default: 44 },
        range: { type: 'number', default: 204 },
        bladeWidth: { type: 'number', default: 4 },
        minHeight: { type: 'number', default: 0.1 },
        bladeHeight: { type: 'number', default: 2 },
        windStrength: { type: 'number', default: 0.2 },
        windTurbulence: { type: 'number', default: 0.05 }
    },

    init: function() {
        this.camera = document.querySelector('#player').object3D;
        this.transforms = [];

        // Create grass blade geometry. 
        const bladeGeometry = new THREE.PlaneGeometry(
            this.data.bladeWidth, 
            this.data.bladeHeight + Math.random()*1,
            2, // Segments for natural bending. Default 5, not 2.
            3
        );
        bladeGeometry.translate(0, this.data.bladeHeight / 2, 0);

        // Advanced vertex color gradient.
        const colors = new Float32Array(bladeGeometry.attributes.position.count * 3);
        for (let i = 0; i < bladeGeometry.attributes.position.count; i++) {
            const y = bladeGeometry.attributes.position.array[i * 3 + 1];
            const intensity = 0.8 + (y / this.data.bladeHeight) * 0.2;
            colors[i * 3] = 0.23 * intensity;
            colors[i * 3 + 1] = 0.5 * intensity;
            colors[i * 3 + 2] = 0.23 * intensity;
        }
        bladeGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        // Material for grass blades.
        const material = new THREE.MeshPhongMaterial({
            //color: 0x3b7f3b,
            color: '#0A0',
            side: THREE.DoubleSide,
            vertexColors: true
        });

        // Create single instanced mesh
        this.instancedGrass = new THREE.InstancedMesh(
            bladeGeometry,
            material,
            this.data.count
        );
        this.el.setObject3D('grass', this.instancedGrass);

        this.populateGrassMeshes();
        this.time = 0;
    },

    populateGrassMeshes: function() {
        const dummy = new THREE.Object3D();

        // Get the current entity's position (chunk offset)
        const chunkOffsetX = this.el.object3D.position.x;
        const chunkOffsetZ = this.el.object3D.position.z;

        for (let i = 0; i < this.data.count; i++) {
            // Generate local coordinates within the chunk range
            const localX = (Math.random() - 0.5) * this.data.range;
            const localZ = (Math.random() - 0.5) * this.data.range;
            
            // Calculate world coordinates by adding chunk offset
            const worldX = localX + chunkOffsetX;
            const worldZ = localZ + chunkOffsetZ;
            
            let y;
            try {
                y = getTerrainHeight(worldX, worldZ);
            } catch (e) {
                y = 0;
            }

            const transform = {
                position: new THREE.Vector3(localX, y, localZ),
                rotation: new THREE.Euler(
                    (Math.random() - 0.5) * 0.2,
                    Math.random() * Math.PI * 2,
                    0
                ),
                scale: new THREE.Vector3(
                    0.7 + Math.random() * 0.6,
                    0.8 + Math.random() * 0.4,
                    1
                )
            };

            this.transforms.push(transform);

            // Set instance matrix
            dummy.position.copy(transform.position);
            dummy.rotation.copy(transform.rotation);
            dummy.scale.copy(transform.scale);
            dummy.updateMatrix();
            this.instancedGrass.setMatrixAt(i, dummy.matrix);
        }
        this.instancedGrass.instanceMatrix.needsUpdate = true;
    },

    tick: function(t, dt) {
        this.time += dt * 0.001;
        const dummy = new THREE.Object3D();
        //const cameraPosition = this.camera.position;

        for (let i = 0; i < this.data.count; i++) {
            const transform = this.transforms[i];

            dummy.position.copy(transform.position);
            dummy.rotation.copy(transform.rotation);
            dummy.scale.copy(transform.scale);

            // Advanced wind simulation with turbulence
            const windFrequency = 2;
            const xOffset = transform.position.x * 0.1;
            const zOffset = transform.position.z * 0.1;

            const windAngle = 
                Math.sin(this.time * windFrequency + xOffset) * 
                Math.cos(this.time * windFrequency + zOffset) * 
                this.data.windStrength;

            // Add turbulence.
            const turbulence = 
                Math.sin(this.time * 3 + xOffset) * 
                Math.cos(this.time * 3 + zOffset) * 
                this.data.windTurbulence;

            dummy.rotation.z = windAngle + turbulence;

            dummy.updateMatrix();
            this.instancedGrass.setMatrixAt(i, dummy.matrix);
        }
        this.instancedGrass.instanceMatrix.needsUpdate = true;
    },

    remove: function() {
        // Cleanup instanced grass
        if (this.instancedGrass) {
            this.instancedGrass.geometry.dispose();
            this.instancedGrass.material.dispose();
            this.el.removeObject3D('grass');
        }
    }
});