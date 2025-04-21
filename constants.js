// constants.js - Centralized location for all game constants

// ===== Sizing Constants =====
export const BLOCK_SIZE = 16;
export const PLAYER_WIDTH = 12;
export const PLAYER_HEIGHT = 32;
export const ANIMAL_SIZE = 16;

// ===== World Generation Constants =====
export const TOTAL_ROWS = 100;
export const CAVE_THRESHOLD = 0.2;

// ===== Physics Constants =====
export const GRAVITY = 0.25;
export const MOVE_SPEED = 3;
export const JUMP_STRENGTH = 7;

// ===== Time Constants =====
export const DAY_DURATION = 120000; // 2 minutes in milliseconds

// ===== Environment Constants =====
export const BIOMES = ["forest", "desert", "tundra"];

// ===== Entity Constants =====
export const MAX_MOBS = 6;
export const MOB_DAMAGE = 10;
export const PLAYER_MAX_HEALTH = 100;

// ===== Game Mechanics =====
export const INVULN_DURATION = 30; // Invulnerability frames after taking damage
export const REGEN_INTERVAL = 5000; // Health regeneration interval (5 seconds)
export const MEAT_HEAL_AMOUNT = 20; // How much health is restored when eating meat
export const ANIMAL_SPAWN_INTERVAL = 30000; // 30 seconds between animal spawns
export const TREE_REGROW_TIME = 60000; // 1 minute for trees to regrow

// ===== Colors =====
export const DAY_SKY_COLOR = [173, 216, 230]; // Light blue
export const NIGHT_SKY_COLOR = [25, 25, 112]; // Midnight blue