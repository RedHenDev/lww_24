AFRAME.registerComponent('terrain-toadstool-generator', {
    dependencies: ['terrain-generator'],

    schema: {
        count: { type: 'number', default: 12 },
        range: { type: 'number', default: 204 },
        minHeight: { type: 'number', default: 6 },
        maxHeight: { type: 'number', default: 10 },
        minRadius: { type: 'number', default: 4 },
        maxRadius: { type: 'number', default: 6 },
        canopySize: { type: 'number', default: 12 }
    },

    init: function() {
        this.terrainGenerator = this.el.components['terrain-generator'];
        this.toadstoolInstances = new Map();
        this.player = document.querySelector('#player').object3D;
        
        this.boundChunkHandler = this.onChunkGenerated.bind(this);
        this.cleanup = this.cleanup.bind(this);
        
        this.el.addEventListener('componentremoved', (evt) => {
            if (evt.detail.name === 'terrain-toadstool-generator') {
                this.cleanup();
            }
        });
        
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
        if (chunkX%3==0) return;
        this.generateToadstoolsForChunk(chunkX, chunkZ);
    },

    generateToadstoolsForChunk: function(chunkX, chunkZ) {
        const key = `${chunkX},${chunkZ}`;
        
        if (this.toadstoolInstances.has(key)) {
            return;
        }

        const toadstoolEntity = document.createElement('a-entity');
        
        toadstoolEntity.setAttribute('toadstool-system', {
            count: this.data.count,
            range: this.data.range,
            minHeight: this.data.minHeight,
            maxHeight: this.data.maxHeight,
            minRadius: this.data.minRadius,
            maxRadius: this.data.maxRadius,
            canopySize: this.data.canopySize
        });

        const chunkSize = this.terrainGenerator.chunkSize;
        const offsetX = chunkX * (chunkSize - 1);
        const offsetZ = chunkZ * (chunkSize - 1);
        toadstoolEntity.object3D.position.set(  offsetX, 
                                                0,offsetZ);

        toadstoolEntity.addEventListener('removeEntity', () => {
            this.removeToadstoolChunk(key, toadstoolEntity);
        });

        this.toadstoolInstances.set(key, toadstoolEntity);
        this.el.sceneEl.appendChild(toadstoolEntity);
    },

    removeToadstoolChunk: function(key, toadstoolEntity) {
        if (!toadstoolEntity) return;

        try {
            if (toadstoolEntity.components['toadstool-system']) {
                toadstoolEntity.removeAttribute('toadstool-system');
            }

            if (toadstoolEntity.parentNode) {
                toadstoolEntity.parentNode.removeChild(toadstoolEntity);
            }
        } catch (e) {
            console.warn('Error removing toadstool chunk:', e);
        }

        this.toadstoolInstances.delete(key);
    },

    tick: function() {
        if (!this.terrainGenerator || !this.player) return;
        
        const chunkSize = this.terrainGenerator.chunkSize;
        const chunkX = Math.floor(this.player.position.x / chunkSize);
        const chunkZ = Math.floor(this.player.position.z / chunkSize);
        
        for (const [key, toadstoolEntity] of this.toadstoolInstances.entries()) {
            const [x, z] = key.split(',').map(Number);
            if (Math.abs(x - chunkX) > 3 || Math.abs(z - chunkZ) > 3) {
                this.removeToadstoolChunk(key, toadstoolEntity);
            }
        }
    },

    cleanup: function() {
        for (const [key, toadstoolEntity] of this.toadstoolInstances.entries()) {
            this.removeToadstoolChunk(key, toadstoolEntity);
        }
        
        this.removeEventListeners();
        
        if (this.el.sceneEl) {
            this.el.sceneEl.removeEventListener('destroy', this.cleanup);
        }

        this.toadstoolInstances.clear();
        this.terrainGenerator = null;
        this.player = null;
    },

    remove: function() {
        this.cleanup();
    }
});