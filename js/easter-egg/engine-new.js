// js/easter-egg/engine-new.js
// Moteur de jeu refactorisé avec modules

import { gameState } from './gameState.js';
import { player } from './player.js';
import { physics } from './physics.js';
import Renderer from './rendering.js';
import { Enemy, Boss, Buzzsaw, Item } from './enemies.js';
import { levelLoader } from './levelLoader.js';
import { saveSystem } from './saveSystem.js';
import { keys, resetJustPressedFlags } from './input.js';
import { playSound, setMusicMode } from './audio.js';

// Variables globales pour l'interface
let gameContainer, closeBtn, restartBtn, canvas, ctx, scoreElement, gameOverScreen;
let bossHpContainer, bossHpFill, bossNameTxt;
let gameLoop;
let renderer;

// Collections d'entités
let particles = [];
let floatingTexts = [];
let enemies = [];
let items = [];
let npcs = [];
let buzzsaws = [];

export function isGameActive() {
    return gameState.gameActive;
}

export function initEngine() {
    // Initialisation des éléments DOM
    gameContainer = document.getElementById('easter-egg-game-container');
    closeBtn = document.getElementById('close-game-btn');
    restartBtn = document.getElementById('restart-game-btn');
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    scoreElement = document.getElementById('game-score');
    gameOverScreen = document.getElementById('game-over-screen');
    bossHpContainer = document.getElementById('boss-hp-container');
    bossHpFill = document.getElementById('boss-hp-fill');
    bossNameTxt = document.getElementById('boss-name');
    
    // Initialisation du renderer
    renderer = new Renderer(canvas, ctx);
    
    // Configuration des événements
    closeBtn.addEventListener('click', closeGameUI);
    restartBtn.addEventListener('click', restartGame);
    
    // Chargement des niveaux
    levelLoader.loadLevels().then(levels => {
        gameState.init(levels.length);
        loadSaveData();
    });
}

export function startGameUI() {
    gameState.gameActive = true;
    gameState.setState('world_map');
    gameContainer.classList.remove('hidden');
    gameContainer.classList.add('flex');
    document.body.style.overflow = 'hidden';
    showWorldMap();
}

function closeGameUI() {
    gameContainer.classList.add('hidden');
    gameContainer.classList.remove('flex');
    document.body.style.overflow = '';
    gameState.gameActive = false;
    cancelAnimationFrame(gameLoop);
}

function loadSaveData() {
    const saveData = saveSystem.load();
    saveSystem.applySaveData(gameState, player, saveData);
}

function saveGameData() {
    saveSystem.save(gameState, player);
}

function updateProgressAbilities() {
    player.hasWallJump = gameState.maxUnlockedLevel >= 1;
    player.hasDash = gameState.maxUnlockedLevel >= 2;
}

function isLevelUnlocked(idx) {
    if (idx === 0) return true; // Le premier niveau est toujours accessible
    const starRequirement = idx <= 2 ? 0 : (idx - 2) * 3;
    return idx <= gameState.maxUnlockedLevel && gameState.totalStarsCollected >= starRequirement;
}

function getMapNodePosition(idx) {
    const level = levelLoader.getLevel(idx);
    if (!level) return { x: 140 + idx * 120, y: 240 };
    
    return {
        x: level.mapX || (140 + idx * 120),
        y: level.mapY || 240
    };
}

function showWorldMap() {
    updateProgressAbilities();
    setMusicMode('map');
    gameState.setState('world_map');
    gameState.mapSelectedLevel = Math.min(gameState.mapSelectedLevel, gameState.maxUnlockedLevel);
    
    const node = getMapNodePosition(gameState.mapSelectedLevel);
    gameState.mapAvatarX = node.x;
    gameState.mapAvatarY = node.y;
    gameState.mapAvatarTargetX = node.x;
    gameState.mapAvatarTargetY = node.y;
    
    gameState.reset();
    
    if (bossHpContainer) {
        bossHpContainer.classList.add('opacity-0');
        setTimeout(() => bossHpContainer.classList.add('hidden'), 500);
    }
    
    document.getElementById('game-ui-level').innerText = "WORLD MAP - CONSTELLATION BOTANIQUE";
    document.getElementById('game-ui-score').innerHTML = `ETOILES: <span class="text-botanic-light text-xl">${gameState.totalStarsCollected}</span> | OUTILS: <span class="text-amber-300 text-xl">${gameState.totalToolsCollected}</span>`;
    gameOverScreen.classList.add('hidden');
    
    gameState.gameActive = true;
    cancelAnimationFrame(gameLoop);
    update();
}

