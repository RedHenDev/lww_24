AFRAME.registerComponent('quest-markers', {
    init: function() {
        this.markers = new Map();
        this.player = document.querySelector('#cam').object3D;

        const checkQuestManager = () => {
            const questManager = document.querySelector('[quest-manager]');
            if (questManager && questManager.components['quest-manager'].quests) {
                console.log('Quest manager ready, creating markers');
                this.questManager = questManager.components['quest-manager'];
                this.createMarkers();
            } else {
                console.log('Quest manager not ready, retrying...');
                setTimeout(checkQuestManager, 1000);
            }
        };
        
        checkQuestManager();
    },

    refreshMarkers: function() {
        console.log('Refreshing markers');
        this.clearAllMarkers();
        this.createMarkers();
    },

    createMarkers: function() {
        console.log('Creating/updating markers');
        if (!this.questManager || !this.questManager.quests) {
            console.log('No quest manager or quests found');
            return;
        }

        // First, ensure proper cleanup.
        this.clearAllMarkers();

        // Get all active quests.
        const quests = this.questManager.getActiveQuests();
        console.log(`Found ${quests.size} quests to mark`);

        for (const [id, quest] of quests) {
            if (quest.completed) {
                console.log(`Skipping completed quest ${id}`);
                continue;
            }

            console.log(`Creating marker for quest ${id} at ${quest.x}, ${quest.y}, ${quest.z}`);
            
            const orb = document.createElement('a-entity');
            
            // Inner sphere.
            const innerSphere = document.createElement('a-sphere');
            innerSphere.setAttribute('radius', '2');
            innerSphere.setAttribute('material', {
                shader: 'standard',
                emissive: quest.type === 'item' ? '#00ff00' : '#0088ff',
                emissiveIntensity: 5,
                opacity: 0.7,
                transparent: true
            });
            
            // Outer glow sphere.
            const outerSphere = document.createElement('a-sphere');
            outerSphere.setAttribute('radius', '3');
            outerSphere.setAttribute('material', {
                shader: 'standard',
                emissive: quest.type === 'item' ? '#00ff00' : '#0088ff',
                emissiveIntensity: 2,
                opacity: 0.3,
                transparent: true
            });

            // Text label.
            const label = document.createElement('a-text');
            label.setAttribute('value', quest.message);
            label.setAttribute('align', 'center');
            label.setAttribute('color', '#000');
            label.setAttribute('position', '0 0 3');
            label.setAttribute('scale', '1 1 1');
            label.setAttribute('rotation', '0 0 0');
            orb.appendChild(label);

            // Animations.
            outerSphere.setAttribute('animation', {
                property: 'scale',
                dir: 'alternate',
                dur: 2000,
                easing: 'easeInOutSine',
                loop: true,
                to: '1.4 1.4 1.4'
            });

            orb.setAttribute('animation', {
                property: 'position',
                dir: 'alternate',
                dur: 2000,
                easing: 'easeInOutSine',
                loop: true,
                to: `${quest.x} ${quest.y + 0.5} ${quest.z}`
            });

            // Position the orb.
            orb.setAttribute('position', `${quest.x} ${quest.y} ${quest.z}`);
            
            // Assemble orb.
            orb.appendChild(innerSphere);
            orb.appendChild(outerSphere);
            
            // Look at subject...
            orb.setAttribute('look-at','targetID:#player;clampY:false;');

            // Add to scene and track.
            this.el.sceneEl.appendChild(orb);
            this.markers.set(id, orb);
            console.log(`Added marker for quest ${id}`);
        }
    },

    clearAllMarkers: function() {
        if (!this.markers) return;
        
        console.log('Clearing all markers');
        for (const [id, marker] of this.markers.entries()) {
            if (marker && marker.parentNode) {
                marker.parentNode.removeChild(marker);
                console.log(`Removed marker ${id}`);
            }
        }
        this.markers.clear();
    }
});