// Tree system optimized for performance
AFRAME.registerComponent('tree-system', {
    schema: {
        count: { type: 'number', default: 32 },
        range: { type: 'number', default: 64 },
        minHeight: { type: 'number', default: 4 },
        maxHeight: { type: 'number', default: 22 }
    },

    init: function() {
        this.active = false;
        this.instancedTrees = null;
        this.transforms = [];
        
        // Defer tree generation until after frame render to reduce initial lag
        setTimeout(() => {
            this.setupTrees();
            this.active = true;
        }, 100);
    },

    setupTrees: function() {
        const treeGeometry = this.createSimplifiedTreeGeometry();
        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.8,
            metalness: 0.2,
            flatShading: true
        });

        this.instancedTrees = new THREE.InstancedMesh(
            treeGeometry,
            material,
            this.data.count
        );
        this.el.setObject3D('trees', this.instancedTrees);
        this.populateTreeMeshes();
    },

    createSimplifiedTreeGeometry: function() {
        // Simplified tree geometry with fewer vertices
        const geometry = new THREE.CylinderGeometry(0.5, 1, 10, 6);
        const colors = new Float32Array(geometry.attributes.position.count * 3);
        
        for (let i = 0; i < geometry.attributes.position.count; i++) {
            colors[i * 3] = 0.2;
            colors[i * 3 + 1] = 0.4;
            colors[i * 3 + 2] = 0.1;
        }
        
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        return geometry;
    },

    populateTreeMeshes: function() {
        const dummy = new THREE.Object3D();
        const chunkOffsetX = this.el.object3D.position.x;
        const chunkOffsetZ = this.el.object3D.position.z;

        // Grid-based distribution
        const gridSize = Math.sqrt(this.data.count);
        const cellSize = this.data.range / gridSize;

        for (let i = 0; i < this.data.count; i++) {
            const row = Math.floor(i / gridSize);
            const col = i % gridSize;
            
            const localX = (col - gridSize/2) * cellSize + (Math.random() - 0.5) * cellSize;
            const localZ = (row - gridSize/2) * cellSize + (Math.random() - 0.5) * cellSize;
            const worldX = localX + chunkOffsetX;
            const worldZ = localZ + chunkOffsetZ;

            const y = getTerrainHeight(worldX, worldZ);
            if (y < -13) continue;

            dummy.position.set(localX, y, localZ);
            dummy.rotation.y = Math.random() * Math.PI * 2;
            dummy.scale.setScalar(1 + Math.random() * 0.5);
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

// Optimized terrain generator
AFRAME.registerComponent('terrain-generator', {
    schema: {
        maxChunks: { type: 'number', default: 64 }, // Maximum chunks to keep in memory
        renderDistance: { type: 'number', default: 3 } // Radius of chunks around player
    },

    init: function() {
        noise.init();
        this.player = document.querySelector('#player').object3D;
        this.chunkSize = 204;
        this.lastChunkX = null;
        this.lastChunkZ = null;

        // Core chunk management
        this.chunks = new Map(); // active chunks
        this.chunkPool = []; // available chunks
        this.chunkLoadQueue = new Set(); // chunks that need to be loaded
        this.chunkUnloadQueue = new Set(); // chunks that need to be unloaded

        // Initialize chunk pool
        this.initializeChunkPool();

        // Start chunk update loop
        this.startChunkProcessing();
    },

    initializeChunkPool: function() {
        for (let i = 0; i < this.data.maxChunks; i++) {
            const geometry = new THREE.BufferGeometry();
            const maxVertices = this.chunkSize * this.chunkSize;
            
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(maxVertices * 3), 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(maxVertices * 3), 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(maxVertices * 3), 3));
            
            const material = new THREE.MeshStandardMaterial({
                vertexColors: true,
                roughness: 0.8,
                metalness: 0.2,
                flatShading: true
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.visible = false;
            this.el.object3D.add(mesh);
            
            this.chunkPool.push({
                mesh,
                inUse: false,
                key: null,
                lastUsed: 0
            });
        }
    },

    getChunkKey: function(x, z) {
        return `${x},${z}`;
    },

    getChunkFromPool: function() {
        // First try to find an unused chunk
        let chunk = this.chunkPool.find(c => !c.inUse);
        
        if (!chunk) {
            // If no unused chunks, find the oldest used chunk
            const now = performance.now();
            chunk = this.chunkPool.reduce((oldest, current) => {
                if (!oldest || current.lastUsed < oldest.lastUsed) {
                    return current;
                }
                return oldest;
            }, null);

            if (chunk && chunk.key) {
                // Remove the old chunk from active chunks
                this.chunks.delete(chunk.key);
            }
        }

        if (chunk) {
            chunk.inUse = true;
            chunk.lastUsed = performance.now();
            return chunk;
        }

        return null;
    },

    releaseChunk: function(chunk) {
        if (!chunk) return;
        chunk.inUse = false;
        chunk.key = null;
        chunk.mesh.visible = false;
    },

    startChunkProcessing: function() {
        const processChunks = () => {
            // Process a few chunks per frame
            this.processChunkQueues();
            requestAnimationFrame(processChunks);
        };
        requestAnimationFrame(processChunks);
    },

    processChunkQueues: function() {
        // Process unload queue first to free up chunks
        for (const key of this.chunkUnloadQueue) {
            const chunk = this.chunks.get(key);
            if (chunk) {
                this.releaseChunk(chunk);
                this.chunks.delete(key);
            }
        }
        this.chunkUnloadQueue.clear();

        // Process load queue
        const startTime = performance.now();
        const maxTimePerFrame = 8; // ms

        for (const coord of this.chunkLoadQueue) {
            if (performance.now() - startTime > maxTimePerFrame) {
                break;
            }

            const [x, z] = coord.split(',').map(Number);
            this.generateChunk(x, z);
            this.chunkLoadQueue.delete(coord);
        }
    },

    generateChunk: function(chunkX, chunkZ) {
        const key = this.getChunkKey(chunkX, chunkZ);
        if (this.chunks.has(key)) return;

        const chunk = this.getChunkFromPool();
        if (!chunk) return;

        const offsetX = chunkX * (this.chunkSize - 1);
        const offsetZ = chunkZ * (this.chunkSize - 1);
        
        // Generate geometry
        const vertices = [];
        const colors = [];
        const indices = [];

        // Generate vertices
        for (let z = 0; z < this.chunkSize; z++) {
            for (let x = 0; x < this.chunkSize; x++) {
                const worldX = x + offsetX;
                const worldZ = z + offsetZ;
                const height = getTerrainHeight(worldX, worldZ);
                vertices.push(worldX, height, worldZ);
                
                const color = new THREE.Color(getTerrainColor(height));
                colors.push(color.r, color.g, color.b);
            }
        }

        // Generate indices
        const verticesPerRow = this.chunkSize;
        for (let z = 0; z < verticesPerRow - 1; z++) {
            for (let x = 0; x < verticesPerRow - 1; x++) {
                const topLeft = z * verticesPerRow + x;
                const topRight = topLeft + 1;
                const bottomLeft = (z + 1) * verticesPerRow + x;
                const bottomRight = bottomLeft + 1;

                indices.push(topLeft, bottomLeft, topRight);
                indices.push(bottomLeft, bottomRight, topRight);
            }
        }

        // Update geometry
        const geometry = chunk.mesh.geometry;
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        chunk.key = key;
        chunk.mesh.visible = true;
        this.chunks.set(key, chunk);

        // Emit event for other systems
        this.el.dispatchEvent(new CustomEvent('chunk-generated', {
            detail: { chunkX, chunkZ, offsetX, offsetZ }
        }));
    },

    updateChunks: function(centerX, centerZ) {
        const renderDistance = this.data.renderDistance;
        
        // Determine which chunks should be loaded
        const desiredChunks = new Set();
        for (let x = centerX - renderDistance; x <= centerX + renderDistance; x++) {
            for (let z = centerZ - renderDistance; z <= centerZ + renderDistance; z++) {
                desiredChunks.add(this.getChunkKey(x, z));
            }
        }

        // Queue chunks for unloading if they're too far
        for (const [key, chunk] of this.chunks) {
            if (!desiredChunks.has(key)) {
                this.chunkUnloadQueue.add(key);
            }
        }

        // Queue new chunks for loading
        for (const key of desiredChunks) {
            if (!this.chunks.has(key)) {
                this.chunkLoadQueue.add(key);
            }
        }
    },

    tick: function() {
        const currentChunkX = Math.floor(this.player.position.x / this.chunkSize);
        const currentChunkZ = Math.floor(this.player.position.z / this.chunkSize);

        // Only update chunks if player has moved to a new chunk
        if (currentChunkX !== this.lastChunkX || currentChunkZ !== this.lastChunkZ) {
            this.updateChunks(currentChunkX, currentChunkZ);
            this.lastChunkX = currentChunkX;
            this.lastChunkZ = currentChunkZ;
        }
    },

    remove: function() {
        // Clean up all chunks
        this.chunkPool.forEach(chunk => {
            if (chunk.mesh) {
                chunk.mesh.geometry.dispose();
                chunk.mesh.material.dispose();
                this.el.object3D.remove(chunk.mesh);
            }
        });
        
        this.chunks.clear();
        this.chunkPool = [];
        this.chunkLoadQueue.clear();
        this.chunkUnloadQueue.clear();
    }
});


// Below here is procedural terrain functionality.
// **********************************************
// **********************************************

// Procedural terrain generation.
let ws=prompt('Type a word or phrase to generate\n a new terrain.');
const worldSeed = getSeed(ws);
//let ws='ihoooo';

function getSeed(seedWord){
    if (!seedWord) return 1;
    // 1. Basic djb2 hash - 
        // simple but effective for most cases.
        
        let hash = 5381;
        for (let i = 0; i < seedWord.length; i++) 
            {
                hash = ((hash << 5) + hash) +
                seedWord.charCodeAt(i);
            }
            if (hash==NaN||hash===5381) return 1;
            return hash >>> 0; 
        // Convert to unsigned 32-bit integer.
}

// Perlin noise implementation.
const noise = {
    p: new Uint8Array(512),
    // 151, not ws. 160, not ws.
    permutation: [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180],
    init: function() {
        for(let i=0; i < 256; i++) {
            // Here's where we add world seed :)
            this.p[i] = this.p[i + 256] = this.permutation[i]*getSeed(ws);
        }
        // What's our seed?
        console.log('world seed is ' + getSeed(ws));
    },
    fade: function(t) { return t * t * t * (t * (t * 6 - 15) + 10); },
    lerp: function(t, a, b) { return a + t * (b - a); },
    grad: function(hash, x, y, z) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    },
    noise: function(x, y, z) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;

        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);

        const u = this.fade(x);
        const v = this.fade(y);
        const w = this.fade(z);

        const A = this.p[X] + Y;
        const AA = this.p[A] + Z;
        const AB = this.p[A + 1] + Z;
        const B = this.p[X + 1] + Y;
        const BA = this.p[B] + Z;
        const BB = this.p[B + 1] + Z;

        return this.lerp(w,
            this.lerp(v,
                this.lerp(u,
                    this.grad(this.p[AA], x, y, z),
                    this.grad(this.p[BA], x-1, y, z)
                ),
                this.lerp(u,
                    this.grad(this.p[AB], x, y-1, z),
                    this.grad(this.p[BB], x-1, y-1, z)
                )
            ),
            this.lerp(v,
                this.lerp(u,
                    this.grad(this.p[AA+1], x, y, z-1),
                    this.grad(this.p[BA+1], x-1, y, z-1)
                ),
                this.lerp(u,
                    this.grad(this.p[AB+1], x, y-1, z-1),
                    this.grad(this.p[BB+1], x-1, y-1, z-1)
                )
            )
        );
    }
};

