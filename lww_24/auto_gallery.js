// For use with A-Frame.
function autoGalleryGo() {
    const imageFiles = ['./assets/drawing_1.jpg',
                        './assets/moon_1.jpg',
                        './assets/aww_24.png',
                        './assets/snowQueen.png'];
    const scene = document.querySelector('a-scene');
    const assets = document.createElement('a-assets');

    console.log('auto img complete...' + ' ' + imageFiles.length + ' files built.');
    
    let i=-1;
    imageFiles.forEach(file => {
        i++;
        const img = document.createElement('img');
        img.id = file.split('.')[0];
        img.src = file;
        img.setAttribute('crossorigin', 'local');
        assets.appendChild(img);

        console.log('generating image object in scene...');

        // Create giant 'gallery' planes for the images.
        const plane = document.createElement('a-plane');
        const radCon = Math.PI/180;
        plane.setAttribute('src', `#${img.id}`);
        plane.setAttribute('position', `${3*Math.sin((radCon)*(360/imageFiles.length*i))} 
                                        ${12}
                                        ${3*Math.cos((radCon)*(360/imageFiles.length*i))}`);
        plane.setAttribute('rotation', `0 ${360/imageFiles.length*i} 0`);
        plane.setAttribute('width', '10');
        plane.setAttribute('height', '10');
        plane.setAttribute('material', 'side: double');
        scene.appendChild(plane);
    });

    scene.appendChild(assets);
}

// Run when scene is loaded.
document.addEventListener('DOMContentLoaded', () => {
    const scene = document.querySelector('a-scene');
    if (scene) {
        scene.addEventListener('loaded', autoGalleryGo);
    }
});