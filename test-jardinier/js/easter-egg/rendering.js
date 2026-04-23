// js/easter-egg/rendering.js
// Module de rendu avec optimisations

export class Renderer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.viewport = {
            x: 0,
            y: 0,
            width: canvas.width,
            height: canvas.height
        };
        this.lastCameraX = 0;
        this.particlePool = [];
        this.textPool = [];
    }
    
    updateCamera(cameraX, levelWidth) {
        this.viewport.x = Math.max(0, Math.min(cameraX - this.canvas.width / 2, levelWidth - this.canvas.width));
        this.lastCameraX = cameraX;
    }
    
    isInViewport(x, y, width, height, margin = 100) {
        return x + width + margin > this.viewport.x &&
               x - margin < this.viewport.x + this.viewport.width &&
               y + height + margin > this.viewport.y &&
               y - margin < this.viewport.y + this.viewport.height;
    }
    
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    applyScreenShake(shakeIntensity) {
        if (shakeIntensity > 0) {
            const shakeX = (Math.random() - 0.5) * shakeIntensity;
            const shakeY = (Math.random() - 0.5) * shakeIntensity;
            this.ctx.translate(shakeX, shakeY);
        }
    }
    
    drawBackground(time, ambience, levelWidth) {
        // Ciel dégradé
        let bg = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        
        switch (ambience) {
            case 'morning':
                bg.addColorStop(0, '#87CEEB');
                bg.addColorStop(1, '#98FB98');
                break;
            case 'midday':
                bg.addColorStop(0, '#00BFFF');
                bg.addColorStop(1, '#90EE90');
                break;
            case 'sunset':
                bg.addColorStop(0, '#FF7F50');
                bg.addColorStop(1, '#FFB347');
                break;
            case 'night':
                bg.addColorStop(0, '#191970');
                bg.addColorStop(1, '#483D8B');
                break;
            case 'bossGarden':
                bg.addColorStop(0, '#2d1b69');
                bg.addColorStop(1, '#0f0f23');
                break;
            default:
                bg.addColorStop(0, '#87CEEB');
                bg.addColorStop(1, '#98FB98');
        }
        
        this.ctx.fillStyle = bg;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Étoiles (nuit)
        if (ambience === 'night' || ambience === 'bossGarden') {
            this.drawStars();
        }
        
        // Nuages
        this.drawClouds(levelWidth, time);
    }
    
    drawStars() {
        // Dessiner les étoiles visibles dans le viewport
        this.ctx.fillStyle = 'white';
        for (let i = 0; i < 120; i++) {
            const x = (i * 137.5) % 5000;
            const y = (i * 89.3) % 450;
            const size = (i % 3) + 1;
            
            if (this.isInViewport(x, y, size, size, 0)) {
                this.ctx.globalAlpha = 0.3 + (Math.sin(Date.now() * 0.001 + i) * 0.2);
                this.ctx.fillRect(x - this.viewport.x, y, size, size);
            }
        }
        this.ctx.globalAlpha = 1;
    }
    
    drawClouds(levelWidth, time) {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        
        for (let i = 0; i < 15; i++) {
            const x = ((i * 213.7) + time * 0.01) % levelWidth;
            const y = (i * 47.3) % 200;
            const size = (i % 20) + 20;
            
            if (this.isInViewport(x, y, size * 3, size, 0)) {
                // Dessiner un nuage simple
                this.ctx.beginPath();
                this.ctx.arc(x - this.viewport.x, y, size, 0, Math.PI * 2);
                this.ctx.arc(x - this.viewport.x + size, y, size * 0.8, 0, Math.PI * 2);
                this.ctx.arc(x - this.viewport.x - size, y, size * 0.8, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }
    
    drawPlatform(platform) {
        if (!this.isInViewport(platform.x, platform.y, platform.w, platform.h)) return;
        
        const x = platform.x - this.viewport.x;
        
        switch (platform.type) {
            case 'normal': {
                // Dégradé de terre
                const soilGradient = this.ctx.createLinearGradient(x, platform.y, x, platform.y + platform.h);
                soilGradient.addColorStop(0, '#9b6b44');
                soilGradient.addColorStop(0.6, '#7a5230');
                soilGradient.addColorStop(1, '#5a3a1a');
                this.ctx.fillStyle = soilGradient;
                this.ctx.fillRect(x, platform.y, platform.w, platform.h);
                
                // Ombre
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                this.ctx.fillRect(x, platform.y + platform.h - 2, platform.w, 2);
                
                // Herbe avec dégradé
                const grassGradient = this.ctx.createLinearGradient(x, platform.y - 2, x, platform.y + 8);
                grassGradient.addColorStop(0, '#4ade80');
                grassGradient.addColorStop(1, '#22c55e');
                this.ctx.fillStyle = grassGradient;
                this.ctx.fillRect(x, platform.y, platform.w, 5);
                
                // Détails d'herbe
                this.ctx.fillStyle = '#16a34a';
                for (let i = 0; i < platform.w; i += 8) {
                    this.ctx.fillRect(x + i, platform.y, 4, 5);
                }
                break;
            }
                
            case 'ghost_plat':
                if (platform.active) {
                    this.ctx.fillStyle = 'rgba(165, 180, 252, 0.8)';
                    this.ctx.fillRect(x, platform.y, platform.w, platform.h);
                    // Effet de fantôme avec lueur
                    this.ctx.strokeStyle = 'rgba(129, 140, 248, 0.9)';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(x, platform.y, platform.w, platform.h);
                    // Pulsation
                    this.ctx.strokeStyle = `rgba(129, 140, 248, ${0.3 + Math.sin(Date.now() * 0.003) * 0.2})`;
                    this.ctx.lineWidth = 1;
                    this.ctx.strokeRect(x - 1, platform.y - 1, platform.w + 2, platform.h + 2);
                }
                break;
                
            case 'bouncy': {
                const bounceGradient = this.ctx.createLinearGradient(x, platform.y, x, platform.y + platform.h);
                bounceGradient.addColorStop(0, '#ec4899');
                bounceGradient.addColorStop(1, '#db2777');
                this.ctx.fillStyle = bounceGradient;
                this.ctx.fillRect(x, platform.y, platform.w, platform.h);
                // Ressorts brillants
                this.ctx.fillStyle = '#f472b6';
                for (let i = 0; i < platform.w; i += 12) {
                    this.ctx.beginPath();
                    this.ctx.arc(x + i + 6, platform.y + platform.h + 3, 4, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                break;
            }
                
            case 'mud': {
                const mudGradient = this.ctx.createLinearGradient(x, platform.y, x, platform.y + platform.h);
                mudGradient.addColorStop(0, '#92400e');
                mudGradient.addColorStop(1, '#65250b');
                this.ctx.fillStyle = mudGradient;
                this.ctx.fillRect(x, platform.y, platform.w, platform.h);
                // Texture de boue plus détaillée
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
                for (let i = 0; i < platform.w; i += 15) {
                    this.ctx.fillRect(x + i, platform.y + 5, 10, 3);
                    this.ctx.fillRect(x + i + 7, platform.y + platform.h - 8, 10, 3);
                }
                break;
            }
                
            case 'fragile': {
                if (platform.state === 'idle') {
                    const fragileGradient = this.ctx.createLinearGradient(x, platform.y, x, platform.y + platform.h);
                    fragileGradient.addColorStop(0, '#d97706');
                    fragileGradient.addColorStop(1, '#92400e');
                    this.ctx.fillStyle = fragileGradient;
                    this.ctx.fillRect(x, platform.y, platform.w, platform.h);
                    // Fissures visibles
                    this.ctx.strokeStyle = '#6b3805';
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(x + platform.w/3, platform.y);
                    this.ctx.quadraticCurveTo(x + platform.w/3 + 5, platform.y + platform.h/2, x + platform.w/3, platform.y + platform.h);
                    this.ctx.stroke();
                    this.ctx.beginPath();
                    this.ctx.moveTo(x + 2*platform.w/3, platform.y);
                    this.ctx.quadraticCurveTo(x + 2*platform.w/3 - 5, platform.y + platform.h/2, x + 2*platform.w/3 - 3, platform.y + platform.h);
                    this.ctx.stroke();
                } else if (platform.state === 'shaking') {
                    const shake = Math.sin(Date.now() * 0.1) * 2;
                    this.ctx.fillStyle = '#cd853f';
                    this.ctx.fillRect(x + shake, platform.y, platform.w, platform.h);
                }
                break;
            }
                
            case 'moving': {
                const movingGradient = this.ctx.createLinearGradient(x, platform.y, x, platform.y + platform.h);
                movingGradient.addColorStop(0, '#3b82f6');
                movingGradient.addColorStop(1, '#1d4ed8');
                this.ctx.fillStyle = movingGradient;
                this.ctx.fillRect(x, platform.y, platform.w, platform.h);
                // Flèches de mouvement pulsantes
                this.ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + Math.sin(Date.now() * 0.003) * 0.3})`;
                this.ctx.beginPath();
                this.ctx.moveTo(x + platform.w/2 - 8, platform.y + platform.h/2);
                this.ctx.lineTo(x + platform.w/2 - 2, platform.y + platform.h/2 - 4);
                this.ctx.lineTo(x + platform.w/2 - 2, platform.y + platform.h/2 + 4);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.moveTo(x + platform.w/2 + 8, platform.y + platform.h/2);
                this.ctx.lineTo(x + platform.w/2 + 2, platform.y + platform.h/2 - 4);
                this.ctx.lineTo(x + platform.w/2 + 2, platform.y + platform.h/2 + 4);
                this.ctx.closePath();
                this.ctx.fill();
                break;
            }
        }
    }
    
    drawWater(water) {
        if (!this.isInViewport(water.x, water.y, water.w, water.h)) return;
        
        const x = water.x - this.viewport.x;
        
        // Eau avec vagues
        this.ctx.fillStyle = 'rgba(64, 164, 223, 0.8)';
        this.ctx.fillRect(x, water.y, water.w, water.h);
        
        // Vagues
        this.ctx.strokeStyle = 'rgba(100, 200, 255, 0.6)';
        this.ctx.lineWidth = 2;
        for (let i = 0; i < water.h; i += 10) {
            this.ctx.beginPath();
            for (let j = 0; j < water.w; j += 5) {
                const waveY = water.y + i + Math.sin((Date.now() * 0.002 + j * 0.1)) * 2;
                if (j === 0) {
                    this.ctx.moveTo(x + j, waveY);
                } else {
                    this.ctx.lineTo(x + j, waveY);
                }
            }
            this.ctx.stroke();
        }
    }
    
    drawWindZone(windZone) {
        if (!this.isInViewport(windZone.x, windZone.y, windZone.w, windZone.h)) return;
        
        const x = windZone.x - this.viewport.x;
        
        // Particules de vent
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        
        for (let i = 0; i < 20; i++) {
            const particleY = windZone.y + (i * windZone.h / 20);
            const particleX = x + ((Date.now() * 0.1 + i * 50) % windZone.w);
            
            this.ctx.beginPath();
            this.ctx.moveTo(particleX, particleY);
            this.ctx.lineTo(particleX + 20, particleY);
            this.ctx.stroke();
        }
    }
    
    drawPlayer(player) {
        if (!this.isInViewport(player.x, player.y, player.width, player.height)) return;
        
        const x = player.x - this.viewport.x;
        
        this.ctx.save();
        
        // Effet squash and stretch
        this.ctx.translate(x + player.width/2, player.y + player.height/2);
        this.ctx.scale(player.squash, player.stretch);
        this.ctx.translate(-(x + player.width/2), -(player.y + player.height/2));
        
        // Invincibilité clignotante
        if (player.invincibleTimer > 0 && player.invincibleTimer % 10 < 5) {
            this.ctx.globalAlpha = 0.5;
        }
        
        // Corps du joueur avec dégradé
        const bodyGradient = this.ctx.createLinearGradient(x, player.y, x, player.y + player.height);
        bodyGradient.addColorStop(0, '#5eef8f');
        bodyGradient.addColorStop(1, '#22c55e');
        this.ctx.fillStyle = bodyGradient;
        this.ctx.fillRect(x, player.y, player.width, player.height);
        
        // Ombre du corps
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(x + 1, player.y + player.height - 3, player.width - 2, 2);
        
        // Visage/Tête avec détails
        this.ctx.fillStyle = '#fbbf24';
        this.ctx.beginPath();
        this.ctx.arc(x + player.width/2, player.y + 8, 7, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Yeux brillants
        this.ctx.fillStyle = '#fff';
        if (player.facingRight) {
            this.ctx.beginPath();
            this.ctx.arc(x + 13, player.y + 6, 2.5, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = '#000';
            this.ctx.beginPath();
            this.ctx.arc(x + 14, player.y + 6, 1.5, 0, Math.PI * 2);
            this.ctx.fill();
        } else {
            this.ctx.beginPath();
            this.ctx.arc(x + 11, player.y + 6, 2.5, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = '#000';
            this.ctx.beginPath();
            this.ctx.arc(x + 10, player.y + 6, 1.5, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Sourire
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(x + player.width/2, player.y + 9, 2, 0, Math.PI);
        this.ctx.stroke();
        
        // Corps inférieur avec détails
        const legGradient = this.ctx.createLinearGradient(x, player.y + 15, x, player.y + player.height);
        legGradient.addColorStop(0, '#4ade80');
        legGradient.addColorStop(1, '#16a34a');
        this.ctx.fillStyle = legGradient;
        this.ctx.fillRect(x + 4, player.y + 15, player.width - 8, player.height - 15);
        
        // Dash effect - aura bleue
        if (player.isDashing) {
            this.ctx.strokeStyle = 'rgba(96, 165, 250, 0.6)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(x + player.width/2, player.y + player.height/2, Math.max(player.width, player.height)/2 + 3, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    drawEnemy(enemy) {
        if (!this.isInViewport(enemy.x, enemy.y, enemy.w, enemy.h)) return;
        
        const x = enemy.x - this.viewport.x;
        
        if (enemy.dead) {
            // Animation de mort - explosion de couleurs
            this.ctx.globalAlpha = Math.max(0, 1 - enemy.deathTimer / 60);
            const scale = 1 + enemy.deathTimer * 0.02;
            this.ctx.save();
            this.ctx.translate(x + enemy.w/2, enemy.y + enemy.h/2);
            this.ctx.scale(scale, scale);
            
            this.ctx.fillStyle = '#ef4444';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, enemy.w/2, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Éclats
            this.ctx.fillStyle = '#fca5a5';
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                this.ctx.beginPath();
                this.ctx.arc(Math.cos(angle) * enemy.w, Math.sin(angle) * enemy.w, enemy.w * 0.3, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            this.ctx.restore();
            this.ctx.globalAlpha = 1;
            return;
        }
        
        switch (enemy.type) {
            case 'snail': {
                // Corps de l'escargot
                const snailGradient = this.ctx.createLinearGradient(x, enemy.y + enemy.h/2, x, enemy.y + enemy.h);
                snailGradient.addColorStop(0, '#9b6b44');
                snailGradient.addColorStop(1, '#6b4423');
                this.ctx.fillStyle = snailGradient;
                this.ctx.fillRect(x, enemy.y + enemy.h/2, enemy.w, enemy.h/2);
                
                // Coquille spirale
                const shellGradient = this.ctx.createLinearGradient(x + enemy.w/2 - enemy.w/2.5, enemy.y + enemy.h/2, x + enemy.w/2 + enemy.w/2.5, enemy.y);
                shellGradient.addColorStop(0, '#d4a574');
                shellGradient.addColorStop(0.5, '#e8c4a0');
                shellGradient.addColorStop(1, '#c9956f');
                this.ctx.fillStyle = shellGradient;
                this.ctx.beginPath();
                this.ctx.arc(x + enemy.w/2, enemy.y + enemy.h/2.5, enemy.w/2.5, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Détail de coquille
                this.ctx.strokeStyle = '#a0785f';
                this.ctx.lineWidth = 1;
                for (let i = 0; i < 4; i++) {
                    this.ctx.beginPath();
                    this.ctx.arc(x + enemy.w/2, enemy.y + enemy.h/2.5, (enemy.w/2.5) * (1 - i * 0.2), 0, Math.PI * 2);
                    this.ctx.stroke();
                }
                break;
            }
                
            case 'frog': {
                // Corps de la grenouille
                const frogGradient = this.ctx.createLinearGradient(x, enemy.y + enemy.h/3, x, enemy.y + enemy.h);
                frogGradient.addColorStop(0, '#4ade80');
                frogGradient.addColorStop(1, '#22c55e');
                this.ctx.fillStyle = frogGradient;
                this.ctx.fillRect(x + 2, enemy.y + enemy.h/3, enemy.w - 4, enemy.h * 2/3);
                
                // Tête
                this.ctx.fillStyle = '#4ade80';
                this.ctx.beginPath();
                this.ctx.ellipse(x + enemy.w/2, enemy.y + enemy.h/4, enemy.w/2.5, enemy.h/4, 0, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Yeux rouges
                this.ctx.fillStyle = '#ef4444';
                this.ctx.beginPath();
                this.ctx.arc(x + enemy.w/2 - 4, enemy.y + 3, 3, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(x + enemy.w/2 + 4, enemy.y + 3, 3, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Yeux brillants
                this.ctx.fillStyle = '#fff';
                this.ctx.beginPath();
                this.ctx.arc(x + enemy.w/2 - 3, enemy.y + 2, 1.5, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(x + enemy.w/2 + 5, enemy.y + 2, 1.5, 0, Math.PI * 2);
                this.ctx.fill();
                break;
            }
                
            case 'mole': {
                if (enemy.timer > 60 && enemy.timer < 180) {
                    // Corps de la taupe
                    const moleGradient = this.ctx.createLinearGradient(x, enemy.y, x, enemy.y + enemy.h);
                    moleGradient.addColorStop(0, '#92400e');
                    moleGradient.addColorStop(1, '#6b3805');
                    this.ctx.fillStyle = moleGradient;
                    this.ctx.beginPath();
                    this.ctx.ellipse(x + enemy.w/2, enemy.y + enemy.h/2, enemy.w/2, enemy.h/2.5, 0, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // Yeux noirs
                    this.ctx.fillStyle = '#000';
                    this.ctx.beginPath();
                    this.ctx.arc(x + enemy.w/2 - 4, enemy.y + enemy.h/3, 2.5, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.beginPath();
                    this.ctx.arc(x + enemy.w/2 + 4, enemy.y + enemy.h/3, 2.5, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // Nez rose
                    this.ctx.fillStyle = '#fb7185';
                    this.ctx.beginPath();
                    this.ctx.arc(x + enemy.w/2, enemy.y + enemy.h/2, 2, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                break;
            }
                
            case 'bee': {
                // Corps de l'abeille
                const beeGradient = this.ctx.createLinearGradient(x, enemy.y, x, enemy.y + enemy.h);
                beeGradient.addColorStop(0, '#fbbf24');
                beeGradient.addColorStop(0.5, '#fcd34d');
                beeGradient.addColorStop(1, '#fbbf24');
                this.ctx.fillStyle = beeGradient;
                this.ctx.beginPath();
                this.ctx.ellipse(x + enemy.w/2, enemy.y + enemy.h/2, enemy.w/2.5, enemy.h/2, 0, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Rayures noires
                this.ctx.fillStyle = '#000';
                for (let i = 0; i < enemy.h; i += 4) {
                    this.ctx.fillRect(x, enemy.y + i, enemy.w, 2);
                }
                
                // Ailes
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                this.ctx.beginPath();
                this.ctx.ellipse(x + 2, enemy.y + enemy.h/3, 3, 6, -0.3, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.ellipse(x + enemy.w - 2, enemy.y + enemy.h/3, 3, 6, 0.3, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Yeux
                this.ctx.fillStyle = '#000';
                this.ctx.beginPath();
                this.ctx.arc(x + 4, enemy.y + 2, 1, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(x + enemy.w - 4, enemy.y + 2, 1, 0, Math.PI * 2);
                this.ctx.fill();
                break;
            }
        }
    }
    
    drawBoss(boss) {
        if (!this.isInViewport(boss.x, boss.y, boss.w, boss.h)) return;
        
        const x = boss.x - this.viewport.x;
        
        if (boss.dead) {
            this.ctx.globalAlpha = Math.max(0, 1 - boss.deathTimer / 120);
        }
        
        switch (boss.type) {
            case 'scarecrow': {
                // Corps
                const scarecrowGradient = this.ctx.createLinearGradient(x, boss.y, x, boss.y + boss.h);
                scarecrowGradient.addColorStop(0, '#d97706');
                scarecrowGradient.addColorStop(1, '#9a3412');
                this.ctx.fillStyle = scarecrowGradient;
                this.ctx.fillRect(x, boss.y + 30, boss.w, boss.h - 30);
                
                // Bras
                this.ctx.strokeStyle = '#8B4513';
                this.ctx.lineWidth = 4;
                this.ctx.beginPath();
                this.ctx.moveTo(x + 5, boss.y + 40);
                this.ctx.lineTo(x - 15, boss.y + 35);
                this.ctx.stroke();
                this.ctx.beginPath();
                this.ctx.moveTo(x + boss.w - 5, boss.y + 40);
                this.ctx.lineTo(x + boss.w + 15, boss.y + 35);
                this.ctx.stroke();
                
                // Tête
                const headGradient = this.ctx.createLinearGradient(x + boss.w/2 - 20, boss.y, x + boss.w/2 + 20, boss.y + 40);
                headGradient.addColorStop(0, '#f4a460');
                headGradient.addColorStop(1, '#d4873f');
                this.ctx.fillStyle = headGradient;
                this.ctx.beginPath();
                this.ctx.arc(x + boss.w/2, boss.y + 20, 20, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Yeux rouges maléfiques
                this.ctx.fillStyle = '#ff0000';
                this.ctx.beginPath();
                this.ctx.arc(x + boss.w/2 - 10, boss.y + 15, 5, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(x + boss.w/2 + 10, boss.y + 15, 5, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Pupilles menaçantes
                this.ctx.fillStyle = '#000';
                this.ctx.beginPath();
                this.ctx.arc(x + boss.w/2 - 10, boss.y + 15, 2.5, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(x + boss.w/2 + 10, boss.y + 15, 2.5, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Bouche menaçante
                this.ctx.strokeStyle = '#8B0000';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(x + boss.w/2, boss.y + 25, 8, 0, Math.PI);
                this.ctx.stroke();
                break;
            }
                
            case 'toad': {
                // Corps principal
                const toadGradient = this.ctx.createLinearGradient(x, boss.y + boss.h/3, x, boss.y + boss.h);
                toadGradient.addColorStop(0, '#4ade80');
                toadGradient.addColorStop(1, '#16a34a');
                this.ctx.fillStyle = toadGradient;
                this.ctx.fillRect(x + 5, boss.y + boss.h/3, boss.w - 10, boss.h * 2/3);
                
                // Tête
                this.ctx.fillStyle = '#4ade80';
                this.ctx.beginPath();
                this.ctx.ellipse(x + boss.w/2, boss.y + boss.h/4, boss.w/2.2, boss.h/3, 0, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Yeux rouges énormes
                this.ctx.fillStyle = '#ef4444';
                this.ctx.beginPath();
                this.ctx.ellipse(x + boss.w/2 - 12, boss.y + boss.h/4 - 5, 8, 10, 0, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.ellipse(x + boss.w/2 + 12, boss.y + boss.h/4 - 5, 8, 10, 0, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Pupilles
                this.ctx.fillStyle = '#000';
                this.ctx.beginPath();
                this.ctx.arc(x + boss.w/2 - 12, boss.y + boss.h/4, 3, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(x + boss.w/2 + 12, boss.y + boss.h/4, 3, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Bouche
                this.ctx.fillStyle = '#0f0f0f';
                this.ctx.beginPath();
                this.ctx.arc(x + boss.w/2, boss.y + boss.h/2, 5, 0, Math.PI);
                this.ctx.fill();
                
                // Protubérances verruqueuses
                this.ctx.fillStyle = '#22c55e';
                for (let i = 0; i < 5; i++) {
                    this.ctx.beginPath();
                    this.ctx.arc(x + 10 + i * 15, boss.y + boss.h - 5, 4, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                break;
            }
                
            case 'bramble': {
                // Corps épineux
                const brambleGradient = this.ctx.createLinearGradient(x, boss.y, x, boss.y + boss.h);
                brambleGradient.addColorStop(0, '#991b1b');
                brambleGradient.addColorStop(0.5, '#7f1d1d');
                brambleGradient.addColorStop(1, '#450a0a');
                this.ctx.fillStyle = brambleGradient;
                this.ctx.fillRect(x + 10, boss.y, boss.w - 20, boss.h);
                
                // Épines massives
                this.ctx.fillStyle = '#ff0000';
                this.ctx.strokeStyle = '#dc2626';
                this.ctx.lineWidth = 2;
                for (let i = 0; i < boss.h; i += 15) {
                    // Épine gauche
                    this.ctx.beginPath();
                    this.ctx.moveTo(x + 10, boss.y + i);
                    this.ctx.lineTo(x - 20, boss.y + i);
                    this.ctx.stroke();
                    
                    // Épine droite
                    this.ctx.beginPath();
                    this.ctx.moveTo(x + boss.w - 10, boss.y + i);
                    this.ctx.lineTo(x + boss.w + 20, boss.y + i);
                    this.ctx.stroke();
                }
                
                // Détails de texture
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                for (let i = 0; i < boss.w - 20; i += 20) {
                    this.ctx.fillRect(x + 10 + i, boss.y + 5, 10, boss.h - 10);
                }
                
                // Aura menaçante
                this.ctx.strokeStyle = `rgba(255, 0, 0, ${0.4 + Math.sin(Date.now() * 0.002) * 0.2})`;
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(x, boss.y, boss.w, boss.h);
                break;
            }
        }
        
        this.ctx.globalAlpha = 1;
    }
    
    drawBuzzsaw(buzzsaw) {
        if (!this.isInViewport(buzzsaw.x - buzzsaw.size, buzzsaw.y - buzzsaw.size, buzzsaw.size * 2, buzzsaw.size * 2)) return;
        
        const x = buzzsaw.x - this.viewport.x;
        
        this.ctx.save();
        this.ctx.translate(x, buzzsaw.y);
        this.ctx.rotate(buzzsaw.angle);
        
        this.ctx.fillStyle = '#696969';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, buzzsaw.size, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Dents
        this.ctx.strokeStyle = '#FF0000';
        this.ctx.lineWidth = 3;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            this.ctx.beginPath();
            this.ctx.moveTo(Math.cos(angle) * buzzsaw.size * 0.8, Math.sin(angle) * buzzsaw.size * 0.8);
            this.ctx.lineTo(Math.cos(angle) * buzzsaw.size, Math.sin(angle) * buzzsaw.size);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    drawItem(item) {
        if (item.collected || !this.isInViewport(item.x, item.y, item.w, item.h)) return;
        
        const x = item.x - this.viewport.x;
        
        switch (item.type) {
            case 'hp':
                this.ctx.fillStyle = '#FF0000';
                this.ctx.fillRect(x + 5, item.y + 2, 10, 16);
                this.ctx.fillRect(x + 2, item.y + 5, 16, 10);
                break;
            case 'star':
                this.ctx.fillStyle = '#FFD700';
                this.ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
                    const innerAngle = ((i + 0.5) / 5) * Math.PI * 2 - Math.PI / 2;
                    if (i === 0) {
                        this.ctx.moveTo(x + item.w/2 + Math.cos(angle) * 10, item.y + item.h/2 + Math.sin(angle) * 10);
                    } else {
                        this.ctx.lineTo(x + item.w/2 + Math.cos(angle) * 10, item.y + item.h/2 + Math.sin(angle) * 10);
                    }
                    this.ctx.lineTo(x + item.w/2 + Math.cos(innerAngle) * 5, item.y + item.h/2 + Math.sin(innerAngle) * 5);
                }
                this.ctx.closePath();
                this.ctx.fill();
                break;
        }
    }
    
    drawTask(task) {
        if (task.done || !this.isInViewport(task.x, task.y, task.w, task.h)) return;
        
        const x = task.x - this.viewport.x;
        
        switch (task.type) {
            case 'grass':
                this.ctx.fillStyle = '#90EE90';
                this.ctx.fillRect(x, task.y, task.w, task.h);
                break;
            case 'hedge':
                this.ctx.fillStyle = '#228B22';
                this.ctx.fillRect(x, task.y, task.w, task.h);
                break;
            case 'branch':
                this.ctx.fillStyle = '#8B4513';
                this.ctx.fillRect(x, task.y, task.w, task.h);
                this.ctx.fillStyle = '#D2691E';
                this.ctx.fillRect(task.trunkX - this.viewport.x, task.trunkY, 10, task.h);
                break;
        }
    }
    
    drawGoal(goal) {
        if (!this.isInViewport(goal.x, goal.y, goal.w, goal.h)) return;
        
        const x = goal.x - this.viewport.x;
        
        // Drapeau
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(x + goal.w/2 - 2, goal.y, 4, goal.h);
        
        this.ctx.fillStyle = '#FF0000';
        this.ctx.beginPath();
        this.ctx.moveTo(x + goal.w/2 + 2, goal.y);
        this.ctx.lineTo(x + goal.w/2 + 30, goal.y + 15);
        this.ctx.lineTo(x + goal.w/2 + 2, goal.y + 30);
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    drawParticles(particles) {
        particles.forEach(particle => {
            if (!this.isInViewport(particle.x, particle.y, particle.size || 4, particle.size || 4)) return;
            
            const x = particle.x - this.viewport.x;
            
            this.ctx.fillStyle = particle.color || '#FFF';
            this.ctx.globalAlpha = particle.alpha || 1;
            this.ctx.fillRect(x, particle.y, particle.size || 4, particle.size || 4);
        });
        this.ctx.globalAlpha = 1;
    }
    
    drawFloatingTexts(texts) {
        texts.forEach(text => {
            if (!this.isInViewport(text.x, text.y - text.yOffset, 100, 20)) return;
            
            const x = text.x - this.viewport.x;
            
            this.ctx.fillStyle = text.color || '#FFF';
            this.ctx.font = text.font || 'bold 16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.globalAlpha = text.alpha || 1;
            this.ctx.fillText(text.text, x, text.y - text.yOffset);
        });
        this.ctx.globalAlpha = 1;
        this.ctx.textAlign = 'left';
    }
}

export default Renderer;
