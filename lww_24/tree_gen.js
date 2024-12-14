AFRAME.registerComponent('terrain-forest-generator', {
    dependencies: ['terrain-generator'],

    schema: {
        count: { type: 'number', default: 32 },
        range: { type: 'number', default: 64 },
        minHeight: { type: 'number', default: 4 },
        maxHeight: { type: 'number', default: 22 },
        windStrength: { type: 'number', default: 0 },
        windTurbulence: { type: 'number', default: 0 }
    },

    init: function() {
        this.terrainGenerator = this.el.components['terrain-generator'];
        this.grassInstances = new Map();
        this.player = document.querySelector('#player').object3D;
        
        // Bind event handlers.
        this.boundChunkHandler = this.onChunkGenerated.bind(this);
        
        // Bind the cleanup function to component/scene events
        this.cleanup = this.cleanup.bind(this);
        this.el.addEventListener('componentremoved', (evt) => {
            if (evt.detail.name === 'terrain-forest-generator') {
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
        // Don't make trees at starting position.
        if ((chunkX==0 && chunkZ==0)||chunkZ%2==0) return;
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
        console.log('planting forest');
        grassEntity.setAttribute('tree-system', {
            count: this.data.count,
            range: this.data.range,
            minHeight: this.data.minHeight,
            maxHeight: this.data.maxHeight,
            windStrength: this.data.windStrength,
            windTurbulence: this.data.windTurbulence
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
            if (grassEntity.components['forest-system']) {
                grassEntity.removeAttribute('forest-system');
            }

            // Remove from scene.
            if (grassEntity.parentNode) {
                grassEntity.parentNode.removeChild(grassEntity);
            }
        } catch (e) {
            console.warn('Error removing tree chunk:', e);
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
        
        // Remove far tree chunks.
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
        
        //console.log('Forest cleanup completed');
    },

    remove: function() {
        this.cleanup();
    }
});