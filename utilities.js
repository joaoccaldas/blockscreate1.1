// utilities.js - Helper functions for the game

// ===== Noise Function =====
export function fract(val) { 
    return val - Math.floor(val); 
}

export function caveNoise(col, row) {
    function hash2D(x, y) {
        const n = x * 12.9898 + y * 78.233;
        return fract(Math.sin(n) * 43758.5453);
    }
    let x0 = Math.floor(col), x1 = x0 + 1;
    let y0 = Math.floor(row), y1 = y0 + 1;
    let sx = col - x0, sy = row - y0;
    let n0 = hash2D(x0, y0);
    let n1 = hash2D(x1, y0);
    let ix0 = n0 + (n1 - n0) * sx;
    n0 = hash2D(x0, y1);
    n1 = hash2D(x1, y1);
    let ix1 = n0 + (n1 - n0) * sx;
    return ix0 + (ix1 - ix0) * sy;
}