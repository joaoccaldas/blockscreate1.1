// Import inventory functionality
import { 
  currentTool, 
  tools, 
  requiredTools, 
  blockDrops, 
  toolTiers, 
  inventory, 
  placeableBlocks, 
  selectedBlock, 
  updateInventoryUI, 
  selectBlock, 
  equipTool 
} from './inventory.js';

// Import crafting functionality
import {
  basicRecipes,
  tableRecipes,
  openCraftingTableUI,
  openBasicCraftingUI,
  closeCraftingTableUI,
  craftFromTable,
  hasCraftingTableInWorld
} from './crafting.js';

// Import constants
import {
  BLOCK_SIZE,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  ANIMAL_SIZE,
  TOTAL_ROWS,
  CAVE_THRESHOLD,
  GRAVITY,
  MOVE_SPEED,
  JUMP_STRENGTH,
  DAY_DURATION,
  MAX_MOBS,
  MOB_DAMAGE,
  PLAYER_MAX_HEALTH,
  INVULN_DURATION,
  REGEN_INTERVAL,
  MEAT_HEAL_AMOUNT,
  ANIMAL_SPAWN_INTERVAL,
  TREE_REGROW_TIME,
  DAY_SKY_COLOR,
  NIGHT_SKY_COLOR
} from './constants.js';

// Import utilities
import {
  fract,
  caveNoise
} from './utilities.js';

// ===== Global Variables =====
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
let totalRows = TOTAL_ROWS;
let gravity = GRAVITY;
let moveSpeed = MOVE_SPEED;
let jumpStrength = JUMP_STRENGTH;
let gameMode;
let biome; // "forest", "desert", "tundra", or random
let world = {};
// selectedBlock is now imported from inventory.js
let cutTrees = [];
let dayDuration = DAY_DURATION;
let gameStartTime = Date.now();
const textureCache = {};
let gameOverFlag = false;
let keys = {};
let paused = false;
let lastAnimalSpawnTime = Date.now();
let lastRegenTime = Date.now();
let wasOnGround = true;
let minYInAir;
let animals = [];
let mobs = [];

// ===== Health Bar Elements =====
const healthBarContainer = document.getElementById("healthBarContainer");
const healthBarInner = document.getElementById("healthBarInner");

// Function to update health bar display
function updateHealthBar() {
  const healthPercent = (player.health / player.maxHealth) * 100;
  healthBarInner.style.width = `${healthPercent}%`;
  
  // Update color based on health level
  healthBarInner.classList.remove('health-high', 'health-medium', 'health-low');
  if (healthPercent > 70) {
    healthBarInner.classList.add('health-high');
  } else if (healthPercent > 30) {
    healthBarInner.classList.add('health-medium');
  } else {
    healthBarInner.classList.add('health-low');
  }
}

// ===== Load Images =====
const animalImages = {
  cow: new Image(),
  pig: new Image(),
  chicken: new Image(),
  polarbear: new Image()
};

// Create placeholder images if actual images fail to load
function createPlaceholderImage(type) {
  const canvas = document.createElement('canvas');
  canvas.width = ANIMAL_SIZE;
  canvas.height = ANIMAL_SIZE;
  const ctx = canvas.getContext('2d');
  
  // Draw different colored rectangles based on animal type
  switch(type) {
    case 'cow':
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, ANIMAL_SIZE, ANIMAL_SIZE);
      ctx.fillStyle = '#000000';
      ctx.fillRect(ANIMAL_SIZE/4, ANIMAL_SIZE/4, ANIMAL_SIZE/2, ANIMAL_SIZE/2);
      break;
    case 'pig':
      ctx.fillStyle = '#FFC0CB'; // Pink
      ctx.fillRect(0, 0, ANIMAL_SIZE, ANIMAL_SIZE);
      ctx.fillStyle = '#FF6B6B';
      ctx.fillRect(ANIMAL_SIZE/4, ANIMAL_SIZE/4, ANIMAL_SIZE/2, ANIMAL_SIZE/2);
      break;
    case 'chicken':
      ctx.fillStyle = '#FFFACD'; // Light yellow
      ctx.fillRect(0, 0, ANIMAL_SIZE, ANIMAL_SIZE);
      ctx.fillStyle = '#FF6347'; // Red for beak
      ctx.fillRect(ANIMAL_SIZE/2, ANIMAL_SIZE/2, ANIMAL_SIZE/4, ANIMAL_SIZE/4);
      break;
    case 'polarbear':
      ctx.fillStyle = '#F0F8FF'; // Ice white
      ctx.fillRect(0, 0, ANIMAL_SIZE, ANIMAL_SIZE);
      ctx.fillStyle = '#000000';
      ctx.fillRect(ANIMAL_SIZE/4, ANIMAL_SIZE/4, ANIMAL_SIZE/8, ANIMAL_SIZE/8); // Eyes
      ctx.fillRect(ANIMAL_SIZE*5/8, ANIMAL_SIZE/4, ANIMAL_SIZE/8, ANIMAL_SIZE/8);
      break;
  }
  
  return canvas.toDataURL();
}

// Set up error handlers for animal images
Object.keys(animalImages).forEach(type => {
  animalImages[type].onerror = () => {
    console.log(`Failed to load ${type}.png, using placeholder instead`);
    animalImages[type].src = createPlaceholderImage(type);
  };
});

// Try to load actual images
animalImages.cow.src = "assets/cow.png";
animalImages.pig.src = "assets/pig.png";
animalImages.chicken.src = "assets/chicken.png";
animalImages.polarbear.src = "assets/polarbear.png";

// Player images for different directions
const playerImages = {
  front: new Image(),
  left: new Image(),
  right: new Image()
};

// Create placeholder player image if actual images fail to load
function createPlaceholderPlayerImage(direction) {
  const canvas = document.createElement('canvas');
  canvas.width = PLAYER_WIDTH;
  canvas.height = PLAYER_HEIGHT;
  const ctx = canvas.getContext('2d');
  
  // Create a simple player representation
  ctx.fillStyle = '#FFD700'; // Gold color base
  ctx.fillRect(0, 0, PLAYER_WIDTH, PLAYER_HEIGHT);
  
  // Different details based on direction
  if (direction === 'left') {
    ctx.fillStyle = '#0000FF'; // Blue detail on left
    ctx.fillRect(0, PLAYER_HEIGHT/4, PLAYER_WIDTH/3, PLAYER_HEIGHT/4);
  } else if (direction === 'right') {
    ctx.fillStyle = '#0000FF'; // Blue detail on right
    ctx.fillRect(PLAYER_WIDTH*2/3, PLAYER_HEIGHT/4, PLAYER_WIDTH/3, PLAYER_HEIGHT/4);
  } else {
    // front
    ctx.fillStyle = '#0000FF'; // Blue detail in center
    ctx.fillRect(PLAYER_WIDTH/3, PLAYER_HEIGHT/4, PLAYER_WIDTH/3, PLAYER_HEIGHT/4);
  }
  
  return canvas.toDataURL();
}

// Set up error handlers for player images
Object.keys(playerImages).forEach(direction => {
  playerImages[direction].onerror = () => {
    console.log(`Failed to load player${direction}.jpg, using placeholder instead`);
    playerImages[direction].src = createPlaceholderPlayerImage(direction);
  };
});

// Try to load actual images
playerImages.front.src = "assets/playerfront.png";
playerImages.left.src = "assets/playerleft.png";
playerImages.right.src = "assets/playerright.png";

// Current player direction
let playerDirection = "front";

// ===== Noise Function =====
const caveThreshold = CAVE_THRESHOLD;

