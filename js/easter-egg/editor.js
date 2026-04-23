export class Editor {
    constructor() {
        this.isEditMode = false;
        this.selectedObject = null;
        this.selectedBoss = null;
        this.newObjectType = 'platforms';
        this.currentBossTemplate = 'melee';
        this.catalog = {
            platforms: ['normal', 'mud', 'bouncy', 'fragile', 'moving', 'ghost_plat'],
            enemies: ['snail', 'bee', 'frog', 'mole'],
            decorations: ['treeDecor', 'flowerPatch', 'lantern', 'bench', 'vineWall'],
            items: ['hp', 'star', 'tool']
        };
        this.bossTemplates = {
            melee: {
                name: 'Melee Boss', speed: 3, hp: 150, attack_interval: 40,
                patterns: ['charge', 'slash', 'ground_pound'],
                phases: 1, phase_hp_threshold: 0
            },
            ranged: {
                name: 'Ranged Boss', speed: 2, hp: 120, attack_interval: 60,
                patterns: ['projectile_spray', 'homing_shot', 'bullet_hell'],
                phases: 1, phase_hp_threshold: 0
            },
            hybrid: {
                name: 'Hybrid Boss', speed: 2.5, hp: 180, attack_interval: 45,
                patterns: ['charge', 'projectile_spray', 'slash'],
                phases: 2, phase_hp_threshold: 0.5
            },
            phase: {
                name: 'Phase Boss', speed: 2, hp: 200, attack_interval: 50,
                patterns: ['charge', 'projectile_spray', 'laser', 'summon'],
                phases: 3, phase_hp_threshold: [0.66, 0.33]
            },
            aerial: {
                name: 'Aerial Boss', speed: 3.5, hp: 140, attack_interval: 55,
                patterns: ['dive', 'air_slash', 'wind_attack'],
                phases: 1, phase_hp_threshold: 0
            }
        };
        this.levelData = null;
        this.canvasClickHandler = this.handleCanvasClick.bind(this);
        this.initCanvasListener();
    }

    initCanvasListener() {
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            canvas.addEventListener('click', this.canvasClickHandler);
            canvas.addEventListener('dblclick', this.handleCanvasDoubleClick.bind(this));
        }
    }

    setEditMode(enabled, levelData) {
        this.isEditMode = enabled;
        this.levelData = levelData;
        
        if (enabled) {
            this.showStatus('✏️ Editor ON - Click to select, Double-click to add objects');
            // Afficher la section Boss
            const bossConfig = document.getElementById('boss-config');
            if (bossConfig) bossConfig.classList.remove('hidden');
        } else {
            this.selectedObject = null;
            this.selectedBoss = null;
            this.showStatus('Editor: OFF');
            const bossConfig = document.getElementById('boss-config');
            if (bossConfig) bossConfig.classList.add('hidden');
        }
    }

    setCategory(cat) {
        this.newObjectType = cat;
        const select = document.getElementById('editor-obj-type');
        if (select) {
            select.innerHTML = this.catalog[cat].map(type => `<option value="${type}">${type}</option>`).join('');
        }
    }

    handleCanvasClick(event) {
        if (!this.isEditMode || !this.levelData) return;
        if (event.button !== 0) return;
        
        const canvas = document.getElementById('gameCanvas');
        const rect = canvas.getBoundingClientRect();
        
        const x = (event.clientX - rect.left) * (canvas.width / rect.width);
        const y = (event.clientY - rect.top) * (canvas.height / rect.height);
        
        // Vérifier les boss en premier
        if (this.levelData.boss) {
            const b = this.levelData.boss;
            if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) {
                this.selectBoss(b);
                return;
            }
        }

        // Puis vérifier les objects normaux
        let found = false;
        const allObjects = [
            ...this.levelData.platforms,
            ...this.levelData.enemies,
            ...(this.levelData.decorations || []),
            ...(this.levelData.items || [])
        ];

        for (let obj of allObjects.reverse()) {
            const w = obj.w || 24;
            const h = obj.h || 24;
            
            if (x > obj.x && x < obj.x + w && y > obj.y && y < obj.y + h) {
                this.selectObject(obj);
                found = true;
                break;
            }
        }

        if (!found) {
            this.selectedObject = null;
            this.showStatus('💡 Double-click to add new object');
        }
    }

    handleCanvasDoubleClick(event) {
        if (!this.isEditMode || !this.levelData) return;
        event.preventDefault();
        
        const canvas = document.getElementById('gameCanvas');
        const rect = canvas.getBoundingClientRect();
        
        const x = (event.clientX - rect.left) * (canvas.width / rect.width);
        const y = (event.clientY - rect.top) * (canvas.height / rect.height);
        
        this.addObject(x, y);
    }

    selectObject(obj) {
        this.selectedObject = obj;
        this.selectedBoss = null;
        const panel = document.getElementById('inspector-panel');
        const fields = document.getElementById('inspector-fields');
        
        if (panel) {
            panel.classList.remove('hidden');
            fields.innerHTML = '';

            const editableProps = ['x', 'y', 'w', 'h', 'vx', 'vy', 'minX', 'maxX', 'type'];
            editableProps.forEach(prop => {
                if (obj[prop] !== undefined) {
                    const input = document.createElement('input');
                    input.type = prop === 'type' ? 'text' : 'number';
                    input.step = '0.1';
                    input.value = obj[prop];
                    input.className = 'w-20 bg-black border border-white/10 rounded px-2 py-1 text-xs';
                    input.onchange = () => {
                        obj[prop] = prop === 'type' ? input.value : parseFloat(input.value);
                        this.showStatus(`Updated ${prop} → ${input.value}`);
                    };

                    const wrapper = document.createElement('div');
                    wrapper.className = 'flex justify-between items-center text-xs';
                    wrapper.innerHTML = `<span class="text-stone-400">${prop}</span>`;
                    wrapper.appendChild(input);
                    fields.appendChild(wrapper);
                }
            });

            this.showStatus(`Selected: ${obj.type || 'object'} at (${obj.x.toFixed(0)}, ${obj.y.toFixed(0)})`);
        }
    }

    selectBoss(boss) {
        this.selectedBoss = boss;
        this.selectedObject = null;
        const panel = document.getElementById('inspector-panel');
        const fields = document.getElementById('inspector-fields');
        
        if (panel) {
            panel.classList.remove('hidden');
            fields.innerHTML = '';

            const bossProps = ['name', 'x', 'y', 'w', 'h', 'hp', 'maxHp', 'speed'];
            bossProps.forEach(prop => {
                if (boss[prop] !== undefined) {
                    const input = document.createElement('input');
                    input.type = prop === 'name' ? 'text' : 'number';
                    input.step = '0.1';
                    input.value = boss[prop];
                    input.className = 'w-20 bg-black border border-orange-400/30 rounded px-2 py-1 text-xs';
                    input.onchange = () => {
                        boss[prop] = prop === 'name' ? input.value : parseFloat(input.value);
                        this.showStatus(`Boss: ${prop} → ${input.value}`);
                    };

                    const wrapper = document.createElement('div');
                    wrapper.className = 'flex justify-between items-center text-xs';
                    wrapper.innerHTML = `<span class="text-amber-400">${prop}</span>`;
                    wrapper.appendChild(input);
                    fields.appendChild(wrapper);
                }
            });

            const delBtn = document.createElement('button');
            delBtn.onclick = () => this.deleteBoss();
            delBtn.textContent = '🗑️ Supprimer Boss';
            delBtn.className = 'w-full bg-red-900/40 hover:bg-red-800/60 border border-red-700/40 text-red-100 p-2 rounded mt-2 text-xs font-bold';
            fields.appendChild(delBtn);

            this.showStatus(`👹 Boss: ${boss.name} (HP: ${boss.hp}/${boss.maxHp})`);
        }
    }

    createNewBoss() {
        const template = this.bossTemplates['melee'];
        const newBoss = {
            name: 'New Boss',
            x: 1500,
            y: 200,
            w: 80,
            h: 80,
            hp: template.hp,
            maxHp: template.hp,
            speed: template.speed,
            attack_interval: template.attack_interval,
            pattern: template.patterns[0],
            phases: template.phases,
            state: 'idle',
            phase: 1
        };

        this.levelData.boss = newBoss;
        this.selectBoss(newBoss);
        this.showStatus('✨ Boss créé ! Configurez-le avec le template');
    }

    deleteBoss() {
        if (this.selectedBoss) {
            this.levelData.boss = null;
            this.selectedBoss = null;
            this.showStatus('🗑️ Boss supprimé');
        }
    }

    applyBossTemplate() {
        if (!this.levelData.boss) {
            this.showStatus('⚠️ Créez un boss d\'abord');
            return;
        }

        const templateSelect = document.getElementById('boss-template');
        const templateName = templateSelect?.value || 'melee';
        const template = this.bossTemplates[templateName];

        const boss = this.levelData.boss;
        boss.hp = parseInt(document.getElementById('boss-hp')?.value || template.hp);
        boss.maxHp = boss.hp;
        boss.speed = parseFloat(document.getElementById('boss-speed')?.value || template.speed);
        boss.attack_interval = parseInt(document.getElementById('boss-attack-interval')?.value || template.attack_interval);
        boss.pattern = template.patterns[0];
        boss.phases = template.phases;
        boss.name = template.name;

        this.showStatus(`✨ Template ${templateName} appliqué !`);
        this.selectBoss(boss);
    }

    deleteSelected() {
        if (this.selectedObject) {
            const arrays = [
                this.levelData.platforms,
                this.levelData.enemies,
                this.levelData.decorations || [],
                this.levelData.items || []
            ];

            for (let arr of arrays) {
                const idx = arr.indexOf(this.selectedObject);
                if (idx !== -1) {
                    arr.splice(idx, 1);
                    this.selectedObject = null;
                    this.showStatus('🗑️ Object deleted');
                    return;
                }
            }
        }
    }

    addObject(x, y) {
        const typeSelect = document.getElementById('editor-obj-type');
        const type = typeSelect?.value || 'normal';
        const newObj = { x: Math.round(x), y: Math.round(y), type };

        if (this.newObjectType === 'platforms') {
            newObj.w = 100;
            newObj.h = 20;
            if (type === 'moving') {
                newObj.vx = 2;
                newObj.minX = x;
                newObj.maxX = x + 200;
            }
            this.levelData.platforms.push(newObj);
        } else if (this.newObjectType === 'enemies') {
            newObj.w = 24;
            newObj.h = 24;
            newObj.vx = 2;
            newObj.minX = x - 100;
            newObj.maxX = x + 100;
            this.levelData.enemies.push(newObj);
        } else if (this.newObjectType === 'decorations') {
            newObj.w = 32;
            newObj.h = 32;
            if (!this.levelData.decorations) this.levelData.decorations = [];
            this.levelData.decorations.push(newObj);
        } else if (this.newObjectType === 'items') {
            newObj.w = 16;
            newObj.h = 16;
            if (!this.levelData.items) this.levelData.items = [];
            this.levelData.items.push(newObj);
        }

        this.selectObject(newObj);
        this.showStatus(`✨ Added ${this.newObjectType} (${type})`);
    }

    showStatus(msg) {
        const statusEl = document.getElementById('editor-status') || document.createElement('div');
        statusEl.id = 'editor-status';
        statusEl.textContent = msg;
        statusEl.className = 'fixed bottom-5 left-5 bg-botanic/30 border-2 border-botanic text-botanic px-4 py-2 rounded text-xs z-[80] font-bold';
        if (!document.getElementById('editor-status')) {
            document.body.appendChild(statusEl);
        }
        
        clearTimeout(this.statusTimeout);
        this.statusTimeout = setTimeout(() => {
            statusEl.style.transition = 'opacity 0.3s';
            statusEl.style.opacity = '0';
            setTimeout(() => statusEl.remove(), 300);
        }, 3000);
    }

    exportLevel() {
        const json = JSON.stringify(this.levelData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `level_export.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showStatus('💾 Level exported!');
    }
}

export const editor = new Editor();
