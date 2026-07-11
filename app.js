// app.js

// 1. إعداد المشهد الافتراضي (Scene, Camera, Renderer)
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0c14);
scene.fog = new THREE.FogExp2(0x0a0c14, 0.05); // تأثير ضبابي خفيف للعمق الجمالي

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; // تفعيل الظلال بجودة عالية
document.getElementById('canvas-container').appendChild(renderer.domElement);

// 2. إعداد نظام التحكم بالمنظور الشخصي الأول (Pointer Lock)
const controls = new THREE.PointerLockControls(camera, document.body);

document.body.addEventListener('click', () => {
    controls.lock();
});

controls.addEventListener('lock', () => {
    document.getElementById('instructions').style.display = 'none';
});

controls.addEventListener('unlock', () => {
    document.getElementById('instructions').style.display = 'block';
});

scene.add(controls.getObject());

// وضعية البداية للاعب (وسط القاعة)
camera.position.set(0, 2, 15);

// 3. كود بناء صالة العرض (الأرضية، الحيوط، السقف)
const textureLoader = new THREE.TextureLoader();

// الأرضية (تأثير مربعات غامقة ونقية)
const floorGeo = new THREE.PlaneGeometry(50, 50);
const floorMat = new THREE.MeshStandardMaterial({ 
    color: 0x111424, 
    roughness: 0.2,
    metalness: 0.5
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// الحيوط (قاعة مستطيلة محيطة بالزائر)
const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1d29, roughness: 0.7 });

const backWall = new THREE.Mesh(new THREE.PlaneGeometry(50, 10), wallMat);
backWall.position.set(0, 5, -25);
backWall.receiveShadow = true;
scene.add(backWall);

const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(50, 10), wallMat);
frontWall.position.set(0, 5, 25);
frontWall.rotation.y = Math.PI;
scene.add(frontWall);

const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(50, 10), wallMat);
leftWall.position.set(-25, 5, 0);
leftWall.rotation.y = Math.PI / 2;
scene.add(leftWall);

const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(50, 10), wallMat);
rightWall.position.set(25, 5, 0);
rightWall.rotation.y = -Math.PI / 2;
scene.add(rightWall);

// 4. نظام الإضاءة داخل المتحف (Ambient & Spotlights)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2); // إضاءة خافتة عامة
scene.add(ambientLight);

// إضافة أضواء موجهة (Spotlights) فوق لوحات العرض لتعطي طابع متاحف حقيقي
function createExhibitionSpotlight(x, z) {
    const spotLight = new THREE.SpotLight(0x00f2fe, 2);
    spotLight.position.set(x, 9, z);
    spotLight.angle = Math.PI / 6;
    spotLight.penumbra = 0.6;
    spotLight.castShadow = true;
    scene.add(spotLight);
}

// 5. دالة لصناعة لوحات العرض الفنية والمشاريع (Art Panels)
function createArtwork(title, colorHex, x, y, z, rotY) {
    // إطار اللوحة
    const frameGeo = new THREE.BoxGeometry(6, 4, 0.2);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: 0.5 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(x, y, z);
    frame.rotation.y = rotY;
    frame.castShadow = true;
    
    // اللوحة الداخلية (حيث ستوضع تصاميمك أو بوسترات الشركة لاحقاً)
    const artGeo = new THREE.PlaneGeometry(5.6, 3.6);
    const artMat = new THREE.MeshStandardMaterial({ 
        color: colorHex, 
        emissive: colorHex, 
        emissiveIntensity: 0.1 // جعل اللوحة تضيء خفيفاً لتبدو عصرية شاشات رقمية
    });
    const art = new THREE.Mesh(artGeo, artMat);
    art.position.set(0, 0, 0.11); // تقديمها قليلاً لتفادي التداخل
    frame.add(art);
    
    scene.add(frame);
    createExhibitionSpotlight(x, z + (z > 0 ? -3 : 3)); // توجيه الضوء أمام اللوحة
}

// توزيع لوحات المعرض (مثال لـ 3 لوحات كبار فالحيوط)
createArtwork("Optima Coding Core", 0x00f2fe, 0, 4.5, -24.8, 0);       // اللوحة الرئيسية فالوجه
createArtwork("Digital Art Gallery", 0xe43f5a, -15, 4.5, -24.8, 0);    // لوحة الفن الرقمي عاليسار
createArtwork("Merch & Custom Products", 0xf1b24a, 15, 4.5, -24.8, 0); // لوحة الميرش والمنتجات عاليمين

// 6. منطق إدارة الحركة بسلاسة وزيرو قلتشات (Keyboard Events)
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let prevTime = performance.now();

const onKeyDown = (event) => {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW': moveForward = true; break;
        case 'ArrowLeft':
        case 'KeyA': moveLeft = true; break;
        case 'ArrowDown':
        case 'KeyS': moveBackward = true; break;
        case 'ArrowRight':
        case 'KeyD': moveRight = true; break;
    }
};

const onKeyUp = (event) => {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW': moveForward = false; break;
        case 'ArrowLeft':
        case 'KeyA': moveLeft = false; break;
        case 'ArrowDown':
        case 'KeyS': moveBackward = false; break;
        case 'ArrowRight':
        case 'KeyD': moveRight = false; break;
    }
};

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

// 7. حلقة التحديث المستمر والتحريك (Animation Loop)
function animate() {
    requestAnimationFrame(animate);

    if (controls.isLocked === true) {
        const time = performance.now();
        const delta = (time - prevTime) / 1000; // حساب التوقيت بدقة لمنع التقطع

        // تطبيق الاحتكاك والتباطؤ بسلاسة عند الوقوف
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize(); // لضمان سرعة تابة عند التحرك بشكل مائل

        if (moveForward || moveBackward) velocity.z -= direction.z * 120.0 * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * 120.0 * delta;

        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);

        // منع الزائر من الخروج من حدود المتحف (صندوق الحماية 48x48)
        if (camera.position.x > 23) camera.position.x = 23;
        if (camera.position.x < -23) camera.position.x = -23;
        if (camera.position.z > 23) camera.position.z = 23;
        if (camera.position.z < -23) camera.position.z = -23;

        prevTime = time;
    }

    renderer.render(scene, camera);
}

// تشغيل الأنيميشن وتحديث الشاشة تلقائياً عند تغيير الحجم
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