// ===== World Generation with Three Biomes =====
function generateColumn(col) {
  if (world[col] !== undefined) return;
  let colArray = [];
  const baseLevel = 20;
  const amplitude = 15;
  let noiseVal = caveNoise(col * 0.1, 0);
  let sineVal = Math.sin(col * 0.05) * 5;
  let ground = Math.floor(baseLevel + amplitude * (noiseVal - 0.5) + sineVal);
  ground = Math.max(5, Math.min(ground, totalRows - 10));
  
  let surfaceBlock, subSurfaceBlock;
  switch (biome) {
    case "forest":
      surfaceBlock = ground > 25 ? "rock" : "grass";
      subSurfaceBlock = surfaceBlock === "grass" ? "dirt" : "stone";
      break;
    case "desert":
      surfaceBlock = "sand";
      subSurfaceBlock = "sandstone";
      break;
    case "tundra":
      surfaceBlock = ground > 25 ? "ice" : "snow";
      subSurfaceBlock = "stone";
      break;
  }
  
  for (let r = 0; r < totalRows; r++) {
    if (r < ground) colArray[r] = "air";
    else if (r === ground) colArray[r] = surfaceBlock;
    else if (r <= ground + 3) colArray[r] = subSurfaceBlock;
    else colArray[r] = "stone";
  }
  
  for (let r = ground + 1; r < totalRows - 3; r++) {
    if (caveNoise(col * 0.2, r * 0.2) < caveThreshold) colArray[r] = "air";
  }
  
  for (let r = ground + 4; r < 70; r++) {
    if (colArray[r] === "stone" && caveNoise(col * 0.2 + 1000, r * 0.2) < 0.1) colArray[r] = "coal ore";
    else if (colArray[r] === "stone" && Math.random() < 0.005) colArray[r] = "mossy stone";
  }
  for (let r = 40; r < 70; r++) {
    if (colArray[r] === "stone" && caveNoise(col * 0.15 + 2000, r * 0.15) < 0.05) colArray[r] = "iron ore";
  }
  for (let r = 60; r < 90; r++) {
    if (colArray[r] === "stone" && caveNoise(col * 0.1 + 3000, r * 0.1) < 0.03) colArray[r] = "gold ore";
  }
  for (let r = 80; r < 95; r++) {
    if (colArray[r] === "stone" && caveNoise(col * 0.05 + 4000, r * 0.05) < 0.02) colArray[r] = "diamond ore";
  }
  
  if (surfaceBlock === "grass" && Math.random() < (world[col - 1] && world[col - 1][ground - 1] === "wood" ? 0.6 : 0.1)) {
    colArray[ground - 1] = "wood";
    colArray[ground - 2] = "wood";
    if (ground - 3 >= 0) colArray[ground - 3] = "leaves";
  } else if (surfaceBlock === "sand" && Math.random() < 0.05) {
    colArray[ground - 1] = "wood"; // Sparse desert trees
  } else if (surfaceBlock === "snow" && Math.random() < 0.08) {
    colArray[ground - 1] = "spruce wood";
    colArray[ground - 2] = "spruce wood";
    if (ground - 3 >= 0) colArray[ground - 3] = "spruce leaves";
  }
  
  colArray.modified = false;
  world[col] = colArray;
}

function ensureWorldForVisibleRange() {
  let camX = camera.x;
  let startCol = Math.floor(camX / BLOCK_SIZE) - 5;
  let endCol = Math.floor((camX + canvas.width) / BLOCK_SIZE) + 5;
  for (let col = startCol; col <= endCol; col++) generateColumn(col);
  for (let col in world) {
    let c = parseInt(col);
    if (!world[col].modified && (c < startCol - 5 || c > endCol + 5)) delete world[col];
  }
}

// ===== Player Setup =====
const player = {
  width: PLAYER_WIDTH,
  height: PLAYER_HEIGHT,
  vx: 0,
  vy: 0,
  onGround: false,
  x: 0,
  y: 0,
  health: 100,
  maxHealth: 100,
  invuln: 0
};
function getGroundLevel(col) {
  generateColumn(col);
  const colArray = world[col];
  for (let r = 0; r < totalRows; r++) if (colArray[r] !== "air") return r;
  return totalRows;
}

// ===== Inventory, Tools & Crafting =====
// Inventory functionality is now imported from inventory.js

// ===== Camera =====
const camera = {
  x: player.x - canvas.width / 2,
  y: player.y - canvas.height / 2
};

// ===== Collision Logic for Player =====
function checkIfOnGround() {
  const footRow = Math.floor((player.y + player.height + 1) / BLOCK_SIZE);
  const pColStart = Math.floor(player.x / BLOCK_SIZE);
  const pColEnd = Math.floor((player.x + player.width - 1) / BLOCK_SIZE);
  let onGround = false;
  for (let col = pColStart; col <= pColEnd; col++) {
    generateColumn(col);
    if (world[col][footRow] !== "air") {
      onGround = true;
      break;
    }
  }
  player.onGround = onGround;
}

function resolveCollisions() {
  let bbox = { left: player.x, right: player.x + player.width, top: player.y, bottom: player.y + player.height };
  let startCol = Math.floor(bbox.left / BLOCK_SIZE);
  let endCol = Math.floor((bbox.right - 1) / BLOCK_SIZE);
  let startRow = Math.floor(bbox.top / BLOCK_SIZE);
  let endRow = Math.floor(bbox.bottom / BLOCK_SIZE);
  for (let col = startCol; col <= endCol; col++) {
    generateColumn(col);
    for (let row = startRow; row <= endRow; row++) {
      let block = world[col][row];
      if (block === "air") continue;
      let cellLeft = col * BLOCK_SIZE;
      let cellRight = cellLeft + BLOCK_SIZE;
      let cellTop = row * BLOCK_SIZE;
      let cellBottom = cellTop + BLOCK_SIZE;
      if (bbox.right > cellLeft && bbox.left < cellRight && bbox.bottom > cellTop && bbox.top < cellBottom) {
        let overlapX = Math.min(bbox.right - cellLeft, cellRight - bbox.left);
        let overlapY = Math.min(bbox.bottom - cellTop, cellBottom - bbox.top);
        if (overlapX < overlapY) {
          if (player.x + player.width / 2 < cellLeft + BLOCK_SIZE / 2) player.x -= overlapX;
          else player.x += overlapX;
          player.vx = 0;
          bbox.left = player.x;
          bbox.right = player.x + player.width;
        } else {
          if (player.y + player.height / 2 < cellTop + BLOCK_SIZE / 2) {
            player.y = cellTop - player.height;
            player.vy = 0;
            player.onGround = true;
          } else {
            player.y = cellBottom;
            player.vy = 0;
          }
          bbox.top = player.y;
          bbox.bottom = player.y + player.height;
        }
      }
    }
  }
}

function snapToGround() {
  const pColStart = Math.floor(player.x / BLOCK_SIZE);
  const pColEnd = Math.floor((player.x + player.width - 1) / BLOCK_SIZE);
  for (let col = pColStart; col <= pColEnd; col++) {
    generateColumn(col);
    let cellTop = getGroundLevel(col) * BLOCK_SIZE;
    if ((cellTop - (player.y + player.height)) >= 0 && (cellTop - (player.y + player.height)) < 5) {
      player.y = cellTop - player.height;
      player.vy = 0;
      player.onGround = true;
    }
  }
}

// ===== Animal Collision Resolution =====
function resolveAnimalBlockCollision(animal) {
  let bbox = { left: animal.x, right: animal.x + ANIMAL_SIZE, top: animal.y, bottom: animal.y + ANIMAL_SIZE };
  let startCol = Math.floor(bbox.left / BLOCK_SIZE);
  let endCol = Math.floor((bbox.right - 1) / BLOCK_SIZE);
  let startRow = Math.floor(bbox.top / BLOCK_SIZE);
  let endRow = Math.floor(bbox.bottom - 1 / BLOCK_SIZE);
  for (let col = startCol; col <= endCol; col++) {
    generateColumn(col);
    for (let row = startRow; row <= endRow; row++) {
      let block = world[col][row];
      if (block !== "air") {
        let cellLeft = col * BLOCK_SIZE;
        let cellRight = cellLeft + BLOCK_SIZE;
        let cellTop = row * BLOCK_SIZE;
        let cellBottom = cellTop + BLOCK_SIZE;
        let overlapX = Math.min(bbox.right - cellLeft, cellRight - bbox.left);
        let overlapY = Math.min(bbox.bottom - cellTop, cellBottom - bbox.top);
        if (overlapX < overlapY) {
          if (animal.x + ANIMAL_SIZE / 2 < cellLeft + BLOCK_SIZE / 2) animal.x -= overlapX;
          else animal.x += overlapX;
        } else {
          if (animal.y + ANIMAL_SIZE / 2 < cellTop + BLOCK_SIZE / 2) animal.y -= overlapY;
          else animal.y += overlapY;
        }
        bbox.left = animal.x;
        bbox.right = animal.x + ANIMAL_SIZE;
        bbox.top = animal.y;
        bbox.bottom = animal.y + ANIMAL_SIZE;
      }
    }
  }
}

