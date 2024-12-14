// LookAt component.
AFRAME.registerComponent('look-at', {
    schema: {
        targetID: {type: 'string', default: '#play'},
        rSpeed: {type: 'number', default: 1},
        clampY: {type: 'boolean', default: true},
        flee: {type: 'boolean', default: false}
    },

    init: function() {
        this.target = document.querySelector(this.data.targetID).object3D;
        this.object = this.el.object3D;
        this.origRotX = this.el.object3D.rotation.x;
        this.origRotZ = this.el.object3D.rotation.z;
    },

    tick: function(delta){
        delta *= 0.001;
        if (!delta) return;

        // Create a direction vector from object to target
        const direction = new THREE.Vector3();
        direction.subVectors(this.target.position, 
            this.object.position).normalize();

        // First, get the angle in the XZ plane (yaw).
        let fleep=0;
        if (this.data.flee) fleep = 180;
        const yaw = Math.atan2(direction.x, direction.z) + fleep;

        // Then get the angle from the ground plane (pitch).
        const pitch = Math.atan2(direction.y, Math.sqrt(direction.x * direction.x + direction.z * direction.z));

        // Apply the rotations.
        // Are we only rotating Y axis?
        if (this.data.clampY){
            this.object.rotation.set(0, yaw * this.data.rSpeed, 0);
        }
        else {
            // Then get the angle from the ground plane (pitch).
            const pitch = Math.atan2(direction.y, 
                Math.sqrt(direction.x * direction.x + direction.z * direction.z));
            this.object.rotation.set(-pitch * this.data.rSpeed, yaw * this.data.rSpeed, 0);
            }

        }
});