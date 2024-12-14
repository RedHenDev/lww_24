AFRAME.registerComponent('terrain-grass-generator', {
    dependencies: ['terrain-generator'],

    schema: {
        count: { type: 'number', default: 256 },
        range: { type: 'number', default: 32 },
        bladeWidth: { type: 'number', default: 0.13 },
        minHeight: { type: 'number', default: 1 },
        bladeHeight: { type: 'number', default: 0.8 },
        windStrength: { type: 'number', default: 0.01 },
        windTurbulence: { type: 'number', default: 0.05 }
    },

    init: function() {
        this.terrainGenerator = this.el.components['terrain-generator'];
        this.grassInstances = new Map();
        this.player = document.querySelector('#player').object3D;
        
        // Bind event handlers
        this.boundChunkHandler = this.onChunkGenerated.bind(this);
        
        // Bind the cleanup function to component/scene events
        this.cleanup = this.cleanup.bind(this);
        this.el.addEventListener('componentremoved', (evt) => {
            if (evt.detail.name === 'terrain-grass-generator') {
                this.cleanup();
            }
        });
        
        // Also listen for scene removal.
        const sceneEl = this.el.sceneEl;
        if (sceneEl) {
            sceneEl.addEventListener('destroy', this.cleanup);
        }
    },

    update: function(oldData) {
        this.removeEventListeners();
        this.addEventListeners();
    },

    addEventListeners: function() {
        this.el.addEventListener('chunk-generated', this.boundChunkHandler);
    },

    removeEventListeners: function() {
        if (this.el) {
            this.el.removeEventListener('chunk-generated', this.boundChunkHandler);
        }
    },

    onChunkGenerated: function(event) {
        const { chunkX, chunkZ } = event.detail;
        this.generateGrassForChunk(chunkX, chunkZ);
    },

    generateGrassForChunk: function(chunkX, chunkZ) {
        const key = `${chunkX},${chunkZ}`;
        
        // Check if grass already exists for this chunk.
        if (this.grassInstances.has(key)) {
            return;
        }

        const grassEntity = document.createElement('a-entity');
        const randomizedRange = this.data.range + 
            (Math.random() * 2) - this.data.range * 0.5;
        
        //grassEntity.setAttribute('plant-system', {
        
        grassEntity.setAttribute('grass-system', {
            count: this.data.count,
            range: this.data.range,
            bladeWidth: this.data.bladeWidth,
            bladeHeight: this.data.bladeHeight,
            windStrength: 0.1,
            windTurbulence: 0.05
        });

        const chunkSize = this.terrainGenerator.chunkSize;
        const offsetX = chunkX * (chunkSize - 1);
        const offsetZ = chunkZ * (chunkSize - 1);
        grassEntity.object3D.position.set(offsetX, 0, offsetZ);

        // Add custom cleanup handler to grass entity
        grassEntity.addEventListener('removeEntity', () => {
            this.removeGrassChunk(key, grassEntity);
        });

        this.grassInstances.set(key, grassEntity);
        this.el.sceneEl.appendChild(grassEntity);
    },

    removeGrassChunk: function(key, grassEntity) {
        if (!grassEntity) return;

        try {
            // Remove the grass-system component first
            if (grassEntity.components['grass-system']) {
                grassEntity.removeAttribute('grass-system');
            }

            // Remove from scene
            if (grassEntity.parentNode) {
                grassEntity.parentNode.removeChild(grassEntity);
            }
        } catch (e) {
            console.warn('Error removing grass chunk:', e);
        }

        // Remove from our instances map
        this.grassInstances.delete(key);
        //console.log('Mowing a lawn chunk...', key);
    },

    tick: function() {
        if (!this.terrainGenerator || !this.player) return;
        
        const chunkSize = this.terrainGenerator.chunkSize;
        const chunkX = Math.floor(this.player.position.x / chunkSize);
        const chunkZ = Math.floor(this.player.position.z / chunkSize);
        
        // Remove far grass chunks
        for (const [key, grassEntity] of this.grassInstances.entries()) {
            const [x, z] = key.split(',').map(Number);
            if (Math.abs(x - chunkX) > 3 || Math.abs(z - chunkZ) > 3) {
                this.removeGrassChunk(key, grassEntity);
            }
        }
    },

    cleanup: function() {
        //console.log('Starting grass cleanup...');
        
        // Remove all grass instances
        for (const [key, grassEntity] of this.grassInstances.entries()) {
            this.removeGrassChunk(key, grassEntity);
        }
        
        // Clean up event listeners
        this.removeEventListeners();
        
        // Remove scene destroy listener if it exists
        if (this.el.sceneEl) {
            this.el.sceneEl.removeEventListener('destroy', this.cleanup);
        }

        // Clear all references
        this.grassInstances.clear();
        this.terrainGenerator = null;
        this.player = null;
        
        //console.log('Grass cleanup completed');
    },

    remove: function() {
        this.cleanup();
    }
});

/*
AFRAME.registerComponent('terrain-grass-generator', {
    dependencies: ['terrain-generator'],

    schema: {
        grassCount: { type: 'number', default: 3000 },
        grassRange: { type: 'number', default: 44 },
        minHeight: { type: 'number', default: 0.5 },
        maxHeight: { type: 'number', default: 8.5 }
    },

    init: function() {
        this.terrainGenerator = this.el.components['terrain-generator'];
        this.grassInstances = new Map();
        this.player = document.querySelector('#player').object3D;
    },

    update: function() {
        // Listen for chunk generation events.
        this.el.addEventListener('chunk-generated', this.onChunkGenerated.bind(this));
        
    },

    onChunkGenerated: function(event) {
        const { chunkX, chunkZ } = event.detail;
        this.generateGrassForChunk(chunkX, chunkZ);
        //console.log('new chunk...');
    },

    generateGrassForChunk: function(chunkX, chunkZ) {
        // Create grass entity for this chunk
        const grassEntity = document.createElement('a-entity');
        grassEntity.setAttribute('grass-system', {
            count: this.data.grassCount,
            range: this.data.grassRange+(Math.random()*2)-this.data.grassRange*0.5,
            windStrength: 0.1,
            windTurbulence: 0.05
        });

        // Position grass entity at chunk location.
        const chunkSize = this.terrainGenerator.chunkSize;
        const offsetX = chunkX * (chunkSize - 1);
        const offsetZ = chunkZ * (chunkSize - 1);
        grassEntity.object3D.position.set(offsetX, 0, offsetZ);

        // Add grass entity to scene.
        this.el.sceneEl.appendChild(grassEntity);

        // Store reference to clean up later.
        const key = `${chunkX},${chunkZ}`;
        this.grassInstances.set(key, grassEntity);
    },

    tick: function() {
        
        const chunkSize = this.terrainGenerator.chunkSize;
        
        // Calculate current chunk
        const chunkX = Math.floor(this.player.position.x / chunkSize);
        const chunkZ = Math.floor(this.player.position.z / chunkSize);
        
        // Remove far grass chunks
        for (const [key, grassEntity] of this.grassInstances.entries()) {
            const [x, z] = key.split(',').map(Number);
            if (Math.abs(x - chunkX) > 3 || Math.abs(z - chunkZ) > 3) {
                grassEntity.parentNode.removeChild(grassEntity);
                this.grassInstances.delete(key);
            }
        }
    },

    remove: function() {
        // Remove all grass instances.
        for (const grassEntity of this.grassInstances.values()) {
            grassEntity.parentNode.removeChild(grassEntity);
        }
        this.grassInstances.clear();
        console.log('Mowing another lawn...');
    }
});
*/