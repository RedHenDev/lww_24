AFRAME.registerComponent('tree-system', {
    schema: {
        count: { type: 'number', default: 1 },
        range: { type: 'number', default: 204 },
        minHeight: { type: 'number', default: 7 },
        maxHeight: { type: 'number', default: 70 },
        windStrength: { type: 'number', default: 0 },
        windTurbulence: { type: 'number', default: 0 }
    },

    init: function() {
        this.camera = document.querySelector('#player').object3D;
        this.transforms = [];
        const treeGeometry = this.createFirGeometry();

        const material = new THREE.MeshPhongMaterial({
            color: '#2d4a1c',
            side: THREE.DoubleSide,
            vertexColors: true,
            transparent: true,
            opacity: 0.95,
            shininess: 5
        });

        this.instancedTrees = new THREE.InstancedMesh(
            treeGeometry,
            material,
            this.data.count
        );
        this.el.setObject3D('trees', this.instancedTrees);

        this.populateTreeMeshes();
        this.time = 0;
    },

    // Hash function to generate consistent values based on position and seed
    generateHash: function(x, z, salt = 0) {
        const hashInput = `${x},${z},${salt},${ws}`;
        let hash = 0;
        for (let i = 0; i < hashInput.length; i++) {
            hash = ((hash << 5) - hash) + hashInput.charCodeAt(i);
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash;
    },

    // Generate deterministic value between 0 and 1
    seededRandom: function(x, z, salt = 0) {
        const hash = this.generateHash(x, z, salt);
        return (hash & 0x7fffffff) / 0x7fffffff;
    },

    // Generate deterministic value within range
    seededRandomRange: function(x, z, min, max, salt = 0) {
        return min + this.seededRandom(x, z, salt) * (max - min);
    },

    createFirGeometry: function() {
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const normals = [];
        const colors = [];

        const createFrond = (baseX, baseY, baseZ, size, angle, layer, totalLayers) => {
            const height = size * 0.8;
            const width = size;
            const layerRatio = layer / totalLayers;
            const tiltFactor = layerRatio * 0.5;
            
            const tip = [
                baseX + Math.cos(angle) * (width * 0.5),
                baseY + height * (0.3 + tiltFactor),
                baseZ + Math.sin(angle) * (width * 0.5)
            ];
            
            const leftBase = [
                baseX + Math.cos(angle - Math.PI/2) * (width * 0.5),
                baseY,
                baseZ + Math.sin(angle - Math.PI/2) * (width * 0.5)
            ];
            
            const rightBase = [
                baseX + Math.cos(angle + Math.PI/2) * (width * 0.5),
                baseY,
                baseZ + Math.sin(angle + Math.PI/2) * (width * 0.5)
            ];

            positions.push(...leftBase, ...rightBase, ...tip);

            const normal = this.calculateNormal(leftBase, rightBase, tip);
            normals.push(...normal, ...normal, ...normal);

            // Use deterministic color variation based on layer
            const layerSeed = layer * 1000; // Unique seed for each layer
            const layerGreen = 0.4 + (layerRatio * 0.2) + (this.seededRandom(layerSeed, 0) * 0.1);
            const color = [
                0.1 + (layerRatio * 0.05),
                layerGreen,
                0.1
            ];
            colors.push(...color, ...color, ...color);
        };

        const createTrunk = (height, radius) => {
            const segments = 8;
            const heightSegments = 4;
            
            for (let h = 0; h < heightSegments; h++) {
                for (let i = 0; i < segments; i++) {
                    const angle1 = (i / segments) * Math.PI * 2;
                    const angle2 = ((i + 1) / segments) * Math.PI * 2;
                    const y1 = (h / heightSegments) * height;
                    const y2 = ((h + 1) / heightSegments) * height;
                    const r1 = radius * (1 - (h / heightSegments) * 0.8);
                    const r2 = radius * (1 - ((h + 1) / heightSegments) * 0.8);

                    const v1 = [Math.cos(angle1) * r1, y1, Math.sin(angle1) * r1];
                    const v2 = [Math.cos(angle2) * r1, y1, Math.sin(angle2) * r1];
                    const v3 = [Math.cos(angle1) * r2, y2, Math.sin(angle1) * r2];
                    const v4 = [Math.cos(angle2) * r2, y2, Math.sin(angle2) * r2];

                    positions.push(...v1, ...v2, ...v3, ...v2, ...v4, ...v3);

                    const brown = [0.3, 0.2, 0.1];
                    for (let j = 0; j < 6; j++) {
                        colors.push(...brown);
                        normals.push(v1[0]/r1, 0, v1[2]/r1);
                    }
                }
            }
        };

        const treeHeight = 100;
        const baseWidth = 40;
        
        createTrunk(treeHeight, baseWidth * 0.1);

        const totalLayers = 20;
        for (let layer = 0; layer < totalLayers; layer++) {
            const layerRatio = layer / totalLayers;
            const layerHeight = layerRatio * treeHeight;
            const layerWidth = baseWidth * Math.pow(1 - layerRatio, 0.8);
            const frondsInLayer = Math.max(
                4,
                Math.floor(12 * (1 - layerRatio) + 6)
            );
            
            for (let i = 0; i < frondsInLayer; i++) {
                const angle = (i / frondsInLayer) * Math.PI * 2;
                const heightOffset = this.seededRandom(layer, i) * 2 - 1;
                createFrond(
                    0, 
                    layerHeight + heightOffset, 
                    0, 
                    layerWidth, 
                    angle + (layerRatio * Math.PI),
                    layer,
                    totalLayers
                );
            }
        }

        const topFronds = 5;
        for (let i = 0; i < topFronds; i++) {
            const angle = (i / topFronds) * Math.PI * 2;
            createFrond(0, treeHeight * 0.98, 0, baseWidth * 0.1, angle, totalLayers, totalLayers);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        return geometry;
    },

    calculateNormal: function(p1, p2, p3) {
        const v1 = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
        const v2 = [p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]];
        const normal = [
            v1[1] * v2[2] - v1[2] * v2[1],
            v1[2] * v2[0] - v1[0] * v2[2],
            v1[0] * v2[1] - v1[1] * v2[0]
        ];
        const length = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);
        return normal.map(n => n / length);
    },

    populateTreeMeshes: function() {
        const dummy = new THREE.Object3D();
        const chunkOffsetX = this.el.object3D.position.x;
        const chunkOffsetZ = this.el.object3D.position.z;

        // Create a grid-based distribution with procedural variation
        const gridSize = Math.sqrt(this.data.count);
        const cellSize = this.data.range / gridSize;

        let index = 0;
        for (let i = 0; i < gridSize && index < this.data.count; i++) {
            for (let j = 0; j < gridSize && index < this.data.count; j++) {
                // Base position in grid cell
                const baseX = (i - gridSize/2) * cellSize;
                const baseZ = (j - gridSize/2) * cellSize;
                
                // Add procedural offset within cell
                const offsetX = this.seededRandom(baseX, baseZ, 1) * cellSize - cellSize/2;
                const offsetZ = this.seededRandom(baseX, baseZ, 2) * cellSize - cellSize/2;
                
                const localX = baseX + offsetX;
                const localZ = baseZ + offsetZ;
                const worldX = localX + chunkOffsetX;
                const worldZ = localZ + chunkOffsetZ;

                let y;
                try {
                    y = getTerrainHeight(worldX, worldZ);
                    if (y < -13) y = -113;
                } catch (e) {
                    y = 0;
                }

                const transform = {
                    position: new THREE.Vector3(localX, y, localZ),
                    rotation: new THREE.Euler(
                        this.seededRandomRange(worldX, worldZ, -0.05, 0.05, 3),
                        this.seededRandom(worldX, worldZ, 4) * Math.PI * 2,
                        0
                    ),
                    scale: new THREE.Vector3().setScalar(
                        0.2 + this.seededRandom(worldX, worldZ, 5) * 0.1
                    )
                };

                this.transforms.push(transform);

                dummy.position.copy(transform.position);
                dummy.rotation.copy(transform.rotation);
                dummy.scale.copy(transform.scale);
                dummy.updateMatrix();
                this.instancedTrees.setMatrixAt(index, dummy.matrix);

                index++;
            }
        }
        this.instancedTrees.instanceMatrix.needsUpdate = true;
    },

    tick: function(t, dt) {
        this.time += dt * 0.001;
        const dummy = new THREE.Object3D();

        for (let i = 0; i < this.data.count; i++) {
            const transform = this.transforms[i];
            if (!transform) continue;

            dummy.position.copy(transform.position);
            dummy.rotation.copy(transform.rotation);
            dummy.scale.copy(transform.scale);

            const windFrequency = 2;
            const xOffset = transform.position.x * 0.1;
            const zOffset = transform.position.z * 0.1;

            const windAngle = 
                Math.sin(this.time * windFrequency + xOffset) * 
                Math.cos(this.time * windFrequency * 0.7 + zOffset) * 
                this.data.windStrength;

            const turbulence = 
                Math.sin(this.time * 4 + xOffset * 2) * 
                Math.cos(this.time * 3 + zOffset * 2) * 
                this.data.windTurbulence;

            dummy.rotation.z = windAngle + turbulence;
            dummy.rotation.x = windAngle * 0.3;

            dummy.updateMatrix();
            this.instancedTrees.setMatrixAt(i, dummy.matrix);
        }
        this.instancedTrees.instanceMatrix.needsUpdate = true;
    },

    remove: function() {
        if (this.instancedTrees) {
            this.instancedTrees.geometry.dispose();
            this.instancedTrees.material.dispose();
            this.el.removeObject3D('trees');
        }
    }
});