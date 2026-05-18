const INVENTORY_STORAGE_KEY = "time-thieves-inventory";

export function getInventoryItems() {
  try {
    const stored = window.sessionStorage.getItem(INVENTORY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

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
