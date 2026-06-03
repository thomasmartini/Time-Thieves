export type ItemSource = "quiz" | "npc" | "pickup" | "memory";

export interface InventoryItem {
  itemId: string;
  source: ItemSource;
  sourceId: string;
  acquiredAt: number;
  metadata?: Record<string, unknown>;
}

const INVENTORY_STORAGE_KEY = "time-thieves-inventory";

function getInventory(): InventoryItem[] {
  try {
    const stored = window.localStorage.getItem(INVENTORY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveInventory(items: InventoryItem[]): void {
  window.localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(items));
}

export function addInventoryItem(
  itemId: string,
  source: ItemSource,
  sourceId: string,
  metadata?: Record<string, unknown>,
): InventoryItem {
  const inventory = getInventory();

  const existingIndex = inventory.findIndex((item) => item.itemId === itemId);
  if (existingIndex >= 0) {
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

  window.dispatchEvent(
    new CustomEvent("inventory-item-added", {
      detail: newItem,
    }),
  );

  return newItem;
}

export function hasInventoryItem(itemId: string): boolean {
  const inventory = getInventory();
  return inventory.some((item) => item.itemId === itemId);
}

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

export function getFullInventory(): InventoryItem[] {
  return getInventory();
}

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