function startSelectedLevel() {
    if (!isLevelUnlocked(gameState.mapSelectedLevel)) return;
    
    gameState.pendingLevelIdx = gameState.mapSelectedLevel;
    gameState.levelEnterTimer = 0;
    gameState.setState('level_enter');
}

function loadLevel(idx) {
    const levelData = levelLoader.getLevel(idx);
    if (!levelData) {
        showWorldMap();
        return;
    }
    
    gameState.currentLevelIdx = idx;
    gameState.levelData = JSON.parse(JSON.stringify(levelData));
    
    // Initialisation des entités depuis les données du niveau
    enemies = [];
    items = [];
    npcs = [];
    buzzsaws = [];
    particles = [];
    floatingTexts = [];
    
    // Création des ennemis
    if (gameState.levelData.enemies) {
        gameState.levelData.enemies.forEach(enemyData => {
            enemies.push(new Enemy(
                enemyData.x,
                enemyData.y,
                enemyData.w,
                enemyData.h,
                enemyData.type,
                enemyData
            ));
        });
    }
    
    // Création des items
    if (gameState.levelData.items) {
        gameState.levelData.items.forEach(itemData => {
            items.push(new Item(
                itemData.x,
                itemData.y,
                itemData.w,
                itemData.h,
                itemData.type
            ));
        });
    }
    
    // Création des scies circulaires
    if (gameState.levelData.buzzsaws) {
        gameState.levelData.buzzsaws.forEach(buzzsawData => {
            buzzsaws.push(new Buzzsaw(
                buzzsawData.x,
                buzzsawData.y,
                buzzsawData.size,
                buzzsawData.minX,
                buzzsawData.maxX,
                buzzsawData.vx
            ));
        });
    }
    
    // Copie des NPCs
    npcs = gameState.levelData.npcs ? [...gameState.levelData.npcs] : [];
    
    // Configuration des tâches
    gameState.levelTasks = gameState.levelData.tasks ? gameState.levelData.tasks.length : 0;
    gameState.completedTasks = 0;
    if (gameState.levelData.tasks) {
        gameState.levelData.tasks.forEach(task => task.done = false);
    }
    
    // Configuration du joueur
    player.setSpawn(50, 200);
    player.reset();
    
    // Configuration du boss
    if (gameState.levelData.boss) {
        const bossData = gameState.levelData.boss;
        gameState.levelData.boss = new Boss(
            bossData.x,
            bossData.y,
            bossData.w,
            bossData.h,
            bossData.type,
            bossData
        );
    }
    
    gameState.setState('playing');
    gameState.reset();
    setMusicMode(gameState.levelData.ambience || 'orchard');
    
    updateUI();
}

function updateUI() {
    const levelElement = document.getElementById('game-ui-level');
    const scoreElement = document.getElementById('game-score');
    
    if (levelElement) {
        levelElement.innerText = `NIVEAU ${gameState.currentLevelIdx + 1}`;
    }
    
    if (scoreElement) {
        scoreElement.innerText = `${gameState.completedTasks}/${gameState.levelTasks}`;
    }
}

function restartGame() {
    gameOverScreen.classList.add('hidden');
    loadLevel(gameState.currentLevelIdx);
}

