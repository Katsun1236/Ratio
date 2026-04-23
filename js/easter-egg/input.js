// js/easter-egg/input.js

export const keys = { 
    left: false, right: false, jump: false, interact: false, dash: false,
    editor: false, // Ajout pour l'éditeur
    jumpJustPressed: false, interactJustPressed: false, dashJustPressed: false,
    editorJustPressed: false // Flag pour détecter l'appui unique
};

export function resetJustPressedFlags() {
    keys.jumpJustPressed = false;
    keys.interactJustPressed = false;
    keys.dashJustPressed = false;
    keys.editorJustPressed = false; // Reset le flag de l'éditeur
}

export function initInputs(gameActiveGetter) {
    document.addEventListener('keydown', (e) => {
        if (!gameActiveGetter()) return;
        const k = e.key.toLowerCase();
        
        // Empêcher le scroll pour les touches de jeu et T
        if(["arrowup","arrowdown","arrowleft","arrowright"," ","e","shift","t"].includes(k) || ["z","q","s","d"].includes(k)) e.preventDefault();
        
        if (k === 'arrowleft' || k === 'q') keys.left = true;
        if (k === 'arrowright' || k === 'd') keys.right = true;
        if (k === 'arrowup' || k === 'z' || k === ' ') {
            if (!keys.jump) keys.jumpJustPressed = true;
            keys.jump = true;
        }
        if (k === 'e' || e.key === 'enter') {
            if (!keys.interact) keys.interactJustPressed = true;
            keys.interact = true;
        }
        if (k === 'shift') {
            if (!keys.dash) keys.dashJustPressed = true;
            keys.dash = true;
        }
        // Détection de la touche T
        if (k === 't') {
            if (!keys.editor) keys.editorJustPressed = true;
            keys.editor = true;
        }
    });

    document.addEventListener('keyup', (e) => {
        const k = e.key.toLowerCase();
        if (k === 'arrowleft' || k === 'q') keys.left = false;
        if (k === 'arrowright' || k === 'd') keys.right = false;
        if (k === 'arrowup' || k === 'z' || k === ' ') keys.jump = false;
        if (k === 'e' || e.key === 'enter') keys.interact = false;
        if (k === 'shift') keys.dash = false;
        if (k === 't') keys.editor = false;
    });
}