// ===== Animal System =====
function spawnAnimals(num) {
  const types = biome === "tundra" ? ["polarbear", "chicken"] : ["cow", "pig", "chicken"];
  for (let i = 0; i < num; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    let x = player.x + (Math.random() * 400 - 200);
    let col = Math.floor(x / BLOCK_SIZE);
    generateColumn(col);
    let groundRow = getGroundLevel(col);
    let y = groundRow * BLOCK_SIZE - ANIMAL_SIZE;
    let vx = (Math.random() < 0.5 ? -1 : 1) * Math.random();
    if (biome === "desert" && Math.random() < 0.7) continue; // Rarer animals in desert
    if (biome === "tundra" && Math.random() < 0.5) continue; // Slightly rarer in tundra
    animals.push({ type, x, y, vx });
  }
}

function updateAnimals() {
  for (let animal of animals) {
    animal.x += animal.vx;
    if (Math.random() < 0.01) animal.vx = -animal.vx;
    resolveAnimalBlockCollision(animal);
    let col = Math.floor(animal.x / BLOCK_SIZE);
    generateColumn(col);
    let groundRow = getGroundLevel(col);
    animal.y = groundRow * BLOCK_SIZE - ANIMAL_SIZE;
  }
}

function drawAnimal(animal) {
  const ax = animal.x - camera.x;
  const ay = animal.y - camera.y;
  let img = animalImages[animal.type];
  
  try {
    if (img && img.complete && img.naturalWidth !== 0) {
      ctx.drawImage(img, ax, ay, ANIMAL_SIZE, ANIMAL_SIZE);
    } else {
      // Fallback colored square if image isn't loaded
      switch(animal.type) {
        case 'cow':
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(ax, ay, ANIMAL_SIZE, ANIMAL_SIZE);
          ctx.fillStyle = "#000000";
          ctx.fillRect(ax + ANIMAL_SIZE/4, ay + ANIMAL_SIZE/4, ANIMAL_SIZE/2, ANIMAL_SIZE/2);
          break;
        case 'pig':
          ctx.fillStyle = "#FFC0CB"; // Pink
          ctx.fillRect(ax, ay, ANIMAL_SIZE, ANIMAL_SIZE);
          ctx.fillStyle = "#FF6B6B";
          ctx.fillRect(ax + ANIMAL_SIZE/4, ay + ANIMAL_SIZE/4, ANIMAL_SIZE/2, ANIMAL_SIZE/2);
          break;
        case 'chicken':
          ctx.fillStyle = "#FFFACD"; // Light yellow
          ctx.fillRect(ax, ay, ANIMAL_SIZE, ANIMAL_SIZE);
          ctx.fillStyle = "#FF6347"; // Red for beak
          ctx.fillRect(ax + ANIMAL_SIZE/2, ay + ANIMAL_SIZE/2, ANIMAL_SIZE/4, ANIMAL_SIZE/4);
          break;
        case 'polarbear':
          ctx.fillStyle = "#F0F8FF"; // Ice white
          ctx.fillRect(ax, ay, ANIMAL_SIZE, ANIMAL_SIZE);
          ctx.fillStyle = "#000000";
          ctx.fillRect(ax + ANIMAL_SIZE/4, ay + ANIMAL_SIZE/4, ANIMAL_SIZE/8, ANIMAL_SIZE/8); // Eyes
          ctx.fillRect(ax + ANIMAL_SIZE*5/8, ay + ANIMAL_SIZE/4, ANIMAL_SIZE/8, ANIMAL_SIZE/8);
          break;
        default:
          ctx.fillStyle = "#AAAAAA";
          ctx.fillRect(ax, ay, ANIMAL_SIZE, ANIMAL_SIZE);
      }
    }
  } catch (e) {
    // Ultimate fallback if any error occurs during drawing
    ctx.fillStyle = "#AAAAAA";
    ctx.fillRect(ax, ay, ANIMAL_SIZE, ANIMAL_SIZE);
    console.log("Error drawing animal:", e);
  }
}

// ===== Hostile Mob System =====
const maxMobs = MAX_MOBS;
function spawnMobs() {
  if (getLightingFactor() < 0.3 && mobs.length < maxMobs) {
    let offset = (Math.random() * 600 + 200) * (Math.random() < 0.5 ? -1 : 1);
    let x = player.x + offset;
    let col = Math.floor(x / BLOCK_SIZE);
    generateColumn(col);
    let groundRow = getGroundLevel(col);
    let y = groundRow * BLOCK_SIZE - ANIMAL_SIZE;
    let vx = (player.x > x ? 1 : -1) * (0.5 + Math.random());
    mobs.push({ x, y, vx, damage: MOB_DAMAGE });
  }
}

function updateMobs() {
  if (getLightingFactor() >= 0.5) {
    mobs = [];
    return;
  }
  if (Math.random() < 0.01) spawnMobs();
  for (let mob of mobs) {
    mob.vx = mob.x < player.x ? Math.abs(mob.vx) || 0.5 : -Math.abs(mob.vx) || -0.5;
    mob.x += mob.vx;
    let col = Math.floor(mob.x / BLOCK_SIZE);
    generateColumn(col);
    let groundRow = getGroundLevel(col);
    mob.y = groundRow * BLOCK_SIZE - ANIMAL_SIZE;
  }
}

function drawMob(mob) {
  const mx = mob.x - camera.x;
  const my = mob.y - camera.y;
  const lightingFactor = getLightingFactor();
  ctx.fillStyle = applyLighting("#AA0000", lightingFactor);
  ctx.fillRect(mx, my, ANIMAL_SIZE, ANIMAL_SIZE);
  ctx.fillStyle = applyLighting("#000000", lightingFactor);
  ctx.fillRect(mx + 4, my + 4, 3, 3);
  ctx.fillRect(mx + ANIMAL_SIZE - 7, my + 4, 3, 3);
}

// ===== Main Interaction (Click Handler) =====
canvas.addEventListener("click", (e) => {
  if (paused) return;
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left + camera.x;
  const clickY = e.clientY - rect.top + camera.y;
  
  for (let i = 0; i < mobs.length; i++) {
    let mob = mobs[i];
    if (clickX >= mob.x && clickX < mob.x + ANIMAL_SIZE && clickY >= mob.y && clickY < mob.y + ANIMAL_SIZE) {
      mobs.splice(i, 1);
      inventory.meat = (inventory.meat || 0) + 1;
      showMessage("Mob defeated! You got some meat.");
      updateInventoryUI();
      return;
    }
  }
  for (let i = 0; i < animals.length; i++) {
    let animal = animals[i];
    if (clickX >= animal.x && clickX < animal.x + ANIMAL_SIZE && clickY >= animal.y && clickY < animal.y + ANIMAL_SIZE) {
      animals.splice(i, 1);
      inventory.meat = (inventory.meat || 0) + 1;
      showMessage("Animal slain! You got some meat.");
      updateInventoryUI();
      return;
    }
  }
  
  const col = Math.floor(clickX / BLOCK_SIZE);
  const row = Math.floor(clickY / BLOCK_SIZE);
  generateColumn(col);
  const blockType = world[col][row];
  
  if (blockType === "crafting table") {
    openCraftingTableUI();
    return;
  }
  
  if (blockType === "air" && selectedBlock && inventory[selectedBlock] > 0) {
    world[col][row] = selectedBlock;
    world[col].modified = true;
    inventory[selectedBlock]--;
    updateInventoryUI();
    return;
  }
  if (blockType === "air") return;
  
  const requiredTool = requiredTools[blockType] || "hand";
  if (toolTiers[currentTool] < toolTiers[requiredTool]) {
    showMessage(`Requires ${requiredTool} to break ${blockType}!`);
    return;
  }
  const breakDistance = currentTool === "hand" ? BLOCK_SIZE * 1.5 : BLOCK_SIZE * 2.5;
  const blockCenterX = col * BLOCK_SIZE + BLOCK_SIZE / 2;
  const blockCenterY = row * BLOCK_SIZE + BLOCK_SIZE / 2;
  const playerCenterX = player.x + player.width / 2;
  const playerCenterY = player.y + player.height / 2;
  if (Math.abs(blockCenterX - playerCenterX) <= breakDistance && Math.abs(blockCenterY - playerCenterY) <= breakDistance) {
    if (blockType === "wood" || blockType === "spruce wood" || blockType === "leaves" || blockType === "spruce leaves") {
      const groundRow = getGroundLevel(col);
      if (world[col][groundRow] === "grass" || world[col][groundRow] === "snow") cutTrees.push({ col, row: groundRow, timestamp: Date.now() + 60000 });
    }
    world[col][row] = "air";
    world[col].modified = true;
    const drop = blockDrops[blockType] || blockType;
    inventory[drop] = (inventory[drop] || 0) + 1;
    updateInventoryUI();
  }
});