function showGameOver(title, text, buttonText, returnToMap = false) {
    document.getElementById('game-end-title').innerText = title;
    document.getElementById('game-end-text').innerText = text;
    restartBtn.innerText = buttonText;
    restartBtn.onclick = () => {
        gameOverScreen.classList.add('hidden');
        if (returnToMap) {
            showWorldMap();
            return;
        }
        restartGame();
    };
    gameOverScreen.classList.remove('hidden');
    gameState.setState('game_over');
}

function activateBossUI(boss) {
    bossHpContainer.classList.remove('hidden');
    bossNameTxt.innerText = boss.name;
    void bossHpContainer.offsetWidth;
    bossHpContainer.classList.remove('opacity-0');
    updateBossUI(boss);
}

function updateBossUI(boss) {
    const pct = Math.max(0, (boss.hp / boss.maxHp) * 100);
    bossHpFill.style.width = pct + '%';
    if (pct <= 0) {
        bossHpContainer.classList.add('opacity-0');
        setTimeout(() => bossHpContainer.classList.add('hidden'), 500);
    }
}

function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            color: color,
            size: Math.random() * 4 + 2,
            alpha: 1,
            life: 30
        });
    }
}

function spawnText(x, y, text, color) {
    floatingTexts.push({
        x: x,
        y: y,
        text: text,
        color: color,
        alpha: 1,
        yOffset: 0,
        font: 'bold 16px Arial'
    });
}

function updateParticles() {
    particles = particles.filter(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.3;
        particle.alpha -= 0.03;
        particle.life--;
        
        return particle.life > 0 && particle.alpha > 0;
    });
}

function updateFloatingTexts() {
    floatingTexts = floatingTexts.filter(text => {
        text.yOffset += 1;
        text.alpha -= 0.02;
        
        return text.alpha > 0;
    });
}

function update() {
    if (gameState.hitStopFrames > 0) {
        gameState.hitStopFrames--;
        draw();
        gameLoop = requestAnimationFrame(update);
        return;
    }
    
    gameState.updateFrame();
    
    if (gameState.isState('world_map')) {
        updateWorldMap();
        draw();
        gameLoop = requestAnimationFrame(update);
        return;
    }
    
    if (gameState.isState('level_enter')) {
        gameState.levelEnterTimer++;
        draw();
        if (gameState.levelEnterTimer > 42) {
            loadLevel(gameState.pendingLevelIdx);
            gameLoop = requestAnimationFrame(update);
            return;
        }
        gameLoop = requestAnimationFrame(update);
        return;
    }
    
    if (!gameState.isState('playing')) return;
    
    // Mise à jour du joueur
    player.update(keys, gameState.levelData);
    
    // Mise à jour des entités
    updateEntities();
    
    // Gestion des collisions
    handleCollisions();
    
    // Mise à jour de la caméra
    updateCamera();
    
    // Vérification des conditions de victoire/défaite
    checkWinCondition();
    
    // Nettoyage des particules
    updateParticles();
    updateFloatingTexts();
    
    // Réinitialiser les flags de touches au fin de la frame
    resetJustPressedFlags();
    
    // Rendu
    draw();
    
    gameLoop = requestAnimationFrame(update);
}

function updateWorldMap() {
    if (keys.left && gameState.mapSelectedLevel > 0) {
        gameState.mapSelectedLevel--;
        keys.left = false;
        const target = getMapNodePosition(gameState.mapSelectedLevel);
        gameState.mapAvatarTargetX = target.x;
        gameState.mapAvatarTargetY = target.y;
        playSound('jump');
    }
    
    if (keys.right && gameState.mapSelectedLevel < gameState.maxUnlockedLevel) {
        gameState.mapSelectedLevel++;
        keys.right = false;
        const target = getMapNodePosition(gameState.mapSelectedLevel);
        gameState.mapAvatarTargetX = target.x;
        gameState.mapAvatarTargetY = target.y;
        playSound('jump');
    }
    
    if (keys.interactJustPressed || keys.jumpJustPressed) {
        keys.interactJustPressed = false;
        keys.jumpJustPressed = false;
        startSelectedLevel();
        return;
    }
    
    // Réinitialiser les flags à la fin de chaque frame
    resetJustPressedFlags();
    
    // Animation de l'avatar
    gameState.mapAvatarX += (gameState.mapAvatarTargetX - gameState.mapAvatarX) * 0.1;
    gameState.mapAvatarY += (gameState.mapAvatarTargetY - gameState.mapAvatarY) * 0.1;
}

