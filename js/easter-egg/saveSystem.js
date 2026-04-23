// js/easter-egg/saveSystem.js
// Système de sauvegarde locale pour la progression

export class SaveSystem {
    constructor() {
        this.saveKey = 'superJardinier_save';
        this.defaultSave = {
            maxUnlockedLevel: 0,
            totalStarsCollected: 0,
            totalToolsCollected: 0,
            levelCompleted: [],
            levelStarsCollected: [],
            levelToolsCollected: [],
            playerProgress: {
                hasWallJump: false,
                hasDash: false
            },
            settings: {
                soundVolume: 0.5,
                musicVolume: 0.008,
                particlesEnabled: true
            }
        };
    }
    a
    save(gameState, player) {
        const saveData = {
            maxUnlockedLevel: gameState.maxUnlockedLevel,
            totalStarsCollected: gameState.totalStarsCollected,
            totalToolsCollected: gameState.totalToolsCollected,
            levelCompleted: [...gameState.levelCompleted],
            levelStarsCollected: [...gameState.levelStarsCollected],
            levelToolsCollected: [...gameState.levelToolsCollected],
            playerProgress: {
                hasWallJump: player.hasWallJump,
                hasDash: player.hasDash
            },
            timestamp: Date.now()
        };
        
        try {
            localStorage.setItem(this.saveKey, JSON.stringify(saveData));
            return true;
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            return false;
        }
    }
    
    load() {
        try {
            const savedData = localStorage.getItem(this.saveKey);
            if (savedData) {
                return JSON.parse(savedData);
            }
        } catch (error) {
            console.error('Erreur lors du chargement de la sauvegarde:', error);
        }
        
        return this.defaultSave;
    }
    
    applySaveData(gameState, player, saveData) {
        gameState.maxUnlockedLevel = saveData.maxUnlockedLevel || 0;
        gameState.totalStarsCollected = saveData.totalStarsCollected || 0;
        gameState.totalToolsCollected = saveData.totalToolsCollected || 0;
        gameState.levelCompleted = saveData.levelCompleted || [];
        gameState.levelStarsCollected = saveData.levelStarsCollected || [];
        gameState.levelToolsCollected = saveData.levelToolsCollected || [];
        
        player.hasWallJump = saveData.playerProgress?.hasWallJump || false;
        player.hasDash = saveData.playerProgress?.hasDash || false;
    }
    
    deleteSave() {
        try {
            localStorage.removeItem(this.saveKey);
            return true;
        } catch (error) {
            console.error('Erreur lors de la suppression de la sauvegarde:', error);
            return false;
        }
    }
    
    hasSave() {
        return localStorage.getItem(this.saveKey) !== null;
    }
    
    getSaveInfo() {
        const saveData = this.load();
        return {
            exists: this.hasSave(),
            maxUnlockedLevel: saveData.maxUnlockedLevel,
            totalStarsCollected: saveData.totalStarsCollected,
            totalToolsCollected: saveData.totalToolsCollected,
            completion: saveData.levelCompleted ? saveData.levelCompleted.filter(c => c).length : 0,
            lastPlayed: saveData.timestamp ? new Date(saveData.timestamp).toLocaleDateString() : null
        };
    }
    
    exportSave() {
        const saveData = this.load();
        const dataStr = JSON.stringify(saveData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `super_jardinier_save_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    }
    
    importSave(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const saveData = JSON.parse(event.target.result);
                    
                    // Validation des données
                    if (this.validateSaveData(saveData)) {
                        localStorage.setItem(this.saveKey, JSON.stringify(saveData));
                        resolve(true);
                    } else {
                        reject(new Error('Données de sauvegarde invalides'));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
            reader.readAsText(file);
        });
    }
    
    validateSaveData(data) {
        const requiredFields = ['maxUnlockedLevel', 'totalStarsCollected', 'totalToolsCollected'];
        
        for (const field of requiredFields) {
            if (typeof data[field] !== 'number' || data[field] < 0) {
                return false;
            }
        }
        
        if (!Array.isArray(data.levelCompleted) || !Array.isArray(data.levelStarsCollected)) {
            return false;
        }
        
        return true;
    }
}

export const saveSystem = new SaveSystem();
