// js/easter-egg/engine.js
// NOUVEAUX GRAPHISMES : Draw personnalisé pour chaque entité.
// NOUVELLE IA BOSS : Vrais patterns d'attaque continus.
// AUDIT UPDATE : Coyote Time, Jump Buffering, Magnétisme, Saut variable et Caméra Axe Y.

import { groundY, clouds, stars, levels } from './config.js';
import { keys } from './input.js';
import { initAudio, playSound, setMusicMode } from './audio.js';

let gameContainer, closeBtn, restartBtn, canvas, ctx, scoreElement, gameOverScreen;
let bossHpContainer, bossHpFill, bossNameTxt;
let gameLoop;

let gameActive = false;
export const isGameActive = () => gameActive;

// AUDIT UPDATE : Ajout de cameraY
let currentLevelIdx = 0; let cameraX = 0; let cameraY = 0; let frameCount = 0; let screenShake = 0;
let hitStopFrames = 0; let gameState = 'playing'; let cinematicTimer = 0; let cinematicState = '';

// AUDIT UPDATE : Physique légèrement plus "lourde" et nerveuse
const gravity = 0.65; const defaultFriction = 0.8; const mudFriction = 0.95; 

// AUDIT UPDATE : Timers pour le Game Feel (Coyote Time & Jump Buffer)
let coyoteFrames = 0;
let jumpBufferFrames = 0;

const player = {
    x: 50, y: 200, width: 24, height: 32, vx: 0, vy: 0, speed: 6.5, jumpPower: -13.5,
    grounded: false, facingRight: true, squash: 1, stretch: 1, hp: 5, maxHp: 5, invincibleTimer: 0,
    jumps: 0, spawnX: 50, spawnY: 200, hasWallJump: false, hasDash: false, 
    canDash: true, isDashing: false, dashTimer: 0, dashDir: 1, wallJumpTimer: 0 
};

let particles = []; let floatingTexts = []; let ghosts = []; let enemies = []; 
let items = []; let npcs = []; let chests = []; let buzzsaws = [];
let levelTasks = 0; let completedTasks = 0; let levelData = {}; 
let activeDialog = null; let nearNPC = null;
let mapSelectedLevel = 0; let maxUnlockedLevel = 0;
const levelCompleted = Array.from({ length: levels.length }, () => false);
const levelStarsCollected = Array.from({ length: levels.length }, () => 0);
let totalStarsCollected = 0;
const levelToolsCollected = Array.from({ length: levels.length }, () => 0);
let totalToolsCollected = 0;
let mapAvatarX = 140; let mapAvatarY = 360; let mapAvatarTargetX = 140; let mapAvatarTargetY = 360;
let pendingLevelIdx = 0; let levelEnterTimer = 0;

export function initEngine() {
    gameContainer = document.getElementById('easter-egg-game-container'); closeBtn = document.getElementById('close-game-btn');
    restartBtn = document.getElementById('restart-game-btn'); canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d'); scoreElement = document.getElementById('game-score');
    gameOverScreen = document.getElementById('game-over-screen'); bossHpContainer = document.getElementById('boss-hp-container');
    bossHpFill = document.getElementById('boss-hp-fill'); bossNameTxt = document.getElementById('boss-name');
    closeBtn.addEventListener('click', closeGameUI);
}

export function startGameUI() {
    initAudio(); player.hasWallJump = false; player.hasDash = false;
    gameContainer.classList.remove('hidden'); gameContainer.classList.add('flex'); 
    document.body.style.overflow = 'hidden'; showWorldMap();
}

function closeGameUI() {
    gameContainer.classList.add('hidden'); gameContainer.classList.remove('flex');
    document.body.style.overflow = ''; gameActive = false; cancelAnimationFrame(gameLoop);
}

function updateProgressAbilities() {
    // Progression de type metroidvania liee a la campagne.
    player.hasWallJump = maxUnlockedLevel >= 1;
    player.hasDash = maxUnlockedLevel >= 2;
}

function isLevelUnlocked(idx) {
    if (idx === 0) return true; // Le premier niveau est toujours accessible
    const starRequirement = idx <= 2 ? 0 : (idx - 2) * 3;
    return idx <= maxUnlockedLevel && totalStarsCollected >= starRequirement;
}

function getMapNodePosition(idx) {
    const lvl = levels[idx];
    return {
        x: lvl.mapX || (140 + idx * 120),
        y: lvl.mapY || (240 + Math.sin(idx) * 80)
    };
}

function showWorldMap() {
    updateProgressAbilities();
    setMusicMode('map');
    gameState = 'world_map';
    mapSelectedLevel = Math.min(mapSelectedLevel, maxUnlockedLevel);
    const node = getMapNodePosition(mapSelectedLevel);
    mapAvatarX = node.x;
    mapAvatarY = node.y;
    mapAvatarTargetX = node.x;
    mapAvatarTargetY = node.y;
    activeDialog = null;
    if (bossHpContainer) {
        bossHpContainer.classList.add('opacity-0');
        setTimeout(() => bossHpContainer.classList.add('hidden'), 500);
    }
    document.getElementById('game-ui-level').innerText = "WORLD MAP - CONSTELLATION BOTANIQUE";
    document.getElementById('game-ui-score').innerHTML = `ETOILES: <span id="game-score" class="text-botanic-light text-xl">${totalStarsCollected}</span> | OUTILS: <span class="text-amber-300 text-xl">${totalToolsCollected}</span>`;
    gameOverScreen.classList.add('hidden');
    gameActive = true;
    cancelAnimationFrame(gameLoop);
    update();
}

function startSelectedLevel() {
    if (!isLevelUnlocked(mapSelectedLevel)) return;
    pendingLevelIdx = mapSelectedLevel;
    levelEnterTimer = 0;
    gameState = 'level_enter';
}

function activateBossUI(boss) {
    bossHpContainer.classList.remove('hidden'); bossNameTxt.innerText = boss.name;
    void bossHpContainer.offsetWidth; bossHpContainer.classList.remove('opacity-0'); updateBossUI(boss);
}

function updateBossUI(boss) {
    let pct = Math.max(0, (boss.hp / boss.maxHp) * 100); bossHpFill.style.width = pct + '%';
    if(pct <= 0) { bossHpContainer.classList.add('opacity-0'); setTimeout(() => bossHpContainer.classList.add('hidden'), 500); }
}

function loadLevel(idx) {
    currentLevelIdx = idx; levelData = JSON.parse(JSON.stringify(levels[idx])); 
    if (!levelData) return showWorldMap();
    
    // FIX BUG CRASH : On s'assure que le niveau a une largeur par défaut
    levelData.width = levelData.width || 3000;
    
    levelData.platforms = levelData.platforms || [];
    levelData.tasks = levelData.tasks || [];
    levelData.water = levelData.water || [];
    levelData.windZones = levelData.windZones || [];
    levelData.checkpoints = levelData.checkpoints || [];
    levelData.decorations = levelData.decorations || [];
    levelData.enemies = levelData.enemies || [];
    levelData.items = levelData.items || [];
    levelData.npcs = levelData.npcs || [];
    levelData.buzzsaws = levelData.buzzsaws || [];
    levelData.chests = levelData.chests || []; // FIX : Ne pas effacer les coffres existants
    
    if (!levelData.goal) levelData.goal = { x: levelData.width - 160, y: groundY - 80, w: 120, h: 80 };
    updateProgressAbilities();
    setMusicMode(levelData.isBoss ? 'boss' : (levelData.time === 'night' ? 'night' : (levelData.time === 'sunset' ? 'sunset' : 'calm')));
    player.x = player.spawnX = 50; player.y = player.spawnY = 200; player.vx = 0; player.vy = 0; 
    player.facingRight = true; player.hp = player.maxHp; player.invincibleTimer = 0; player.jumps = 0;
    player.isDashing = false; player.canDash = true; player.wallJumpTimer = 0;
    
    cameraX = 0; cameraY = 0; // Reset caméras
    coyoteFrames = 0; jumpBufferFrames = 0; // Reset timers

    enemies = levelData.enemies; items = levelData.items; npcs = levelData.npcs; 
    buzzsaws = levelData.buzzsaws; chests = levelData.chests; // FIX : Charger les coffres du niveau
    completedTasks = 0; levelTasks = levelData.tasks ? levelData.tasks.length : 0;
    particles = []; floatingTexts = []; ghosts = []; activeDialog = null; nearNPC = null;
    levelData.projectiles = []; levelData.switches = []; gameState = 'playing'; hitStopFrames = 0;
    levelData.stars = (levelData.stars || [
        { x: Math.max(180, Math.floor(levelData.width * 0.25)), y: Math.max(80, groundY - 130), collected: false },
        { x: Math.max(220, Math.floor(levelData.width * 0.55)), y: Math.max(70, groundY - 180), collected: false },
        { x: Math.max(260, Math.floor(levelData.width * 0.82)), y: Math.max(60, groundY - 160), collected: false }
    ]);
    levelData.tools = (levelData.tools || [
        { x: Math.max(220, Math.floor(levelData.width * 0.2)), y: Math.max(90, groundY - 120), collected: false, kind: 'rake' },
        { x: Math.max(260, Math.floor(levelData.width * 0.5)), y: Math.max(80, groundY - 160), collected: false, kind: 'shears' },
        { x: Math.max(320, Math.floor(levelData.width * 0.78)), y: Math.max(90, groundY - 140), collected: false, kind: 'shovel' }
    ]);
    
    // FIX BUG CRASH : Initialiser les baseY pour éviter les valeurs NaN (Not a Number) avec le magnétisme
    if (items) items.forEach(i => i.baseY = i.baseY !== undefined ? i.baseY : i.y);
    if (enemies) enemies.forEach(e => e.baseY = e.baseY !== undefined ? e.baseY : e.y);
    if (levelData.stars) levelData.stars.forEach(s => s.baseY = s.baseY !== undefined ? s.baseY : s.y);
    if (levelData.tools) levelData.tools.forEach(t => t.baseY = t.baseY !== undefined ? t.baseY : t.y);

    for (let i = 0; i < levelData.stars.length; i++) {
        if (i < levelStarsCollected[idx]) levelData.stars[i].collected = true;
    }
    for (let i = 0; i < levelData.tools.length; i++) {
        if (i < levelToolsCollected[idx]) levelData.tools[i].collected = true;
    }

    if (levelData.boss) {
        levelData.boss.phase = 1; levelData.boss.state = 'idle'; levelData.boss.shield = false;
        levelData.boss.invincible = false; levelData.boss.hasDoneIntro = false; levelData.boss.isActive = false; 
        levelData.boss.startX = levelData.boss.x; // FIX : Mémoriser le X pour le restart
    }
    
    document.getElementById('game-ui-level').innerText = "NIVEAU " + (idx + 1) + " - " + levelData.name;
    document.getElementById('game-ui-score').innerHTML = levelData.isBoss ? "BATTEZ LA RONCE !" : `TÂCHES: <span id="game-score" class="text-botanic-light text-xl">0/${levelTasks}</span>`;
    if(!levelData.isBoss) scoreElement = document.getElementById('game-score');
    
    gameOverScreen.classList.add('hidden');
    if(bossHpContainer) { bossHpContainer.classList.add('opacity-0'); setTimeout(() => bossHpContainer.classList.add('hidden'), 500); }
    gameActive = true; cancelAnimationFrame(gameLoop); update();
}

