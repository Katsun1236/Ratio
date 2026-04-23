export const groundY = 480;

export const clouds = Array.from({length: 15}, () => ({ 
    x: Math.random() * 5000, y: Math.random() * 200, 
    s: Math.random() * 0.3 + 0.1, size: Math.random() * 15 + 20 
}));

export const stars = Array.from({length: 120}, () => ({ 
    x: Math.random() * 5000, y: Math.random() * 450, 
    size: Math.random() * 2 + 0.5, twinkleSpeed: Math.random() * 0.05 + 0.01 
}));

export const levels = [
    {   // NIVEAU 1 : Apprentissage (Double Saut)
        name: "Le Verger Paisible", time: "morning", ambience: "orchard", mapX: 140, mapY: 360, width: 7000, goal: { x: 6700, y: groundY - 80, w: 120, h: 80 }, 
        checkpoints: [{ x: 2000, y: groundY - 60, w: 20, h: 60, active: false }, { x: 4200, y: groundY - 60, w: 20, h: 60, active: false }],
        platforms: [
            { x: 0, y: groundY, w: 900, h: 80, type: 'normal' },
            { x: 1050, y: groundY - 50, w: 200, h: 20, type: 'normal' },
            { x: 1400, y: groundY - 100, w: 200, h: 20, type: 'normal' },
            // Vertical Tree Climb
            { x: 1700, y: 300, w: 100, h: 20, type: 'normal' },
            { x: 1550, y: 200, w: 100, h: 20, type: 'normal' },
            { x: 1800, y: 100, w: 200, h: 20, type: 'normal' },
            
            // Bridge over water
            { x: 2000, y: groundY, w: 900, h: 80, type: 'normal' },
            { x: 2900, y: groundY - 50, w: 200, h: 80, type: 'fragile', timer: 0, state: 'idle' },
            { x: 3100, y: groundY - 100, w: 200, h: 20, type: 'fragile', timer: 0, state: 'idle' },
            
            // Puzzle zone: Ghost plates & Switch
            { x: 3500, y: 350, w: 120, h: 20, type: 'ghost_plat', timer: 0, active: true },
            { x: 3750, y: 250, w: 120, h: 20, type: 'ghost_plat', timer: 60, active: false },
            { x: 3500, y: 150, w: 120, h: 20, type: 'ghost_plat', timer: 0, active: true },
            { x: 3900, y: 150, w: 150, h: 20, type: 'normal' }, // Switch platform
            
            { x: 4000, y: groundY, w: 800, h: 80, type: 'normal' },
            { x: 5000, y: 350, w: 150, h: 20, type: 'moving', minX: 4900, maxX: 5300, vx: 2.5 },
            { x: 5500, y: groundY, w: 1500, h: 80, type: 'normal' }
        ],
        water: [ { x: 900, y: groundY + 40, w: 150, h: 80 }, { x: 2900, y: groundY + 40, w: 1100, h: 80 } ], 
        windZones: [], 
        buzzsaws: [ 
            { x: 2400, y: groundY - 40, size: 25, minX: 2300, maxX: 2700, vx: 4 },
            { x: 4200, y: groundY - 40, size: 35, minX: 4100, maxX: 4600, vx: 6 }
        ],
        switches: [ { x: 3950, y: 110, id: 'gate1', active: false, type: 'lever' } ],
        gates: [ { x: 4200, y: groundY - 200, w: 40, h: 200, switchId: 'gate1', open: false } ],
        tasks: [
            { x: 500, y: groundY - 20, w: 80, h: 20, type: 'grass', done: false, name: 'Tonte d\'échauffement' },
            { x: 1850, y: 100 - 45, w: 50, h: 45, type: 'hedge', done: false, name: 'Taille Suspendue' },
            { x: 2700, y: groundY - 120, w: 40, h: 20, type: 'branch', done: false, trunkX: 2750, trunkY: groundY, name: 'Élagage à risque' },
            { x: 4500, y: groundY - 20, w: 60, h: 20, type: 'grass', done: false, name: 'Tonte Post-Porte' },
        ],
        npcs: [ 
            { x: 200, y: groundY - 36, w: 20, h: 36, color: '#f87171', name: "Mme. Rose", dialogs: ["Bienvenue ! Les terrains sont plus rudes et vastes.", "Saute avec précision et observe la structure des niveaux !", "Et utilise les LEVIERS pour ouvrir les portes végétales."] },
            { x: 3400, y: groundY + 40, w: 20, h: 36, color: '#fcd34d', name: "Ouvrier Coincé", dialogs: ["La porte là-bas est bloquée !", "Il faut grimper sur les plateformes fantômes pour trouver le Mécanisme..."] }
        ],
        enemies: [ 
            { x: 600, y: groundY - 24, w: 24, h: 24, type: 'snail', vx: 1.5, minX: 550, maxX: 850, dead: false },
            { x: 1450, y: groundY - 100 - 24, w: 24, h: 24, type: 'frog', vx: -1.8, vy: 0, baseY: groundY - 100 - 24, minX: 1400, maxX: 1550, dead: false },
            { x: 2500, y: groundY - 24, w: 24, h: 24, type: 'snail', vx: -2.5, minX: 2200, maxX: 2800, dead: false },
            { x: 3700, y: 220, w: 24, h: 24, type: 'bee', vx: 2, baseY: 220, minX: 3500, maxX: 3900, dead: false },
            { x: 4400, y: groundY - 24, w: 24, h: 24, type: 'frog', vx: -2, vy: 0, baseY: groundY - 24, minX: 4100, maxX: 4700, dead: false },
            { x: 5100, y: 350 - 24, w: 24, h: 24, type: 'bee', vx: -3, baseY: 300, minX: 4900, maxX: 5300, dead: false }
        ], 
        items: [ { x: 3980, y: 130, baseY: 130, w: 20, h: 20, type: 'hp', collected: false } ],
        stars: [ { x: 1850, y: 50, baseY: 50, collected: false }, { x: 3550, y: 180, baseY: 180, collected: false }, { x: 5050, y: 220, baseY: 220, collected: false } ],
        tools: [ { x: 700, y: groundY - 40, baseY: groundY - 40, collected: false }, { x: 2800, y: groundY - 180, baseY: groundY - 180, collected: false } ],
        decorations: [
            { type: 'bench', x: 320, y: groundY - 22 },
            { type: 'flowerPatch', x: 1100, y: groundY - 50 - 16, w: 80 },
            { type: 'treeDecor', x: 2150, y: groundY - 120, size: 80 },
            { type: 'vineWall', x: 4200, y: groundY - 200, h: 200 },
            { type: 'lantern', x: 4700, y: groundY - 85 },
            { type: 'arch', x: 6500, y: groundY - 60, w: 100, h: 80 }
        ],
        boss: { x: 6000, startX: 6000, y: groundY - 140, w: 80, h: 140, hp: 5, maxHp: 5, type: 'scarecrow', state: 'idle', timer: 0, dead: false, name: "ÉPOUVANTAIL DÉTRAQUÉ", reward: "walljump", arenaMin: 5500, arenaMax: 6800, hasDoneIntro: false, isActive: false }
    },
    {   // NIVEAU 2 : Précision, Boue & Wall-Jump
        name: "La Faille Boueuse", time: "midday", ambience: "mudlands", mapX: 280, mapY: 290, width: 7500, goal: { x: 7200, y: groundY - 80, w: 120, h: 80 }, 
        checkpoints: [ { x: 1850, y: 300 - 60, w: 20, h: 60, active: false }, { x: 4950, y: 150 - 60, w: 20, h: 60, active: false } ],
        platforms: [
            { x: 0, y: groundY, w: 600, h: 80, type: 'normal' },
            // Grand toboggan de boue descendant
            { x: 600, y: 400, w: 150, h: 200, type: 'mud' }, 
            { x: 850, y: 300, w: 150, h: 300, type: 'mud' },  
            
            // Wall jump chasm avec Scies
            { x: 1200, y: 100, w: 50, h: 600, type: 'normal' },
            { x: 1500, y: 100, w: 50, h: 600, type: 'normal' },
            
            // Arrivée Walljump
            { x: 1550, y: 300, w: 600, h: 60, type: 'mud' }, 
            
            // Énigme de la chûte (faut descendre pour activer le switch et rebondir)
            { x: 2300, y: 300, w: 100, h: 20, type: 'fragile', timer: 0, state: 'idle' },
            { x: 2600, y: 300, w: 100, h: 20, type: 'fragile', timer: 0, state: 'idle' },
            { x: 2800, y: 800, w: 200, h: 20, type: 'bouncy' }, // Huge fall !
            
            { x: 3000, y: 150, w: 800, h: 60, type: 'normal' }, 
            
            { x: 4300, y: 350, w: 150, h: 20, type: 'moving', minX: 4300, maxX: 4700, vx: 3.5 },
            { x: 4900, y: 150, w: 400, h: 60, type: 'normal' },
            { x: 5500, y: groundY, w: 2000, h: 80, type: 'normal' }
        ],
        water: [ { x: 1200, y: 650, w: 400, h: 200 }, { x: 2150, y: 900, w: 1200, h: 200 } ], 
        windZones: [],
        buzzsaws: [ 
            { x: 1350, y: 250, size: 25, minX: 1250, maxX: 1450, vx: 5 }, 
            { x: 1350, y: 450, size: 25, minX: 1250, maxX: 1450, vx: -5 }, 
            { x: 3400, y: 110, size: 30, minX: 3100, maxX: 3700, vx: 8 } 
        ],
        switches: [ { x: 2880, y: 550, id: 'gate2', active: false, type: 'button' } ], 
        gates: [ { x: 3000, y: -50, w: 40, h: 200, switchId: 'gate2', open: false } ],
        tasks: [ 
            { x: 400, y: groundY - 20, w: 80, h: 20, type: 'grass', done: false, name: 'Tonte de Départ' },
            { x: 1650, y: 300 - 45, w: 50, h: 45, type: 'hedge', done: false, name: 'Taille du Sommet' },
            { x: 3200, y: 150 - 20, w: 80, h: 20, type: 'grass', done: false, name: 'Tonte Protégée' },
            { x: 5100, y: 150 - 120, w: 40, h: 20, type: 'branch', done: false, trunkX: 5120, trunkY: 150, name: 'Élagage du Précipice' }
        ],
        npcs: [ 
            { x: 150, y: groundY - 36, w: 20, h: 36, color: '#60a5fa', name: "M. Tulipe", dialogs: ["La grande faille te bloque !", "Saute vers le mur, maintiens la direction contre lui pour glisser.", "Puis, appuie sur SAUT pour bondir (Wall-Jump) et éviter les scies !"] },
            { x: 2150, y: 300 - 36, w: 20, h: 36, color: '#a78bfa', name: "Explorateur", dialogs: ["La porte en haut à droite est fermée...", "J'ai cru voir un BOUTON VOLANT au fond du gouffre...", "Il te faudra te laisser tomber et rebondir pour survivre !"] }
        ],
        enemies: [ 
            { x: 1700, y: 300 - 24, w: 24, h: 24, type: 'mole', vx: 0, vy: 0, baseY: 300, timer: 0, dead: false },
            { x: 2000, y: 300 - 24, w: 24, h: 24, type: 'frog', vx: -2, vy: 0, baseY: 300 - 24, minX: 1850, maxX: 2100, dead: false },
            { x: 3500, y: 150 - 24, w: 24, h: 24, type: 'frog', vx: 2, vy: 0, baseY: 150 - 24, minX: 3250, maxX: 3700, dead: false },
            { x: 4500, y: 150 - 24, w: 24, h: 24, type: 'bee', vx: 3, baseY: 200, minX: 4300, maxX: 4800, dead: false },
            { x: 5050, y: 150 - 24, w: 24, h: 24, type: 'mole', vx: 0, vy: 0, baseY: 150, timer: 20, dead: false },
            { x: 5700, y: groundY - 24, w: 24, h: 24, type: 'snail', vx: 2, minX: 5500, maxX: 6000, dead: false }
        ],
        items: [ { x: 2650, y: 250, baseY: 250, w: 20, h: 20, type: 'hp', collected: false } ],
        stars: [ { x: 1350, y: 350, baseY: 350, collected: false }, { x: 2900, y: 650, baseY: 650, collected: false }, { x: 4500, y: 250, baseY: 250, collected: false } ],
        tools: [ { x: 750, y: 300, baseY: 300, collected: false }, { x: 3250, y: 50, baseY: 50, collected: false } ],
        decorations: [
            { type: 'vineWall', x: 1200, y: 100, h: 600 },
            { type: 'wheelbarrow', x: 3160, y: 150 - 10 },
            { type: 'barrel', x: 5200, y: 150 },
            { type: 'lantern', x: 5600, y: groundY - 24 }
        ],
        boss: { x: 6200, startX: 6200, y: groundY - 100, w: 100, h: 100, hp: 8, maxHp: 8, type: 'toad', state: 'idle', timer: 0, dead: false, name: "CRAPAUD-BUFFLE", reward: "dash", arenaMin: 5600, arenaMax: 6900, hasDoneIntro: false, isActive: false }
    },
    {   // NIVEAU 3 : Les Courants d'air et le Dash
        name: "Les Hauts Vents", time: "sunset", ambience: "windgarden", mapX: 430, mapY: 220, width: 5000, goal: { x: 4800, y: groundY - 80, w: 120, h: 80 },
        checkpoints: [ { x: 1600, y: groundY - 60, w: 20, h: 60, active: false }, { x: 3000, y: 350 - 60, w: 20, h: 60, active: false } ],
        platforms: [
            { x: 0, y: groundY, w: 300, h: 80, type: 'normal' }, { x: 900, y: groundY, w: 4100, h: 80, type: 'normal' }, 
            { x: 1300, y: 300, w: 100, h: 20, type: 'ghost_plat', timer: 0, active: true }, 
            { x: 1700, y: 250, w: 100, h: 20, type: 'moving', minX: 1700, maxX: 2100, vx: 3 }, 
            { x: 2300, y: 250, w: 100, h: 20, type: 'bouncy' }, { x: 2800, y: 350, w: 100, h: 20, type: 'normal' },
            { x: 3400, y: 250, w: 100, h: 20, type: 'fragile', timer: 0, state: 'idle' },
            { x: 3920, y: 300, w: 120, h: 20, type: 'moving', minX: 3920, maxX: 4300, vx: 2.4 }
        ],
        water: [ { x: 300, y: groundY + 20, w: 600, h: 60 }, { x: 2200, y: groundY + 20, w: 400, h: 60 } ],
        windZones: [ { x: 400, y: 100, w: 400, h: groundY }, { x: 3300, y: 50, w: 300, h: groundY } ], buzzsaws: [],
        tasks: [ { x: 1000, y: groundY - 45, w: 50, h: 45, type: 'hedge', done: false, name: 'Taille' }, { x: 1320, y: 300 - 20, w: 60, h: 20, type: 'grass', done: false, name: 'Tonte' }, { x: 2820, y: 350 - 120, w: 40, h: 20, type: 'branch', done: false, trunkX: 2850, trunkY: 350, name: 'Élagage' }, { x: 3100, y: groundY - 20, w: 80, h: 20, type: 'grass', done: false, name: 'Tonte' } ],
        npcs: [ { x: 150, y: groundY - 36, w: 20, h: 36, color: '#fcd34d', name: "L'Apprenti", dialogs: ["Chef, j'ai laissé le Souffleur à feuilles allumé dans la crevasse !", "Sautez dans le vent, ça va vous porter. Puis utilisez le Sécateur-Dash (MAJ) !"] } ],
        enemies: [ { x: 1100, y: groundY - 24, w: 24, h: 24, type: 'snail', vx: 1.5, minX: 950, maxX: 1250, dead: false }, { x: 1800, y: 150, w: 24, h: 24, type: 'bee', vx: 2, baseY: 150, minX: 1700, maxX: 2200, dead: false }, { x: 2500, y: groundY, w: 24, h: 24, type: 'mole', vx: 0, vy: 0, baseY: groundY, timer: 0, dead: false }, { x: 2600, y: 200, w: 24, h: 24, type: 'bee', vx: -2.5, baseY: 200, minX: 2400, maxX: 2900, dead: false } ],
        items: [ { x: 2340, y: 100, baseY: 100, w: 20, h: 20, type: 'hp', collected: false } ],
        decorations: [
            { type: 'windmill', x: 520, y: groundY - 140, h: 140 },
            { type: 'flowerPatch', x: 1040, y: groundY - 16, w: 70 },
            { type: 'treeDecor', x: 2120, y: groundY - 100, size: 56 },
            { type: 'kitePole', x: 3180, y: groundY - 150 },
            { type: 'arch', x: 4680, y: groundY - 60, w: 90, h: 60 }
        ],
        boss: null
    },
    {   // NIVEAU 4 : Ruines Moussues (intermediaire)
        name: "Les Ruines Moussues", time: "afternoon", ambience: "ruins", mapX: 580, mapY: 260, width: 5400, goal: { x: 5150, y: groundY - 80, w: 120, h: 80 },
        checkpoints: [ { x: 1800, y: groundY - 60, w: 20, h: 60, active: false }, { x: 3700, y: 260, w: 20, h: 60, active: false } ],
        platforms: [
            { x: 0, y: groundY, w: 1200, h: 80, type: 'normal' },
            { x: 1300, y: 390, w: 120, h: 20, type: 'fragile', timer: 0, state: 'idle' },
            { x: 1550, y: 340, w: 120, h: 20, type: 'ghost_plat', timer: 20, active: true },
            { x: 1800, y: 290, w: 120, h: 20, type: 'moving', minX: 1800, maxX: 2200, vx: 2.8 },
            { x: 2300, y: 240, w: 120, h: 20, type: 'bouncy' },
            { x: 2800, y: 300, w: 140, h: 20, type: 'normal' },
            { x: 3200, y: 260, w: 140, h: 20, type: 'mud' },
            { x: 3500, y: 320, w: 1800, h: 80, type: 'normal' },
            { x: 4100, y: 220, w: 120, h: 20, type: 'ghost_plat', timer: 60, active: false }
        ],
        water: [ { x: 1200, y: groundY + 20, w: 250, h: 60 }, { x: 2550, y: groundY + 20, w: 500, h: 60 } ],
        windZones: [ { x: 4350, y: 80, w: 230, h: groundY } ],
        buzzsaws: [ { x: 2050, y: 250, size: 24, minX: 1950, maxX: 2450, vx: 4 }, { x: 3950, y: groundY - 45, size: 28, minX: 3750, maxX: 4700, vx: 6 } ],
        tasks: [
            { x: 600, y: groundY - 20, w: 80, h: 20, type: 'grass', done: false, name: 'Tonte' },
            { x: 2320, y: 240 - 45, w: 50, h: 45, type: 'hedge', done: false, name: 'Taille' },
            { x: 2850, y: 300 - 120, w: 40, h: 20, type: 'branch', done: false, trunkX: 2880, trunkY: 300, name: 'Élagage' },
            { x: 4450, y: 240, w: 60, h: 20, type: 'grass', done: false, name: 'Tonte' }
        ],
        npcs: [ { x: 220, y: groundY - 36, w: 20, h: 36, color: '#86efac', name: "Garde Forestier", dialogs: ["Les ruines sont piégeuses, garde ton dash pour les sauts ratés.", "Le vent final te propulse vers la sortie !"] } ],
        enemies: [
            { x: 1450, y: groundY - 24, w: 24, h: 24, type: 'snail', vx: 2, minX: 1300, maxX: 1720, dead: false },
            { x: 2440, y: 180, w: 24, h: 24, type: 'bee', vx: 2.4, baseY: 180, minX: 2350, maxX: 2900, dead: false },
            { x: 4300, y: groundY, w: 24, h: 24, type: 'mole', vx: 0, vy: 0, baseY: groundY, timer: 0, dead: false }
        ],
        items: [ { x: 4140, y: 170, baseY: 170, w: 20, h: 20, type: 'hp', collected: false } ],
        decorations: [
            { type: 'ruinPillar', x: 1180, y: groundY - 120, h: 120 },
            { type: 'ruinPillar', x: 2460, y: groundY - 160, h: 160 },
            { type: 'vineWall', x: 3600, y: groundY - 180, h: 180 },
            { type: 'lantern', x: 4380, y: 180 },
            { type: 'bench', x: 4920, y: groundY - 22 }
        ],
        boss: null
    },
    {   // NIVEAU 5 : Antre du Crapaud Royal
        name: "Le Marais des Couronnes", time: "night", ambience: "swamp", mapX: 720, mapY: 190, width: 4800, goal: { x: 4580, y: 130 - 80, w: 120, h: 80 },
        checkpoints: [ { x: 1500, y: 130 - 60, w: 20, h: 60, active: false }, { x: 3000, y: 130 - 60, w: 20, h: 60, active: false } ],
        platforms: [
            { x: 0, y: groundY, w: 350, h: 80, type: 'normal' },
            { x: 350, y: 130, w: 900, h: 70, type: 'mud' },
            { x: 1250, y: 130, w: 60, h: 380, type: 'normal' },
            { x: 1500, y: 130, w: 1100, h: 70, type: 'normal' },
            { x: 2620, y: 80, w: 120, h: 20, type: 'moving', minX: 2620, maxX: 3100, vx: 3 },
            { x: 3200, y: 130, w: 1600, h: 70, type: 'mud' },
            { x: 3720, y: 40, w: 120, h: 20, type: 'bouncy' }
        ],
        water: [ { x: 2600, y: 160, w: 520, h: 380 } ],
        windZones: [],
        buzzsaws: [ { x: 2050, y: 90, size: 25, minX: 1800, maxX: 2550, vx: 5 } ],
        tasks: [
            { x: 650, y: 130 - 20, w: 80, h: 20, type: 'grass', done: false, name: 'Tonte' },
            { x: 1900, y: 130 - 45, w: 50, h: 45, type: 'hedge', done: false, name: 'Taille' },
            { x: 3340, y: 130 - 20, w: 80, h: 20, type: 'grass', done: false, name: 'Tonte' }
        ],
        npcs: [ { x: 140, y: groundY - 36, w: 20, h: 36, color: '#c4b5fd', name: "Noctis", dialogs: ["Ici, la boue avale ton inertie.", "Tu dois dompter le marais pour atteindre le portail final."] } ],
        enemies: [
            { x: 950, y: 130 - 24, w: 24, h: 24, type: 'frog', vx: -2, vy: 0, baseY: 130 - 24, minX: 700, maxX: 1220, dead: false },
            { x: 2150, y: 130 - 24, w: 24, h: 24, type: 'frog', vx: 2, vy: 0, baseY: 130 - 24, minX: 1600, maxX: 2500, dead: false },
            { x: 3550, y: 130 - 24, w: 24, h: 24, type: 'snail', vx: -2, minX: 3300, maxX: 4000, dead: false }
        ],
        items: [ { x: 3760, y: -20, baseY: -20, w: 20, h: 20, type: 'hp', collected: false } ],
        decorations: [
            { type: 'mushroom', x: 780, y: 110, size: 22 },
            { type: 'reed', x: 1740, y: 112, h: 40 },
            { type: 'reed', x: 2740, y: 150, h: 50 },
            { type: 'totem', x: 3460, y: 106 },
            { type: 'lantern', x: 4440, y: 46 }
        ],
        boss: { x: 4040, startX: 4040, y: 130 - 120, w: 110, h: 120, hp: 10, maxHp: 10, type: 'toad', state: 'idle', timer: 0, dead: false, name: "CRAPAUD ROYAL", reward: "dash", arenaMin: 3600, arenaMax: 4550, hasDoneIntro: false, isActive: false }
    },
    {   // NIVEAU 6 : Boss Final
        name: "La Racine du Mal", time: "night", ambience: "bossGarden", mapX: 840, mapY: 260, width: 4000, goal: { x: -1000, y: 0, w: 1, h: 1 }, isBoss: true,
        platforms: [ { x: 0, y: groundY, w: 500, h: 80, type: 'normal' }, { x: 500, y: groundY, w: 3500, h: 80, type: 'normal' } ],
        water: [], windZones: [], buzzsaws: [], tasks: [], enemies: [], items: [],
        decorations: [
            { type: 'thornPillar', x: 1280, y: groundY - 180, h: 180 },
            { type: 'thornPillar', x: 1820, y: groundY - 140, h: 140 },
            { type: 'thornPillar', x: 2940, y: groundY - 220, h: 220 },
            { type: 'lanternRed', x: 3440, y: groundY - 90 }
        ],
        npcs: [ { x: 200, y: groundY - 36, w: 20, h: 36, color: '#a78bfa', name: "Vieux Chêne", dialogs: ["La Ronce Mutante est juste là...", "Utilise ton Dash pour passer à travers ses piques géantes !"] } ],
        boss: { x: 2200, startX: 2200, y: groundY - 200, w: 140, h: 200, hp: 15, maxHp: 15, type: 'bramble', state: 'intro', timer: 0, dead: false, name: "RONCE MUTANTE (PHASE FINALE)", phase: 1, shield: false, invincible: false, arenaMin: 1000, arenaMax: 3500, hasDoneIntro: false, isActive: false }
    }
];
