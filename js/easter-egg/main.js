// js/easter-egg/main.js
// Injecte l'interface (correction de la Boss Bar z-index 50) et lie les modules.

import { initInputs } from './input.js';
import { initEngine, startGameUI, isGameActive } from './engine.js';

const gameHTML = `
<div id="easter-egg-game-container" class="fixed inset-0 z-[100] hidden flex-col items-center justify-center p-2 md:p-5 font-sans bg-[radial-gradient(circle_at_top,_#1f2937_0%,_#020617_65%)]">
    <button id="close-game-btn" class="absolute top-4 right-4 md:top-6 md:right-6 text-white/90 text-3xl focus:outline-none hover:text-botanic transition-colors z-[101] bg-white/10 hover:bg-white/20 border border-white/20 rounded-full w-11 h-11 md:w-12 md:h-12" aria-label="Fermer le jeu"><i class="fa-solid fa-times"></i></button>
    <div class="text-center mb-3 md:mb-5 px-4 py-3 rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md">
        <h2 class="font-serif text-3xl md:text-6xl text-white mb-1 md:mb-2 tracking-wide" style="text-shadow: 0 0 20px rgba(110,231,183,0.45);"><span class="text-botanic-light">Super</span> Jardinier !</h2>
        <p class="text-stone-300 text-[11px] md:text-sm tracking-[0.2em] uppercase">World Map: flèches + Espace/E | En niveau: ZQSD/flèches, Espace, Maj, E</p>
    </div>
    <div class="relative bg-black/50 p-1.5 md:p-2 rounded-2xl shadow-[0_0_70px_rgba(0,0,0,0.85)] border border-white/20 overflow-hidden w-full max-w-5xl">
        <div class="absolute top-3 left-3 md:top-4 md:left-4 text-white font-bold tracking-widest z-10 drop-shadow-md bg-black/40 border border-white/20 rounded-xl px-3 py-1.5" id="game-ui-score">TÂCHES: <span id="game-score" class="text-botanic-light text-xl">0/0</span></div>
        <div class="absolute top-3 right-3 md:top-4 md:right-4 text-white font-bold tracking-widest z-10 text-right drop-shadow-md bg-black/40 border border-white/20 rounded-xl px-3 py-1.5" id="game-ui-level">NIVEAU 1</div>
        <div id="game-over-screen" class="absolute inset-0 bg-stone-900/80 backdrop-blur-sm flex flex-col items-center justify-center hidden rounded-lg z-30 transition-all">
            <h3 id="game-end-title" class="font-serif text-4xl md:text-5xl text-white mb-4 drop-shadow-lg text-center">Chantier terminé !</h3>
            <p id="game-end-text" class="text-stone-300 mb-8 text-lg md:text-xl text-center max-w-md font-light">Le jardin est parfait.</p>
            <button id="restart-game-btn" class="glow-btn px-8 py-4 bg-botanic text-white uppercase tracking-widest text-sm font-bold hover:bg-botanic-dark transition-all rounded-full shadow-[0_0_20px_rgba(114,138,100,0.5)]">Rejouer</button>
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

    let clickCount = 0; let clickTimeout;
    leaf.addEventListener('click', () => {
        clickCount++; clearTimeout(clickTimeout);
        if (clickCount >= 7) {
            clickCount = 0; startGameUI();
        } else { clickTimeout = setTimeout(() => { clickCount = 0; }, 1500); }
    });
});