function spawnParticles(x, y, color, count, type = 'normal') {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x + Math.random() * 20 - 10, y: y + Math.random() * 20 - 10,
            vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 1) * 10,
            life: 1.0, size: Math.random() * 6 + 3, rot: Math.random() * Math.PI * 2, vrot: (Math.random() - 0.5) * 0.4, color: color, type: type
        });
    }
}

function spawnText(x, y, text, color = '#fff', size = '18px') { floatingTexts.push({ x: x, y: y, text: text, life: 1.0, color: color, size: size }); }
function checkCollision(r1, r2) { let w1 = r1.w||r1.width; let h1 = r1.h||r1.height; let w2 = r2.w||r2.width; let h2 = r2.h||r2.height; return r1.x < r2.x + w2 && r1.x + w1 > r2.x && r1.y < r2.y + h2 && r1.y + h1 > r2.y; }

function applyDamage(desc, knockbackX = 0, knockbackY = -6) {
    if (player.invincibleTimer > 0) return false;
    player.hp--;
    player.invincibleTimer = 120; // 2 secondes a 60 FPS
    player.vx = knockbackX;
    player.vy = knockbackY;
    hitStopFrames = 12; // Grosse pause à l'impact
    screenShake = 15;
    spawnParticles(player.x, player.y, '#ef4444', 14);
    spawnText(player.x, player.y - 20, "-1 PV", '#ef4444', '24px');
    if (player.hp <= 0) {
        gameActive = false;
        document.getElementById('game-end-title').innerText = "Mort !"; document.getElementById('game-end-text').innerText = desc;
        restartBtn.innerText = "Repartir";
        restartBtn.onclick = () => {
            player.hp = player.maxHp; player.x = player.spawnX; player.y = player.spawnY; player.vx = 0; player.vy = 0; player.invincibleTimer = 120; player.wallJumpTimer = 0;
            cameraX = player.x - canvas.width / 2;
            cameraY = player.y - canvas.height / 2;
            if (levelData.boss && !levelData.boss.dead) {
                levelData.boss.hp = levelData.boss.maxHp; levelData.boss.x = levelData.boss.startX;
                levelData.boss.state = 'idle'; levelData.boss.isActive = false; levelData.boss.hasDoneIntro = false; gameState = 'playing';
                if(bossHpContainer) { bossHpContainer.classList.add('opacity-0'); setTimeout(() => bossHpContainer.classList.add('hidden'), 500); }
            }
            gameOverScreen.classList.add('hidden'); gameActive = true; update();
        };
        gameOverScreen.classList.remove('hidden'); return true;
    }
    return false;
}

function edgeRespawn(reason) {
    const safeX = Math.max(20, player.x - 220);
    player.x = safeX;
    player.y = Math.min(player.y, groundY - 120);
    player.vx = 0;
    player.vy = 0;
    screenShake = 10;
    return applyDamage(reason, 0, -4);
}

function showGameOver(title, desc, buttonText = "Rejouer", returnToMap = false) {
    gameActive = false;
    cancelAnimationFrame(gameLoop);
    document.getElementById('game-end-title').innerText = title;
    document.getElementById('game-end-text').innerText = desc;
    restartBtn.innerText = buttonText;
    restartBtn.onclick = () => {
        gameOverScreen.classList.add('hidden');
        if (returnToMap) {
            showWorldMap();
            return;
        }
        loadLevel(currentLevelIdx);
    };
    gameOverScreen.classList.remove('hidden');
}