function getTerrainHeight(x, z) {
    // Default 0.05.
    const xCoord = x * 0.05;  // Base frequency - try 0.03 for wider features or 0.08 for tighter.
    const zCoord = z * 0.05;
    
    // Base terrain with multiple layers
    let height = 0;

    const gSpread2 = 0.001;
    height += noise.noise(xCoord * 0.1 * gSpread2, 0, zCoord * 0.1 * gSpread2) * 2048;
    
    // Large features (mountains and valleys)
    // Original values 0.5 and 24.
    // General spread multiplier attempt. Default 1.
    const gSpread = 0.7;
    height += noise.noise(xCoord * 0.1 * gSpread, 0, zCoord * 0.1 * gSpread) * 64;  // Increased from 10.
    
    // Medium features (hills)
    height += noise.noise(xCoord * 1 * gSpread, 0, zCoord * 1 * gSpread) * 12;  // New medium scale.
    
    // Small features (rough terrain)
    height += noise.noise(xCoord * 2 * gSpread, 0, zCoord * 2 * gSpread) * 6;
    
    // Micro features (texture)
    height += noise.noise(xCoord * 4 * gSpread, 0, zCoord * 4 * gSpread) * 3;
    
    // Mountain generation with more variation
    const mountainNoise = noise.noise(xCoord * 0.25 * gSpread, 0, zCoord * 0.25 * gSpread);
    if (mountainNoise > 0.5) {
        // Create more varied mountains.
        // Default 40, not 160.
        const mountainHeight = (mountainNoise - 0.5) * 2; // 0 to 1
        const mountainScale = 40 + noise.noise(xCoord * 0.1, 0, zCoord * 0.1) * 200;
        height += mountainHeight * mountainScale;
    }
    
    // Add plateaus.
    const plateauNoise = noise.noise(xCoord * 0.15 * gSpread, 0, zCoord * 0.15 * gSpread);
    if (plateauNoise > 0.7) {
        // Default 15..
        const plateauHeight = 15;
        const plateauBlend = (plateauNoise - 0.7) * 3.33; // 0 to 1
        height = height * (1 - plateauBlend) + plateauHeight * plateauBlend;
    }
    
    // Add valleys/canyons.
    const valleyNoise = noise.noise(xCoord * 0.2 * gSpread, 0, zCoord * 0.2 * gSpread);
    if (valleyNoise < 0.2) {
        const valleyDepth = -10;
        const valleyBlend = (0.2 - valleyNoise) * 5; // 0 to 1
        height *= (1 - valleyBlend * 0.8);
    }

    let biomes=true;
    let erosion=true;
    let ridges=false;
    // Add biomes.
    if (biomes){
        height += getBiomeHeight(x,z,gSpread)
    }
    // Add ridges.
    if (ridges){
        const ridgeNoise = getRidgeNoise(xCoord * 0.5, zCoord * 0.5);
        // Ridge strength default 30, not 12.
        height += ridgeNoise * ridgeNoise * 12; // Square it for sharper ridges.
    }
    // Add erosion.
    if (erosion){
        height += getErosionNoise(xCoord, zCoord);
    }
    
    return height;
}

