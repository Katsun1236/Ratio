// js/easter-egg/player.js
// Module de gestion du joueur

export class Player {
    constructor() {
        this.x = 50;
        this.y = 200;
        this.width = 24;
        this.height = 32;
        this.vx = 0;
        this.vy = 0;
        this.speed = 6;
        this.jumpPower = -12.5;
        this.grounded = false;
        this.facingRight = true;
        this.squash = 1;
        this.stretch = 1;
        this.hp = 5;
        this.maxHp = 5;
        this.invincibleTimer = 0;
        this.jumps = 0;
        this.spawnX = 50;
        this.spawnY = 200;
        this.hasWallJump = false;
        this.hasDash = false;
        this.canDash = true;
        this.isDashing = false;
        this.dashTimer = 0;
        this.dashDir = 1;
        this.wallJumpTimer = 0;
    }
    
    reset() {
        this.x = this.spawnX;
        this.y = this.spawnY;
        this.vx = 0;
        this.vy = 0;
        this.hp = this.maxHp;
        this.invincibleTimer = 0;
        this.jumps = 0;
        this.canDash = true;
        this.isDashing = false;
        this.dashTimer = 0;
        this.wallJumpTimer = 0;
    }
    
    setSpawn(x, y) {
        this.spawnX = x;
        this.spawnY = y;
    }
    
    takeDamage(amount) {
        if (this.invincibleTimer > 0) return false;
        
        this.hp -= amount;
        this.invincibleTimer = 120; // 2 secondes d'invincibilité
        
        if (this.hp <= 0) {
            this.hp = 0;
            return true; // Mort
        }
        return false;
    }
    
    heal(amount) {
        this.hp = Math.min(this.hp + amount, this.maxHp);
    }
    
    canJump() {
        return this.jumps < (this.grounded ? 1 : 2);
    }
    
    jump() {
        if (!this.canJump()) return false;
        
        this.vy = this.jumpPower;
        this.jumps++;
        this.grounded = false;
        this.squash = 0.8;
        this.stretch = 1.2;
        
        return true;
    }
    
    dash(direction) {
        if (!this.hasDash || !this.canDash || this.dashTimer > 0) return false;
        
        this.isDashing = true;
        this.dashTimer = 15;
        this.dashDir = direction;
        this.canDash = false;
        this.vx = direction * 12;
        this.vy = 0;
        
        return true;
    }
    
    wallJump(direction) {
        if (!this.hasWallJump || this.wallJumpTimer > 0) return false;
        
        this.vy = this.jumpPower * 0.9;
        this.vx = direction * 8;
        this.wallJumpTimer = 20;
        this.facingRight = direction > 0;
        this.grounded = false;
        
        return true;
    }
    
    update(keys, levelData) {
        // Update timers
        if (this.invincibleTimer > 0) this.invincibleTimer--;
        if (this.dashTimer > 0) {
            this.dashTimer--;
            if (this.dashTimer === 0) {
                this.isDashing = false;
                this.vx *= 0.3;
            }
        }
        if (this.wallJumpTimer > 0) this.wallJumpTimer--;
        
        // Dash recovery
        if (!this.canDash && !this.isDashing && this.grounded) {
            this.canDash = true;
        }
        
        // Squash and stretch recovery
        if (this.squash !== 1) this.squash += (1 - this.squash) * 0.2;
        if (this.stretch !== 1) this.stretch += (1 - this.stretch) * 0.2;
        
        // Handle input
        if (!this.isDashing && this.wallJumpTimer === 0) {
            if (keys.left) {
                this.vx = Math.max(this.vx - 0.8, -this.speed);
                this.facingRight = false;
            } else if (keys.right) {
                this.vx = Math.min(this.vx + 0.8, this.speed);
                this.facingRight = true;
            } else {
                this.vx *= 0.85;
            }
        }
        
        // Handle jump
        if (keys.jumpJustPressed) {
            this.jump();
        }
        
        // Handle dash
        if (keys.dashJustPressed) {
            const dashDir = this.facingRight ? 1 : -1;
            this.dash(dashDir);
        }
        
        // Apply gravity
        if (!this.isDashing) {
            this.vy += 0.55;
        }
        
        // Update position
        this.x += this.vx;
        this.y += this.vy;
        
        // Speed limits
        if (!this.isDashing && this.wallJumpTimer === 0) {
            if (this.vx > this.speed) this.vx = this.speed;
            if (this.vx < -this.speed) this.vx = -this.speed;
        }
        
        // Terminal velocity
        if (this.vy > 15) this.vy = 15;
    }
}

export const player = new Player();