function update() {
    if (!gameActive) return;
    if (hitStopFrames > 0) { hitStopFrames--; draw(); gameLoop = requestAnimationFrame(update); return; }
    frameCount++;

    if (gameState === 'world_map') {
        if (keys.left && mapSelectedLevel > 0) {
            mapSelectedLevel--;
            keys.left = false;
            const target = getMapNodePosition(mapSelectedLevel);
            mapAvatarTargetX = target.x; mapAvatarTargetY = target.y;
            playSound('jump');
        }
        if (keys.right && mapSelectedLevel < maxUnlockedLevel) {
            mapSelectedLevel++;
            keys.right = false;
            const target = getMapNodePosition(mapSelectedLevel);
            mapAvatarTargetX = target.x; mapAvatarTargetY = target.y;
            playSound('jump');
        }
        if (keys.interactJustPressed || keys.jumpJustPressed) {
            keys.interactJustPressed = false;
            keys.jumpJustPressed = false;
            startSelectedLevel();
            return;
        }
        draw();
        gameLoop = requestAnimationFrame(update);
        return;
    }

    if (gameState === 'level_enter') {
        levelEnterTimer++;
        draw();
        if (levelEnterTimer > 42) {
            loadLevel(pendingLevelIdx);
            return;
        }
        gameLoop = requestAnimationFrame(update);
        return;
    }

    // Gestion des timers de tolérance pour les contrôles
    if (player.grounded) {
        coyoteFrames = 6; // 6 frames de grâce après avoir quitté le bord
    } else {
        if (coyoteFrames > 0) coyoteFrames--;
    }

    if (keys.jumpJustPressed) {
        jumpBufferFrames = 6; // Enregistre l'input pendant 6 frames
    } else {
        if (jumpBufferFrames > 0) jumpBufferFrames--;
    }

    // GESTION PLATEFORMES FANTOMES & SCIES
    for (let p of levelData.platforms) {
        if (p.type === 'ghost_plat') {
            p.timer++;
            if (p.timer > 120) { p.active = !p.active; p.timer = 0; }
        }
    }
    for (let s of buzzsaws) {
        s.x += s.vx;
        if (s.x < s.minX || s.x > s.maxX) s.vx *= -1;
        if (player.invincibleTimer === 0 && !player.isDashing && checkCollision(player, {x: s.x - s.size, y: s.y - s.size, w: s.size*2, h: s.size*2})) {
            screenShake = 15; playSound('hit');
            if(applyDamage("Déchiqueté par une scie circulaire !", (player.x < s.x ? -12 : 12), -8)) return;
        }
    }

    if (levelData.boss && !levelData.boss.dead && gameState !== 'boss_intro') {
        let distToBoss = Math.abs((player.x + player.width/2) - (levelData.boss.x + levelData.boss.w/2));
        if (!levelData.boss.isActive && distToBoss < 600) {
            levelData.boss.isActive = true;
            if (!levelData.boss.hasDoneIntro) {
                gameState = 'boss_intro'; cinematicState = 'pan'; cinematicTimer = 0;
                levelData.boss.hasDoneIntro = true; player.vx = 0; player.vy = 0; 
            } else { activateBossUI(levelData.boss); }
        }
    }

    if (gameState === 'boss_intro') {
        cinematicTimer++;
        if (cinematicState === 'pan') {
            let targetCamX = levelData.boss.x - canvas.width/2 + levelData.boss.w/2; cameraX += (targetCamX - cameraX) * 0.05;
            // On centre aussi l'axe Y sur le boss
            let targetCamY = levelData.boss.y - canvas.height/2 + levelData.boss.h/2; cameraY += (targetCamY - cameraY) * 0.05;
            if (cinematicTimer > 60) { cinematicState = 'roar'; cinematicTimer = 0; }
        } else if (cinematicState === 'roar') {
            if (cinematicTimer === 1) { playSound('boss_intro'); screenShake = 20; }
            if (cinematicTimer > 60) { cinematicState = 'pan_back'; cinematicTimer = 0; }
        } else if (cinematicState === 'pan_back') {
            let targetCamX = player.x - canvas.width/2 + player.width/2; cameraX += (targetCamX - cameraX) * 0.1;
            let targetCamY = player.y - canvas.height/2 + player.height/2; cameraY += (targetCamY - cameraY) * 0.1;
            if (Math.abs(cameraX - targetCamX) < 10 || cinematicTimer > 60) { gameState = 'playing'; activateBossUI(levelData.boss); }
        }
        draw(); gameLoop = requestAnimationFrame(update); return; 
    }

    let currentFriction = defaultFriction;
    if (player.grounded) {
        for(let p of levelData.platforms) {
            if (p.type === 'mud' && player.x + player.width > p.x && player.x < p.x + p.w && player.y + player.height >= p.y && player.y + player.height <= p.y + 5) currentFriction = mudFriction; 
        }
    }

    nearNPC = null;
    for (let npc of npcs) if (Math.abs((player.x + player.width/2) - (npc.x + npc.w/2)) < 100 && Math.abs(player.y - npc.y) < 60) nearNPC = npc;
    
    if (nearNPC) {
        if (!activeDialog || activeDialog.npc !== nearNPC) activeDialog = { npc: nearNPC, line: 0, showPrompt: true };
        if (keys.interactJustPressed) {
            if(activeDialog.showPrompt) { activeDialog.showPrompt = false; } 
            else { activeDialog.line++; if (activeDialog.line >= nearNPC.dialogs.length) activeDialog = null; }
        }
    } else if (activeDialog && activeDialog.npc.name !== "Coffre") activeDialog = null;

    for (let c of chests) {
        if (!c.opened && checkCollision(player, c)) {
            if (keys.interactJustPressed) {
                c.opened = true; playSound('chest'); spawnParticles(c.x + 20, c.y + 20, '#fde047', 50);
                let itemName = c.item === 'walljump' ? "Crampons d'Élagage" : "Sécateur-Dash";
                let itemDesc = c.item === 'walljump' ? "Glissez sur les murs et sautez pour rebondir tel un ninja !" : "Appuyez sur MAJ en plein saut pour foncer et être invincible !";
                if (c.item === 'walljump') player.hasWallJump = true; if (c.item === 'dash') player.hasDash = true;
                activeDialog = { npc: { x: c.x, y: c.y - 40, w: 0, h: 0, name: "Coffre", dialogs: [`Vous avez obtenu : ${itemName} !`, itemDesc] }, line: 0, showPrompt: false };
            }
        }
    }
    
    if(activeDialog && activeDialog.npc.name === "Coffre" && keys.interactJustPressed) { activeDialog.line++; if (activeDialog.line >= activeDialog.npc.dialogs.length) activeDialog = null; }
    keys.interactJustPressed = false; 

    for (let w of (levelData.windZones || [])) {
        if (checkCollision(player, w)) { player.vy -= 1.2; if (frameCount % 10 === 0) spawnParticles(player.x + player.width/2, player.y + player.height, '#ffffff', 1, 'wind'); }
    }

    if (player.invincibleTimer > 0) player.invincibleTimer--;
    player.squash += (1 - player.squash) * 0.2; player.stretch += (1 - player.stretch) * 0.2;

    if (keys.dashJustPressed && player.hasDash && player.canDash && !player.isDashing) {
        player.isDashing = true; player.dashTimer = 12; player.canDash = false;
        player.dashDir = player.facingRight ? 1 : -1; player.vy = 0; player.wallJumpTimer = 0;
        playSound('dash'); spawnParticles(player.x, player.y+10, '#3b82f6', 15);
        screenShake = 3; // Petit kick visuel au dash
    }
    keys.dashJustPressed = false;

    if (player.isDashing) {
        player.vx = player.dashDir * 15; player.dashTimer--; player.vy = 0; 
        if (frameCount % 2 === 0) ghosts.push({ x: player.x, y: player.y, squash: player.squash, stretch: player.stretch, facingRight: player.facingRight, life: 1.0 });
        if (player.dashTimer <= 0) player.isDashing = false;
    } else if (player.wallJumpTimer > 0) {
        player.wallJumpTimer--;
    } else {
        if (keys.left) { player.vx -= 1.2; player.facingRight = false; }
        if (keys.right) { player.vx += 1.2; player.facingRight = true; }
        player.vx *= currentFriction;
    }

    let platformDeltaX = 0;
    for (let p of levelData.platforms) {
        if (p.type === 'moving') {
            p.x += p.vx; if (p.x < p.minX || p.x + p.w > p.maxX) p.vx *= -1;
            if (player.grounded && player.y + player.height === p.y && player.x + player.width > p.x && player.x < p.x + p.w) platformDeltaX = p.vx;
        }
        if (p.type === 'fragile' && p.state === 'falling') p.y += 6;
    }
    player.x += platformDeltaX;

    if (!player.isDashing && player.wallJumpTimer === 0) { if (player.vx > player.speed) player.vx = player.speed; if (player.vx < -player.speed) player.vx = -player.speed; }

    player.x += player.vx;
    if (player.x < -20) { showWorldMap(); return; }
    if (player.x + player.width > levelData.width) { player.x = levelData.width - player.width; player.vx = 0; }

    let touchingWallDir = 0;
    for (let p of levelData.platforms) {
        if (p.type === 'bouncy' || (p.type === 'ghost_plat' && !p.active)) continue; 
        
        if (checkCollision(player, p)) {
            if (player.vx > 0 || platformDeltaX > 0) { player.x = p.x - player.width; player.vx = 0; } 
            else if (player.vx < 0 || platformDeltaX < 0) { player.x = p.x + p.w; player.vx = 0; }
            if (player.isDashing) { player.isDashing = false; player.dashTimer = 0; }
        }
        
        if (player.vy > 0 && player.y + player.height > p.y && player.y < p.y + p.h) {
            if (player.x + player.width >= p.x - 1 && player.x + player.width <= p.x + 1 && keys.right) touchingWallDir = 1;
            if (player.x <= p.x + p.w + 1 && player.x >= p.x + p.w - 1 && keys.left) touchingWallDir = -1;
        }
    }

    if (!player.isDashing) { 
        player.vy += gravity; 
        // AUDIT UPDATE : Hauteur de saut variable (plus on lâche vite, plus on retombe vite)
        if (!keys.jump && player.vy < -2 && player.wallJumpTimer === 0) {
            player.vy *= 0.85; 
        }
        if (player.vy > 14) player.vy = 14; 
    }

    let isWallSliding = false;
    if (player.hasWallJump && !player.grounded && player.vy > 0 && touchingWallDir !== 0 && !player.isDashing) {
        isWallSliding = true; player.vy = 2.5; player.canDash = true; player.jumps = 1; // Glisse contrôlée
        if (frameCount % 4 === 0) spawnParticles(player.x + (touchingWallDir===1?player.width:0), player.y + 10, '#d4d4d8', 3);
    }

    // Utilisation du Jump Buffer et Coyote Time
    if (jumpBufferFrames > 0 && !player.isDashing) {
        if (isWallSliding || (touchingWallDir !== 0 && !player.grounded)) {
            playSound('jump'); player.vy = player.jumpPower * 0.85; player.vx = touchingWallDir * -13; 
            player.facingRight = (touchingWallDir === -1); player.jumps = 1; player.wallJumpTimer = 12; 
            player.squash = 0.7; player.stretch = 1.3; spawnParticles(player.x + (touchingWallDir===1?player.width:0), player.y + 16, '#d4d4d8', 12);
            jumpBufferFrames = 0; coyoteFrames = 0;
        } else if (coyoteFrames > 0) { // On est sur le sol ou on vient de le quitter (Coyote Time)
            playSound('jump'); player.vy = player.jumpPower; player.grounded = false; player.jumps = 1;
            player.squash = 0.6; player.stretch = 1.4; spawnParticles(player.x + 12, player.y + 32, '#d4d4d8', 8);
            jumpBufferFrames = 0; coyoteFrames = 0;
        } else if (player.jumps === 1) { // Double saut
            playSound('jump'); player.vy = player.jumpPower * 0.9; player.jumps = 2;
            player.squash = 0.7; player.stretch = 1.3; spawnParticles(player.x + 12, player.y + 32, '#818cf8', 15);
            jumpBufferFrames = 0;
        }
    }

    player.y += player.vy;
    const wasGrounded = player.grounded; player.grounded = false;

    for (let p of levelData.platforms) {
        if (p.type === 'ghost_plat' && !p.active) continue;

        if (checkCollision(player, p)) {
            if (player.vy > 0) {
                player.y = p.y - player.height; player.vy = 0; player.grounded = true;
                player.jumps = 0; player.canDash = true; player.wallJumpTimer = 0; 
                coyoteFrames = 6; // Recharge coyote timer à l'atterrissage
                
                if (p.type === 'bouncy') {
                    playSound('bounce'); player.vy = -18; player.grounded = false; player.jumps = 1;
                    player.squash = 0.5; player.stretch = 1.5; spawnParticles(player.x + 12, player.y + 32, '#ef4444', 15);
                    coyoteFrames = 0; // Pas de coyote sur un bumper
                }
                if (p.type === 'fragile') {
                    if(p.state === 'idle') p.state = 'shaking'; p.timer++; if(p.timer > 25) p.state = 'falling';
                }
            } else if (player.vy < 0) {
                if (p.type !== 'bouncy') { player.y = p.y + p.h; player.vy = 0; }
            }
        }
    }

    if (!wasGrounded && player.grounded) { 
        if (!player.canDash && player.hasDash) {
            // AUDIT UPDATE : Feedback visuel quand le dash se recharge en atterrissant
            spawnParticles(player.x + 12, player.y + 32, '#60a5fa', 10);
        }
        player.squash = 1.4; player.stretch = 0.6; 
        spawnParticles(player.x + 12, player.y + 32, '#a8a29e', 6); 
    }

    for (let w of (levelData.water || [])) {
        if (player.y + player.height > w.y + 20 && player.x + player.width > w.x && player.x < w.x + w.w) {
            playSound('water'); spawnParticles(player.x+12, w.y+10, '#3b82f6', 30);
            if(edgeRespawn("Vous êtes tombé à l'eau.")) return;
        }
    }
    if (player.y > groundY + 200) if(edgeRespawn("Attention où vous mettez les pieds.")) return;

    for (let c of (levelData.checkpoints || [])) {
        if (!c.active && checkCollision(player, c)) {
            c.active = true; player.spawnX = c.x; player.spawnY = c.y - 20; 
            spawnParticles(c.x + 10, c.y, '#fde047', 30); spawnText(c.x, c.y - 30, "SAUVEGARDÉ !", '#fde047', '22px');
        }
    }

    // AUDIT UPDATE : Caméra Axe X et Axe Y !
    let lookAheadX = Math.max(-90, Math.min(90, player.vx * 14));
    let lookAheadY = player.vy > 6 ? player.vy * 6 : 0; // Regarde légèrement en bas si on tombe vite
    
    let targetCamX = player.x - canvas.width / 2 + player.width / 2 + lookAheadX;
    let targetCamY = player.y - canvas.height / 2 + player.height / 2 + lookAheadY;
    
    // Limites de la caméra sur l'Axe X
    if (targetCamX < 0) targetCamX = 0; 
    if (targetCamX > levelData.width - canvas.width) targetCamX = levelData.width - canvas.width;
    
    // Limite de la caméra sur l'Axe Y (pour ne pas trop voir le vide en dessous du sol)
    let bottomLimit = groundY + 120 - canvas.height;
    if (targetCamY > bottomLimit) targetCamY = bottomLimit;
    
    cameraX += (targetCamX - cameraX) * 0.14;
    cameraY += (targetCamY - cameraY) * 0.14;

    if (screenShake > 0) { ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake); screenShake *= 0.9; }

    for (let i = ghosts.length - 1; i >= 0; i--) { ghosts[i].life -= 0.05; if (ghosts[i].life <= 0) ghosts.splice(i, 1); }
    for (let i = particles.length - 1; i >= 0; i--) { let p = particles[i]; p.x += p.vx; p.y += p.vy; if(p.type!=='wind') p.vy += gravity * 0.5; p.rot += p.vrot; p.life -= 0.02; if (p.life <= 0) particles.splice(i, 1); }
    for (let i = floatingTexts.length - 1; i >= 0; i--) { let ft = floatingTexts[i]; ft.y -= 1.0; ft.life -= 0.015; if (ft.life <= 0) floatingTexts.splice(i, 1); }

    for (let t of levelData.tasks) {
        if (!t.done && checkCollision(player, t)) {
            t.done = true; completedTasks++; playSound('hit'); hitStopFrames = 3; 
            if (scoreElement) scoreElement.innerText = `${completedTasks}/${levelTasks}`;
            spawnParticles(t.x + t.w/2, t.y + t.h/2, '#22c55e', 40, 'leaf'); 
            spawnText(t.x + t.w/2, t.y - 20, t.name, '#4ade80', '22px');
        }
    }

    let isGoalOpen = completedTasks >= levelTasks && (!levelData.boss || levelData.boss.dead) && chests.every(c => c.opened);
    if (!levelData.isBoss && checkCollision(player, levelData.goal)) {
        if (isGoalOpen) {
            if (keys.interact) {
                playSound('tractor');
                levelCompleted[currentLevelIdx] = true;
                if (currentLevelIdx < levels.length - 1) {
                    maxUnlockedLevel = Math.max(maxUnlockedLevel, currentLevelIdx + 1);
                }
                showWorldMap();
                return;
            }
        } else if (frameCount % 60 === 0) spawnText(player.x, player.y - 40, "Tâches ou Coffre manquant !", '#ef4444');
    }

    // Magnétisme des Items
    for (let i = items.length - 1; i >= 0; i--) {
        let item = items[i];
        let distX = (player.x + player.width/2) - (item.x + item.w/2 || item.x);
        let distY = (player.y + player.height/2) - (item.y + item.h/2 || item.y);
        let dist = Math.sqrt(distX*distX + distY*distY);
        
        if (dist < 100) { 
            item.x += distX * 0.1;
            item.baseY += distY * 0.1; 
        }
        item.y = item.baseY + Math.sin(frameCount * 0.1) * 5;

        if (!item.collected && checkCollision(player, item)) {
            item.collected = true; if (player.hp < player.maxHp) player.hp++;
            spawnParticles(item.x + 10, item.y + 10, '#ef4444', 25); spawnText(item.x, item.y, "+1 PV", '#ef4444');
            items.splice(i, 1);
        }
    }

    for (let s of (levelData.stars || [])) {
        if (s.collected) continue;
        let distX = (player.x + player.width/2) - s.x;
        let distY = (player.y + player.height/2) - s.y;
        if (Math.sqrt(distX*distX + distY*distY) < 120) { 
            s.x += distX * 0.08; 
            s.baseY += distY * 0.08; 
        }
        // FIX BUG : Assigner la vraie position à partir du baseY
        s.y = s.baseY + Math.sin(frameCount * 0.08 + s.x * 0.01) * 5;

        if (checkCollision(player, { x: s.x - 10, y: s.y - 10, w: 20, h: 20 })) {
            s.collected = true;
            totalStarsCollected++;
            levelStarsCollected[currentLevelIdx]++;
            playSound('chest');
            spawnParticles(s.x, s.y, '#fde047', 24, 'leaf');
            spawnText(s.x, s.y - 18, "+1 ETOILE", '#fde047', '18px');
        }
    }

    for (let tool of (levelData.tools || [])) {
        if (tool.collected) continue;
        let distX = (player.x + player.width/2) - tool.x;
        let distY = (player.y + player.height/2) - tool.y;
        if (Math.sqrt(distX*distX + distY*distY) < 120) { 
            tool.x += distX * 0.08; 
            tool.baseY += distY * 0.08; 
        }
        // FIX BUG : Assigner la vraie position à partir du baseY
        tool.y = tool.baseY + Math.sin(frameCount * 0.07 + tool.x * 0.015) * 4;

        if (checkCollision(player, { x: tool.x - 12, y: tool.y - 12, w: 24, h: 24 })) {
            tool.collected = true;
            totalToolsCollected++;
            levelToolsCollected[currentLevelIdx]++;
            playSound('chest');
            spawnParticles(tool.x, tool.y, '#f59e0b', 24, 'leaf');
            spawnText(tool.x, tool.y - 18, "+1 OUTIL", '#f59e0b', '18px');
        }
    }

    for (let e of enemies) {
        if (e.dead) continue;
        
        if (e.type === 'snail') { e.x += e.vx; if (e.x < e.minX || e.x + e.w > e.maxX) e.vx *= -1; } 
        else if (e.type === 'bee') { e.x += e.vx; e.y = e.baseY + Math.sin(frameCount * 0.05 + e.x * 0.01) * 40; if (e.x < e.minX || e.x + e.w > e.maxX) e.vx *= -1; } 
        else if (e.type === 'frog') {
            e.x += e.vx; e.vy += gravity; e.y += e.vy;
            if (e.y >= e.baseY) { e.y = e.baseY; e.vy = 0; if (Math.random() < 0.02) e.vy = -14; }
            if (e.x < e.minX || e.x + e.w > e.maxX) e.vx *= -1;
        }
        else if (e.type === 'mole') {
            e.timer++;
            if (e.timer < 120) { if (e.timer > 90 && frameCount % 5 === 0) spawnParticles(e.x + e.w/2, e.y, '#78350f', 3); } 
            else if (e.timer === 120) { e.vy = -13; playSound('hit'); } 
            else { e.y += e.vy; e.vy += gravity; if (e.y >= e.baseY) { e.y = e.baseY; e.vy = 0; e.timer = 0; } }
        }

        if (player.invincibleTimer === 0 && checkCollision(player, e)) {
            if (!player.isDashing && player.vy > 0 && player.y + player.height * 0.5 < e.y) {
                e.dead = true; player.vy = -11; hitStopFrames = 8; playSound('hit'); screenShake = 8;
                spawnParticles(e.x + e.w/2, e.y + e.h/2, '#fde047', 25); spawnText(e.x, e.y - 10, "CRASH!", '#fde047', '20px');
            } else if (!player.isDashing) {
                if(applyDamage("Les nuisibles ont gagné.", (player.x < e.x) ? -12 : 12, -7)) return;
            }
        }
    }

    if (levelData.boss && !levelData.boss.dead && gameState !== 'boss_intro') {
        let b = levelData.boss;
        
        if (b.isActive) {
            b.timer++;
            
            if (b.type === 'scarecrow') {
                b.x += b.vx || 0;
                if (b.state === 'idle') {
                    if(b.timer > 40) { b.attackType = Math.random() > 0.5 ? 'throw' : 'dash'; b.state = b.attackType; b.timer = 0; }
                } else if (b.state === 'throw') {
                    if (b.timer === 20 || b.timer === 40 || b.timer === 60) { 
                        levelData.projectiles.push({ x: b.x+b.w/2, y: b.y + 40, vx: (player.x > b.x ? 7 : -7), vy: 0, size: 20, color: '#9ca3af', type: 'scythe', rot: 0 }); playSound('hit');
                    }
                    if (b.timer > 100) { b.state = 'idle'; b.timer = 0; b.vx = 0; }
                } else if (b.state === 'dash') {
                    if (b.timer === 20) b.vx = (player.x > b.x ? 14 : -14);
                    if (b.timer > 50 || b.x < b.arenaMin || b.x + b.w > b.arenaMax) { b.state = 'idle'; b.timer = 0; b.vx = 0; }
                }
            }
            else if (b.type === 'toad') {
                const enraged = b.hp <= Math.ceil(b.maxHp * 0.45);
                if (b.state === 'idle') {
                    if(b.timer > (enraged ? 38 : 60)) { b.state = Math.random() > 0.5 ? 'summon' : 'jump'; b.timer = 0; } 
                } else if (b.state === 'jump') {
                    if(b.timer === 1) { b.vy = -20; b.vx = (player.x - b.x) * 0.04; }
                    b.vy += gravity; b.x += b.vx; b.y += b.vy;
                    if (b.x < b.arenaMin) b.x = b.arenaMin; if (b.x + b.w > b.arenaMax) b.x = b.arenaMax - b.w;
                    if (b.y >= 150 - b.h) { 
                        b.y = 150 - b.h; b.vy = 0; b.vx = 0; b.state = 'idle'; b.timer = 0; screenShake = 20; playSound('boss_hit');
                        levelData.projectiles.push({ x: b.x+b.w/2, y: b.y+b.h-10, vx: 8, vy: 0, size: 15, color: '#4ade80', type: 'shockwave', life: 100 });
                        levelData.projectiles.push({ x: b.x+b.w/2, y: b.y+b.h-10, vx: -8, vy: 0, size: 15, color: '#4ade80', type: 'shockwave', life: 100 });
                        if (enraged) {
                            levelData.projectiles.push({ x: b.x+b.w/2, y: b.y+b.h-16, vx: 0, vy: -4, size: 12, color: '#22c55e', type: 'thorn', rot: 0 });
                        }
                    }
                } else if (b.state === 'summon') {
                    if (b.timer === 20) {
                        playSound('water');
                        enemies.push({ x: b.x, y: b.y+b.h-24, w: 24, h: 24, type: 'frog', vx: -3, vy: -10, baseY: 150-24, minX: b.arenaMin, maxX: b.arenaMax, dead: false });
                        if (enraged) enemies.push({ x: b.x + 40, y: b.y+b.h-24, w: 24, h: 24, type: 'frog', vx: 3, vy: -10, baseY: 150-24, minX: b.arenaMin, maxX: b.arenaMax, dead: false });
                    }
                    if (b.timer > (enraged ? 45 : 60)) { b.state = 'idle'; b.timer = 0; }
                }
            }
            else if (b.type === 'bramble') {
                const phase2 = b.hp <= Math.ceil(b.maxHp * 0.5);
                if (b.state === 'intro') {
                    b.state = 'move'; b.vx = -4; b.timer = 0;
                } else if (b.state === 'move') {
                    if (phase2 && Math.abs(b.vx) < 6) b.vx *= 1.2;
                    b.x += b.vx;
                    if (b.x < b.arenaMin || b.x + b.w > b.arenaMax) b.vx *= -1;
                    
                    if (b.timer % (phase2 ? 36 : 60) === 0) {
                        playSound('hit');
                        levelData.projectiles.push({ x: b.x + b.w/2, y: b.y + 40, vx: (player.x > b.x ? 8 : -8), vy: -2, size: 15, color: '#991b1b', type: 'thorn', rot: 0 });
                        if (phase2) {
                            levelData.projectiles.push({ x: b.x + b.w/2, y: b.y + 45, vx: 0, vy: -5, size: 13, color: '#7f1d1d', type: 'thorn', rot: 0 });
                        }
                    }
                    
                    if (b.timer % (phase2 ? 120 : 180) === 0) { b.vy = phase2 ? -21 : -18; }
                }
                
                if (b.y < groundY - b.h) { b.vy += gravity; b.y += b.vy; } 
                else { 
                    if (b.vy > 5) {
                        screenShake = 15; playSound('boss_hit');
                        levelData.projectiles.push({ x: b.x+b.w/2, y: b.y+b.h-10, vx: 8, vy: 0, size: 20, color: '#b91c1c', type: 'shockwave', life: 150 });
                        levelData.projectiles.push({ x: b.x+b.w/2, y: b.y+b.h-10, vx: -8, vy: 0, size: 20, color: '#b91c1c', type: 'shockwave', life: 150 });
                    }
                    b.y = groundY - b.h; b.vy = 0; 
                }
            }

            if (player.invincibleTimer === 0 && checkCollision(player, b)) {
                if (!b.invincible && !player.isDashing && player.vy > 0 && player.y + player.height < b.y + 40) {
                    b.hp--; player.vy = -16; hitStopFrames = 10; screenShake = 25; playSound('boss_hit');
                    spawnParticles(b.x + b.w/2, b.y, '#dc2626', 80); spawnText(b.x + b.w/2, b.y - 30, "AÏE !", '#fde047', '36px');
                    updateBossUI(b);
                    if (b.hp <= 0) {
                        b.dead = true; 
                        if(b.type === 'bramble') {
                            b.deathTimer = 0; b.state = 'dying'; 
                        } else {
                            chests.push({ x: b.x + b.w/2 - 20, y: b.y + b.h - 40, w: 40, h: 40, item: b.reward, opened: false });
                            b.w = 0; 
                        }
                    }
                } else if (!player.isDashing) {
                    screenShake = 20;
                    if(applyDamage("Le boss vous a écrasé.", (player.x < b.x) ? -18 : 18, -10)) return;
                }
            }
            
            for (let i = levelData.projectiles.length - 1; i >= 0; i--) {
                let p = levelData.projectiles[i]; p.x += p.vx; p.y += p.vy;
                if(p.type === 'scythe' || p.type === 'thorn') p.rot += 0.2;
                if(p.type === 'shockwave') { p.life--; if(p.life <= 0) { levelData.projectiles.splice(i, 1); continue; } }
                if (checkCollision(player, {x: p.x-p.size, y: p.y-p.size, w: p.size*2, h: p.size*2}) && player.invincibleTimer === 0 && !player.isDashing) {
                    screenShake = 20; levelData.projectiles.splice(i, 1);
                    if(applyDamage("Touché par un projectile.", (player.x < p.x ? -12 : 12), -8)) return;
                }
            }
        }
        
        // AUDIT UPDATE : Feedback épique pour la mort du Boss Final
        if (b.dead && b.state === 'dying') {
            b.deathTimer++;
            if (b.deathTimer === 1) { hitStopFrames = 25; screenShake = 30; playSound('boss_hit'); }
            if (b.deathTimer % 5 === 0) spawnParticles(b.x + Math.random()*b.w, b.y + Math.random()*b.h, '#dc2626', 15);
            if (b.deathTimer > 60) {
                levelCompleted[currentLevelIdx] = true;
                maxUnlockedLevel = Math.max(maxUnlockedLevel, currentLevelIdx);
                return showGameOver("VICTOIRE MAGISTRALE !", "Le Hainaut est sauvé. Nouvelle campagne complétée !", "Retour world map", true);
            }
        }
    }

    draw(); gameLoop = requestAnimationFrame(update);
}

