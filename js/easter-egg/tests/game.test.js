// js/easter-egg/tests/game.test.js
// Tests unitaires pour les mécaniques clés du jeu

import { player } from '../player.js';
import { physics } from '../physics.js';
import { gameState } from '../gameState.js';
import { Enemy, Boss, Item } from '../enemies.js';
import { levelLoader } from '../levelLoader.js';

// Mock pour l'environnement de test
const mockCanvas = {
    width: 900,
    height: 500
};

const mockCtx = {
    clearRect: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    beginPath: () => {},
    closePath: () => {},
    arc: () => {},
    fill: () => {},
    stroke: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    setTransform: () => {},
    fillText: () => {},
    measureText: () => ({ width: 100 }),
    createLinearGradient: () => ({
        addColorStop: () => {}
    }),
    createRadialGradient: () => ({
        addColorStop: () => {}
    })
};

// Suite de tests
class GameTests {
    constructor() {
        this.results = [];
    }
    
    runAllTests() {
        console.log('🧪 Démarrage des tests unitaires...');
        
        this.testPlayerMovement();
        this.testPlayerJump();
        this.testPlayerDash();
        this.testPlayerWallJump();
        this.testPhysicsCollisions();
        this.testEnemyBehavior();
        this.testItemCollection();
        this.testGameState();
        this.testLevelLoading();
        
        this.printResults();
    }
    
    testPlayerMovement() {
        console.log('\n📋 Tests de mouvement du joueur...');
        
        // Test de déplacement gauche
        player.reset();
        player.x = 100;
        player.vx = 0;
        
        const mockKeys = { left: true, right: false, jump: false, interact: false, dash: false };
        player.update(mockKeys, {});
        
        this.assert(player.vx < 0, 'Le joueur doit se déplacer vers la gauche');
        this.assert(player.facingRight === false, 'Le joueur doit faire face à gauche');
        
        // Test de déplacement droit
        player.reset();
        player.x = 100;
        player.vx = 0;
        
        const mockKeysRight = { left: false, right: true, jump: false, interact: false, dash: false };
        player.update(mockKeysRight, {});
        
        this.assert(player.vx > 0, 'Le joueur doit se déplacer vers la droite');
        this.assert(player.facingRight === true, 'Le joueur doit faire face à droite');
        
        // Test de friction
        player.reset();
        player.vx = 5;
        
        const mockKeysNoMove = { left: false, right: false, jump: false, interact: false, dash: false };
        player.update(mockKeysNoMove, {});
        
        this.assert(Math.abs(player.vx) < 5, 'La friction doit ralentir le joueur');
    }
    
    testPlayerJump() {
        console.log('\n📋 Tests de saut du joueur...');
        
        // Test de saut simple
        player.reset();
        player.y = 400;
        player.grounded = true;
        player.vy = 0;
        
        const jumpSuccess = player.jump();
        
        this.assert(jumpSuccess, 'Le saut doit réussir quand le joueur est au sol');
        this.assert(player.vy < 0, 'Le joueur doit avoir une vitesse verticale négative après le saut');
        this.assert(player.grounded === false, 'Le joueur ne doit plus être au sol après le saut');
        
        // Test de double saut
        player.reset();
        player.y = 200;
        player.grounded = false;
        player.jumps = 1;
        player.vy = 0;
        
        const doubleJumpSuccess = player.jump();
        
        this.assert(doubleJumpSuccess, 'Le double saut doit réussir');
        this.assert(player.jumps === 2, 'Le compteur de sauts doit être à 2');
    }
    
    testPlayerDash() {
        console.log('\n📋 Tests de dash du joueur...');
        
        // Test de dash sans capacité
        player.reset();
        player.hasDash = false;
        
        const dashWithoutAbility = player.dash(1);
        
        this.assert(!dashWithoutAbility, 'Le dash doit échouer sans la capacité');
        
        // Test de dash avec capacité
        player.reset();
        player.hasDash = true;
        player.canDash = true;
        
        const dashWithAbility = player.dash(1);
        
        this.assert(dashWithAbility, 'Le dash doit réussir avec la capacité');
        this.assert(player.isDashing === true, 'Le joueur doit être en état de dash');
        this.assert(player.canDash === false, 'Le dash ne doit plus être disponible immédiatement');
        this.assert(Math.abs(player.vx) > player.speed, 'La vitesse de dash doit être supérieure à la vitesse normale');
    }
    
