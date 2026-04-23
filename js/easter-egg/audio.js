// js/easter-egg/audio.js
// Gère l'audio avec de vrais fichiers MP3 (Fallbacks procéduraux si manquants)

const soundFiles = {
    jump: 'assets/sounds/jump.mp3',
    bounce: 'assets/sounds/bounce.mp3',
    dash: 'assets/sounds/dash.mp3',
    hit: 'assets/sounds/hit.mp3',
    boss_hit: 'assets/sounds/boss_hit.mp3',
    boss_intro: 'assets/sounds/boss_intro.mp3',
    water: 'assets/sounds/water.mp3',
    chest: 'assets/sounds/chest.mp3',
    tractor: 'assets/sounds/tractor.mp3'
};

const audioPools = {};
let audioCtx;
let audioInitialized = false;
const POOL_SIZE = 4;
let musicGain;
let musicOscA;
let musicOscB;
let musicFilter;
let currentMusicMode = '';

export function initAudio() {
    if (!audioInitialized) {
        // Precharge un petit pool de lecteurs par son pour eviter cloneNode a chaud.
        for (let key in soundFiles) {
            const pool = [];
            for (let i = 0; i < POOL_SIZE; i++) {
                const a = new Audio(soundFiles[key]);
                a.volume = 0.5;
                a.preload = 'auto';
                pool.push(a);
            }
            audioPools[key] = pool;
        }
        audioInitialized = true;
    }

    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    if (!musicGain) {
        musicGain = audioCtx.createGain();
        musicGain.gain.value = 0.008;
        musicFilter = audioCtx.createBiquadFilter();
        musicFilter.type = 'lowpass';
        musicFilter.frequency.value = 900;
        musicFilter.Q.value = 0.7;
        musicGain.connect(musicFilter);
        musicFilter.connect(audioCtx.destination);

        musicOscA = audioCtx.createOscillator();
        musicOscA.type = 'sine';
        musicOscA.frequency.value = 220;
        musicOscA.connect(musicGain);
        musicOscA.start();

        musicOscB = audioCtx.createOscillator();
        musicOscB.type = 'sine';
        musicOscB.frequency.value = 330;
        musicOscB.connect(musicGain);
        musicOscB.start();
    }
}

export function setMusicMode(mode) {
    if (!audioCtx || !musicGain || !musicOscA || !musicOscB) return;
    if (currentMusicMode === mode) return;
    currentMusicMode = mode;

    const now = audioCtx.currentTime;
    let aFreq = 110;
    let bFreq = 165;
    let vol = 0.008;
    let filterHz = 900;

    if (mode === 'map') {
        aFreq = 220;
        bFreq = 329.63;
        vol = 0.010;
        filterHz = 1400;
    } else if (mode === 'boss') {
        aFreq = 98;
        bFreq = 146.83;
        vol = 0.012;
        filterHz = 800;
    } else if (mode === 'night') {
        aFreq = 174.61;
        bFreq = 261.63;
        vol = 0.007;
        filterHz = 700;
    } else if (mode === 'sunset') {
        aFreq = 196;
        bFreq = 293.66;
        vol = 0.009;
        filterHz = 1100;
    } else {
        // calm/day
        aFreq = 207.65;
        bFreq = 311.13;
        vol = 0.008;
        filterHz = 1200;
    }

    musicOscA.frequency.cancelScheduledValues(now);
    musicOscB.frequency.cancelScheduledValues(now);
    musicGain.gain.cancelScheduledValues(now);
    if (musicFilter) musicFilter.frequency.cancelScheduledValues(now);
    musicOscA.frequency.linearRampToValueAtTime(aFreq, now + 0.7);
    musicOscB.frequency.linearRampToValueAtTime(bFreq, now + 0.7);
    musicGain.gain.linearRampToValueAtTime(vol, now + 0.7);
    if (musicFilter) musicFilter.frequency.linearRampToValueAtTime(filterHz, now + 0.7);
}

export function playSound(type) {
    const pool = audioPools[type];
    if (!pool || pool.length === 0) {
        playProceduralFallback(type);
        return;
    }

    const available = pool.find((audio) => audio.paused || audio.ended);
    if (!available) {
        // Evite d'empiler trop d'instances quand le son est spamme.
        return;
    }

    available.currentTime = 0;
    available.play().catch(() => playProceduralFallback(type));
}

// L'ancienne méthode de secours
function playProceduralFallback(type) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;

    const playTone = (kind, fromHz, toHz, duration, volume = 0.14) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = kind;
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(fromHz, now);
        if (toHz !== fromHz) osc.frequency.exponentialRampToValueAtTime(Math.max(1, toHz), now + duration);
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        osc.start(now);
        osc.stop(now + duration);
    };

    if (type === 'jump') {
        playTone('sine', 320, 680, 0.09, 0.13);
    } else if (type === 'dash') {
        playTone('triangle', 220, 1100, 0.12, 0.16);
    } else if (type === 'bounce') {
        playTone('square', 180, 500, 0.14, 0.14);
    } else if (type === 'hit') {
        playTone('sawtooth', 180, 55, 0.16, 0.2);
    } else if (type === 'boss_hit') { 
        playTone('square', 90, 30, 0.4, 0.4);
    } else if (type === 'boss_intro') { 
        playTone('sawtooth', 50, 160, 0.9, 0.42);
        playTone('triangle', 80, 35, 1.0, 0.2);
    } else if (type === 'water') {
        playTone('sine', 420, 160, 0.22, 0.12);
    } else if (type === 'chest') {
        playTone('triangle', 460, 920, 0.12, 0.16);
        playTone('sine', 720, 1320, 0.16, 0.12);
    } else if (type === 'tractor') {
        playTone('square', 70, 95, 0.28, 0.18);
        playTone('square', 95, 70, 0.28, 0.14);
    }
}