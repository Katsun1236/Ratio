// js/easter-egg/enemies.js
// Module de gestion des ennemis et entités

export class Enemy {
    constructor(x, y, width, height, type, config = {}) {
        this.x = x;
        this.y = y;
        this.w = width;
        this.h = height;
        this.type = type;
        this.dead = false;
        this.deathTimer = 0;
        
        // Configuration spécifique au type
        Object.assign(this, config);
    }
    
    update(player, levelData) {
        if (this.dead) {
            this.deathTimer++;
            return;
        }
        
        switch (this.type) {
            case 'snail':
                this.updateSnail(player);
                break;
            case 'frog':
                this.updateFrog(player);
                break;
            case 'mole':
                this.updateMole(player);
                break;
            case 'bee':
                this.updateBee(player);
                break;
            default:
                this.updateDefault(player);
        }
    }
    
    updateSnail(player) {
        this.x += this.vx;
        
        if (this.x <= this.minX || this.x + this.w >= this.maxX) {
            this.vx = -this.vx;
        }
    }
    
    updateFrog(player) {
        this.x += this.vx;
        
        if (this.x <= this.minX || this.x + this.w >= this.maxX) {
            this.vx = -this.vx;
        }
        
        // Saut occasionnel
        if (Math.random() < 0.01) {
            this.vy = -8;
        }
        
        this.vy += 0.5;
        this.y += this.vy;
        
        // Atterrir sur le sol
        if (this.y >= this.baseY) {
            this.y = this.baseY;
            this.vy = 0;
        }
    }
    
    updateMole(player) {
        this.timer++;
        
        // Sortir du sol
        if (this.timer === 60) {
            this.vy = -5;
        }
        
        // Monter
        if (this.vy < 0) {
            this.y += this.vy;
            this.vy += 0.3;
        }
        
        // Attendre à la surface
        if (this.y <= this.baseY - 20 && this.timer < 180) {
            this.y = this.baseY - 20;
        }
        
        // Retourner dans le sol
        if (this.timer >= 180) {
            this.y += 2;
            if (this.y >= this.baseY) {
                this.y = this.baseY;
                this.timer = 0;
                this.vx = 0;
            }
        }
    }
    
    updateBee(player) {
        this.x += this.vx;
        
        if (this.x <= this.minX || this.x + this.w >= this.maxX) {
            this.vx = -this.vx;
        }
        
        // Mouvement vertical sinusoïdal
        this.y = this.baseY + Math.sin(Date.now() * 0.003) * 30;
    }
    
    updateDefault(player) {
        this.x += this.vx;
        this.y += this.vy || 0;
    }
    
    takeDamage() {
        if (this.dead) return false;
        
        this.dead = true;
        this.deathTimer = 0;
        return true;
    }
}

export class Boss extends Enemy {
    constructor(x, y, width, height, type, config = {}) {
        super(x, y, width, height, type, config);
        this.state = 'idle';
        this.timer = 0;
        this.hasDoneIntro = false;
        this.isActive = false;
        
        // Boss spécifique
        if (type === 'scarecrow') {
            this.phase = 1;
        } else if (type === 'toad') {
            this.jumpCooldown = 0;
        } else if (type === 'bramble') {
            this.phase = 1;
            this.shield = false;
            this.invincible = false;
        }
    }
    
    update(player, levelData) {
        if (this.dead) {
            this.deathTimer++;
            return;
        }
        
        this.timer++;
        
        switch (this.type) {
            case 'scarecrow':
                this.updateScarecrow(player);
                break;
            case 'toad':
                this.updateToad(player);
                break;
            case 'bramble':
                this.updateBramble(player);
                break;
        }
    }
    
    updateScarecrow(player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (!this.isActive && distance < 200) {
            this.isActive = true;
            this.state = 'intro';
            this.timer = 0;
        }
        
        if (this.state === 'intro') {
            if (this.timer > 120) {
                this.state = 'attacking';
                this.timer = 0;
            }
        } else if (this.state === 'attacking') {
            // Mouvement vers le joueur
            if (distance > 100) {
                this.x += Math.sign(dx) * 2;
            }
            
            // Attaque toutes les 60 frames
            if (this.timer % 60 === 0) {
                this.state = 'attacking';
                // Créer un projectile ou faire une attaque
            }
        }
    }
    
    updateToad(player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (!this.isActive && distance < 250) {
            this.isActive = true;
            this.state = 'intro';
            this.timer = 0;
        }
        
        if (this.state === 'intro') {
            if (this.timer > 90) {
                this.state = 'jumping';
                this.timer = 0;
            }
        } else if (this.state === 'jumping') {
            if (this.jumpCooldown <= 0) {
                // Saut vers le joueur
                this.vy = -12;
                this.vx = Math.sign(dx) * 5;
                this.jumpCooldown = 120;
            }
            
            this.jumpCooldown--;
            
            // Appliquer la physique
            this.vy += 0.6;
            this.x += this.vx;
            this.y += this.vy;
            
            // Atterrir
            if (this.y >= this.y) {
                this.y = this.baseY || this.y;
                this.vy = 0;
                this.vx *= 0.5;
            }
        }
    }
    
    updateBramble(player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (this.state === 'intro') {
            if (this.timer > 180) {
                this.state = 'phase1';
                this.timer = 0;
            }
        } else if (this.state === 'phase1') {
            // Phase 1: tirs de projectiles
            if (this.timer % 80 === 0) {
                // Créer des projectiles
            }
            
            if (this.hp <= this.maxHp * 0.6) {
                this.state = 'phase2';
                this.phase = 2;
                this.timer = 0;
            }
        } else if (this.state === 'phase2') {
            // Phase 2: attaques plus agressives
            if (this.timer % 60 === 0) {
                // Attaques rapides
            }
            
            if (this.hp <= this.maxHp * 0.3) {
                this.state = 'phase3';
                this.phase = 3;
                this.timer = 0;
            }
        } else if (this.state === 'phase3') {
            // Phase 3: mode berserk
            if (this.timer % 40 === 0) {
                // Attaques constantes
            }
        }
    }
    
    takeDamage(amount) {
        if (this.dead || this.invincible) return false;
        
        this.hp -= amount;
        
        if (this.hp <= 0) {
            this.dead = true;
            this.deathTimer = 0;
            return true;
        }
        
        return false;
    }
}

export class Buzzsaw {
    constructor(x, y, size, minX, maxX, vx) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.minX = minX;
        this.maxX = maxX;
        this.vx = vx;
        this.angle = 0;
    }
    
    update() {
        this.x += this.vx;
        this.angle += 0.3;
        
        if (this.x <= this.minX || this.x >= this.maxX) {
            this.vx = -this.vx;
        }
    }
    
    checkCollision(player) {
        const dx = (player.x + player.width/2) - this.x;
        const dy = (player.y + player.height/2) - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < (this.size + Math.min(player.width, player.height) / 2);
    }
}

export class Item {
    constructor(x, y, width, height, type) {
        this.x = x;
        this.y = y;
        this.w = width;
        this.h = height;
        this.type = type;
        this.collected = false;
        this.baseY = y;
        this.floatOffset = Math.random() * Math.PI * 2;
    }
    
    update() {
        if (this.collected) return;
        
        // Flottement
        this.y = this.baseY + Math.sin(Date.now() * 0.003 + this.floatOffset) * 5;
    }
    
    collect() {
        if (this.collected) return false;
        
        this.collected = true;
        return true;
    }
}
