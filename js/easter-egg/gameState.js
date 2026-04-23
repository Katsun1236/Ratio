// js/easter-egg/gameState.js
// Gestionnaire d'état centralisé

export class GameState {
    constructor() {
        this.gameActive = false;
        this.currentLevelIdx = 0;
        this.cameraX = 0;
        this.frameCount = 0;
        this.screenShake = 0;
        this.hitStopFrames = 0;
        this.gameState = 'playing'; // 'playing', 'world_map', 'level_enter', 'game_over'
        this.cinematicTimer = 0;
        this.cinematicState = '';
        
        // World map
        this.mapSelectedLevel = 0;
        this.maxUnlockedLevel = 0;
        this.mapAvatarX = 140;
        this.mapAvatarY = 360;
        this.mapAvatarTargetX = 140;
        this.mapAvatarTargetY = 360;
        this.pendingLevelIdx = 0;
        this.levelEnterTimer = 0;
        
        // Progression
        this.levelCompleted = [];
        this.levelStarsCollected = [];
        this.totalStarsCollected = 0;
        this.levelToolsCollected = [];
        this.totalToolsCollected = 0;
        
        // Level data
        this.levelTasks = 0;
        this.completedTasks = 0;
        this.levelData = {};
        
        // UI
        this.activeDialog = null;
        this.nearNPC = null;
    }
    
    init(levelsCount) {
        this.levelCompleted = Array.from({ length: levelsCount }, () => false);
        this.levelStarsCollected = Array.from({ length: levelsCount }, () => 0);
        this.levelToolsCollected = Array.from({ length: levelsCount }, () => 0);
    }
    
    reset() {
        this.frameCount = 0;
        this.screenShake = 0;
        this.hitStopFrames = 0;
        this.cinematicTimer = 0;
        this.cinematicState = '';
        this.activeDialog = null;
        this.nearNPC = null;
    }
    
    setState(newState) {
        this.gameState = newState;
    }
    
    isState(state) {
        return this.gameState === state;
    }
    
    updateFrame() {
        this.frameCount++;
        if (this.screenShake > 0) this.screenShake--;
        if (this.hitStopFrames > 0) this.hitStopFrames--;
    }
    
    addScreenShake(intensity) {
        this.screenShake = Math.max(this.screenShake, intensity);
    }
    
    setHitStop(frames) {
        this.hitStopFrames = frames;
    }
}

export const gameState = new GameState();