function updateEntities() {
    // Mise à jour des plateformes mobiles
    if (gameState.levelData.platforms) {
        gameState.levelData.platforms.forEach(platform => {
            if (platform.type === 'moving') {
                platform.x += platform.vx;
                if (platform.x <= platform.minX || platform.x + platform.w >= platform.maxX) {
                    platform.vx = -platform.vx;
                }
            } else if (platform.type === 'ghost_plat') {
                platform.timer++;
                if (platform.timer > 120) {
                    platform.active = !platform.active;
                    platform.timer = 0;
                }
            } else if (platform.type === 'fragile' && platform.state === 'shaking') {
                platform.timer++;
                if (platform.timer > 30) {
                    platform.state = 'broken';
                    platform.timer = 0;
                }
            }
        });
    }
    
    // Mise à jour des ennemis
    enemies.forEach(enemy => enemy.update(player, gameState.levelData));
    
    // Mise à jour du boss
    if (gameState.levelData.boss) {
        gameState.levelData.boss.update(player, gameState.levelData);
    }
    
    // Mise à jour des scies circulaires
    buzzsaws.forEach(buzzsaw => buzzsaw.update());
    
    // Mise à jour des items
    items.forEach(item => item.update());
}

function handleCollisions() {
    // Collisions avec les plateformes
    if (gameState.levelData.platforms) {
        gameState.levelData.platforms.forEach(platform => {
            physics.resolvePlayerPlatformCollision(player, platform);
        });
    }
    
    // Collisions avec l'eau
    if (gameState.levelData.water) {
        gameState.levelData.water.forEach(water => {
            const waterResult = physics.applyWaterPhysics(player, water);
            if (waterResult && waterResult.drowning) {
                playerDeath();
            }
        });
    }
    
    // Collisions avec les zones de vent
    if (gameState.levelData.windZones) {
        gameState.levelData.windZones.forEach(windZone => {
            physics.applyWindForce(player, windZone);
        });
    }
    
    // Collisions avec les ennemis
    enemies.forEach(enemy => {
        if (physics.checkEnemyCollision(player, enemy)) {
            if (player.vy > 0 && player.y < enemy.y) {
                // Joueur écrase l'ennemi
                enemy.takeDamage();
                player.vy = -8;
                spawnParticles(enemy.x + enemy.w/2, enemy.y + enemy.h/2, '#ef4444', 10);
                playSound('hit');
            } else if (!player.isDashing) {
                // Joueur prend des dégâts
                if (player.takeDamage(1)) {
                    playerDeath();
                } else {
                    spawnParticles(player.x + player.width/2, player.y + player.height/2, '#ef4444', 5);
                    playSound('hit');
                }
            }
        }
    });
    
    // Collisions avec le boss
    if (gameState.levelData.boss && !gameState.levelData.boss.dead) {
        if (physics.checkEnemyCollision(player, gameState.levelData.boss)) {
            if (!player.isDashing) {
                if (player.takeDamage(1)) {
                    playerDeath();
                } else {
                    spawnParticles(player.x + player.width/2, player.y + player.height/2, '#ef4444', 8);
                    playSound('boss_hit');
                }
            }
        }
    }
    
    // Collisions avec les scies circulaires
    buzzsaws.forEach(buzzsaw => {
        if (physics.checkBuzzsawCollision(player, buzzsaw)) {
            if (player.takeDamage(1)) {
                playerDeath();
            } else {
                spawnParticles(player.x + player.width/2, player.y + player.height/2, '#ef4444', 8);
                playSound('hit');
            }
        }
    });
    
    // Collisions avec les items
    items.forEach(item => {
        if (physics.checkItemCollision(player, item)) {
            if (item.collect()) {
                handleItemCollection(item);
            }
        }
    });
    
    // Collisions avec les tâches
    if (gameState.levelData.tasks) {
        gameState.levelData.tasks.forEach(task => {
            if (physics.checkTaskCollision(player, task) && keys.interactJustPressed) {
                completeTask(task);
            }
        });
    }
    
    // Collisions avec la zone de but
    if (gameState.levelData.goal) {
        if (physics.checkGoalCollision(player, gameState.levelData.goal)) {
            levelComplete();
        }
    }
    
    // Limites du niveau
    const boundsResult = physics.updateLevelBounds(player, gameState.levelData.width);
    if (boundsResult) {
        if (boundsResult.exit === 'left') {
            showWorldMap();
        } else if (boundsResult.death) {
            playerDeath();
        }
    }
}