// ===== Day-Night Cycle =====
function getTimeOfDay() {
  const elapsed = Date.now() - gameStartTime;
  return (elapsed % dayDuration) / dayDuration;
}

function getLightingFactor() {
  const cycleProgress = getTimeOfDay();
  return (Math.sin(cycleProgress * Math.PI * 2) + 1) / 2;
}

function drawSunAndMoon(lightingFactor) {
  if (lightingFactor > 0.5) {
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.arc(canvas.width - 50, 50, 30, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#F0E68C";
    ctx.beginPath();
    ctx.arc(50, 50, 25, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ===== Texture Generation & Lighting =====
const blockImages = {
  "bed": new Image(),
  "cobblestone": new Image(),
  "dirt": new Image(),
  "grass": new Image(),
  "leaves": new Image(),
  "tegelstone": new Image(), // Brick-like texture
  "wood": new Image(),
  "spruce wood": new Image(),
  "stone": new Image(),
  "coal ore": new Image(),
  "iron ore": new Image(),
  "gold ore": new Image(),
  "diamond ore": new Image(),
  "sand": new Image(),
  "sandstone": new Image(),
  "snow": new Image(),
  "ice": new Image(),
  "crafting table": new Image(),
  "glass": new Image(),
  "mossy stone": new Image(),
  "rock": new Image(),
  "spruce leaves": new Image(),
  "woodendoor": new Image()
};

// Pre-load all available block textures
blockImages.bed.src = "assets/bed.png";
blockImages.cobblestone.src = "assets/cobblestone.jpg";
blockImages.dirt.src = "assets/dirt.jpg";
blockImages.grass.src = "assets/grass.jpg";
blockImages.leaves.src = "assets/leaves.png";
blockImages.tegelstone.src = "assets/tegelstone.jpg"; // Used for brick
blockImages.wood.src = "assets/wood.jpg";
blockImages.woodendoor.src = "assets/woodendoor.png";
blockImages.stone.src = "assets/stone.jpg"; // Added stone texture
blockImages.stone.src = "assets/stone.jpg";

// Create properly sized textures for each block type
function createStaticBlockTexture(block) {
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = BLOCK_SIZE;
  tempCanvas.height = BLOCK_SIZE;
  const tCtx = tempCanvas.getContext("2d");
  
  // Default colors for textures we don't have images for
  let fillColor = "#808080"; // Default gray
  let patternColor = "#606060"; // Default pattern color
  
  switch (block) {
    case "wood":
    case "spruce wood":
      if (blockImages.wood.complete && blockImages.wood.naturalWidth > 0) {
        tCtx.drawImage(blockImages.wood, 0, 0, BLOCK_SIZE, BLOCK_SIZE);
        return tCtx.createPattern(tempCanvas, "repeat");
      }
      fillColor = block === "spruce wood" ? "#5C4033" : "#8B4513";
      patternColor = block === "spruce wood" ? "#3C2F2F" : "#5C4033";
      break;
      
    case "dirt":
      if (blockImages.dirt.complete && blockImages.dirt.naturalWidth > 0) {
        tCtx.drawImage(blockImages.dirt, 0, 0, BLOCK_SIZE, BLOCK_SIZE);
        return tCtx.createPattern(tempCanvas, "repeat");
      }
      fillColor = "#8B4513";
      patternColor = "#5C3317";
      break;
      
    case "grass":
      if (blockImages.grass.complete && blockImages.grass.naturalWidth > 0) {
        tCtx.drawImage(blockImages.grass, 0, 0, BLOCK_SIZE, BLOCK_SIZE);
        return tCtx.createPattern(tempCanvas, "repeat");
      }
      fillColor = "#006600";
      patternColor = "#00aa00";
      break;
      
    case "stone":
      if (blockImages.stone.complete && blockImages.stone.naturalWidth > 0) {
        tCtx.drawImage(blockImages.stone, 0, 0, BLOCK_SIZE, BLOCK_SIZE);
        return tCtx.createPattern(tempCanvas, "repeat");
      }
      fillColor = "#808080";
      patternColor = "#505050";
      break;
      
    case "cobblestone":
      if (blockImages.cobblestone.complete && blockImages.cobblestone.naturalWidth > 0) {
        tCtx.drawImage(blockImages.cobblestone, 0, 0, BLOCK_SIZE, BLOCK_SIZE);
        return tCtx.createPattern(tempCanvas, "repeat");
      }
      fillColor = "#505050";
      patternColor = "#303030";
      break;
      
    case "leaves":
    case "spruce leaves":
      if (blockImages.leaves.complete && blockImages.leaves.naturalWidth > 0) {
        tCtx.drawImage(blockImages.leaves, 0, 0, BLOCK_SIZE, BLOCK_SIZE);
        return tCtx.createPattern(tempCanvas, "repeat");
      }
      fillColor = block === "spruce leaves" ? "#2F4F4F" : "#006400";
      patternColor = block === "spruce leaves" ? "#4682B4" : "#228B22";
      break;
      
    case "coal ore":
      fillColor = "#808080";
      patternColor = "#333333";
      break;
      
    case "iron ore":
      fillColor = "#808080";
      patternColor = "#D87F33";
      break;
      
    case "gold ore":
      fillColor = "#808080";
      patternColor = "#FFD700";
      break;
      
    case "diamond ore":
      fillColor = "#808080";
      patternColor = "#00FFFF";
      break;
      
    case "brick":
      if (blockImages.tegelstone.complete && blockImages.tegelstone.naturalWidth > 0) {
        tCtx.drawImage(blockImages.tegelstone, 0, 0, BLOCK_SIZE, BLOCK_SIZE);
        return tCtx.createPattern(tempCanvas, "repeat");
      }
      fillColor = "#B22222";
      patternColor = "#8B0000";
      break;
      
    case "sand":
      fillColor = "#F4A460";
      patternColor = "#DEB887";
      break;
      
    case "sandstone":
      fillColor = "#D2B48C";
      patternColor = "#F4A460";
      break;
      
    case "snow":
      fillColor = "#F0F8FF";
      patternColor = "#FFFFFF";
      break;
      
    case "ice":
      fillColor = "#ADD8E6";
      patternColor = "#87CEEB";
      break;
      
    case "crafting table":
      fillColor = "#8B4513";
      patternColor = "#FFD700";
      // Draw crafting table
      tCtx.fillStyle = fillColor;
      tCtx.fillRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);
      tCtx.strokeStyle = patternColor;
      tCtx.strokeRect(2, 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);
      tCtx.fillStyle = "#FFFFFF";
      tCtx.font = "10px monospace";
      tCtx.fillText("Craft", 2, BLOCK_SIZE - 2);
      return tCtx.createPattern(tempCanvas, "repeat");
      
    case "glass":
      fillColor = "rgba(200,200,255,0.5)";
      patternColor = "rgba(200,200,255,0.8)";
      break;
      
    case "mossy stone":
      fillColor = "#808080";
      patternColor = "#228B22";
      break;
      
    case "rock":
      fillColor = "#666666";
      patternColor = "#555555";
      break;
      
    case "woodendoor":
      if (blockImages.woodendoor.complete && blockImages.woodendoor.naturalWidth > 0) {
        tCtx.drawImage(blockImages.woodendoor, 0, 0, BLOCK_SIZE, BLOCK_SIZE);
        return tCtx.createPattern(tempCanvas, "repeat");
      }
      fillColor = "#8B4513";
      patternColor = "#5C3317";
      break;
      
    case "bed":
      if (blockImages.bed.complete && blockImages.bed.naturalWidth > 0) {
        tCtx.drawImage(blockImages.bed, 0, 0, BLOCK_SIZE, BLOCK_SIZE);
        return tCtx.createPattern(tempCanvas, "repeat");
      }
      fillColor = "#FF0000";
      patternColor = "#FFFFFF";
      break;
  }
  
  // Create a simple static texture for blocks without images
  tCtx.fillStyle = fillColor;
  tCtx.fillRect(0, 0, BLOCK_SIZE, BLOCK_SIZE);
  
  // Add some texture details
  tCtx.fillStyle = patternColor;
  for (let i = 0; i < 8; i++) {
    tCtx.fillRect(
      Math.floor(Math.random() * BLOCK_SIZE), 
      Math.floor(Math.random() * BLOCK_SIZE), 
      Math.floor(2 + Math.random() * 3), 
      Math.floor(2 + Math.random() * 3)
    );
  }
  
  return tCtx.createPattern(tempCanvas, "repeat");
}

function createTexture(type) {
  if (textureCache[type]) return textureCache[type];
  
  // Create a static texture for this block type
  const pattern = createStaticBlockTexture(type);
  textureCache[type] = pattern;
  return pattern;
}

function applyLighting(color, factor) {
  if (typeof color === "string") {
    let r = parseInt(color.slice(1, 3), 16);
    let g = parseInt(color.slice(3, 5), 16);
    let b = parseInt(color.slice(5, 7), 16);
    r = Math.floor(r * factor);
    g = Math.floor(g * factor);
    b = Math.floor(b * factor);
    return `rgb(${r},${g},${b})`;
  }
  return color;
}

// ===== Render Function =====
function render() {
  const lightingFactor = getLightingFactor();
  const dayColor = DAY_SKY_COLOR;
  const nightColor = NIGHT_SKY_COLOR;
  const r = Math.floor(dayColor[0] + (nightColor[0] - dayColor[0]) * (1 - lightingFactor));
  const g = Math.floor(dayColor[1] + (nightColor[1] - dayColor[1]) * (1 - lightingFactor));
  const b = Math.floor(dayColor[2] + (nightColor[2] - dayColor[2]) * (1 - lightingFactor));
  canvas.style.background = `rgb(${r},${g},${b})`;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawSunAndMoon(lightingFactor);
  let startCol = Math.floor(camera.x / BLOCK_SIZE);
  let endCol = Math.floor((camera.x + canvas.width) / BLOCK_SIZE);
  for (let col = startCol; col <= endCol; col++) {
    generateColumn(col);
    let column = world[col];
    for (let row = 0; row < totalRows; row++) {
      const block = column[row];
      if (block === "air") continue;
      const xPos = col * BLOCK_SIZE - camera.x;
      const yPos = row * BLOCK_SIZE - camera.y;
      ctx.fillStyle = createTexture(block);
      ctx.fillRect(xPos, yPos, BLOCK_SIZE, BLOCK_SIZE);
      
      // Apply shadows without overlapping player's head or interfering with other elements
      if (!(
          col * BLOCK_SIZE < player.x + player.width &&
          col * BLOCK_SIZE + BLOCK_SIZE > player.x &&
          row * BLOCK_SIZE < player.y + player.height &&
          row * BLOCK_SIZE + BLOCK_SIZE > player.y
        )) {
        ctx.fillStyle = `rgba(0,0,0,${0.3 * (1 - lightingFactor)})`;
        ctx.fillRect(xPos, yPos, BLOCK_SIZE / 2, BLOCK_SIZE / 2);
      }
      
      ctx.strokeStyle = applyLighting("#333", lightingFactor);
      ctx.strokeRect(xPos, yPos, BLOCK_SIZE, BLOCK_SIZE);
    }
  }
  animals.forEach(drawAnimal);
  mobs.forEach(drawMob);
  
  // Draw player with correct directional image
  const px = player.x - camera.x;
  const py = player.y - camera.y;
  const currentPlayerImage = playerImages[playerDirection];
  
  if (currentPlayerImage && currentPlayerImage.complete) {
    ctx.drawImage(currentPlayerImage, px, py, player.width, player.height);
  } else {
    // Fallback if image isn't loaded
    ctx.fillStyle = applyLighting("#FFD700", lightingFactor);
    ctx.fillRect(px, py, player.width, player.height);
  }
}

// ===== Update Loop =====
function update() {
  if (paused) return;
  
  if (keys["a"] && !isDraggingPlayer) {
    player.vx = -moveSpeed;
    playerDirection = "left";
  } else if (keys["d"] && !isDraggingPlayer) {
    player.vx = moveSpeed;
    playerDirection = "right";
  } else {
    player.vx = 0;
    playerDirection = "front";
  }
  
  if (keys["w"] && player.onGround && !isDraggingPlayer) {
    player.vy = -jumpStrength;
    player.onGround = false;
  }
  
  // Only apply gravity when not being dragged
  if (!isDraggingPlayer) {
    player.vy += gravity;
    player.x += player.vx;
    player.y += player.vy;
    
    let iterations = 0, prevY;
    do {
      prevY = player.y;
      resolveCollisions();
      iterations++;
    } while (Math.abs(player.y - prevY) > 0.001 && iterations < 10);
    
    snapToGround();
    checkIfOnGround();
    
    if (wasOnGround && !player.onGround) minYInAir = player.y;
    else if (!player.onGround) minYInAir = Math.min(minYInAir, player.y);
    if (!wasOnGround && player.onGround) {
      const fallDistance = (player.y - minYInAir) / BLOCK_SIZE;
      if (fallDistance > 8) {
        const damage = Math.floor((fallDistance - 8) * 5);
        player.health -= damage;
        showMessage(`Fell from height, took ${damage} damage. Health: ${player.health}`);
        updateHealthBar(); // Update health bar after taking fall damage
        updateInventoryUI();
      }
    }
    wasOnGround = player.onGround;
  }
  
  camera.x = player.x - canvas.width / 2;
  camera.y = player.y - canvas.height / 2;
  
  // Rest of the update function remains unchanged
  ensureWorldForVisibleRange();
  cutTrees.forEach(tree => regrowTree(tree.col, tree.row, tree.timestamp));
  updateAnimals();
  updateMobs();
  if (player.invuln > 0) player.invuln--;
  
  for (let mob of mobs) {
    if (player.x < mob.x + ANIMAL_SIZE && player.x + player.width > mob.x &&
        player.y < mob.y + ANIMAL_SIZE && player.y + player.height > mob.y) {
      if (player.invuln === 0) {
        player.health -= mob.damage;
        player.invuln = INVULN_DURATION;
        showMessage(`Hit by a mob! Health: ${player.health}`);
        updateHealthBar(); // Update health bar after taking mob damage
        updateInventoryUI();
      }
    }
  }
  
  if (animals.length < 20 && Date.now() - lastAnimalSpawnTime > ANIMAL_SPAWN_INTERVAL) {
    spawnAnimals(1);
    lastAnimalSpawnTime = Date.now();
  }
  
  if (Date.now() - lastRegenTime > REGEN_INTERVAL && player.health < player.maxHealth) {
    player.health += 1;
    lastRegenTime = Date.now();
    updateHealthBar(); // Update health bar after regenerating
    updateInventoryUI();
  }
  
  if (player.health <= 0) {
    gameOverFlag = true;
    cancelAnimationFrame(gameLoopId);
    
    if (gameMode === "hardcore") {
      // In hardcore mode, kick the player out to the menu
      showMessage("Game Over! You died in Hardcore mode.");
      setTimeout(() => {
        exitToMenu();
        document.getElementById("startScreen").innerHTML += `<div class="game-over-message">You died in Hardcore mode after collecting ${Object.values(inventory).reduce((a, b) => a + b, 0)} items!</div>`;
      }, 2000);
    } else {
      // In normal mode, show the restart screen
      document.getElementById("gameOverScreen").style.display = "flex";
      document.getElementById("restartButton").onclick = resetGame;
    }
  }
}

// ===== Game Loop =====
let gameLoopId;
function gameLoop() {
  if (!paused && !gameOverFlag) update();
  render();
  gameLoopId = requestAnimationFrame(gameLoop);
}

// World creation variables
let selectedMode = "";
let selectedBiome = "";
let worldName = "";

// Setup event listeners for the world creation UI
document.addEventListener("DOMContentLoaded", () => {
    // Loading screen functionality
    const loadingBar = document.getElementById("loadingBar");
    const loadingScreen = document.getElementById("loadingScreen");
    const startScreen = document.getElementById("startScreen");
    
    // Start the loading animation
    let progress = 0;
    const loadingInterval = setInterval(() => {
        progress += 2; // Increase by 2% each frame
        if (progress > 100) {
            progress = 100;
            clearInterval(loadingInterval);
            
            // Once loading is complete, fade out the loading screen and show the main menu
            setTimeout(() => {
                loadingScreen.style.opacity = "0";
                loadingScreen.style.transition = "opacity 0.5s";
                
                setTimeout(() => {
                    loadingScreen.style.display = "none";
                    startScreen.style.display = "block"; 
                    // Update the saved games UI once the start screen is shown
                    updateSavedGamesUI();
                }, 500);
            }, 200);
        }
        loadingBar.style.width = progress + "%";
    }, 100); // Update every 100ms, total time ~5 seconds

    // World name input handling
    const worldNameInput = document.getElementById("worldNameInput");
    const createWorldButton = document.getElementById("createWorldButton");
    
    worldNameInput.addEventListener("input", () => {
        worldName = worldNameInput.value.trim();
        updateCreateButtonState();
    });
    
    // World selection buttons
    const worldSelectButtons = document.querySelectorAll(".world-select-btn");
    worldSelectButtons.forEach(button => {
        button.addEventListener("click", () => {
            // Remove selected class from all buttons
            worldSelectButtons.forEach(btn => btn.classList.remove("selected"));
            // Add selected class to clicked button
            button.classList.add("selected");
            
            // Store selected mode and biome
            selectedMode = button.getAttribute("data-mode");
            selectedBiome = button.getAttribute("data-biome");
            
            updateCreateButtonState();
        });
    });
    
    // Create button handling
    createWorldButton.addEventListener("click", () => {
        if (createWorldButton.disabled) return;
        startGame(selectedMode, selectedBiome, worldName);
    });
    
    // Function to update the Create button state
    function updateCreateButtonState() {
        createWorldButton.disabled = !worldName || !selectedMode || !selectedBiome;
    }
});

// ===== Save Game Functions =====
function saveGame() {
    const saveData = {
        worldName,
        gameMode,
        biome,
        world: JSON.parse(JSON.stringify(world)),
        player: { ...player },
        inventory: { ...inventory },
        animals: [...animals],
        mobs: [...mobs],
        cutTrees: [...cutTrees],
        gameStartTime,
        lastAnimalSpawnTime,
        lastRegenTime,
        currentTool,
        selectedBlock
    };
    let savedGames = JSON.parse(localStorage.getItem("savedGames")) || [];
    savedGames.unshift({
        data: saveData,
        timestamp: new Date().toLocaleString(),
        name: worldName || `${gameMode} - ${biome} - ${saveData.player.health} HP`
    });
    savedGames = savedGames.slice(0, 5); // Keep only the last 5 saves
    localStorage.setItem("savedGames", JSON.stringify(savedGames));
    showMessage("Game saved!");
    updateSavedGamesUI();
}

function loadGame(index) {
    const savedGames = JSON.parse(localStorage.getItem("savedGames")) || [];
    if (index < 0 || index >= savedGames.length) return;
    const save = savedGames[index].data;
    
    worldName = save.worldName || "";
    gameMode = save.gameMode;
    biome = save.biome;
    world = save.world;
    player.x = save.player.x;
    player.y = save.player.y;
    player.health = save.player.health;
    player.vx = save.player.vx;
    player.vy = save.player.vy;
    player.onGround = save.player.onGround;
    player.invuln = save.player.invuln;
    inventory = save.inventory;
    animals = save.animals;
    mobs = save.mobs;
    cutTrees = save.cutTrees;
    gameStartTime = save.gameStartTime;
    lastAnimalSpawnTime = save.lastAnimalSpawnTime;
    lastRegenTime = save.lastRegenTime;
    currentTool = save.currentTool;
    selectedBlock = save.selectedBlock;
    
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;
    minYInAir = player.y;
    wasOnGround = true;
    
    document.getElementById("startScreen").style.display = "none";
    document.getElementById("gameCanvas").style.display = "block";
    document.getElementById("inventory").style.display = "block";
    document.getElementById("toolStatus").style.display = "block";
    document.getElementById("message").style.display = "block";
    document.getElementById("craftingMenu").style.display = "none";
    document.getElementById("gameOverScreen").style.display = "none";
    document.getElementById("exitButton").style.display = "block";
    document.getElementById("healthBarContainer").style.display = "block"; // Show health bar
    
    updateHealthBar(); // Update health bar when loading game
    updateInventoryUI();
    gameOverFlag = false;
    paused = false;
    gameLoop();
    
    // Show world name if it exists
    if (worldName) {
        showMessage(`Welcome to ${worldName}!`);
    }
}

function updateSavedGamesUI() {
    const savedGamesDiv = document.getElementById("savedGames");
    const savedGames = JSON.parse(localStorage.getItem("savedGames")) || [];
    if (savedGames.length) {
        const worldList = savedGames.map((game, i) => {
            const displayName = game.name || `World ${i+1}`;
            // Add delete button alongside the load button
            return `<div class="saved-world">
                <span class="world-name">${displayName} (${game.timestamp})</span>
                <div class="world-buttons">
                    <button onclick="window.loadGame(${i})">Load</button>
                    <button class="delete-btn" onclick="window.deleteWorld(${i})">Delete</button>
                </div>
            </div>`;
        }).join("");
        savedGamesDiv.innerHTML = worldList;
    } else {
        savedGamesDiv.innerHTML = "<div class='no-worlds'>No saved worlds.</div>";
    }
}

// Function to delete a saved world
function deleteWorld(index) {
    // Ask for confirmation before deletion
    if (confirm("Are you sure you want to delete this world? This action cannot be undone.")) {
        // Get saved games from localStorage
        let savedGames = JSON.parse(localStorage.getItem("savedGames")) || [];
        
        // Check if index is valid
        if (index >= 0 && index < savedGames.length) {
            // Remove the world at the specified index
            savedGames.splice(index, 1);
            
            // Update localStorage
            localStorage.setItem("savedGames", JSON.stringify(savedGames));
            
            // Update the UI
            updateSavedGamesUI();
            
            // Show a message
            showMessage("World deleted successfully.");
        }
    }
}

// Expose the delete function to the global window object
window.deleteWorld = deleteWorld;

// ===== Start Game Function =====
function startGame(mode, selectedBiome, name = "") {
    gameMode = mode;
    biome = selectedBiome === "random" ? ["forest", "desert", "tundra"][Math.floor(Math.random() * 3)] : selectedBiome;
    worldName = name.trim();
    
    player.x = (Math.floor(Math.random() * 50) - 25) * BLOCK_SIZE;
    let spawnCol = Math.floor(player.x / BLOCK_SIZE);
    generateColumn(spawnCol);
    let groundRow = getGroundLevel(spawnCol);
    player.y = groundRow * BLOCK_SIZE - player.height;
    minYInAir = player.y;
    
    document.getElementById("startScreen").style.display = "none";
    document.getElementById("gameCanvas").style.display = "block";
    document.getElementById("inventory").style.display = "block";
    document.getElementById("toolStatus").style.display = "block";
    document.getElementById("message").style.display = "block";
    document.getElementById("craftingMenu").style.display = "none";
    document.getElementById("gameOverScreen").style.display = "none";
    document.getElementById("exitButton").style.display = "block";
    document.getElementById("healthBarContainer").style.display = "block"; // Show health bar
    
    player.health = player.maxHealth; // Reset health to max
    updateHealthBar(); // Initialize health bar
    
    ensureWorldForVisibleRange();
    spawnAnimals(3);
    updateInventoryUI(player, biome);
    gameLoop();
    
    // Show welcome message with world name if it exists
    if (worldName) {
        showMessage(`Welcome to ${worldName}!`);
    } else {
        showMessage(`Welcome to your new ${gameMode} world!`);
    }
}

// ===== Exit to Menu Function =====
function exitToMenu() {
  document.getElementById("exitMenuOverlay").style.display = "none";
  
  // Cancel the game loop first
  cancelAnimationFrame(gameLoopId);
  
  // Hide all game elements
  document.getElementById("gameCanvas").style.display = "none";
  document.getElementById("inventory").style.display = "none";
  document.getElementById("toolStatus").style.display = "none";
  document.getElementById("message").style.display = "none";
  document.getElementById("craftingMenu").style.display = "none";
  document.getElementById("gameOverScreen").style.display = "none";
  document.getElementById("exitButton").style.display = "none";
  document.getElementById("healthBarContainer").style.display = "none";
  document.getElementById("detailedInventoryUI").style.display = "none";
  
  // Show the start screen properly with block display
  document.getElementById("startScreen").style.display = "block";
  
  // Reset game data
  world = {};
  animals = [];
  mobs = [];
  cutTrees = [];
  paused = false;
  gameOverFlag = false;
  
  // Reset inventory in hardcore mode
  if (gameMode === "hardcore") {
    inventory = {
      grass: 0, dirt: 0, stone: 0, wood: 0, "spruce wood": 0, leaves: 0, "spruce leaves": 0, cobblestone: 0,
      flower: 0, coal: 0, "iron ingot": 0, "gold ingot": 0, diamond: 0,
      brick: 0, fence: 0, glass: 0, "mossy stone": 0,
      "crafting table": 0,
      meat: 0, sand: 0, sandstone: 0, snow: 0, ice: 0
    };
    player.health = player.maxHealth;
  }
  
  selectedBlock = null;
  currentTool = "hand";
  updateSavedGamesUI();
}

// ===== Helper: Tree Regrowth =====
function regrowTree(col, row, timestamp) {
  if (Date.now() >= timestamp) {
    if (biome === "forest" && world[col][row] === "grass") {
      world[col][row - 1] = "wood";
      world[col][row - 2] = "wood";
      if (row - 3 >= 0) world[col][row - 3] = "leaves";
    } else if (biome === "tundra" && world[col][row] === "snow") {
      world[col][row - 1] = "spruce wood";
      world[col][row - 2] = "spruce wood";
      if (row - 3 >= 0) world[col][row - 3] = "spruce leaves";
    }
    cutTrees = cutTrees.filter(tree => tree.col !== col || tree.row !== row);
  }
}

// ===== Helper: Display Messages =====
function showMessage(msg) {
  const messageDiv = document.getElementById("message");
  messageDiv.innerHTML = msg;
  setTimeout(() => messageDiv.innerHTML = "", 5000); // Changed from 3000 (3 seconds) to 5000 (5 seconds)
}

// ===== Reset Game Function =====
function resetGame() {
  // Reset player position
  player.x = (Math.floor(Math.random() * 50) - 25) * BLOCK_SIZE;
  let spawnCol = Math.floor(player.x / BLOCK_SIZE);
  generateColumn(spawnCol);
  let groundRow = getGroundLevel(spawnCol);
  player.y = groundRow * BLOCK_SIZE - player.height;
  player.health = player.maxHealth;
  player.invuln = 0;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  
  if (gameMode === "hardcore") {
    // In hardcore mode, reset the entire world and inventory
    world = {};
    ensureWorldForVisibleRange();
    
    inventory = {
      grass: 0, dirt: 0, stone: 0, wood: 0, "spruce wood": 0, leaves: 0, "spruce leaves": 0, cobblestone: 0,
      flower: 0, coal: 0, "iron ingot": 0, "gold ingot": 0, diamond: 0,
      brick: 0, fence: 0, glass: 0, "mossy stone": 0,
      "crafting table": 0,
      meat: 0, sand: 0, sandstone: 0, snow: 0, ice: 0
    };
    selectedBlock = null;
    currentTool = "hand";
    
    // Reset animals and mobs
    animals = [];
    spawnAnimals(3);
    mobs = [];
  } else {
    // In normal mode, keep the world and inventory, just respawn
    // Make sure there's clear space where the player respawns
    let playerCol = Math.floor(player.x / BLOCK_SIZE);
    for (let r = groundRow - 3; r < groundRow; r++) {
      if (world[playerCol] && world[playerCol][r] !== "air") {
        world[playerCol][r] = "air";
      }
    }
  }
  
  camera.x = player.x - canvas.width / 2;
  camera.y = player.y - canvas.height / 2;
  
  gameOverFlag = false;
  paused = false;
  // Regrowth and time variables
  gameStartTime = Date.now();
  lastAnimalSpawnTime = Date.now();
  lastRegenTime = Date.now();
  wasOnGround = true;
  minYInAir = player.y;
  
  document.getElementById("gameOverScreen").style.display = "none";
  document.getElementById("healthBarContainer").style.display = "block"; // Show health bar
  updateHealthBar(); // Reset health bar display
  updateInventoryUI();
  gameLoop();
  
  // Show a helpful message based on game mode
  if (gameMode === "hardcore") {
    showMessage("Game restarted! All progress was reset in hardcore mode.");
  } else {
    showMessage("You respawned! Your inventory and world were kept.");
  }
}

// ===== Event Listeners =====
document.getElementById("exitButton").addEventListener("click", toggleExitMenu);

// Exit Menu Functions
function toggleExitMenu() {
  const exitMenuOverlay = document.getElementById("exitMenuOverlay");
  if (exitMenuOverlay.style.display === "none" || !exitMenuOverlay.style.display) {
    exitMenuOverlay.style.display = "flex";
    paused = true;
  } else {
    exitMenuOverlay.style.display = "none";
    paused = false;
  }
}

// Set up exit menu button listeners and hover descriptions
document.getElementById("continueButton").addEventListener("click", function() {
  toggleExitMenu();
});

document.getElementById("saveGameButton").addEventListener("click", function() {
  saveGame();
  showMessage("Game saved!");
});

document.getElementById("goToPage1Button").addEventListener("click", function() {
  exitToMenu();
});

// New buttons for Inventory and Workbench
document.getElementById("inventoryButton").addEventListener("click", function() {
  toggleExitMenu(); // Close the menu first
  toggleDetailedInventory(true); // Open the inventory
});

document.getElementById("workbenchButton").addEventListener("click", function() {
  toggleExitMenu(); // Close the menu first
  if (hasCraftingTableInWorld(world, totalRows) || inventory["crafting table"] > 0) {
    paused = openCraftingTableUI(paused, showMessage);
  } else {
    // If no crafting table is available, open the basic crafting interface instead
    paused = openBasicCraftingUI(paused);
    showMessage("Using basic crafting. Build a crafting table for more recipes!");
  }
});

document.getElementById("settingsButton").addEventListener("click", function() {
  showMessage("Settings not implemented yet");
});

document.getElementById("controlsButton").addEventListener("click", function() {
  showMessage("WASD to move, click to break/place blocks, T for crafting, I for inventory");
});

document.getElementById("helpButton").addEventListener("click", function() {
  showMessage("Collect resources, craft tools, build and survive!");
});

document.getElementById("exitGameButton").addEventListener("click", function() {
  if (confirm("Are you sure you want to quit the game?")) {
    window.close();
    // Fallback if window.close() doesn't work (common in browsers)
    showMessage("Please close the browser tab to exit completely.");
  }
});

// Set up button description hover effects
const menuButtons = document.querySelectorAll(".exit-menu-content button");
const buttonDescription = document.getElementById("buttonDescription");

menuButtons.forEach(button => {
  button.addEventListener("mouseover", () => {
    const description = button.getAttribute("data-description");
    if (description) {
      buttonDescription.textContent = description;
      buttonDescription.style.display = "block";
    }
  });
  
  button.addEventListener("mouseout", () => {
    buttonDescription.style.display = "none";
  });
});

document.addEventListener("keydown", (e) => {
  if (!paused) keys[e.key.toLowerCase()] = true;
  if (e.key === "Escape") {
    if (document.getElementById("exitMenuOverlay").style.display === "flex") {
      toggleExitMenu();
    } else if (!gameOverFlag) {
      toggleExitMenu();
    }
  }
  if (e.key.toLowerCase() === "s" && !paused && !gameOverFlag) saveGame();
  
  // Toggle detailed inventory UI with 'i' key
  if (e.key.toLowerCase() === "i" && !gameOverFlag) {
    toggleDetailedInventory();
  }
});

document.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "t" && !paused) {
    if (hasCraftingTableInWorld(world, totalRows) || inventory["crafting table"] > 0) {
      paused = openCraftingTableUI(paused, showMessage);
    } else {
      paused = openBasicCraftingUI(paused);
    }
  }
  
  if (e.key.toLowerCase() === "e" && !paused && inventory.meat > 0) {
    inventory.meat--;
    player.health = Math.min(player.health + 20, player.maxHealth);
    showMessage("Ate meat, restored 20 health.");
    updateHealthBar(); // Update health bar after eating meat
    updateInventoryUI(player, biome);
  }
});