// --- DESSIN (CANVAS) ---
function drawWorldMap() {
    let bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, '#052e16');
    bg.addColorStop(1, '#14532d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 45; i++) {
        const x = (i * 137 + 20) % canvas.width;
        const y = (i * 97 + frameCount * 0.1) % canvas.height;
        ctx.globalAlpha = 0.12 + Math.sin(frameCount * 0.04 + i) * 0.08;
        ctx.fillStyle = '#bbf7d0';
        ctx.beginPath();
        ctx.arc(x, y, (i % 4) + 2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    for (let i = 0; i < levels.length; i++) {
        const { x, y } = getMapNodePosition(i);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(120, 53, 15, 0.35)';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.font = "bold 42px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = '#ecfccb';
    ctx.fillText("CARTE DES JARDINS", canvas.width / 2, 70);
    ctx.font = "16px Arial";
    ctx.fillStyle = '#d9f99d';
    ctx.fillText("FLECHES: choisir | E ou ESPACE: entrer", canvas.width / 2, 98);

    for (let i = 0; i < levels.length; i++) {
        const { x, y } = getMapNodePosition(i);
        const unlocked = isLevelUnlocked(i);
        const done = levelCompleted[i];
        const selected = i === mapSelectedLevel;
        const pulse = selected ? Math.sin(frameCount * 0.15) * 6 : 0;
        const radius = 20 + pulse;

        ctx.fillStyle = unlocked ? (done ? '#22c55e' : '#60a5fa') : '#334155';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = selected ? 4 : 2;
        ctx.strokeStyle = selected ? '#fef08a' : 'rgba(255,255,255,0.45)';
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = "bold 15px Arial";
        ctx.fillText(String(i + 1), x, y + 5);
        ctx.fillStyle = '#fde047';
        ctx.font = "12px Arial";
        ctx.fillText("★".repeat(Math.min(3, levelStarsCollected[i])), x, y + 28);
    }

    mapAvatarX += (mapAvatarTargetX - mapAvatarX) * 0.18;
    mapAvatarY += (mapAvatarTargetY - mapAvatarY) * 0.18;
    const step = Math.sin(frameCount * 0.25) * 2;
    ctx.save();
    ctx.translate(mapAvatarX, mapAvatarY - 22 + step);
    ctx.fillStyle = '#fca5a5'; ctx.beginPath(); ctx.arc(0, -7, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#84cc16'; ctx.fillRect(-7, -2, 14, 14);
    ctx.fillStyle = '#1e3a8a'; ctx.fillRect(-7, 12, 5, 10); ctx.fillRect(2, 12, 5, 10);
    ctx.fillStyle = '#166534'; ctx.fillRect(-5, -13, 10, 4);
    ctx.restore();

    if (gameState === 'level_enter') {
        const t = levelEnterTimer / 42;
        const burst = 80 + t * 420;
        const flash = ctx.createRadialGradient(mapAvatarX, mapAvatarY, 10, mapAvatarX, mapAvatarY, burst);
        flash.addColorStop(0, 'rgba(255,255,220,0.8)');
        flash.addColorStop(1, 'rgba(255,255,220,0)');
        ctx.fillStyle = flash;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(0,0,0,' + (t * 0.7).toFixed(3) + ')';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const level = levels[mapSelectedLevel];
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(160, 390, 580, 90, 14) : ctx.fillRect(160, 390, 580, 90);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.textAlign = "left";
    ctx.font = "bold 24px Arial";
    ctx.fillText(`Niveau ${mapSelectedLevel + 1} - ${level.name || 'Jardin Inconnu'}`, 184, 425);
    ctx.font = "16px Arial";
    const selectedUnlocked = isLevelUnlocked(mapSelectedLevel);
    const starRequirement = mapSelectedLevel <= 2 ? 0 : (mapSelectedLevel - 2) * 3;
    ctx.fillStyle = '#a5b4fc';
    ctx.fillText(selectedUnlocked ? "Debloque" : `Verrouille - ${starRequirement} etoiles`, 184, 452);
    ctx.fillStyle = '#fde047';
    ctx.fillText(`Etoiles: ${levelStarsCollected[mapSelectedLevel]}/3`, 330, 452);
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`Outils: ${levelToolsCollected[mapSelectedLevel]}/3`, 500, 452);
}

function drawAmbientOverlay(time, ambience) {
    if (ambience === 'orchard') {
        for (let i = 0; i < 18; i++) {
            const x = (frameCount * 0.8 + i * 180) % (canvas.width + 120) - 60;
            const y = 80 + (i * 31) % 260 + Math.sin(frameCount * 0.03 + i) * 12;
            ctx.fillStyle = 'rgba(253, 224, 71, 0.16)';
            ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
        }
    } else if (ambience === 'mudlands' || ambience === 'swamp') {
        for (let i = 0; i < 22; i++) {
            const x = (i * 97 + frameCount * 0.5) % canvas.width;
            const y = 220 + (i * 53) % 240;
            ctx.fillStyle = ambience === 'swamp' ? 'rgba(163, 230, 53, 0.18)' : 'rgba(180, 83, 9, 0.14)';
            ctx.fillRect(x, y + Math.sin(frameCount * 0.04 + i) * 4, 2, 6);
        }
    } else if (ambience === 'windgarden') {
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 12; i++) {
            const sx = ((frameCount * 3.2) + i * 120) % (canvas.width + 140) - 70;
            const sy = 110 + i * 28;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.quadraticCurveTo(sx + 26, sy - 10, sx + 56, sy + 4);
            ctx.stroke();
        }
    } else if (ambience === 'ruins') {
        ctx.fillStyle = 'rgba(120, 113, 108, 0.08)';
        for (let i = 0; i < 10; i++) {
            const x = (i * 160 + frameCount * 0.2) % (canvas.width + 80) - 40;
            ctx.fillRect(x, 120 + (i % 3) * 50, 80, 180);
        }
    } else if (ambience === 'bossGarden' || time === 'night') {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.06)';
        for (let i = 0; i < 9; i++) {
            const x = (i * 180 + frameCount * 0.7) % (canvas.width + 120) - 60;
            ctx.fillRect(x, 0, 24, canvas.height);
        }
    }
}

function drawDecorations(list) {
    for (const d of (list || [])) {
        if (!d || typeof d.x !== 'number') continue;
        const baseY = typeof d.y === 'number' ? d.y : groundY - 20;
        if (d.type === 'flowerPatch') {
            for (let i = 0; i < (d.w || 80); i += 12) {
                const x = d.x + i;
                const y = baseY + Math.sin(frameCount * 0.08 + i) * 2;
                ctx.fillStyle = '#166534'; ctx.fillRect(x, y - 8, 2, 8);
                ctx.fillStyle = ['#f472b6', '#fde047', '#93c5fd'][i % 3];
                ctx.beginPath(); ctx.arc(x + 1, y - 10, 3, 0, Math.PI * 2); ctx.fill();
            }
        } else if (d.type === 'bench') {
            ctx.fillStyle = '#78350f'; ctx.fillRect(d.x, baseY, 40, 6); ctx.fillRect(d.x + 4, baseY + 6, 4, 10); ctx.fillRect(d.x + 32, baseY + 6, 4, 10);
        } else if (d.type === 'treeDecor') {
            const s = d.size || 60;
            ctx.fillStyle = '#78350f'; ctx.fillRect(d.x, baseY + 20, s * 0.2, s * 0.9);
            ctx.fillStyle = '#15803d'; ctx.beginPath(); ctx.arc(d.x + s * 0.1, baseY, s * 0.55, 0, Math.PI * 2); ctx.fill();
        } else if (d.type === 'lantern' || d.type === 'lanternRed') {
            ctx.fillStyle = '#475569'; ctx.fillRect(d.x, baseY - 20, 3, 20);
            ctx.fillStyle = d.type === 'lanternRed' ? '#dc2626' : '#fde047';
            ctx.fillRect(d.x - 4, baseY - 24, 11, 10);
        } else if (d.type === 'arch') {
            ctx.strokeStyle = '#92400e'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(d.x, baseY + d.h); ctx.quadraticCurveTo(d.x + d.w/2, baseY, d.x + d.w, baseY + d.h); ctx.stroke();
        } else if (d.type === 'reed') {
            ctx.strokeStyle = '#65a30d'; ctx.lineWidth = 2;
            for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(d.x + i * 4, baseY); ctx.lineTo(d.x + i * 4 + Math.sin(frameCount * 0.06 + i) * 6, baseY - (d.h || 35)); ctx.stroke(); }
        } else if (d.type === 'wheelbarrow') {
            ctx.fillStyle = '#b45309'; ctx.fillRect(d.x, baseY, 26, 10); ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(d.x + 28, baseY + 10, 5, 0, Math.PI * 2); ctx.fill();
        } else if (d.type === 'barrel') {
            ctx.fillStyle = '#7c2d12'; ctx.fillRect(d.x, baseY, 14, 20); ctx.fillStyle = '#d6d3d1'; ctx.fillRect(d.x, baseY + 4, 14, 2); ctx.fillRect(d.x, baseY + 14, 14, 2);
        } else if (d.type === 'windmill') {
            ctx.fillStyle = '#64748b'; ctx.fillRect(d.x, baseY, 6, d.h || 120);
            ctx.save(); ctx.translate(d.x + 3, baseY + 10); ctx.rotate(frameCount * 0.05); ctx.fillStyle = '#e2e8f0';
            for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.fillRect(0, -2, 26, 4); } ctx.restore();
        } else if (d.type === 'kitePole') {
            ctx.fillStyle = '#334155'; ctx.fillRect(d.x, baseY, 4, 150); ctx.strokeStyle = '#fde047'; ctx.beginPath(); ctx.moveTo(d.x + 2, baseY + 20); ctx.lineTo(d.x + 46, baseY - 16); ctx.stroke();
        } else if (d.type === 'ruinPillar') {
            ctx.fillStyle = '#a8a29e'; ctx.fillRect(d.x, baseY, 30, d.h || 120); ctx.fillStyle = '#78716c'; ctx.fillRect(d.x - 4, baseY, 38, 8);
        } else if (d.type === 'vineWall') {
            ctx.fillStyle = '#14532d';
            for (let i = 0; i < 7; i++) ctx.fillRect(d.x + i * 8 + Math.sin(frameCount * 0.04 + i) * 3, baseY, 4, d.h || 160);
        } else if (d.type === 'mushroom') {
            ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(d.x, baseY, d.size || 18, Math.PI, 0); ctx.fill();
            ctx.fillStyle = '#fef2f2'; ctx.fillRect(d.x - 4, baseY, 8, (d.size || 18));
        } else if (d.type === 'totem') {
            ctx.fillStyle = '#854d0e'; ctx.fillRect(d.x, baseY - 30, 22, 30); ctx.fillStyle = '#fef3c7'; ctx.fillRect(d.x + 4, baseY - 22, 4, 4); ctx.fillRect(d.x + 14, baseY - 22, 4, 4);
        } else if (d.type === 'thornPillar') {
            ctx.fillStyle = '#3f6212'; ctx.fillRect(d.x, baseY, 16, d.h || 140);
            ctx.fillStyle = '#991b1b'; for (let i = 0; i < 8; i++) ctx.fillRect(d.x + 16, baseY + i * 18, 6, 4);
        }
    }
}

