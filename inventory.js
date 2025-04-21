// inventory.js - Handles inventory and tools functionality

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

// ===== Inventory & Tools =====
let currentTool = "hand";
const tools = ["hand", "wooden pickaxe", "stone pickaxe", "iron pickaxe", "diamond pickaxe"];
const requiredTools = {
  "stone": "wooden pickaxe",
  "coal ore": "stone pickaxe",
  "iron ore": "stone pickaxe",
  "gold ore": "iron pickaxe",
  "diamond ore": "iron pickaxe",
  "sandstone": "wooden pickaxe",
  "ice": "wooden pickaxe"
};
const blockDrops = {
  "stone": "cobblestone",
  "coal ore": "coal",
  "iron ore": "iron ingot",
  "gold ore": "gold ingot",
  "diamond ore": "diamond",
  "wood": "wood",
  "spruce wood": "spruce wood",
  "leaves": "leaves",
  "spruce leaves": "spruce leaves",
  "brick": "brick",
  "fence": "fence",
  "glass": "glass",
  "mossy stone": "mossy stone",
  "cobblestone": "cobblestone",
  "flower": "flower",
  "crafting table": "crafting table",
  "sand": "sand",
  "sandstone": "sandstone",
  "snow": "snow",
  "ice": "ice",
  "bed": "bed",
  "woodendoor": "woodendoor"
};
const toolTiers = {
  "hand": 0,
  "wooden pickaxe": 1,
  "stone pickaxe": 2,
  "iron pickaxe": 3,
  "diamond pickaxe": 4
};

let inventory = {
  grass: 0, dirt: 0, stone: 0, wood: 0, "spruce wood": 0, leaves: 0, "spruce leaves": 0, cobblestone: 0,
  flower: 0, coal: 0, "iron ingot": 0, "gold ingot": 0, diamond: 0,
  brick: 0, fence: 0, glass: 0, "mossy stone": 0,
  "crafting table": 0,
  meat: 0, sand: 0, sandstone: 0, snow: 0, ice: 0
};
const placeableBlocks = ["grass", "dirt", "stone", "wood", "spruce wood", "leaves", "spruce leaves", "cobblestone", "flower", "brick", "glass", "fence", "mossy stone", "crafting table", "sand", "sandstone", "snow", "ice", "bed", "woodendoor"];
let selectedBlock = null;

function updateInventoryUI(player, biome) {
  const invDiv = document.getElementById("inventory");
  const toolDisplay = tools.map(tool => {
    if (tool === "hand") return `<span class="${currentTool === 'hand' ? 'selected' : ''}" onclick="window.equipTool('hand')">hand</span>`;
    const count = inventory[tool] || 0;
    return count > 0 ? `<span class="${currentTool === tool ? 'selected' : ''}" onclick="window.equipTool('${tool}')">${tool}: ${count}</span>` : '';
  }).filter(str => str).join(" | ");
  
  const placeable = placeableBlocks.map(type => {
    const count = inventory[type] || 0;
    const selected = type === selectedBlock ? "selected" : "";
    return `<span class="${selected}" onclick="window.selectBlock('${type}')">${type}: ${count}</span>`;
  }).join(" | ");
  
  const craftingItems = Object.entries(inventory)
    .filter(([type]) => !placeableBlocks.includes(type) && !tools.includes(type) && inventory[type] > 0)
    .map(([type, count]) => `${type}: ${count}`)
    .join(" | ");
  
  invDiv.innerHTML = `Inventory:<br>Tools: ${toolDisplay}<br>Placeable: ${placeable}<br>Other: ${craftingItems || 'None'}`;
  
  // Check if player and biome parameters exist before using them
  const healthDisplay = player ? player.health : "N/A";
  const biomeDisplay = biome || "Unknown";
  
  document.getElementById("toolStatus").innerHTML = `Tool: ${currentTool} | Health: ${healthDisplay} | Biome: ${biomeDisplay}`;
}

function selectBlock(type) {
  if (placeableBlocks.includes(type) && inventory[type] > 0) {
    selectedBlock = type;
    updateInventoryUI();
  }
}

function equipTool(tool) {
  if (tool === "hand" || inventory[tool] > 0) {
    currentTool = tool;
    updateInventoryUI();
  }
}

// Export inventory functionality
export {
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
  equipTool,
  openCraftingTableUI,
  openBasicCraftingUI,
  closeCraftingTableUI,
  craftFromTable,
  hasCraftingTableInWorld
};