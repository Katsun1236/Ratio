// js/easter-egg/physics.js
// Module de gestion de la physique et des collisions

import { groundY } from './config.js';

export class Physics {
    constructor() {
        this.gravity = 0.55;
        this.defaultFriction = 0.8;
        this.mudFriction = 0.95;
    }
    
    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.w &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.h &&
               rect1.y + rect1.height > rect2.y;
    }
    
    checkPlatformCollision(player, platform) {
        const playerRect = {
            x: player.x,
            y: player.y,
            width: player.width,
            height: player.height
        };
        
        const platformRect = {
            x: platform.x,
            y: platform.y,
            w: platform.w,
            h: platform.h
        };
        
        return this.checkCollision(playerRect, platformRect);
    }
    
    resolvePlayerPlatformCollision(player, platform) {
        if (!this.checkPlatformCollision(player, platform)) return false;
        
        // Calculate overlap on each axis
        const overlapLeft = (player.x + player.width) - platform.x;
        const overlapRight = (platform.x + platform.w) - player.x;
        const overlapTop = (player.y + player.height) - platform.y;
        const overlapBottom = (platform.y + platform.h) - player.y;
        
        // Find the smallest overlap
        const minOverlapX = Math.min(overlapLeft, overlapRight);
        const minOverlapY = Math.min(overlapTop, overlapBottom);
        
        // Resolve collision based on smallest overlap
        if (minOverlapX < minOverlapY) {
            // Horizontal collision
            if (overlapLeft < overlapRight) {
                player.x = platform.x - player.width;
            } else {
                player.x = platform.x + platform.w;
            }
            player.vx = 0;
            
            // Check for wall jump opportunity
            if (!player.grounded && player.hasWallJump) {
                return { wallJump: true, direction: overlapLeft < overlapRight ? -1 : 1 };
            }
        } else {
            // Vertical collision
            if (overlapTop < overlapBottom) {
                // Landing on top
                player.y = platform.y - player.height;
                player.vy = 0;
                player.grounded = true;
                player.jumps = 0;
                
                // Apply platform-specific effects
                if (platform.type === 'bouncy') {
                    player.vy = -18;
                    player.grounded = false;
                    return { bounce: true };
                } else if (platform.type === 'mud') {
                    player.vx *= this.mudFriction;
                } else if (platform.type === 'fragile' && platform.state === 'idle') {
                    platform.state = 'shaking';
                    platform.timer = 0;
                }
            } else {
                // Hitting from below
                player.y = platform.y + platform.h;
                player.vy = 0;
            }
        }
        
        return true;
    }
    
    checkWaterCollision(player, water) {
        const playerRect = {
            x: player.x,
            y: player.y,
            width: player.width,
            height: player.height
        };
        
        const waterRect = {
            x: water.x,
            y: water.y,
            w: water.w,
            h: water.h
        };
        
        return this.checkCollision(playerRect, waterRect);
    }
    
    applyWaterPhysics(player, water) {
        if (this.checkWaterCollision(player, water)) {
            player.vy *= 0.5;
            player.vx *= 0.8;
            player.vy += 0.2; // Reduced gravity in water
            
            // Check if player is deep enough to take damage
            if (player.y > water.y + water.h * 0.7) {
                return { drowning: true };
            }
        }
        return false;
    }
    
    checkWindZoneCollision(player, windZone) {
        const playerRect = {
            x: player.x,
            y: player.y,
            width: player.width,
            height: player.height
        };
        
        const windRect = {
            x: windZone.x,
            y: windZone.y,
            w: windZone.w,
            h: windZone.h
        };
        
        return this.checkCollision(playerRect, windRect);
    }
    
    applyWindForce(player, windZone) {
        if (this.checkWindZoneCollision(player, windZone)) {
            player.vy -= 0.3; // Upward wind force
            player.vx += 0.1; // Slight horizontal push
        }
    }
    
    checkEnemyCollision(player, enemy) {
        if (enemy.dead) return false;
        
        const playerRect = {
            x: player.x,
            y: player.y,
            width: player.width,
            height: player.height
        };
        
        const enemyRect = {
            x: enemy.x,
            y: enemy.y,
            w: enemy.w,
            h: enemy.h
        };
        
        return this.checkCollision(playerRect, enemyRect);
    }
    
    checkItemCollision(player, item) {
        if (item.collected) return false;
        
        const playerRect = {
            x: player.x,
            y: player.y,
            width: player.width,
            height: player.height
        };
        
        const itemRect = {
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h
        };
        
        return this.checkCollision(playerRect, itemRect);
    }
    
    checkTaskCollision(player, task) {
        if (task.done) return false;
        
        const playerRect = {
            x: player.x,
            y: player.y,
            width: player.width,
            height: player.height
        };
        
        const taskRect = {
            x: task.x,
            y: task.y,
            w: task.w,
            h: task.h
        };
        
        return this.checkCollision(playerRect, taskRect);
    }
    
    checkGoalCollision(player, goal) {
        const playerRect = {
            x: player.x,
            y: player.y,
            width: player.width,
            height: player.height
        };
        
        const goalRect = {
            x: goal.x,
            y: goal.y,
            w: goal.w,
            h: goal.h
        };
        
        return this.checkCollision(playerRect, goalRect);
    }
    
    checkBuzzsawCollision(player, buzzsaw) {
        const dx = (player.x + player.width/2) - buzzsaw.x;
        const dy = (player.y + player.height/2) - buzzsaw.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < (buzzsaw.size + Math.min(player.width, player.height) / 2);
    }
    
    updateLevelBounds(player, levelWidth) {
        // Left boundary - return to world map
        if (player.x < -20) {
            return { exit: 'left' };
        }
        
        // Right boundary
        if (player.x + player.width > levelWidth) {
            player.x = levelWidth - player.width;
            player.vx = 0;
        }
        
        // Top boundary
        if (player.y < -500) {
            return { exit: 'top' };
        }
        
        // Bottom boundary - death
        if (player.y > groundY + 100) {
            return { death: true };
        }
        
        return false;
    }
}

export const physics = new Physics();