function handleItemCollection(item) {
    switch (item.type) {
        case 'hp':
            player.heal(1);
            spawnText(item.x, item.y, '+1 PV', '#ef4444');
            break;
        case 'star':
            gameState.totalStarsCollected++;
            gameState.levelStarsCollected[gameState.currentLevelIdx]++;
            spawnText(item.x, item.y, 'ÉTOILE!', '#fbbf24');
            break;
        case 'tool':
            gameState.totalToolsCollected++;
            gameState.levelToolsCollected[gameState.currentLevelIdx]++;
            spawnText(item.x, item.y, 'OUTIL!', '#f59e0b');
            break;
    }
    
    spawnParticles(item.x + item.w/2, item.y + item.h/2, '#fbbf24', 8);
    playSound('chest');
    saveGameData();
}

function completeTask(task) {
    if (task.done) return;
    
    task.done = true;
    gameState.completedTasks++;
    updateUI();
    
    spawnText(task.x + task.w/2, task.y, task.name + ' ✓', '#4ade80');
    spawnParticles(task.x + task.w/2, task.y + task.h/2, '#4ade80', 6);
    playSound('tractor');
    
    saveGameData();
}

function playerDeath() {
    player.reset();
    gameState.setHitStop(30);
    spawnParticles(player.x + player.width/2, player.y + player.height/2, '#ef4444', 15);
    playSound('hit');
}

function levelComplete() {
    gameState.levelCompleted[gameState.currentLevelIdx] = true;
    gameState.maxUnlockedLevel = Math.max(gameState.maxUnlockedLevel, gameState.currentLevelIdx + 1);
    
    showGameOver(
        "Niveau Terminé !",
        `Tâches complétées: ${gameState.completedTasks}/${gameState.levelTasks}`,
        "Continuer",
        true
    );
    
    saveGameData();
}

function checkWinCondition() {
    // Vérification de la victoire contre le boss
    if (gameState.levelData.boss && gameState.levelData.boss.dead) {
        gameState.levelData.boss.deathTimer++;
        
        if (gameState.levelData.boss.deathTimer % 5 === 0) {
            spawnParticles(
                gameState.levelData.boss.x + Math.random() * gameState.levelData.boss.w,
                gameState.levelData.boss.y + Math.random() * gameState.levelData.boss.h,
                '#dc2626',
                10
            );
        }
        
        if (gameState.levelData.boss.deathTimer > 60) {
            gameState.levelCompleted[gameState.currentLevelIdx] = true;
            gameState.maxUnlockedLevel = Math.max(gameState.maxUnlockedLevel, gameState.currentLevelIdx);
            
            return showGameOver(
                "VICTOIRE MAGISTRALE !",
                "Le Hainaut est sauvé. Nouvelle campagne complète !",
                "Retour world map",
                true
            );
        }
    }
}

function updateCamera() {
    const targetCameraX = player.x + player.width / 2;
    gameState.cameraX += (targetCameraX - gameState.cameraX) * 0.1;
    renderer.updateCamera(gameState.cameraX, gameState.levelData.width);
}