    testPlayerWallJump() {
        console.log('\n📋 Tests de wall jump du joueur...');
        
        // Test de wall jump sans capacité
        player.reset();
        player.hasWallJump = false;
        
        const wallJumpWithoutAbility = player.wallJump(-1);
        
        this.assert(!wallJumpWithoutAbility, 'Le wall jump doit échouer sans la capacité');
        
        // Test de wall jump avec capacité
        player.reset();
        player.hasWallJump = true;
        player.wallJumpTimer = 0;
        
        const wallJumpWithAbility = player.wallJump(-1);
        
        this.assert(wallJumpWithAbility, 'Le wall jump doit réussir avec la capacité');
        this.assert(player.vy < 0, 'Le joueur doit sauter verticalement');
        this.assert(player.vx < 0, 'Le joueur doit être propulsé horizontalement');
        this.assert(player.facingRight === false, 'Le joueur doit faire face à la direction du saut');
    }
    
    testPhysicsCollisions() {
        console.log('\n📋 Tests de collisions physiques...');
        
        // Test de collision AABB
        const rect1 = { x: 0, y: 0, width: 10, height: 10 };
        const rect2 = { x: 5, y: 5, width: 10, height: 10 };
        const rect3 = { x: 20, y: 20, width: 10, height: 10 };
        
        this.assert(physics.checkCollision(rect1, rect2), 'Les rectangles qui se chevauchent doivent être en collision');
        this.assert(!physics.checkCollision(rect1, rect3), 'Les rectangles séparés ne doivent pas être en collision');
        
        // Test de collision joueur-plateforme
        player.reset();
        player.x = 100;
        player.y = 450;
        player.vx = 0;
        player.vy = 5;
        
        const platform = {
            x: 50,
            y: 480,
            w: 200,
            h: 20,
            type: 'normal'
        };
        
        const collisionResult = physics.resolvePlayerPlatformCollision(player, platform);
        
        this.assert(collisionResult, 'Le joueur doit entrer en collision avec la plateforme');
        this.assert(player.grounded === true, 'Le joueur doit être au sol après avoir atterri sur la plateforme');
        this.assert(player.vy === 0, 'La vitesse verticale doit être nulle après atterrissage');
    }
    
    testEnemyBehavior() {
        console.log('\n📋 Tests de comportement des ennemis...');
        
        // Test de création d'ennemi
        const enemy = new Enemy(100, 400, 24, 24, 'snail', {
            vx: 2,
            minX: 50,
            maxX: 150
        });
        
        this.assert(enemy.x === 100, 'La position X de l\'ennemi doit être correcte');
        this.assert(enemy.y === 400, 'La position Y de l\'ennemi doit être correcte');
        this.assert(enemy.type === 'snail', 'Le type d\'ennemi doit être correct');
        this.assert(enemy.dead === false, 'L\'ennemi doit être vivant à la création');
        
        // Test de mouvement d'escargot
        const initialX = enemy.x;
        enemy.update(player, {});
        
        this.assert(enemy.x !== initialX, 'L\'escargot doit se déplacer');
        
        // Test de dégâts et mort
        const deathResult = enemy.takeDamage();
        
        this.assert(deathResult, 'L\'ennemi doit pouvoir prendre des dégâts');
        this.assert(enemy.dead === true, 'L\'ennemi doit être mort après avoir pris des dégâts');
        this.assert(enemy.deathTimer === 0, 'Le timer de mort doit être initialisé');
    }
    
