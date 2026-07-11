// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, set, onValue, onDisconnect, remove } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";

// 1. إعداد قواعد البيانات للعب الأونلاين
const firebaseConfig = { databaseURL: "https://optima-game-default-rtdb.europe-west1.firebasedatabase.app/" };
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const myId = "visitor_" + Math.floor(Math.random() * 1000000);
const myRef = ref(db, `museum_players/${myId}`);

// 2. إعداد مشهد 3D (Three.js)
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070c);
scene.fog = new THREE.FogExp2(0x05070c, 0.02);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('canvas-container').appendChild(renderer.domElement);

// 3. بناء المتحف والجرافيك
// أرضية لامعة وعاكسة
const floorGeo = new THREE.PlaneGeometry(100, 100);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x111424, roughness: 0.1, metalness: 0.8 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// شبكة مضيئة فوق الأرضية (Cyberpunk Grid)
const gridHelper = new THREE.GridHelper(100, 50, 0x00f2fe, 0x1f2833);
gridHelper.position.y = 0.01;
scene.add(gridHelper);

// دالة لكتابة اسم الشركة على الحيوط بجودة عالية
function createTextWall(text, x, y, z, rotY) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 256;
    const context = canvas.getContext('2d');
    context.fillStyle = '#0b0c10'; context.fillRect(0, 0, 1024, 256);
    context.font = 'bold 100px sans-serif';
    context.textAlign = 'center'; context.textBaseline = 'middle';
    context.fillStyle = '#00f2fe';
    context.shadowColor = '#00f2fe'; context.shadowBlur = 20;
    context.fillText(text, 512, 128);
    
    const texture = new THREE.CanvasTexture(canvas);
    const wallGeo = new THREE.PlaneGeometry(40, 10);
    const wallMat = new THREE.MeshStandardMaterial({ map: texture, emissive: 0x00f2fe, emissiveMap: texture, emissiveIntensity: 0.8 });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(x, y, z);
    wall.rotation.y = rotY;
    scene.add(wall);
    
    // ضوء موجه للوحة
    const light = new THREE.PointLight(0x00f2fe, 1.5, 30);
    light.position.set(x + (Math.sin(rotY)*2), y, z + (Math.cos(rotY)*2));
    scene.add(light);
}

// بناء جدران المتحف الأربعة
const wallMatDark = new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: 0.9 });
function buildSolidWall(w, h, x, y, z, rotY) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMatDark);
    mesh.position.set(x, y, z); mesh.rotation.y = rotY; mesh.receiveShadow = true;
    scene.add(mesh);
}
buildSolidWall(100, 20, 0, 10, -50, 0); // أمامي
buildSolidWall(100, 20, 0, 10, 50, Math.PI); // خلفي
buildSolidWall(100, 20, -50, 10, 0, Math.PI/2); // يسار
buildSolidWall(100, 20, 50, 10, 0, -Math.PI/2); // يمين

// إضافة لوحات الشركة المضيئة
createTextWall("OPTIMA CODE", 0, 8, -49.9, 0);
createTextWall("OPTIMA CODE", 0, 8, 49.9, Math.PI);
createTextWall("INNOVATION HUB", -49.9, 8, 0, Math.PI/2);
createTextWall("DIGITAL ART", 49.9, 8, 0, -Math.PI/2);

// إضاءة عامة
scene.add(new THREE.AmbientLight(0xffffff, 0.2));

// 4. نظام شخصيات اللاعبين (Avatars) 
const players = {};
// دالة لتصميم شخصية روبوت طافي بشكل عصري
function createAvatar() {
    const group = new THREE.Group();
    
    // الجسم
    const bodyGeo = new THREE.CapsuleGeometry(1, 2.5, 4, 16);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1f2833, metalness: 0.7, roughness: 0.2 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 2.5;
    body.castShadow = true;
    
    // القناع المضيء (الوجه)
    const visorGeo = new THREE.BoxGeometry(1.2, 0.6, 0.8);
    const visorMat = new THREE.MeshStandardMaterial({ color: 0xe43f5a, emissive: 0xe43f5a, emissiveIntensity: 1 });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 3.2, 0.7); // الوجه موجه للأمام
    
    group.add(body);
    group.add(visor);
    return group;
}

// 5. نظام التحكم المزدوج (هاتف + حاسوب)
const pitchObj = new THREE.Object3D();
pitchObj.add(camera);
const yawObj = new THREE.Object3D();
yawObj.position.y = 3;
yawObj.add(pitchObj);
scene.add(yawObj);

let isLocked = false;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;

// إعدادات البي سي (الماوس والكيبورد)
const startScreen = document.getElementById('start-screen');
startScreen.addEventListener('click', () => {
    if(window.innerWidth > 768) document.body.requestPointerLock();
    startScreen.style.display = 'none';
});