// ===== Detailed Inventory UI Functions =====
let inventoryVisible = false;

function toggleDetailedInventory(forceState = null) {
  const inventoryUI = document.getElementById("detailedInventoryUI");
  
  // If a specific state is set, use that, otherwise toggle
  if (forceState !== null) {
    inventoryVisible = forceState;
  } else {
    inventoryVisible = !inventoryVisible;
  }
  
  if (inventoryVisible) {
    inventoryUI.style.display = "flex";
    populateDetailedInventory();
    paused = true;
  } else {
    inventoryUI.style.display = "none";
    paused = false;
  }
}

function populateDetailedInventory() {
  // Populate tools section
  const toolsGrid = document.getElementById("toolsGrid");
  toolsGrid.innerHTML = "";
  
  tools.forEach(tool => {
    const count = tool === "hand" ? 1 : (inventory[tool] || 0);
    if (count > 0 || tool === "hand") {
      const itemDiv = document.createElement("div");
      itemDiv.className = `inventory-item item-tool ${currentTool === tool ? "selected" : ""}`;
      itemDiv.onclick = () => {
        window.equipTool(tool);
        // Update selected state visually
        document.querySelectorAll("#toolsGrid .inventory-item").forEach(el => {
          el.classList.remove("selected");
        });
        itemDiv.classList.add("selected");
      };
      
      // Create item content
      const iconDiv = document.createElement("div");
      iconDiv.className = "item-icon";
      
      // Create procedural tool icon based on tool type
      if (tool === "hand") {
        iconDiv.innerHTML = "✋";
      } else if (tool.includes("pickaxe")) {
        // Determine the material color
        let color = "#8B4513"; // Default wood color
        if (tool.includes("stone")) color = "#808080";
        if (tool.includes("iron")) color = "#C0C0C0";
        if (tool.includes("diamond")) color = "#00FFFF";
        
        iconDiv.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24">
          <path d="M6,2 L18,14 L14,18 L2,6 Z" fill="${color}" stroke="#000" stroke-width="1" />
          <rect x="14" y="14" width="3" height="8" fill="#8B4513" stroke="#000" stroke-width="1" transform="rotate(-45, 14, 14)" />
        </svg>`;
      }
      
      const nameDiv = document.createElement("div");
      nameDiv.className = "item-name";
      nameDiv.textContent = tool;
      
      if (tool !== "hand") {
        const countDiv = document.createElement("div");
        countDiv.className = "item-count";
        countDiv.textContent = count;
        itemDiv.appendChild(countDiv);
      }
      
      itemDiv.appendChild(iconDiv);
      itemDiv.appendChild(nameDiv);
      toolsGrid.appendChild(itemDiv);
    }
  });
  
  // Populate blocks section
  const blocksGrid = document.getElementById("blocksGrid");
  blocksGrid.innerHTML = "";
  
  placeableBlocks.forEach(block => {
    const count = inventory[block] || 0;
    if (count > 0) {
      const itemDiv = document.createElement("div");
      itemDiv.className = `inventory-item item-block ${selectedBlock === block ? "selected" : ""}`;
      itemDiv.onclick = () => {
        window.selectBlock(block);
        // Update selected state visually
        document.querySelectorAll("#blocksGrid .inventory-item").forEach(el => {
          el.classList.remove("selected");
        });
        itemDiv.classList.add("selected");
      };
      
      // Create item content
      const iconDiv = document.createElement("div");
      iconDiv.className = `item-icon block-texture texture-${block.replace(" ", "-")}`;
      
      const nameDiv = document.createElement("div");
      nameDiv.className = "item-name";
      nameDiv.textContent = block;
      
      const countDiv = document.createElement("div");
      countDiv.className = "item-count";
      countDiv.textContent = count;
      
      itemDiv.appendChild(iconDiv);
      itemDiv.appendChild(nameDiv);
      itemDiv.appendChild(countDiv);
      blocksGrid.appendChild(itemDiv);
    }
  });
  
  // Populate resources section
  const resourcesGrid = document.getElementById("resourcesGrid");
  resourcesGrid.innerHTML = "";
  
  Object.entries(inventory).forEach(([item, count]) => {
    // Skip tools and placeables which are already shown
    if (tools.includes(item) || placeableBlocks.includes(item)) return;
    
    if (count > 0) {
      const itemDiv = document.createElement("div");
      itemDiv.className = "inventory-item item-resource";
      
      // Create item content
      const iconDiv = document.createElement("div");
      iconDiv.className = "item-icon";
      
      // Add different icons for different resource types
      if (item === "meat") {
        iconDiv.textContent = "🥩";
      } else if (item === "coal") {
        iconDiv.textContent = "⬤";
      } else if (item.includes("ingot")) {
        iconDiv.textContent = "▬";
      } else if (item === "diamond") {
        iconDiv.textContent = "♦";
      } else {
        iconDiv.textContent = "●"; // Generic resource icon
      }
      
      const nameDiv = document.createElement("div");
      nameDiv.className = "item-name";
      nameDiv.textContent = item;
      
      const countDiv = document.createElement("div");
      countDiv.className = "item-count";
      countDiv.textContent = count;
      
      itemDiv.appendChild(iconDiv);
      itemDiv.appendChild(nameDiv);
      itemDiv.appendChild(countDiv);
      resourcesGrid.appendChild(itemDiv);
    }
  });
  
  // Show "No items" message if a section is empty
  if (toolsGrid.children.length === 0) {
    toolsGrid.innerHTML = "<div class='no-items'>No tools acquired</div>";
  }
  if (blocksGrid.children.length === 0) {
    blocksGrid.innerHTML = "<div class='no-items'>No blocks acquired</div>";
  }
  if (resourcesGrid.children.length === 0) {
    resourcesGrid.innerHTML = "<div class='no-items'>No resources acquired</div>";
  }
}

// ===== Mouse Drag Controls =====
let isDraggingPlayer = false;
let dragStartX = 0;
let dragStartY = 0;
let playerStartX = 0;
let playerStartY = 0;

// Add mouse down event for player dragging
canvas.addEventListener("mousedown", (e) => {
  if (paused) return;
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left + camera.x;
  const mouseY = e.clientY - rect.top + camera.y;
  
  // Check if click is on player AND player is on the ground
  if (mouseX >= player.x && mouseX <= player.x + player.width &&
      mouseY >= player.y && mouseY <= player.y + player.height &&
      player.onGround) {  // Added check for player being on the ground
    isDraggingPlayer = true;
    dragStartX = e.clientX - rect.left;
    dragStartY = e.clientY - rect.top;
    playerStartX = player.x;
    playerStartY = player.y;
    // Change cursor to indicate dragging
    canvas.style.cursor = "grabbing";
    // Prevent normal click handling when starting a drag
    e.preventDefault();
    e.stopPropagation();
  }
});

// Add mouse move event for player dragging
canvas.addEventListener("mousemove", (e) => {
  if (!isDraggingPlayer) return;
  const rect = canvas.getBoundingClientRect();
  const deltaX = (e.clientX - rect.left) - dragStartX;
  
  // Update player position horizontally - check for collision first
  let newX = playerStartX + deltaX;
  let oldX = player.x;
  player.x = newX;
  
  // Update camera
  camera.x = player.x - canvas.width / 2;
  
  // Check for collisions horizontally
  resolveCollisions();
  
  // If player position was corrected during collision resolution, update the drag start point
  if (player.x !== newX) {
    // The player collided, adjust the drag start to prevent sticking
    const difference = player.x - newX;
    playerStartX = playerStartX + difference;
    dragStartX = e.clientX - rect.left;
  }
  
  // Only allow vertical movement along the ground
  // Ensure player stays on the ground when dragged horizontally
  if (player.onGround) {
    // Find ground level at current position
    const pColStart = Math.floor(player.x / BLOCK_SIZE);
    const pColEnd = Math.floor((player.x + player.width - 1) / BLOCK_SIZE);
    
    // Find the highest ground level across the player's width
    let highestGround = totalRows;
    for (let col = pColStart; col <= pColEnd; col++) {
      generateColumn(col);
      let groundLevel = getGroundLevel(col);
      highestGround = Math.min(highestGround, groundLevel);
    }
    
    // Position player on the ground
    player.y = highestGround * BLOCK_SIZE - player.height;
  }
});

// Add mouse up event to stop dragging
canvas.addEventListener("mouseup", () => {
  if (isDraggingPlayer) {
    isDraggingPlayer = false;
    canvas.style.cursor = "default";
    // Check for collisions after placement
    resolveCollisions();
    checkIfOnGround();
  }
});

// Add mouse leave event to stop dragging if cursor leaves canvas
canvas.addEventListener("mouseleave", () => {
  if (isDraggingPlayer) {
    isDraggingPlayer = false;
    canvas.style.cursor = "default";
    // Check for collisions after placement
    resolveCollisions();
    checkIfOnGround();
  }
});

// Initial UI Update
updateInventoryUI(player, biome);
updateSavedGamesUI();

// Expose functions to the global window object for HTML button access
window.startGame = startGame;
window.loadGame = loadGame;
window.equipTool = equipTool;
window.selectBlock = selectBlock;
window.craftFromTable = (recipe, isBasic) => craftFromTable(recipe, isBasic, showMessage);
window.closeCraftingTableUI = () => { paused = false; closeCraftingTableUI(); };
window.toggleDetailedInventory = toggleDetailedInventory;