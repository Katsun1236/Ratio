// js/easter-egg/main.js
// Injecte l'interface (correction de la Boss Bar z-index 50) et lie les modules.

import { initInputs } from './input.js';
import { initEngine, startGameUI, isGameActive } from './engine.js';
import { editor } from './editor.js';

const gameHTML = `
<div id="easter-egg-game-container" class="fixed inset-0 z-[100] hidden flex-col items-center justify-center p-2 md:p-5 font-sans bg-[radial-gradient(circle_at_top,_#1f2937_0%,_#020617_65%)]">
    <button id="close-game-btn" class="absolute top-4 right-4 md:top-6 md:right-6 text-white/90 text-3xl focus:outline-none hover:text-botanic transition-colors z-[101] bg-white/10 hover:bg-white/20 border border-white/20 rounded-full w-11 h-11 md:w-12 md:h-12" aria-label="Fermer le jeu"><i class="fa-solid fa-times"></i></button>
    <div class="text-center mb-3 md:mb-5 px-4 py-3 rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md">
        <h2 class="font-serif text-3xl md:text-6xl text-white mb-1 md:mb-2 tracking-wide" style="text-shadow: 0 0 20px rgba(110,231,183,0.45);"><span class="text-botanic-light">Super</span> Jardinier !</h2>
        <p class="text-stone-300 text-[11px] md:text-sm tracking-[0.2em] uppercase">World Map: flèches + Espace/E | En niveau: ZQSD/flèches, Espace, Maj, E | Éditeur: T</p>
    </div>
    <div class="relative bg-black/50 p-1.5 md:p-2 rounded-2xl shadow-[0_0_70px_rgba(0,0,0,0.85)] border border-white/20 overflow-hidden w-full max-w-5xl">
        <div class="absolute top-3 left-3 md:top-4 md:left-4 text-white font-bold tracking-widest z-10 drop-shadow-md bg-black/40 border border-white/20 rounded-xl px-3 py-1.5" id="game-ui-score">TÂCHES: <span id="game-score" class="text-botanic-light text-xl">0/0</span></div>
        <div class="absolute top-3 right-3 md:top-4 md:right-4 text-white font-bold tracking-widest z-10 text-right drop-shadow-md bg-black/40 border border-white/20 rounded-xl px-3 py-1.5" id="game-ui-level">NIVEAU 1</div>
        <div id="game-over-screen" class="absolute inset-0 bg-stone-900/80 backdrop-blur-sm flex flex-col items-center justify-center hidden rounded-lg z-30 transition-all">
            <h3 id="game-end-title" class="font-serif text-4xl md:text-5xl text-white mb-4 drop-shadow-lg text-center">Chantier terminé !</h3>
            <p id="game-end-text" class="text-stone-300 mb-8 text-lg md:text-xl text-center max-w-md font-light">Le jardin est parfait.</p>
            <button id="restart-game-btn" class="glow-btn px-8 py-4 bg-botanic text-white uppercase tracking-widest text-sm font-bold hover:bg-botanic-dark transition-all rounded-full shadow-[0_0_20px_rgba(114,138,100,0.5)]">Rejouer</button>
        </div>
    <div id="editor-panel" class="hidden absolute left-5 top-30 w-80 max-h-[calc(100vh-140px)] overflow-y-auto bg-gradient-to-b from-stone-800/98 to-stone-900/98 border-2 border-botanic/40 rounded-3xl p-5 text-white z-[70] backdrop-blur-lg shadow-2xl" style="opacity: 0; transform: translateX(-20px) scale(0.95); transition: none;">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-botanic font-bold text-lg tracking-wider">✏️ ÉDITEUR</h3>
            <span class="text-botanic text-[10px] opacity-60">T to toggle</span>
        </div>
        <div class="w-full h-0.5 bg-gradient-to-r from-botanic via-botanic/50 to-transparent mb-5"></div>
        
        <div class="mb-6">
            <label class="text-[9px] uppercase tracking-widest text-stone-300 font-semibold block mb-3">🗂️ Catégorie</label>
            <div class="grid grid-cols-2 gap-2">
                <button onclick="editor.setCategory('platforms')" class="bg-stone-700/70 hover:bg-botanic/40 hover:border-botanic/60 border border-white/10 p-3 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-105">🧱 Sol</button>
                <button onclick="editor.setCategory('enemies')" class="bg-stone-700/70 hover:bg-red-900/30 hover:border-red-600/60 border border-white/10 p-3 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-105">👾 Ennemi</button>
                <button onclick="editor.setCategory('decorations')" class="bg-stone-700/70 hover:bg-yellow-900/30 hover:border-yellow-600/60 border border-white/10 p-3 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-105">🌸 Déco</button>
                <button onclick="editor.setCategory('items')" class="bg-stone-700/70 hover:bg-amber-900/30 hover:border-amber-600/60 border border-white/10 p-3 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-105">⭐ Item</button>
            </div>
        </div>

        <div id="object-selector-container" class="mb-6">
            <label class="text-[9px] uppercase tracking-widest text-stone-300 font-semibold block mb-2">📝 Type</label>
            <select id="editor-obj-type" class="w-full bg-stone-700/50 hover:bg-stone-600/70 border border-botanic/30 hover:border-botanic/60 p-3 rounded-lg mt-1 text-sm font-medium focus:outline-none focus:border-botanic transition-all"></select>
        </div>

        <div class="border-t border-botanic/20 pt-4 mt-4">
            <label class="text-[9px] uppercase tracking-widest text-amber-400 font-semibold block mb-3">👹 BOSS CREATOR</label>
            <div class="space-y-3">
                <button onclick="editor.createNewBoss()" class="w-full bg-amber-900/50 hover:bg-amber-800/70 border border-amber-700/40 hover:border-amber-600/80 text-amber-100 p-2 rounded-lg text-xs font-bold transition-all duration-200 hover:scale-105">➕ Ajouter Boss</button>
                
                <div>
                    <label class="text-[8px] uppercase tracking-widest text-stone-300 block mb-1">🎯 Template</label>
                    <select id="boss-template" class="w-full bg-stone-700/50 border border-amber-700/40 p-2 rounded text-xs">
                        <option value="melee">🔨 Melee - Attaque rapide + charge</option>
                        <option value="ranged">🎯 Ranged - Projectiles ciblés</option>
                        <option value="hybrid">⚔️ Hybrid - Mixte rapide/distance</option>
                        <option value="phase">🌀 Phase - Chg phases multiples</option>
                        <option value="aerial">🪁 Aerial - Volant + attques aériennes</option>
                    </select>
                </div>

                <div id="boss-config" class="hidden space-y-2 bg-stone-800/40 p-3 rounded border border-amber-700/30">
                    <div class="bg-stone-800/50 p-2 rounded text-xs space-y-1">
                        <label class="text-stone-300 block">PV Max</label>
                        <input type="number" id="boss-hp" min="20" max="500" value="150" class="w-full bg-black border border-white/10 rounded px-2 py-1 text-xs">
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <div class="bg-stone-800/50 p-2 rounded text-xs space-y-1">
                            <label class="text-stone-300 block">Vitesse</label>
                            <input type="number" id="boss-speed" min="0.5" max="6" step="0.5" value="2.5" class="w-full bg-black border border-white/10 rounded px-1 py-1 text-xs">
                        </div>
                        <div class="bg-stone-800/50 p-2 rounded text-xs space-y-1">
                            <label class="text-stone-300 block">Attaque</label>
                            <input type="number" id="boss-attack-interval" min="20" max="120" value="60" class="w-full bg-black border border-white/10 rounded px-1 py-1 text-xs">
                        </div>
                    </div>
                    <button onclick="editor.applyBossTemplate()" class="w-full bg-amber-900 hover:bg-amber-800 text-amber-100 p-2 rounded text-xs font-bold transition-all">✨ Appliquer Template</button>
                </div>
            </div>
        </div>

        <div id="inspector-panel" class="hidden border-t border-botanic/20 pt-4 mt-4">
            <label class="text-[9px] uppercase tracking-widest text-botanic font-semibold block mb-3">⚙️ Propriétés</label>
            <div id="inspector-fields" class="space-y-3">
            </div>
            <button onclick="editor.deleteSelected && editor.deleteSelected()" class="w-full bg-red-900/40 hover:bg-red-800/60 border border-red-700/40 hover:border-red-600/80 text-red-100 hover:text-red-50 p-3 rounded-lg mt-4 text-xs font-bold transition-all duration-200 hover:scale-105">🗑️ Supprimer</button>
        </div>

        <button id="export-json" class="w-full bg-gradient-to-br from-botanic to-green-500 hover:from-botanic/80 hover:to-green-600 text-botanic-dark font-bold p-4 rounded-xl mt-6 text-sm transition-all duration-200 hover:shadow-lg hover:shadow-botanic/30 hover:scale-105 active:scale-95">💾 EXPORTER NIVEAU</button>
        
        <div class="text-[8px] text-stone-500 text-center mt-4 opacity-70">
            Edit level objects • Beta
        </div>
    </div>
        <!-- Barre de vie du Boss (Mise à jour Z-index: 50 pour passer au dessus du Canvas !) -->
        <div id="boss-hp-container" class="absolute top-16 left-1/2 transform -translate-x-1/2 w-3/4 max-w-lg hidden z-50 opacity-0 transition-opacity duration-500">
            <div class="text-white text-center font-serif text-lg md:text-xl mb-1 tracking-widest" id="boss-name" style="text-shadow: 2px 2px 0 #000;">BOSS</div>
            <div class="w-full h-4 bg-stone-800 border-2 border-stone-400 rounded-sm overflow-hidden">
                <div id="boss-hp-fill" class="h-full bg-red-600 transition-all duration-300 ease-out" style="width: 100%;"></div>
            </div>
        </div>

        <canvas id="gameCanvas" width="900" height="500" class="w-full h-auto bg-[#87CEEB] rounded-xl shadow-inner block border border-white/15" style="image-rendering: auto;"></canvas>
    </div>
</div>
`;

document.body.insertAdjacentHTML('beforeend', gameHTML);

document.addEventListener('DOMContentLoaded', () => {
    const leaf = document.getElementById('easter-egg-leaf');
    if(!leaf) { console.warn("Bouton easter-egg-leaf introuvable."); return; }

    initInputs(isGameActive);
    initEngine();
    
    // Initialiser l'éditeur - le rendre accessible globalement
    window.editor = editor;
    import('./engine.js').then(module => {
        if (module.setEditorInstance) {
            module.setEditorInstance(editor);
        }
    });

    let clickCount = 0; let clickTimeout;
    leaf.addEventListener('click', () => {
        clickCount++; clearTimeout(clickTimeout);
        if (clickCount >= 7) {
            clickCount = 0; startGameUI();
        } else { clickTimeout = setTimeout(() => { clickCount = 0; }, 1500); }
    });
    
    // Setup export button
    document.addEventListener('DOMContentLoaded', () => {
        const exportBtn = document.getElementById('export-json');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                editor.exportLevel();
            });
        }
    });
});