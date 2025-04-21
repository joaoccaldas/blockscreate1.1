// crafting.js - Handles all crafting functionality and recipes

// Import inventory data
import { inventory, updateInventoryUI } from './inventory.js';

// ===== Recipe Definitions =====
const basicRecipes = { 
  "crafting table": { "wood": 4 }
};

const tableRecipes = {
  "wooden pickaxe": { "wood": 5 },
  "stone pickaxe": { "wood": 5, "cobblestone": 3 },
  "iron pickaxe": { "wood": 5, "iron ingot": 3 },
  "diamond pickaxe": { "wood": 5, "diamond": 3 },
  "brick": { "wood": 2, "stone": 2 },
  "fence": { "wood": 4 },
  "glass": { "sand": 3 },
  "mossy stone": { "stone": 4, "coal": 1 },
  "bed": { "wood": 3, "cobblestone": 1 },
  "woodendoor": { "wood": 6 }
};

// Advanced recipes that require specific tools or conditions
const advancedRecipes = {
  "enchanted diamond pickaxe": { 
    "diamond pickaxe": 1, 
    "diamond": 5,
    "special": "Requires standing near a crafting table at night" 
  }
};

// ===== Crafting UI Functions =====
function openCraftingTableUI(paused, showMessage) {
  paused = true;
  const craftDiv = document.getElementById("craftingMenu");
  let html = `<h2>Crafting Table</h2><div>Select a recipe:</div>`;
  
  for (let recipe in tableRecipes) {
    const reqs = tableRecipes[recipe];
    const canCraft = canCraftItem(recipe, reqs);
    html += `<div class="recipe ${canCraft ? 'canCraft' : ''}" onclick="window.craftFromTable('${recipe}')">${recipe} (${formatRequirements(reqs)})</div>`;
  }
  
  html += `<h3>Basic Recipes</h3>`;
  for (let recipe in basicRecipes) {
    const reqs = basicRecipes[recipe];
    const canCraft = canCraftItem(recipe, reqs);
    html += `<div class="recipe ${canCraft ? 'canCraft' : ''}" onclick="window.craftFromTable('${recipe}', true)">${recipe} (${formatRequirements(reqs)})</div>`;
  }
  
  html += `<button onclick="window.closeCraftingTableUI()">Close</button>`;
  craftDiv.innerHTML = html;
  craftDiv.style.display = "block";
  return paused;
}

function openBasicCraftingUI(paused) {
  paused = true;
  const craftDiv = document.getElementById("craftingMenu");
  let html = `<h2>Basic Crafting</h2><div>Select a basic recipe:</div>`;
  
  for (let recipe in basicRecipes) {
    const reqs = basicRecipes[recipe];
    const canCraft = canCraftItem(recipe, reqs);
    html += `<div class="recipe ${canCraft ? 'canCraft' : ''}" onclick="window.craftFromTable('${recipe}', true)">${recipe} (${formatRequirements(reqs)})</div>`;
  }
  
  html += `<button onclick="window.closeCraftingTableUI()">Close</button>`;
  craftDiv.innerHTML = html;
  craftDiv.style.display = "block";
  return paused;
}

function closeCraftingTableUI() {
  document.getElementById("craftingMenu").style.display = "none";
  return false; // paused = false
}

// Helper function to format recipe requirements for display
function formatRequirements(reqs) {
  return Object.entries(reqs).map(([item, num]) => `${item}: ${num}`).join(", ");
}

// Helper function to check if player can craft an item
function canCraftItem(recipe, requirements) {
  return Object.entries(requirements).every(([item, needed]) => (inventory[item] || 0) >= needed);
}

// Main crafting function
function craftFromTable(recipe, isBasic, showMessage) {
  let reqs = isBasic ? basicRecipes[recipe] : tableRecipes[recipe];
  if (!reqs) return;
  
  if (!canCraftItem(recipe, reqs)) {
    showMessage(`Not enough materials for ${recipe}!`);
    return;
  }
  
  // Consume the required materials
  for (let [item, needed] of Object.entries(reqs)) {
    inventory[item] -= needed;
  }
  
  // Add the crafted item to inventory
  inventory[recipe] = (inventory[recipe] || 0) + 1;
  showMessage(`Crafted ${recipe}!`);
  updateInventoryUI();
}

// Check if there is a crafting table in the world
function hasCraftingTableInWorld(world, totalRows) {
  for (let c in world) {
    for (let r = 0; r < totalRows; r++) {
      if (world[c][r] === "crafting table") return true;
    }
  }
  return false;
}

// ===== Crafting System Functions =====

// Check if a recipe can be crafted with current inventory
function checkRecipeAvailability(recipe) {
  const recipeList = {};
  
  // Combine all recipe types for checking
  Object.assign(recipeList, basicRecipes, tableRecipes, advancedRecipes);
  
  const recipeRequirements = recipeList[recipe];
  if (!recipeRequirements) return false;
  
  return Object.entries(recipeRequirements).every(([item, needed]) => {
    // Skip special requirements for availability check
    if (item === "special") return true;
    return (inventory[item] || 0) >= needed;
  });
}

// Get all available recipes that can be crafted now
function getAvailableRecipes(hasTable = false) {
  const available = [];
  
  // Always check basic recipes
  for (let recipe in basicRecipes) {
    if (canCraftItem(recipe, basicRecipes[recipe])) {
      available.push({ name: recipe, type: 'basic' });
    }
  }
  
  // Check table recipes only if we have a table
  if (hasTable) {
    for (let recipe in tableRecipes) {
      if (canCraftItem(recipe, tableRecipes[recipe])) {
        available.push({ name: recipe, type: 'table' });
      }
    }
  }
  
  return available;
}

// Export crafting functionality
export {
  basicRecipes,
  tableRecipes,
  advancedRecipes,
  openCraftingTableUI,
  openBasicCraftingUI,
  closeCraftingTableUI,
  craftFromTable,
  hasCraftingTableInWorld,
  checkRecipeAvailability,
  getAvailableRecipes
};