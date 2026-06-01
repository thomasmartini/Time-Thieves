const INVENTORY_STORAGE_KEY = "time-thieves-inventory";
/**
 * This module manages the player's inventory, which is stored in sessionStorage.
 */
export function getInventoryItems() {
  try {
    const stored = window.sessionStorage.getItem(INVENTORY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}
/**
 * This function populates the inventory with dummy items for testing purposes. It creates a set of predefined items and saves them to sessionStorage under the INVENTORY_STORAGE_KEY. Each item has an itemId, source, sourceId, acquiredAt timestamp, and metadata. If there is an error while saving to sessionStorage, it logs a warning to the console.
 */
export function populateDummyInventory() {
  const dummyItems = [
    {
      itemId: "boek-erasmus",
      source: "quiz",
      sourceId: "quiz-1",
      acquiredAt: Date.now() - 3600000,
      metadata: {},
    },
    {
      itemId: "bakstenen-verwoeste-stad",
      source: "pickup",
      sourceId: "zone-1",
      acquiredAt: Date.now() - 1800000,
      metadata: {},
    },
  ];

  try {
    window.sessionStorage.setItem(
      INVENTORY_STORAGE_KEY,
      JSON.stringify(dummyItems),
    );
  } catch {
    console.warn("Could not save inventory to sessionStorage");
  }
}