    testItemCollection() {
        console.log('\n📋 Tests de collecte d\'items...');
        
        // Test de création d'item
        const item = new Item(100, 400, 20, 20, 'hp');
        
        this.assert(item.x === 100, 'La position X de l\'item doit être correcte');
        this.assert(item.type === 'hp', 'Le type d\'item doit être correct');
        this.assert(item.collected === false, 'L\'item ne doit pas être collecté initialement');
        
        // Test de collecte
        const collectResult = item.collect();
        
        this.assert(collectResult, 'L\'item doit pouvoir être collecté');
        this.assert(item.collected === true, 'L\'item doit être marqué comme collecté');
        
        // Test de double collecte
        const secondCollectResult = item.collect();
        
        this.assert(!secondCollectResult, 'Un item déjà collecté ne peut pas être collecté à nouveau');
    }
    
    testGameState() {
        console.log('\n📋 Tests de l\'état du jeu...');
        
        // Test d'initialisation
        gameState.init(6);
        
        this.assert(gameState.levelCompleted.length === 6, 'Le tableau des niveaux complétés doit avoir la bonne taille');
        this.assert(gameState.levelStarsCollected.length === 6, 'Le tableau des étoiles doit avoir la bonne taille');
        this.assert(gameState.levelToolsCollected.length === 6, 'Le tableau des outils doit avoir la bonne taille');
        
        // Test de changement d'état
        gameState.setState('playing');
        
        this.assert(gameState.isState('playing'), 'L\'état du jeu doit être correctement mis à jour');
        this.assert(!gameState.isState('world_map'), 'L\'ancien état ne doit plus être actif');
        
        // Test de mise à jour des frames
        const initialFrame = gameState.frameCount;
        gameState.updateFrame();
        
        this.assert(gameState.frameCount === initialFrame + 1, 'Le compteur de frames doit s\'incrémenter');
    }
    
    testLevelLoading() {
        console.log('\n📋 Tests de chargement des niveaux...');
        
        // Test de création de niveau par défaut
        const defaultLevel = levelLoader.createDefaultLevel(1);
        
        this.assert(defaultLevel.name === 'Niveau 1', 'Le nom du niveau par défaut doit être correct');
        this.assert(defaultLevel.width > 0, 'La largeur du niveau doit être positive');
        this.assert(Array.isArray(defaultLevel.platforms), 'Le niveau doit avoir des plateformes');
        this.assert(defaultLevel.platforms.length > 0, 'Le niveau doit avoir au moins une plateforme');
        
        // Test de validation de données de sauvegarde
        const validSaveData = {
            maxUnlockedLevel: 3,
            totalStarsCollected: 5,
            totalToolsCollected: 2,
            levelCompleted: [true, false, true],
            levelStarsCollected: [1, 2, 3]
        };
        
        this.assert(levelLoader.validateSaveData(validSaveData), 'Les données de sauvegarde valides doivent passer la validation');
        
        const invalidSaveData = {
            maxUnlockedLevel: -1,
            totalStarsCollected: 'invalid',
            levelCompleted: 'not an array'
        };
        
        this.assert(!levelLoader.validateSaveData(invalidSaveData), 'Les données de sauvegarde invalides ne doivent pas passer la validation');
    }
    
    assert(condition, message) {
        if (condition) {
            this.results.push({ passed: true, message });
            console.log(`✅ ${message}`);
        } else {
            this.results.push({ passed: false, message });
            console.log(`❌ ${message}`);
        }
    }
    
    printResults() {
        const totalTests = this.results.length;
        const passedTests = this.results.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        
        console.log('\n📊 Résultats des tests:');
        console.log(`Total: ${totalTests}`);
        console.log(`Réussis: ${passedTests} ✅`);
        console.log(`Échoués: ${failedTests} ❌`);
        console.log(`Taux de réussite: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        
        if (failedTests > 0) {
            console.log('\n❌ Tests échoués:');
            this.results.filter(r => !r.passed).forEach(r => {
                console.log(`  - ${r.message}`);
            });
        }
        
        return failedTests === 0;
    }
}

// Export pour utilisation dans le jeu
export { GameTests };

// Auto-exécution si le fichier est chargé directement
if (typeof window !== 'undefined') {
    window.runGameTests = () => {
        const tests = new GameTests();
        return tests.runAllTests();
    };
}