function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (gameState === 'world_map' || gameState === 'level_enter') {
        drawWorldMap();
        return;
    }

    const time = levelData.time;
    const ambience = levelData.ambience || '';
    let skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    if (time === 'morning') { skyGrad.addColorStop(0, '#0ea5e9'); skyGrad.addColorStop(1, '#e0f2fe'); }
    else if (time === 'midday') { skyGrad.addColorStop(0, '#0284c7'); skyGrad.addColorStop(1, '#bae6fd'); } 
    else if (time === 'afternoon') { skyGrad.addColorStop(0, '#ea580c'); skyGrad.addColorStop(1, '#fef08a'); } 
    else if (time === 'sunset') { skyGrad.addColorStop(0, '#9f1239'); skyGrad.addColorStop(1, '#fca5a5'); } 
    else { skyGrad.addColorStop(0, '#1e1b4b'); skyGrad.addColorStop(1, '#4c1d95'); } 
    ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (time === 'night') {
        ctx.fillStyle = '#fff';
        stars.forEach(s => {
            ctx.globalAlpha = Math.sin(frameCount * s.twinkleSpeed) * 0.5 + 0.5;
            // AUDIT UPDATE : Parallaxe Verticale pour les étoiles
            ctx.beginPath(); ctx.arc(s.x - cameraX * 0.05, s.y - cameraY * 0.05, s.size, 0, Math.PI*2); ctx.fill();
        }); ctx.globalAlpha = 1.0;
    }
    drawAmbientOverlay(time, ambience);

    // AUDIT UPDATE : Parallaxe Verticale pour le Soleil
    let sunX = 700 - (cameraX * 0.03); 
    let sunY = 100 - (cameraY * 0.03); 
    
    let sunRadius = 60; let haloPulse = Math.sin(frameCount*0.05)*20;
    let sunGrad = ctx.createRadialGradient(sunX, sunY, sunRadius, sunX, sunY, sunRadius + 50 + haloPulse);
    sunGrad.addColorStop(0, (time === 'night') ? '#f8fafc' : (time === 'sunset' ? '#f87171' : '#fef08a'));
    sunGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sunGrad; ctx.beginPath(); ctx.arc(sunX, sunY, sunRadius + 50 + haloPulse, 0, Math.PI*2); ctx.fill();

    // God Rays
    if (time === 'morning' || time === 'midday') {
        ctx.save();
        let rayGrad = ctx.createLinearGradient(sunX, sunY, sunX + 400, sunY + 500);
        rayGrad.addColorStop(0, 'rgba(255,255,255,0.15)'); rayGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = rayGrad;
        ctx.beginPath(); ctx.moveTo(sunX, sunY); ctx.lineTo(sunX - 200 + Math.sin(frameCount*0.01)*50, sunY + 500); ctx.lineTo(sunX + 600 + Math.cos(frameCount*0.01)*50, sunY + 500); ctx.fill();
        ctx.restore();
    }

    ctx.save();
    // AUDIT UPDATE : Parallax Y (Montagnes/Collines lointaines)
    ctx.translate(-cameraX * 0.15, -cameraY * 0.05);
    ctx.fillStyle = (time === 'sunset' || time === 'night') ? '#881337' : '#7dd3fc';
    ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(400, 100); ctx.lineTo(800, groundY); ctx.fill();
    ctx.beginPath(); ctx.moveTo(600, groundY); ctx.lineTo(1000, 150); ctx.lineTo(1400, groundY); ctx.fill();
    ctx.beginPath(); ctx.moveTo(1200, groundY); ctx.lineTo(1700, 100); ctx.lineTo(2200, groundY); ctx.fill();
    
    ctx.translate(cameraX * 0.15 - cameraX * 0.3, cameraY * 0.05 - cameraY * 0.1);
    ctx.fillStyle = (time === 'sunset' || time === 'night') ? '#4c0519' : '#38bdf8';
    ctx.beginPath(); ctx.moveTo(-200, groundY); ctx.lineTo(150, 180); ctx.lineTo(600, groundY); ctx.fill();
    ctx.beginPath(); ctx.moveTo(500, groundY); ctx.lineTo(900, 220); ctx.lineTo(1300, groundY); ctx.fill();
    
    ctx.translate(cameraX * 0.3 - cameraX * 0.5, cameraY * 0.1 - cameraY * 0.2);
    let treeColor = (time === 'sunset' || time === 'night') ? '#1e3a8a' : '#0369a1';
    for(let i=0; i<levelData.width*2; i+=350) {
        ctx.fillStyle = '#1e3a8a'; ctx.fillRect(i+140, groundY-100, 20, 100);
        ctx.fillStyle = treeColor; 
        ctx.beginPath(); ctx.arc(i+150, groundY-120, 60, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(i+110, groundY-80, 50, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(i+190, groundY-80, 50, 0, Math.PI*2); ctx.fill();
    }
    
    // Le monde "réel" bénéficie du reste de la translation (-cameraX, -cameraY total)
    ctx.translate(cameraX * 0.5 - cameraX, cameraY * 0.2 - cameraY); 
    
    ctx.fillStyle = (time === 'sunset' || time === 'night') ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.9)';
    clouds.forEach(c => {
        let float = Math.sin(frameCount*0.02 + c.x)*5;
        ctx.beginPath(); ctx.arc(c.x, c.y + float, c.size, 0, Math.PI*2);
        ctx.arc(c.x + c.size*1.3, c.y - c.size*0.7 + float, c.size*1.4, 0, Math.PI*2);
        ctx.arc(c.x + c.size*2.6, c.y + float, c.size, 0, Math.PI*2); ctx.fill();
    });

    for (let w of (levelData.water || [])) {
        let waveGrad = ctx.createLinearGradient(0, w.y, 0, w.y+w.h);
        waveGrad.addColorStop(0, time === 'afternoon' ? '#b45309' : '#0284c7'); waveGrad.addColorStop(1, time === 'afternoon' ? '#78350f' : '#1e3a8a');
        ctx.fillStyle = waveGrad; ctx.beginPath(); ctx.moveTo(w.x, w.y + w.h);
        for(let i=0; i<=w.w; i+=15) { ctx.lineTo(w.x + i, w.y + 8 + Math.sin(frameCount*0.1 + i*0.1)*6); }
        ctx.lineTo(w.x + w.w, w.y + w.h); ctx.fill();
    }

    for (let w of (levelData.windZones || [])) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(w.x + w.w/3, w.y + w.h); ctx.lineTo(w.x + w.w/3, w.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w.x + w.w*0.6, w.y + w.h); ctx.lineTo(w.x + w.w*0.6, w.y); ctx.stroke();
    }
    drawDecorations(levelData.decorations);

    // Scies circulaires
    for (let s of buzzsaws) {
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(frameCount * 0.2);
        ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.arc(0, 0, s.size, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.arc(0, 0, s.size*0.7, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(0, 0, s.size*0.2, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#cbd5e1';
        for(let i=0; i<8; i++) {
            ctx.rotate(Math.PI/4);
            ctx.beginPath(); ctx.moveTo(0, -s.size); ctx.lineTo(8, -s.size-8); ctx.lineTo(16, -s.size); ctx.fill();
        }
        ctx.restore();
    }

    for (let p of levelData.platforms) {
        if(p.type === 'ghost_plat') {
            if (!p.active) continue; 
            ctx.globalAlpha = 0.6 + Math.sin(frameCount*0.2)*0.2; 
        }
        if(p.type === 'fragile' && p.state === 'falling') ctx.globalAlpha = 0.5;

        if (p.type === 'bouncy') {
            ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(p.x + p.w/2, p.y + p.h, p.w/2, Math.PI, 0); ctx.fill(); 
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x + p.w*0.3, p.y + p.h*0.5, 6, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(p.x + p.w*0.7, p.y + p.h*0.7, 7, 0, Math.PI*2); ctx.fill();
        } else if (p.type === 'moving') {
            ctx.fillStyle = '#b45309'; ctx.fillRect(p.x, p.y, p.w, p.h);
            ctx.fillStyle = '#78350f'; ctx.fillRect(p.x, p.y+p.h-4, p.w, 4);
            ctx.strokeStyle = 'rgba(253, 230, 138, 0.35)';
            for (let i = 6; i < p.w; i += 18) {
                ctx.beginPath(); ctx.moveTo(p.x + i, p.y + 2); ctx.lineTo(p.x + i + 8, p.y + p.h - 6); ctx.stroke();
            }
            ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(p.x+15, p.y); ctx.lineTo(p.x+15, p.y-150); ctx.stroke(); 
            ctx.beginPath(); ctx.moveTo(p.x+p.w-15, p.y); ctx.lineTo(p.x+p.w-15, p.y-150); ctx.stroke();
        } else if (p.type === 'ghost_plat') {
            ctx.fillStyle = '#818cf8'; ctx.fillRect(p.x, p.y, p.w, p.h);
            ctx.fillStyle = 'rgba(224, 231, 255, 0.5)';
            for (let i = 0; i < p.w; i += 20) ctx.fillRect(p.x + i, p.y + 4 + Math.sin(frameCount * 0.15 + i) * 2, 10, 2);
        } else if (p.type === 'fragile') {
            ctx.fillStyle = '#d97706'; ctx.fillRect(p.x, p.y, p.w, p.h);
            ctx.fillStyle = '#fde047'; ctx.fillRect(p.x, p.y, p.w, 4);
            ctx.fillStyle = 'rgba(120, 53, 15, 0.45)';
            for (let i = 8; i < p.w; i += 22) ctx.fillRect(p.x + i, p.y + 8, 2, p.h - 8);
            if(p.state === 'shaking') { ctx.fillStyle = 'rgba(239, 68, 68, 0.4)'; ctx.fillRect(p.x, p.y, p.w, p.h); }
        } else if (p.type === 'mud') {
            ctx.fillStyle = '#451a03'; ctx.fillRect(p.x, p.y + 12, p.w, p.h - 12);
            ctx.fillStyle = '#290f02'; ctx.fillRect(p.x, p.y, p.w, 12); 
            ctx.fillStyle = '#78350f'; ctx.fillRect(p.x, p.y+12, p.w, 4);
            ctx.fillStyle = 'rgba(30, 10, 2, 0.65)';
            for (let i = 0; i < p.w; i += 24) {
                const ooze = Math.sin(frameCount * 0.08 + i * 0.2) * 2;
                ctx.fillRect(p.x + i, p.y + 6 + ooze, 14, 3);
            }
        } else {
            ctx.fillStyle = levelData.isBoss ? '#290f02' : '#451a03'; ctx.fillRect(p.x, p.y + 12, p.w, p.h - 12);
            ctx.fillStyle = levelData.isBoss ? '#7c2d12' : (time === 'night' ? '#064e3b' : '#22c55e');
            ctx.fillRect(p.x, p.y, p.w, 12);
            ctx.fillStyle = levelData.isBoss ? '#9a3412' : (time === 'night' ? '#022c22' : '#16a34a');
            ctx.fillRect(p.x, p.y+12, p.w, 4);
            ctx.fillStyle = 'rgba(255,255,255,0.13)';
            for (let i = 6; i < p.w; i += 18) ctx.fillRect(p.x + i, p.y + 2, 8, 1);
            ctx.fillStyle = 'rgba(6, 78, 59, 0.35)';
            for (let i = 0; i < p.w; i += 20) ctx.fillRect(p.x + i, p.y + 7, 6, 5);
        }
        ctx.globalAlpha = 1.0;
    }

    for (let c of (levelData.checkpoints || [])) {
        ctx.fillStyle = '#78350f'; ctx.fillRect(c.x + 8, c.y, 4, c.h);
        ctx.fillStyle = c.active ? '#22c55e' : '#ef4444';
        ctx.beginPath(); ctx.moveTo(c.x + 12, c.y + 2); ctx.lineTo(c.x + 35, c.y + 12); ctx.lineTo(c.x + 12, c.y + 22); ctx.fill();
    }

    for (let c of chests) {
        ctx.fillStyle = '#b45309'; ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.fillStyle = '#fde047'; ctx.fillRect(c.x - 2, c.y + 15, c.w + 4, 8);
        ctx.fillStyle = '#78350f'; ctx.fillRect(c.x + c.w/2 - 4, c.y + 12, 8, 14);
        if (!c.opened) {
            ctx.strokeStyle = '#fde047'; ctx.lineWidth = 2; ctx.strokeRect(c.x, c.y, c.w, c.h);
            if (Math.abs((player.x+player.width/2) - (c.x+c.w/2)) < 50) {
                ctx.fillStyle = '#fde047'; ctx.font = "bold 14px Arial"; ctx.textAlign = "center";
                ctx.fillText("'E' OUVRIR", c.x + c.w/2, c.y - 15);
            }
        } else { ctx.fillStyle = '#000'; ctx.fillRect(c.x + 4, c.y + 4, c.w - 8, c.h - 8); }
    }

    if (!levelData.isBoss) {
        let g = levelData.goal;
        let isGoalOpen = completedTasks >= levelTasks && (!levelData.boss || levelData.boss.dead) && chests.every(c => c.opened);
        
        ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(g.x + 30, g.y + g.h - 20, 25, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(g.x + g.w - 20, g.y + g.h - 15, 15, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#94a3b8'; ctx.beginPath(); ctx.arc(g.x + 30, g.y + g.h - 20, 10, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(g.x + g.w - 20, g.y + g.h - 15, 6, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = isGoalOpen ? '#ef4444' : '#7f1d1d'; 
        ctx.fillRect(g.x + 10, g.y + g.h - 60, 60, 45); ctx.fillRect(g.x + 60, g.y + g.h - 40, g.w - 70, 25); 
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(g.x + 10, g.y + g.h - 75, 60, 5); ctx.fillRect(g.x + 15, g.y + g.h - 70, 5, 10); ctx.fillRect(g.x + 60, g.y + g.h - 70, 5, 10); 
        ctx.fillStyle = '#475569'; ctx.fillRect(g.x + g.w - 35, g.y + g.h - 65, 5, 25);

        if (isGoalOpen) {
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.beginPath(); ctx.arc(g.x + g.w - 32 + Math.sin(frameCount*0.1)*5, g.y + g.h - 70 - (frameCount%20), 8, 0, Math.PI*2); ctx.fill();
            if (Math.abs((player.x+player.width/2) - (g.x+g.w/2)) < 50) {
                ctx.fillStyle = '#fde047'; ctx.font = "bold 16px Arial"; ctx.textAlign = "center"; 
                ctx.fillText("APPUYEZ SUR 'E'", g.x + g.w/2, g.y - 30);
            }
        }
    }

    for (let t of levelData.tasks) {
        if (!t.done) { 
            ctx.fillStyle = 'rgba(74, 222, 128, 0.2)'; 
            let pulse = Math.sin(frameCount * 0.1)*5;
            ctx.fillRect(t.x - 10 - pulse, t.y - 10 - pulse, t.w + 20 + pulse*2, t.h + 20 + pulse*2);
        }
        if (t.type === 'grass') {
            ctx.fillStyle = t.done ? '#4ade80' : '#166534';
            let sway = Math.sin(frameCount * 0.05 + t.x) * (t.done ? 1 : 5); let yOff = t.done ? t.h - 8 : 0;
            for(let i=0; i<t.w; i+=12) {
                ctx.beginPath(); ctx.moveTo(t.x + i, t.y + t.h); ctx.lineTo(t.x + i + 6 + sway, t.y + yOff); ctx.lineTo(t.x + i + 12, t.y + t.h); ctx.fill();
            }
        } else if (t.type === 'hedge') {
            if (!t.done) {
                let sX = Math.sin(frameCount * 0.03 + t.x) * 3; let sY = Math.cos(frameCount * 0.04 + t.x) * 3;
                ctx.fillStyle = '#14532d';
                ctx.beginPath(); ctx.arc(t.x+15+sX, t.y+25+sY, 28, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(t.x+35-sX, t.y+20-sY, 33, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(t.x+45+sX, t.y+35+sY, 23, 0, Math.PI*2); ctx.fill();
            } else { ctx.fillStyle = '#15803d'; ctx.fillRect(t.x, t.y + 20, t.w, t.h - 20); }
        } else if (t.type === 'branch') {
            ctx.fillStyle = '#451a03'; ctx.fillRect(t.trunkX, t.y, 18, t.trunkY - t.y);
            if (!t.done) {
                ctx.fillRect(t.x, t.y + 5, t.trunkX - t.x, 10);
                let sway = Math.sin(frameCount * 0.05 + t.x) * 4; ctx.fillStyle = '#166534';
                ctx.beginPath(); ctx.arc(t.x + 10 + sway, t.y + 10, 28, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(t.x + 25 + sway, t.y, 23, 0, Math.PI*2); ctx.fill();
            }
            ctx.fillStyle = '#14532d'; ctx.beginPath(); ctx.arc(t.trunkX + 9, t.y - 15, 40, 0, Math.PI*2); ctx.fill();
        }
    }

    for (let s of (levelData.stars || [])) {
        if (s.collected) continue;
        const spin = frameCount * 0.12;
        const px = s.x;
        const py = s.y; 
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(spin);
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
            const a2 = a + Math.PI / 5;
            ctx.lineTo(Math.cos(a) * 10, Math.sin(a) * 10);
            ctx.lineTo(Math.cos(a2) * 4, Math.sin(a2) * 4);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#fff7ae';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
    }

    for (let tool of (levelData.tools || [])) {
        if (tool.collected) continue;
        const px = tool.x;
        const py = tool.y; 
        ctx.save();
        ctx.translate(px, py);
        ctx.strokeStyle = '#fef3c7';
        ctx.lineWidth = 3;
        if (tool.kind === 'rake') {
            ctx.strokeStyle = '#f59e0b';
            ctx.beginPath(); ctx.moveTo(-8, 10); ctx.lineTo(8, -10); ctx.stroke();
            ctx.strokeStyle = '#fde68a';
            for (let i = -6; i <= 2; i += 4) { ctx.beginPath(); ctx.moveTo(i, -10); ctx.lineTo(i + 4, -14); ctx.stroke(); }
        } else if (tool.kind === 'shears') {
            ctx.strokeStyle = '#d1d5db';
            ctx.beginPath(); ctx.arc(-4, 5, 4, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.arc(4, 5, 4, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-1, 3); ctx.lineTo(10, -8); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(1, 3); ctx.lineTo(12, -2); ctx.stroke();
        } else {
            ctx.strokeStyle = '#a16207';
            ctx.beginPath(); ctx.moveTo(-1, 10); ctx.lineTo(4, -10); ctx.stroke();
            ctx.strokeStyle = '#e5e7eb';
            ctx.beginPath(); ctx.moveTo(4, -10); ctx.lineTo(12, -5); ctx.lineTo(5, 2); ctx.stroke();
        }
        ctx.restore();
    }

    for(let npc of npcs) {
        ctx.fillStyle = npc.color; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(npc.x, npc.y, npc.w, npc.h, 6) : ctx.fillRect(npc.x, npc.y, npc.w, npc.h); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(npc.x + 6, npc.y + 10, 3, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(npc.x + 14, npc.y + 10, 3, 0, Math.PI*2); ctx.fill();
    }

    for (let g of ghosts) {
        ctx.save(); ctx.translate(g.x + player.width/2, g.y + player.height);
        if (!g.facingRight) ctx.scale(-1, 1); ctx.scale(g.squash, g.stretch);
        ctx.globalAlpha = g.life * 0.6; ctx.fillStyle = '#93c5fd';
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-10, -28, 20, 18, 5) : ctx.fillRect(-10, -28, 20, 18); ctx.fill();
        ctx.beginPath(); ctx.arc(0, -38, 9, 0, Math.PI*2); ctx.fill(); ctx.restore();
    }
    ctx.globalAlpha = 1.0;

    // LE JOUEUR
    if (player.invincibleTimer % 4 < 2) { 
        ctx.save(); ctx.translate(player.x + player.width/2, player.y + player.height);
        if (!player.facingRight) ctx.scale(-1, 1);
        
        if (player.isDashing) { ctx.rotate(Math.PI/2); ctx.scale(1.5, 0.5); } 
        else ctx.scale(player.squash, player.stretch);
        
        let walkAnim = (Math.abs(player.vx) > 0.1 && player.grounded) ? Math.sin(frameCount * 0.5) * 25 : (!player.grounded ? 30 : 0);

        // Jambes
        ctx.fillStyle = '#1e293b'; 
        ctx.save(); ctx.translate(-4, -12); ctx.rotate(-walkAnim * Math.PI/180); ctx.fillRect(-2, 0, 4, player.grounded? 14 : 20); ctx.restore();
        ctx.save(); ctx.translate(4, -12); ctx.rotate(walkAnim * Math.PI/180); ctx.fillRect(-2, 0, 4, player.grounded? 14 : 10); ctx.restore();
        
        // Corps
        ctx.fillStyle = player.hasDash ? '#f59e0b' : '#84cc16'; 
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-10, -28, 20, 18, 5) : ctx.fillRect(-10, -28, 20, 18); ctx.fill();
        ctx.fillStyle = '#3b82f6'; ctx.fillRect(-8, -28, 5, 18); ctx.fillRect(3, -28, 5, 18); 
        
        // Bras 
        ctx.fillStyle = '#fca5a5'; 
        ctx.save(); ctx.translate(10, -20); ctx.rotate(walkAnim * Math.PI/180); 
        ctx.fillRect(-2, 0, 4, 12); 
        ctx.fillStyle = '#64748b'; ctx.fillRect(-4, 10, 8, 4); 
        ctx.restore();

        // Tête et Écharpe
        ctx.fillStyle = '#fca5a5'; ctx.beginPath(); ctx.arc(0, -38, 9, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(4, -40, 2, 0, Math.PI*2); ctx.fill(); 
        ctx.fillStyle = '#166534'; ctx.beginPath(); ctx.arc(0, -40, 9, Math.PI, 0); ctx.fill(); 
        ctx.fillRect(0, -42, 14, 4); 
        // Écharpe flottante
        ctx.fillStyle = '#ef4444'; 
        ctx.beginPath(); ctx.moveTo(-8, -30); ctx.lineTo(-18 - Math.abs(player.vx)*2, -25 + Math.sin(frameCount*0.2)*5); ctx.lineTo(-12, -20); ctx.fill();

        ctx.restore();
    }

    // ENNEMIS
    for(let e of enemies) {
        if(e.dead) continue;
        let dir = e.vx > 0 ? 1 : -1;
        if (e.type === 'snail') {
            ctx.fillStyle = '#fef08a'; ctx.fillRect(e.x, e.y + 16, e.w, 8); 
            ctx.fillStyle = '#ca8a04'; ctx.beginPath(); ctx.arc(e.x + 12, e.y + 12, 12, 0, Math.PI*2); ctx.fill(); 
            ctx.strokeStyle = '#854d0e'; ctx.lineWidth = 2; 
            ctx.beginPath(); ctx.arc(e.x + 12, e.y + 12, 6, 0, Math.PI*1.5); ctx.stroke(); 
            ctx.fillStyle = '#000'; ctx.fillRect(e.x + 12 + 8*dir, e.y + 18, 2, 2); 
            ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(e.x - 10*dir, e.y + 22, 10, 2); 
        } 
        else if (e.type === 'bee') {
            let wingBeat = Math.sin(frameCount) > 0 ? -10 : 10;
            ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.ellipse(e.x + 12, e.y + 12, 14, 10, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#000'; ctx.fillRect(e.x + 8, e.y + 2, 4, 20); ctx.fillRect(e.x + 16, e.y + 2, 4, 20);
            ctx.fillStyle = 'rgba(255,255,255,0.8)'; 
            ctx.beginPath(); ctx.ellipse(e.x + 12 - 5*dir, e.y + wingBeat, 6, 12, 0.5*dir, 0, Math.PI*2); ctx.fill(); 
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(e.x + 12 + 10*dir, e.y + 10, 2, 0, Math.PI*2); ctx.fill(); 
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(e.x + 12 - 14*dir, e.y + 12); ctx.lineTo(e.x + 12 - 20*dir, e.y + 12); ctx.stroke(); 
        } 
        else if (e.type === 'frog') {
            let jumpStretch = Math.abs(e.vy) > 1 ? 4 : 0;
            ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.ellipse(e.x + 12, e.y + 16 - jumpStretch, 14, 10 + jumpStretch, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(e.x + 6 + 4*dir, e.y + 10 - jumpStretch, 6, 0, Math.PI*2); ctx.fill(); 
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(e.x + 6 + 6*dir, e.y + 10 - jumpStretch, 2, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#15803d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(e.x+12, e.y+16); ctx.lineTo(e.x+12-8*dir, e.y+24+jumpStretch); ctx.stroke(); 
        }
        else if (e.type === 'mole') {
            if (e.timer > 120) {
                ctx.fillStyle = '#451a03'; ctx.beginPath(); ctx.ellipse(e.x+12, e.y+12, 12, 16, 0, Math.PI, 0); ctx.fill(); 
                ctx.fillStyle = '#fca5a5'; ctx.fillRect(e.x+8, e.y+4, 8, 4); 
                ctx.fillStyle = '#000'; ctx.fillRect(e.x+6, e.y+10, 2, 2); ctx.fillRect(e.x+16, e.y+10, 2, 2); 
            }
        }
    }

    if (levelData.boss && !levelData.boss.dead && levelData.boss.w > 0) { 
        let b = levelData.boss;
        if (b.type === 'scarecrow') {
            ctx.fillStyle = '#451a03'; ctx.fillRect(b.x+b.w/2-10, b.y+50, 20, b.h-50); 
            ctx.fillStyle = '#fef08a'; ctx.fillRect(b.x+b.w/2-30, b.y, 60, 50); 
            ctx.fillStyle = '#b45309'; ctx.fillRect(b.x, b.y+50, b.w, 20); 
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(b.x+b.w/2-15, b.y+20, 5, 0, Math.PI*2); ctx.arc(b.x+b.w/2+15, b.y+20, 5, 0, Math.PI*2); ctx.fill();
        } else if (b.type === 'toad') {
            ctx.fillStyle = '#15803d'; ctx.beginPath(); ctx.arc(b.x+b.w/2, b.y+b.h, b.w/2, Math.PI, 0); ctx.fill();
            ctx.fillStyle = '#86efac'; ctx.beginPath(); ctx.arc(b.x+b.w/2, b.y+b.h, b.w/2.5, Math.PI, 0); ctx.fill();
            ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(b.x+30, b.y+b.h/2, 15, 0, Math.PI*2); ctx.arc(b.x+b.w-30, b.y+b.h/2, 15, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#000'; ctx.fillRect(b.x+25, b.y+b.h/2-2, 10, 4); ctx.fillRect(b.x+b.w-35, b.y+b.h/2-2, 10, 4);
        } else if (b.type === 'bramble') {
            ctx.fillStyle = '#064e3b';
            let pulse = Math.sin(frameCount*0.1)*10;
            ctx.beginPath(); ctx.arc(b.x+b.w/2, b.y+b.h/2, b.w/2 + pulse, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#ef4444';
            ctx.beginPath(); ctx.ellipse(b.x+40, b.y+60, 10, 20, 0.2, 0, Math.PI*2); ctx.ellipse(b.x+b.w-40, b.y+60, 10, 20, -0.2, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#022c22'; ctx.lineWidth = 8;
            for(let i=0; i<4; i++) {
                ctx.beginPath(); ctx.moveTo(b.x+b.w/2, b.y+b.h/2); 
                ctx.quadraticCurveTo(b.x+b.w/2 + (i%2===0?-100:100), b.y-50, b.x + (i*50), b.y - 100 - pulse*2); ctx.stroke();
            }
        }
    }

    for (let p of levelData.projectiles) {
        ctx.save(); ctx.translate(p.x, p.y);
        if(p.type === 'scythe' || p.type === 'thorn') {
            ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.fillRect(-2, -p.size, 4, p.size*2);
            ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.moveTo(2, -p.size); ctx.lineTo(20, -p.size-10); ctx.lineTo(2, -p.size+10); ctx.fill();
        } else { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI*2); ctx.fill(); }
        ctx.restore();
    }

    for (let p of particles) {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.type === 'leaf') { ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size/2, 0, 0, Math.PI*2); ctx.fill(); } 
        else if (p.type === 'wind') { ctx.fillRect(0,0, p.size/2, p.size*2); }
        else { ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI*2); ctx.fill(); } 
        ctx.restore();
    }

    // AUDIT UPDATE : Ajustement du brouillard (haze) pour l'axe Y
    let haze = ctx.createLinearGradient(0, cameraY, 0, cameraY + canvas.height);
    haze.addColorStop(0, time === 'night' ? 'rgba(15, 23, 42, 0.05)' : 'rgba(255, 255, 255, 0.04)');
    haze.addColorStop(1, time === 'night' ? 'rgba(2, 6, 23, 0.35)' : 'rgba(15, 23, 42, 0.12)');
    ctx.fillStyle = haze;
    ctx.fillRect(cameraX, cameraY, canvas.width, canvas.height);
    ctx.restore(); 

    if (gameState === 'boss_intro') {
        ctx.fillStyle = '#000'; let barHeight = Math.min(cinematicTimer * 2, 80); 
        ctx.fillRect(0, 0, canvas.width, barHeight); ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);
    }

    ctx.textAlign = "center";
    for (let ft of floatingTexts) {
        ctx.font = `bold ${ft.size} 'Playfair Display', serif`; ctx.fillStyle = ft.color; ctx.globalAlpha = ft.life;
        // AUDIT UPDATE : Texts avec prise en compte du cameraY
        ctx.fillText(ft.text, ft.x - cameraX, ft.y - cameraY); ctx.globalAlpha = 1.0;
    }

    if (activeDialog && gameState !== 'boss_intro') {
        let npc = activeDialog.npc;
        let cx = (npc.x + npc.w/2) - cameraX; let cy = npc.y - 45 - cameraY;
        
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(cx - 150, cy - 60, 300, 70, 8) : ctx.fillRect(cx - 150, cy - 60, 300, 70); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx - 15, cy + 10); ctx.lineTo(cx + 15, cy + 10); ctx.lineTo(cx, cy + 25); ctx.fill();
        
        ctx.fillStyle = '#1c1917'; ctx.font = "bold 14px Arial"; ctx.fillText(npc.name, cx, cy - 40);
        ctx.fillStyle = '#44403c'; ctx.font = "14px Arial"; 
        
        if (activeDialog.showPrompt) {
            ctx.fillText("Appuyez sur 'E' pour interagir", cx, cy - 15);
        } else {
            ctx.fillText(npc.dialogs[activeDialog.line], cx, cy - 15);
            if(frameCount % 40 < 20 && activeDialog.line < npc.dialogs.length - 1) { ctx.fillStyle = '#ef4444'; ctx.fillText("▼", cx + 130, cy + 5); }
        }
    }

    const px = player.x + player.width / 2 - cameraX;
    const py = player.y + player.height / 2 - cameraY;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    let playerHalo = ctx.createRadialGradient(px, py, 8, px, py, 120);
    playerHalo.addColorStop(0, 'rgba(255, 251, 160, 0.28)');
    playerHalo.addColorStop(1, 'rgba(255, 251, 160, 0)');
    ctx.fillStyle = playerHalo;
    ctx.fillRect(px - 120, py - 120, 240, 240);
    let skyBloom = ctx.createRadialGradient(canvas.width * 0.85, 90 - cameraY * 0.05, 30, canvas.width * 0.85, 90 - cameraY * 0.05, 240);
    skyBloom.addColorStop(0, time === 'night' ? 'rgba(226,232,240,0.28)' : 'rgba(254,240,138,0.26)');
    skyBloom.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = skyBloom;
    ctx.fillRect(canvas.width * 0.6, 0, canvas.width * 0.4, 280);
    ctx.restore();

    if (gameState !== 'boss_intro') {
        ctx.fillStyle = '#ef4444'; ctx.textAlign = "left"; ctx.font = "28px Arial";
        ctx.fillText("❤️".repeat(player.hp), 15, 35);
        ctx.fillStyle = '#fde047'; ctx.font = "20px Arial";
        ctx.fillText(`★ ${totalStarsCollected}`, 16, 62);
        ctx.fillStyle = '#f59e0b'; ctx.font = "18px Arial";
        ctx.fillText(`OUTILS ${totalToolsCollected}`, 16, 84);
    }

    let vignette = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        canvas.height * 0.2,
        canvas.width / 2,
        canvas.height / 2,
        canvas.height * 0.8
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, time === 'night' ? 'rgba(0, 0, 0, 0.42)' : 'rgba(0, 0, 0, 0.22)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}