document.addEventListener('pointerlockchange', () => { isLocked = document.pointerLockElement === document.body; });
document.addEventListener('mousemove', (e) => {
    if (!isLocked) return;
    yawObj.rotation.y -= e.movementX * 0.002;
    pitchObj.rotation.x -= e.movementY * 0.002;
    pitchObj.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitchObj.rotation.x));
});
document.addEventListener('keydown', (e) => {
    switch(e.code) { case 'KeyW': moveForward=true; break; case 'KeyS': moveBackward=true; break; case 'KeyA': moveLeft=true; break; case 'KeyD': moveRight=true; break; }
});
document.addEventListener('keyup', (e) => {
    switch(e.code) { case 'KeyW': moveForward=false; break; case 'KeyS': moveBackward=false; break; case 'KeyA': moveLeft=false; break; case 'KeyD': moveRight=false; break; }
});

// إعدادات الهاتف (الجويستيك واللمس)
const joyZone = document.getElementById('mobile-controls');
const joyKnob = document.getElementById('joystick-knob');
const touchZone = document.getElementById('touch-zone-right');
let joyActive = false, joyCX = 0, joyCY = 0;
let lastTouchX = 0, lastTouchY = 0;

joyZone.addEventListener('touchstart', (e) => {
    joyActive = true;
    const rect = joyZone.getBoundingClientRect();
    joyCX = rect.left + rect.width/2;
    joyCY = rect.top + rect.height/2;
});
joyZone.addEventListener('touchmove', (e) => {
    if(!joyActive) return;
    let dx = e.touches[0].clientX - joyCX;
    let dy = e.touches[0].clientY - joyCY;
    let dist = Math.sqrt(dx*dx + dy*dy);
    if(dist > 40) { dx = (dx/dist)*40; dy = (dy/dist)*40; }
    joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    
    // تحويل الحركة
    moveForward = dy < -10; moveBackward = dy > 10;
    moveLeft = dx < -10; moveRight = dx > 10;
});
joyZone.addEventListener('touchend', () => {
    joyActive = false; joyKnob.style.transform = `translate(-50%, -50%)`;
    moveForward = moveBackward = moveLeft = moveRight = false;
});

touchZone.addEventListener('touchstart', (e) => { lastTouchX = e.touches[0].clientX; lastTouchY = e.touches[0].clientY; });
touchZone.addEventListener('touchmove', (e) => {
    let dx = e.touches[0].clientX - lastTouchX;
    let dy = e.touches[0].clientY - lastTouchY;
    yawObj.rotation.y -= dx * 0.005;
    pitchObj.rotation.x -= dy * 0.005;
    pitchObj.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitchObj.rotation.x));
    lastTouchX = e.touches[0].clientX; lastTouchY = e.touches[0].clientY;
});

// 6. الاتصال الأونلاين (Firebase Sync)
onValue(ref(db, 'museum_players'), (snapshot) => {
    const data = snapshot.val() || {};
    document.getElementById('players-count').innerText = `الزوار حالياً: ${Object.keys(data).length}`;
    
    // تحديث أو إنشاء اللاعبين الآخرين
    for (let id in data) {
        if (id === myId) continue;
        if (!players[id]) {
            players[id] = createAvatar();
            scene.add(players[id]);
        }
        // تحريك سلس نحو الموضع الجديد (Interpolation)
        players[id].position.lerp(new THREE.Vector3(data[id].x, 0, data[id].z), 0.2);
        players[id].rotation.y = data[id].ry; // دوران الشخصية
    }
    
    // حذف اللي خرجو
    for (let id in players) {
        if (!data[id]) { scene.remove(players[id]); delete players[id]; }
    }
});
onDisconnect(myRef).remove();

// 7. حلقة الحركة والتحديث (Game Loop)
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let prevTime = performance.now();

function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();
    const delta = (time - prevTime) / 1000;

    // فيزياء الحركة
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    if (moveForward || moveBackward) velocity.z -= direction.z * 50.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 50.0 * delta;

    yawObj.translateX(-velocity.x * delta);
    yawObj.translateZ(-velocity.z * delta);

    // حدود المتحف باش ماتخرجش على الحيوط
    if(yawObj.position.x > 48) yawObj.position.x = 48;
    if(yawObj.position.x < -48) yawObj.position.x = -48;
    if(yawObj.position.z > 48) yawObj.position.z = 48;
    if(yawObj.position.z < -48) yawObj.position.z = -48;

    // إرسال موقعي للسيرفر باش يشوفوني الناس
    set(myRef, {
        x: yawObj.position.x,
        z: yawObj.position.z,
        ry: yawObj.rotation.y
    });

    // تحريك الشخصيات ديال الزوار شوية لفوق ولتحت باش يبانو طافيين (Floating Effect)
    for(let id in players) {
        players[id].position.y = Math.sin(time * 0.003 + players[id].position.x) * 0.5;
    }

    renderer.render(scene, camera);
    prevTime = time;
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
