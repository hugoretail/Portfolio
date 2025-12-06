const STROKE_PATTERNS = [
    { d: "M0 664 C 182 608 320 556 436 598 C 580 640 686 620 762 516 C 792 476 814 464 830 460 C 830 421.34 798.66 390 760 390 C 721.34 390 690 421.34 690 460 C 690 498.66 721.34 530 760 530 C 798.66 530 830 498.66 830 460 C 856 356 900 194 850 0", duration: 6600, pause: 980, rotation: -2.1, scale: 0.97 },
    { d: "M0 662 C 168 604 302 552 420 580 C 564 616 670 602 744 504 C 774 466 798 454 814 448 C 814 409.34 782.66 378 744 378 C 705.34 378 674 409.34 674 448 C 674 486.66 705.34 518 744 518 C 782.66 518 814 486.66 814 448 C 840 340 892 190 850 0", duration: 7000, pause: 1080, rotation: -1.3, scale: 0.98 },
    { d: "M0 668 C 190 626 318 574 438 604 C 590 640 700 620 772 510 C 802 470 826 456 842 450 C 842 411.34 810.66 380 772 380 C 733.34 380 702 411.34 702 450 C 702 488.66 733.34 520 772 520 C 810.66 520 842 488.66 842 450 C 872 332 908 188 850 0", duration: 6200, pause: 900, rotation: -2.5, scale: 0.96 },
    { d: "M0 658 C 174 612 308 560 428 586 C 572 618 682 598 758 496 C 788 458 810 446 826 440 C 826 401.34 794.66 370 756 370 C 717.34 370 686 401.34 686 440 C 686 478.66 717.34 510 756 510 C 794.66 510 826 478.66 826 440 C 854 330 900 190 850 0", duration: 6900, pause: 1040, rotation: -1.0, scale: 0.98 },
    { d: "M0 666 C 186 618 322 568 452 598 C 600 630 714 612 790 500 C 820 460 844 448 860 442 C 860 403.34 828.66 372 790 372 C 751.34 372 720 403.34 720 442 C 720 480.66 751.34 512 790 512 C 828.66 512 860 480.66 860 442 C 890 326 908 202 850 0", duration: 6400, pause: 950, rotation: -2.2, scale: 0.97 },
    { d: "M0 654 C 172 604 300 552 416 574 C 558 600 666 586 740 484 C 770 444 792 432 808 426 C 808 387.34 776.66 356 738 356 C 699.34 356 668 387.34 668 426 C 668 464.66 699.34 496 738 496 C 776.66 496 808 464.66 808 426 C 836 316 898 196 850 0", duration: 7600, pause: 1180, rotation: -1.55, scale: 0.99 }
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