// js/easter-egg/levelLoader.js
// Chargeur de niveaux depuis les fichiers JSON

export class LevelLoader {
    constructor() {
        this.levels = [];
        this.loaded = false;
    }
    
    async loadLevels() {
        if (this.loaded) return this.levels;
        
        try {
            const levelFiles = [
                './js/easter-egg/levels/level1.json',
                './js/easter-egg/levels/level2.json',
                './js/easter-egg/levels/level3.json',
                './js/easter-egg/levels/level4.json',
                './js/easter-egg/levels/level5.json',
                './js/easter-egg/levels/level6.json'
            ];
            
            for (const file of levelFiles) {
                try {
                    const response = await fetch(file);
                    if (response.ok) {
                        const levelData = await response.json();
                        this.levels.push(levelData);
                    } else {
                        console.warn(`Impossible de charger le fichier ${file}`);
                        // Ajouter un niveau par défaut si le fichier n'existe pas
                        this.levels.push(this.createDefaultLevel(this.levels.length + 1));
                    }
                } catch (error) {
                    console.warn(`Erreur lors du chargement de ${file}:`, error);
                    this.levels.push(this.createDefaultLevel(this.levels.length + 1));
                }
            }
            
            this.loaded = true;
            return this.levels;
        } catch (error) {
            console.error('Erreur lors du chargement des niveaux:', error);
            // Retourner des niveaux par défaut
            return this.createDefaultLevels();
        }
    }
    
    createDefaultLevels() {
        const levels = [];
        for (let i = 1; i <= 6; i++) {
            levels.push(this.createDefaultLevel(i));
        }
        this.levels = levels;
        this.loaded = true;
        return levels;
    }
    
    createDefaultLevel(levelNumber) {
        return {
            name: `Niveau ${levelNumber}`,
            time: "morning",
            ambience: "orchard",
            mapX: 140 + (levelNumber - 1) * 120,
            mapY: 360,
            width: 2000 + levelNumber * 500,
            goal: {
                x: 1800 + levelNumber * 300,
                y: 400,
                w: 120,
                h: 80
            },
            checkpoints: [],
            platforms: [
                {
                    x: 0,
                    y: 480,
                    w: 2000 + levelNumber * 500,
                    h: 80,
                    type: "normal"
                }
            ],
            water: [],
            windZones: [],
            buzzsaws: [],
            tasks: [],
            npcs: [],
            enemies: [],
            items: [],
            decorations: [],
            boss: levelNumber === 6 ? {
                x: 1000,
                startX: 1000,
                y: 280,
                w: 140,
                h: 200,
                hp: 15,
                maxHp: 15,
                type: "bramble",
                state: "intro",
                timer: 0,
                dead: false,
                name: "BOSS FINAL",
                phase: 1,
                shield: false,
                invincible: false,
                arenaMin: 500,
                arenaMax: 1500,
                hasDoneIntro: false,
                isActive: false
            } : null
        };
    }
    
    getLevel(index) {
        if (!this.loaded) {
            console.warn('Les niveaux ne sont pas encore chargés');
            return null;
        }
        
        if (index < 0 || index >= this.levels.length) {
            console.warn(`Index de niveau invalide: ${index}`);
            return null;
        }
        
        return this.levels[index];
    }
    
    getAllLevels() {
        return this.loaded ? [...this.levels] : [];
    }
    
    getLevelsCount() {
        return this.levels.length;
    }
}

export const levelLoader = new LevelLoader();
