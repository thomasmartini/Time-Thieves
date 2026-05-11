export type ItemSource = "quiz" | "npc" | "pickup";

export interface InventoryItem {
  itemId: string;
  source: ItemSource;
  sourceId: string; // quiz1, npc-id, location-id, etc.
  acquiredAt: number; // timestamp
  metadata?: Record<string, unknown>; // arbitrary data (score, dialogue node, etc.)
}

const INVENTORY_STORAGE_KEY = "time-thieves-inventory";

function getInventory(): InventoryItem[] {
  try {
    const stored = window.sessionStorage.getItem(INVENTORY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveInventory(items: InventoryItem[]): void {
  window.sessionStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(items));
}

/**
 * Add an item to the player's inventory
 */
export function addInventoryItem(
  itemId: string,
  source: ItemSource,
  sourceId: string,
  metadata?: Record<string, unknown>,
): InventoryItem {
  const inventory = getInventory();

  // Check if item already exists
  const existingIndex = inventory.findIndex((item) => item.itemId === itemId);
  if (existingIndex >= 0) {
    // Item already in inventory, don't duplicate
    return inventory[existingIndex];
  }

  const newItem: InventoryItem = {
    itemId,
    source,
    sourceId,
    acquiredAt: Date.now(),
    metadata,
  };

  inventory.push(newItem);
  saveInventory(inventory);

  // Dispatch event for other systems to react to
  window.dispatchEvent(
    new CustomEvent("inventory-item-added", {
      detail: newItem,
    }),
  );

  return newItem;
}

/**
 * Check if player has a specific item
 */
export function hasInventoryItem(itemId: string): boolean {
  const inventory = getInventory();
  return inventory.some((item) => item.itemId === itemId);
}

/**
 * Get all items from a specific source
 */
export function getInventoryItemsBySource(
  source: ItemSource,
  sourceId?: string,
): InventoryItem[] {
  const inventory = getInventory();
  return inventory.filter(
    (item) =>
      item.source === source && (!sourceId || item.sourceId === sourceId),
  );
}

/**
 * Get the entire inventory
 */
export function getFullInventory(): InventoryItem[] {
  return getInventory();
}

/**
 * Remove an item from inventory
 */
export function removeInventoryItem(itemId: string): boolean {
  const inventory = getInventory();
  const index = inventory.findIndex((item) => item.itemId === itemId);

  if (index >= 0) {
    const removed = inventory.splice(index, 1)[0];
    saveInventory(inventory);

    window.dispatchEvent(
      new CustomEvent("inventory-item-removed", {
        detail: removed,
      }),
    );
    return true;
  }

  return false;
}
