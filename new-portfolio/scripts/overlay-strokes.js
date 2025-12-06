const STROKE_PATTERNS = [
    { d: "M0 664 C 190 610 352 568 506 604 S 790 658 876 520 S 940 320 910 160 S 862 32 844 0", duration: 6100, pause: 900, rotation: -1.6, scale: 0.97 },
    { d: "M0 662 C 178 608 330 564 484 598 S 756 648 842 506 S 904 314 876 154 S 832 22 810 0", duration: 6400, pause: 980, rotation: -1.1, scale: 0.985 },
    { d: "M0 668 C 196 618 350 574 508 610 S 782 662 864 528 S 926 338 900 162 S 858 30 840 0", duration: 5800, pause: 860, rotation: -2.2, scale: 0.965 },
    { d: "M0 658 C 186 606 338 562 492 598 S 768 650 854 512 S 918 316 888 148 S 846 18 824 0", duration: 6500, pause: 1020, rotation: -0.9, scale: 0.99 },
    { d: "M0 666 C 188 614 344 572 506 608 S 792 660 874 524 S 934 330 904 156 S 860 24 840 0", duration: 6000, pause: 920, rotation: -2.0, scale: 0.972 },
    { d: "M0 654 C 180 602 328 558 476 588 S 744 636 828 498 S 892 312 864 140 S 820 12 804 0", duration: 6900, pause: 1100, rotation: -1.4, scale: 0.99 }
];

let pathEl = null;
let svgEl = null;
let lastIndex = -1;
let pendingTimeout = null;

function pickStroke() {
    if (!STROKE_PATTERNS.length) {
        return null;
    }
    let nextIndex = Math.floor(Math.random() * STROKE_PATTERNS.length);
    if (STROKE_PATTERNS.length > 1) {
        while (nextIndex === lastIndex) {
            nextIndex = Math.floor(Math.random() * STROKE_PATTERNS.length);
        }
    }
    lastIndex = nextIndex;
    return STROKE_PATTERNS[nextIndex];
}

function scheduleStroke() {
    if (!pathEl || !svgEl || !document.body.contains(pathEl)) {
        return;
    }
    const pattern = pickStroke();
    if (!pattern) {
        return;
    }

    pathEl.setAttribute('d', pattern.d);
    pathEl.style.setProperty('--stroke-duration', `${pattern.duration}ms`);
    if (svgEl) {
        svgEl.style.setProperty('--stroke-rotation', `${pattern.rotation}deg`);
        svgEl.style.setProperty('--stroke-scale', pattern.scale);
    }

    pathEl.classList.remove('overlay__stroke-path--active');
    void pathEl.getBoundingClientRect();
    pathEl.classList.add('overlay__stroke-path--active');

    const onAnimationEnd = () => {
        pathEl.classList.remove('overlay__stroke-path--active');
        pathEl.removeEventListener('animationend', onAnimationEnd);
        if (!document.body.contains(pathEl)) {
            return;
        }
        pendingTimeout = window.setTimeout(scheduleStroke, pattern.pause ?? 900);
    };

    pathEl.addEventListener('animationend', onAnimationEnd);
}

function initStrokeOverlay() {
    pathEl = document.querySelector('[data-overlay-stroke-path]');
    svgEl = pathEl?.closest('.overlay__stroke');
    if (!pathEl || !svgEl) {
        return;
    }
    scheduleStroke();

    document.addEventListener('visibilitychange', () => {
        if (!pathEl) return;
        if (document.hidden) {
            if (pendingTimeout) {
                window.clearTimeout(pendingTimeout);
                pendingTimeout = null;
            }
        } else if (!pathEl.classList.contains('overlay__stroke-path--active')) {
            scheduleStroke();
        }
    });
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initStrokeOverlay();
} else {
    document.addEventListener('DOMContentLoaded', initStrokeOverlay);
}