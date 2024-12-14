AFRAME.registerComponent('ai-locomotion', {
    schema: {
        speed: {type: 'number', default: 0.6},
        height: {type: 'number', default: 0.6},
        wiggle: {type: 'boolean', default: true},
        flee: {type: 'boolean', default: true},
        target: {type: 'string', default: '#player'},
        aidrive: {type: 'boolean', default: false},
        turnSpeed: {type: 'number', default: 1.0}  // New property for turn speed
    },

    init: function() {
        this.rig = this.el.object3D;
        this.target = document.querySelector(this.data.target).object3D;
        this.currentRotation = new THREE.Vector3();
        this.targetRotation = new THREE.Vector3();
        // const rts = Math.random();
        // if (rts < 0.3){
        //     this.randTimeStop = 300 + rts;
        // } else if (rts < 0.6){
        //     this.randTimeStop = 500 + rts;
        // } else {
        //     this.randTimeStop = 700 + rts;
        // }
        // this.timeStamp = Date.now();
        // this.paused = false;
        // this.pausedTimeStamp = Date.now();
        
    },

    turn: function() {
        // If time to pause, then do so.
        // const timeNow = Date.now();
        // if (!this.paused && (timeNow - this.timeStamp >= this.randTimeStop)){
        //     this.paused = true;
        //     this.pausedTimeStamp = timeNow;
        // }
        // if (this.paused){
        //     if (timeNow - this.pausedTimeStamp >= 200){
        //         this.paused = false;
        //         this.timeStamp = timeNow;
        //     } else return;

        // }


        // Store current rotation.
        this.currentRotation.set(this.rig.rotation.x, this.rig.rotation.y, 0);
        
        // Make entity look at target.
        this.rig.lookAt(this.target.position);
        // Attempt to clamp pitch (x-axis).
        this.rig.rotation.x = this.currentRotation.x;
        
        // Store target rotation.
        this.targetRotation.set(0, this.rig.rotation.y, 0);
        
        // Interpolate between current and target rotation.
        this.rig.rotation.y = THREE.MathUtils.lerp(
            this.currentRotation.y,
            this.targetRotation.y,
            this.data.turnSpeed * 0.1  // Multiply by 0.1 to make the turn speed more manageable.
        );
    },

    tick: function(time, delta) {
        if (!delta) return;
        delta = delta * 0.001; // Convert to seconds.
        
        const mx = this.rig.position.x;
        const mz = this.rig.position.z;
        const my = getTerrainHeight(mx,mz);
        this.rig.position.y = my+this.data.height;

        let distFromTarget = new THREE.Vector3();
        distFromTarget.subVectors(this.target.position, 
            this.rig.position);

        this.turn();

        // if (this.data.aidrive && 
        //     (!(distFromTarget.length() > 6) || this.data.flee)){
        //     this.turn();
        //     if (this.data.flee){
        //         this.rig.rotation.y += Math.PI; // Add 180 degrees in radians
        //     }
        // }

        this.rig.position.x += 
                Math.sin(this.rig.rotation.y)*this.data.speed * delta;
        this.rig.position.z += 
                Math.cos(this.rig.rotation.y)*this.data.speed * delta;

        if (!this.data.wiggle) return;
        // Wiggle animation
        this.rig.rotation.z = Math.sin((Math.abs(this.rig.position.z) + 
                            Math.abs(this.rig.position.x)) *8) * 0.16;
    }
});