function draw() {
    renderer.clear();
    renderer.applyScreenShake(gameState.screenShake);
    
    if (gameState.isState('world_map') || gameState.isState('level_enter')) {
        drawWorldMap();
        return;
    }
    
    // Arrière-plan
    renderer.drawBackground(gameState.frameCount, gameState.levelData.ambience, gameState.levelData.width);
    
    // Plateformes
    if (gameState.levelData.platforms) {
        gameState.levelData.platforms.forEach(platform => renderer.drawPlatform(platform));
    }
    
    // Eau
    if (gameState.levelData.water) {
        gameState.levelData.water.forEach(water => renderer.drawWater(water));
    }
    
    // Zones de vent
    if (gameState.levelData.windZones) {
        gameState.levelData.windZones.forEach(windZone => renderer.drawWindZone(windZone));
    }
    
    // Items
    items.forEach(item => renderer.drawItem(item));
    
    // Tâches
    if (gameState.levelData.tasks) {
        gameState.levelData.tasks.forEach(task => renderer.drawTask(task));
    }
    
    // But
    if (gameState.levelData.goal) {
        renderer.drawGoal(gameState.levelData.goal);
    }
    
    // Ennemis
    enemies.forEach(enemy => renderer.drawEnemy(enemy));
    
    // Boss
    if (gameState.levelData.boss) {
        renderer.drawBoss(gameState.levelData.boss);
    }
    
    // Scies circulaires
    buzzsaws.forEach(buzzsaw => renderer.drawBuzzsaw(buzzsaw));
    
    // Joueur
    renderer.drawPlayer(player);
    
    // Particules
    renderer.drawParticles(particles);
    
    // Textes flottants
    renderer.drawFloatingTexts(floatingTexts);
}

function drawWorldMap() {
    // Fond de la world map
    let bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, '#052e16');
    bg.addColorStop(1, '#14532d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Dessin des constellations (niveaux)
    const levels = levelLoader.getAllLevels();
    levels.forEach((level, i) => {
        const { x, y } = getMapNodePosition(i);
        const unlocked = isLevelUnlocked(i);
        const done = gameState.levelCompleted[i];
        const selected = i === gameState.mapSelectedLevel;
        const pulse = selected ? Math.sin(gameState.frameCount * 0.15) * 6 : 0;
        const radius = 20 + pulse;
        
        // Ligne de connexion
        if (i > 0) {
            const prevNode = getMapNodePosition(i - 1);
            ctx.strokeStyle = unlocked ? '#4ade80' : '#6b7280';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(prevNode.x, prevNode.y);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
        
        // Nœud de niveau
        ctx.fillStyle = done ? '#fbbf24' : (unlocked ? '#4ade80' : '#6b7280');
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Sélection
        if (selected) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Numéro du niveau
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(i + 1, x, y);
    });
    
    // Avatar du joueur
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(gameState.mapAvatarX, gameState.mapAvatarY, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // Panneau d'information
    const level = levels[gameState.mapSelectedLevel];
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
    ctx.lineWidth = 2;
    ctx.roundRect(170, 410, 560, 60, 10);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = '#e2e8f0';
    ctx.textAlign = 'left';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(`Niveau ${gameState.mapSelectedLevel + 1} - ${level.name}`, 184, 425);
    ctx.font = '16px Arial';
    const selectedUnlocked = isLevelUnlocked(gameState.mapSelectedLevel);
    const starRequirement = gameState.mapSelectedLevel <= 2 ? 0 : (gameState.mapSelectedLevel - 2) * 3;
    ctx.fillStyle = '#a5b4fc';
    ctx.fillText(selectedUnlocked ? "Débloqué" : `Verrouillé - ${starRequirement} étoiles`, 184, 452);
    ctx.fillStyle = '#fde047';
    ctx.fillText(`Étoiles: ${gameState.levelStarsCollected[gameState.mapSelectedLevel]}/3`, 330, 452);
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`Outils: ${gameState.levelToolsCollected[gameState.mapSelectedLevel]}/3`, 500, 452);
}