function getTerrainColor(height) {

    if (worldSeed!=1){
    // Grassy height-based colouring.
    if (height < -11.5) return '#002222';
    if (height < 0) return '#002200';     
    if (height < 5) return '#002900';     
    if (height < 10) return '#003000';    
    if (height < 30) return '#003800';    
    if (height < 50) return '#004400';    
    if (height < 70) return '#6B776B';    
    return '#FFFFFF';
    }
    else if (worldSeed===1){
    // Snowy appearance.
    if (height < -11.5) return '#002222';
    if (height < 0) return '#AAA';     // Deep water
    if (height < 5) return '#BBB';     // Shallow water
    if (height < 10) return '#CCC';    // Beach/Sand
    if (height < 30) return '#DDD';    // Grass/Plains
    if (height < 50) return '#EEE';    // Forest
    if (height < 70) return '#FFFFFF';    // Mountain
    return '#FFFFFF';                     // Snow peaks
    }
}


function getBiomeHeight(x, z, gSpread) {
    const xCoord = x * 0.05 * gSpread;
    const zCoord = z * 0.05 * gSpread;
    
    // Biome selection.
    const biomeNoise = noise.noise(xCoord * 0.002, 0, zCoord * 0.002);
    
    let height = 0;
    
    // Default < 0.5.
    // Hills is 0.6.
    if (biomeNoise < 0.5) {
        // Plains biome
        height += noise.noise(xCoord * 1, 0, zCoord * 1) * 8;
        height += noise.noise(xCoord * 2, 0, zCoord * 2) * 4;
        
    } else if (biomeNoise < 0.6) {
        // Hills biome
        height += noise.noise(xCoord * 0.5, 0, zCoord * 0.5) * 20;
        height += noise.noise(xCoord * 1, 0, zCoord * 1) * 10;
        
    } else {
        // Mountains biome
        height += noise.noise(xCoord * 0.3, 0, zCoord * 0.3) * 35;
        height += noise.noise(xCoord * 0.8, 0, zCoord * 0.8) * 15;
        
        // Sharp peaks
        const peakNoise = noise.noise(xCoord * 1.5, 0, zCoord * 1.5);
        if (peakNoise > 0.7) {
            height += Math.pow(peakNoise - 0.7, 2) * 60;
        }
    }
    
    return height;
}

function getRidgeNoise(x, z) {
    const n = noise.noise(x, 0, z);
    return 1 - Math.abs(n); // Creates sharp ridges
}

function getErosionNoise(xCoord,zCoord){
    // Erosion effect.
    const erosionNoise = noise.noise(xCoord * 3, 0, zCoord * 3);
    const slope = Math.abs(
        noise.noise(xCoord + 0.1, 0, zCoord) - 
        noise.noise(xCoord - 0.1, 0, zCoord)
    );
    
    // More erosion on steeper slopes.
    // Strength default is 10, not 20.
    const erosionStrength=16;
    if (slope > 0.2) {
        return -erosionNoise * slope * erosionStrength;
    } else return 0;
}