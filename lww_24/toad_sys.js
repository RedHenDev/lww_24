AFRAME.registerComponent('toadstool-system', {
    schema: {
        count: { type: 'number', default: 3 },
        range: { type: 'number', default: 128 },
        scaleFactor: { type: 'number', default: 0.07 },
        minHeight: { type: 'number', default: 0.1 },
        maxHeight: { type: 'number', default: 0.4 },
        minRadius: { type: 'number', default: 0.2 },
        maxRadius: { type: 'number', default: 1 },
        canopySize: { type: 'number', default: 8 }
    },

    init: function() {
        this.position = this.el.object3D.position;
        this.generateToadstools();
    },

    generateToadstools: function() {
        for (let i = 0; i < this.data.count; i++) {
            const toadstool = this.createToadstool();
            if (toadstool!=1)
            this.el.appendChild(toadstool);
        }
    },

    createToadstool: function() {
        // First, let's see where we're attempting to place
        // our toad. Too low, no go.
        //let y = getTerrainHeight(this.position.x,this.position.z)-(0.5*this.data.scaleFactor);
        

        const scaleFactor = this.data.scaleFactor;
        const height = THREE.MathUtils.randFloat(this.data.minHeight, this.data.maxHeight) * scaleFactor;
        const radius = THREE.MathUtils.randFloat(this.data.minRadius, this.data.maxRadius) * scaleFactor;

        const toadstoolEntity = document.createElement('a-entity');

        // Stem - Slightly tapered and curved
        const stem = document.createElement('a-cone');
        stem.setAttribute('color', 'beige');
        stem.setAttribute('height', height);
        stem.setAttribute('radius-bottom', radius * 0.6);
        stem.setAttribute('radius-top', radius * 0.4);
        stem.setAttribute('position', `0 ${height / 2} 0`);
        stem.setAttribute('material', 'shader: standard;');

        // Cap - Flatter and rounder
        const cap = document.createElement('a-sphere');
        cap.setAttribute('color', 'crimson');
        cap.setAttribute('radius', radius);
        cap.setAttribute('position', `0 ${height + radius * 0.5} 0`);
        cap.setAttribute('scale', `1 ${5*scaleFactor} 1`);
        cap.setAttribute('material', 'shader: standard;');

        // Add white spots
        for (let j = 0; j < 6; j++) {
            const spot = document.createElement('a-sphere');
            const spotRadius = radius * THREE.MathUtils.randFloat(0.05, 0.15); // Varying spot sizes
            const angle = Math.random() * Math.PI * 2;
            const distance = radius * 0.7 * Math.random(); // Slightly randomized distance

            spot.setAttribute('color', 'white');
            spot.setAttribute('radius', spotRadius);
            spot.setAttribute(
                'position',
                `${Math.cos(angle) * distance * 1.1} ${radius * 0.75} ${Math.sin(angle) * distance * 1.1}`
            );
            //spot.setAttribute('material', 'shader: standard; emissive: white; emissiveIntensity: 0.2');

            cap.appendChild(spot);
        }

        toadstoolEntity.appendChild(stem);
        toadstoolEntity.appendChild(cap);

        // Randomize position within the given range
        const x = THREE.MathUtils.randFloat(-this.data.range / 2, this.data.range / 2);
        const z = THREE.MathUtils.randFloat(-this.data.range / 2, this.data.range / 2);
        const tilt = THREE.MathUtils.randFloat(-10, 10); // Slight tilt for playfulness.
        
        // Adjust y since we have decided new placement.
        y = getTerrainHeight(this.position.x+x,this.position.z+z)-(0.5*this.data.scaleFactor);
        if (y<-13) return 1;
        toadstoolEntity.setAttribute('position', `${x} ${y} ${z}`);
        toadstoolEntity.setAttribute('rotation', `0 ${Math.random() * 360} ${tilt}`);

        return toadstoolEntity;
    }
});