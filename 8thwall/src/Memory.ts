import * as ecs from "@8thwall/ecs";
import { addInventoryItem } from "./Inventory";

// Types for memory game
interface CardState {
  isFlipped: boolean;
  imageId: string;
  isMatched: boolean;
}

interface MemoryGameStateData {
  cards: CardState[];
  flippedCards: number[]; // Store indices of currently flipped cards
  moves: number;
  matchedPairs: number;
  isProcessing: boolean; // Prevent clicking while comparing
}

// Card pairs - Each pair has the same imageId (4x4 grid = 8 pairs)
// These are the actual image asset paths from your scene
const CARD_PAIRS: string[] = [
  "image-1",
  "image-1",
  "image-2",
  "image-2",
  "image-3",
  "image-3",
  "image-4",
  "image-4",
  "image-5",
  "image-5",
  "image-6",
  "image-6",
  "image-7",
  "image-7",
  "image-8",
  "image-8",
];

// Back of card image - solid color
const BACK_IMAGE_URL = "#4a5568";

// Map card IDs to asset paths
// Update these to match your actual 8th Wall asset URLs
const CARD_IMAGE_MAP: Record<string, string> = {
  "image-1": "assets/Photographer.png",
  "image-2": "assets/Student.png",
  "image-3": "assets/Time_Thief.png",
  "image-4": "assets/Professor.png",
  "image-5": "assets/TT_Photographer_Style2_1.png",
  "image-6": "assets/TT_Professor_Style2_1.png",
  "image-7": "assets/TT_Student_Style2_1.png",
  "image-8": "assets/Photographer_1.png",
};

// Storage key for persisting game state
const MEMORY_GAME_STATE_KEY = "time-thieves-memory-game-state";
const MEMORY_GAME_COMPLETED_TEXT =
  "Memory game has been completed already. You have already earned this reward.";

/**
 * Initialize memory game state
 */
function initializeGameState(): MemoryGameStateData {
  const shuffledCards = shuffleArray(CARD_PAIRS).map((imageId) => ({
    isFlipped: false,
    imageId,
    isMatched: false,
  }));

  return {
    cards: shuffledCards,
    flippedCards: [],
    moves: 0,
    matchedPairs: 0,
    isProcessing: false,
  };
}

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray(array: string[]): string[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Load or create game state
 */
function loadGameState(): MemoryGameStateData {
  const stored = localStorage.getItem(MEMORY_GAME_STATE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return initializeGameState();
    }
  }
  return initializeGameState();
}

/**
 * Save game state to localStorage
 */
function saveGameState(state: MemoryGameStateData): void {
  localStorage.setItem(MEMORY_GAME_STATE_KEY, JSON.stringify(state));
}

function isGameStateComplete(state: MemoryGameStateData): boolean {
  return state.matchedPairs === CARD_PAIRS.length / 2;
}

function showCompletionText(world: ecs.World, schema: any, text: string): void {
  if (!schema.rewardTextTarget) {
    return;
  }

  const rewardTextEntity = resolveTargetEntity(world, schema.rewardTextTarget);
  if (!rewardTextEntity) {
    return;
  }

  if (rewardTextEntity.isHidden()) rewardTextEntity.show();
  if (rewardTextEntity.isDisabled()) rewardTextEntity.enable();
  rewardTextEntity.set(ecs.Ui, {
    text,
  });
}

function showCompletionReward(world: ecs.World, schema: any): void {
  const rewardEntity = resolveTargetEntity(world, schema.rewardItemTarget);
  if (rewardEntity) {
    if (rewardEntity.isHidden()) rewardEntity.show();
    if (rewardEntity.isDisabled()) rewardEntity.enable();
  }

  showCompletionText(world, schema, MEMORY_GAME_COMPLETED_TEXT);
}

/**
 * Find an entity by name in the scene hierarchy
 */
function findByName(root: ecs.Entity, targetName: string): ecs.Entity | null {
  const normalizedTargetName = targetName.trim().toLowerCase();
  const queue: ecs.Entity[] = [root];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const runtimeName = (current as unknown as { name?: string }).name;
    if ((runtimeName || "").trim().toLowerCase() === normalizedTargetName) {
      return current;
    }

    queue.push(...current.getChildren());
  }

  return null;
}

/**
 * Resolve an entity ID to an actual entity
 */
function resolveTargetEntity(
  world: ecs.World,
  targetEid?: bigint,
): ecs.Entity | null {
  if (!targetEid || !world.eidToEntity.has(targetEid)) {
    return null;
  }

  return world.getEntity(targetEid);
}

/**
 * Get all card entities (gets them directly as children of root)
 */
function getCardEntities(
  world: ecs.World,
  eid: bigint,
  schema: any,
): ecs.Entity[] {
  const root = schema.gameRoot
    ? resolveTargetEntity(world, schema.gameRoot)
    : world.getEntity(eid);
  if (!root) return [];

  const cardEntities: ecs.Entity[] = [];

  // If card EIDs are provided in schema, use them
  if (schema.cardEids && schema.cardEids.length > 0) {
    for (const cardEid of schema.cardEids) {
      const entity = resolveTargetEntity(world, cardEid);
      if (entity) {
        cardEntities.push(entity);
      }
    }
    return cardEntities;
  }

  // Otherwise, get the direct children of root (they are the card entities in order)
  const children = root.getChildren();
  return children.slice(0, 16); // Return up to 16 children as cards
}

/**
 * Update card visual appearance using 8th Wall Ui component
 */
function updateCardVisual(
  cardEntity: ecs.Entity,
  card: CardState,
  isSelected = false,
): void {
  if (!cardEntity.has(ecs.Ui)) {
    console.warn("Card entity does not have Ui component");
    return;
  }

  const imageUrl = CARD_IMAGE_MAP[card.imageId] || BACK_IMAGE_URL;
  const showFace = card.isFlipped || card.isMatched || isSelected;

  console.log(
    `Updating card ${card.imageId} visual. Flipped: ${card.isFlipped}, Matched: ${card.isMatched}, Selected: ${isSelected}`,
  );

  const uiUpdate: any = {
    background: BACK_IMAGE_URL,
    backgroundSize: showFace ? "contain" : "cover",
    image: showFace ? imageUrl : "assets/Group_6.png",
  };

  console.log(`Card ${card.imageId} visual update:`, uiUpdate);

  // Add visual feedback for matched cards
  if (card.isMatched) {
    uiUpdate.opacity = 0.6;
  } else {
    uiUpdate.opacity = 1;
  }

  // Selected state shows the actual card image as background (no border styling)

  cardEntity.set(ecs.Ui, uiUpdate);
  console.log(`Card visual updated`);
}

/**
 * Get the game root entity
 */
function getGameRoot(
  world: ecs.World,
  eid: bigint,
  configuredRootEid?: bigint,
): ecs.Entity {
  if (configuredRootEid && world.eidToEntity.has(configuredRootEid)) {
    return world.getEntity(configuredRootEid);
  }

  return world.getEntity(eid);
}

/**
 * Check if this memory game scene should be active
 */
const queryParams = new URLSearchParams(window.location.search);
const requestedSceneId =
  queryParams.get("scene")?.trim().toLowerCase() || undefined;

function normalizeId(value: string | undefined): string {
  return value?.trim().toLowerCase() || "";
}

function shouldHandleMemoryScene(
  componentSceneId: string | undefined,
): boolean {
  if (!requestedSceneId) {
    return false;
  }

  return normalizeId(componentSceneId) === requestedSceneId;
}

// Register the MemoryGame component with ECS
ecs.registerComponent({
  name: "MemoryGame",
  schema: {
    sceneId: "string", // e.g., "de-verwoeste-stad-05"
    gameRoot: "eid",
    cardEids: ["eid"], // Optional: direct entity references for cards
    rewardItemTarget: "eid", // Optional: item to show on completion
    rewardTextTarget: "eid", // Optional: text to show on completion
  },
  schemaDefaults: {
    sceneId: "de-verwoeste-stad-05",
  },

  add: (world, component) => {
    const schema = component.schema;
    const root = getGameRoot(world, component.eid, schema.gameRoot);
    const shouldHandle = shouldHandleMemoryScene(schema.sceneId);

    // Hide/show the game root based on whether this scene is active
    if (shouldHandle) {
      if (root.isHidden()) {
        root.show();
      }
      if (root.isDisabled()) {
        root.enable();
      }
    } else {
      if (!root.isHidden()) {
        root.hide();
      }
      if (!root.isDisabled()) {
        root.disable();
      }
    }
  },

  stateMachine: ({ world, eid, schemaAttribute }) => {
    let gameState: MemoryGameStateData = initializeGameState();
    let cardEntities: ecs.Entity[] = [];
    let initialized = false;
    let isLocked = false;
    let isGameComplete = false;

    const initialSchema = schemaAttribute.get(eid);

    const handleCardFlip = (cardIndex: number) => {
      console.log(`Card ${cardIndex} was clicked!`);

      const schema = schemaAttribute.get(eid);
      if (
        !shouldHandleMemoryScene(schema.sceneId) ||
        isLocked ||
        isGameComplete
      ) {
        return;
      }

      if (cardIndex < 0 || cardIndex >= gameState.cards.length) {
        console.warn(`Invalid card index: ${cardIndex}`);
        return;
      }

      const card = gameState.cards[cardIndex];
      const cardEntity = cardEntities[cardIndex];

      // Prevent clicking if already matched, already flipped, or still processing
      if (
        card.isMatched ||
        gameState.flippedCards.includes(cardIndex) ||
        gameState.isProcessing
      ) {
        return;
      }

      console.log(`Flipping card ${cardIndex}`);
      card.isFlipped = true;
      gameState.flippedCards.push(cardIndex);
      updateCardVisual(cardEntity, card, true);

      // Check if we have two cards flipped
      if (gameState.flippedCards.length === 2) {
        isLocked = true;
        gameState.isProcessing = true;
        gameState.moves++;

        const [firstIndex, secondIndex] = gameState.flippedCards;
        const firstCard = gameState.cards[firstIndex];
        const secondCard = gameState.cards[secondIndex];

        // Compare the two cards
        if (firstCard.imageId === secondCard.imageId) {
          // Match found!
          firstCard.isMatched = true;
          secondCard.isMatched = true;
          gameState.matchedPairs++;

          updateCardVisual(cardEntities[firstIndex], firstCard, false);
          updateCardVisual(cardEntities[secondIndex], secondCard, false);

          gameState.flippedCards = [];
          gameState.isProcessing = false;
          isLocked = false;

          // Check if game is complete
          if (gameState.matchedPairs === CARD_PAIRS.length / 2) {
            isGameComplete = true;
            showCompletionReward(world, schema);

            addInventoryItem("memory-game-completed", "quiz", schema.sceneId, {
              moves: gameState.moves,
              pairs: gameState.matchedPairs,
            });
            window.dispatchEvent(
              new CustomEvent("memory-game-complete", {
                detail: {
                  sceneId: schema.sceneId,
                  moves: gameState.moves,
                  pairs: gameState.matchedPairs,
                },
              }),
            );
          }

          saveGameState(gameState);
        } else {
          // No match, flip cards back after a delay
          setTimeout(() => {
            firstCard.isFlipped = false;
            secondCard.isFlipped = false;

            updateCardVisual(cardEntities[firstIndex], firstCard, false);
            updateCardVisual(cardEntities[secondIndex], secondCard, false);

            gameState.flippedCards = [];
            gameState.isProcessing = false;
            isLocked = false;
            saveGameState(gameState);
          }, 1000);
        }
      } else {
        saveGameState(gameState);
      }
    };

    // Define default state
    const defaultStateBuilder = ecs
      .defineState("default")
      .initial()
      .onEnter(() => {
        const schema = schemaAttribute.get(eid);
        if (!shouldHandleMemoryScene(schema.sceneId)) {
          return;
        }

        if (initialized) {
          return;
        }

        console.log("Initializing memory game...");
        gameState = loadGameState();
        isGameComplete = isGameStateComplete(gameState);

        // FIND CARDS HERE - not in add(), because scene entities aren't ready yet
        const root = getGameRoot(world, eid, schema.gameRoot);
        cardEntities = getCardEntities(world, eid, schema);
        console.log(`Found ${cardEntities.length} card entities in onEnter`);
        console.log(
          `Root entity:`,
          (root as unknown as { name?: string }).name || "unknown",
        );

        if (cardEntities.length === 0) {
          console.warn("No cards found - checking available entities:");
          // Log all children of root to debug
          const children = root.getChildren();
          console.warn(
            `Root has ${children.length} children:`,
            children.map((c: any) => c.name || "unnamed"),
          );
          return;
        }

        initialized = true;

        if (isGameComplete) {
          showCompletionReward(world, schema);
        } else if (schema.rewardTextTarget) {
          const rewardTextEntity = resolveTargetEntity(
            world,
            schema.rewardTextTarget,
          );
          if (rewardTextEntity) {
            if (!rewardTextEntity.isHidden()) rewardTextEntity.hide();
            if (!rewardTextEntity.isDisabled()) rewardTextEntity.disable();
          }
        }

        // Update all card visuals
        cardEntities.forEach((cardEntity, index) => {
          if (index < gameState.cards.length) {
            console.log(`Initialized card ${index + 1}`);
            updateCardVisual(cardEntity, gameState.cards[index]);
          }
        });

        // NOW set up event handlers for each found card
        console.log("Setting up event listeners for found cards...");
        for (let i = 0; i < cardEntities.length && i < 16; i++) {
          const cardEntity = cardEntities[i];
          const cardEid = (cardEntity as unknown as { eid: bigint }).eid;
          console.log(`Adding touch listener for card ${i + 1}`);
          defaultStateBuilder.listen(
            () => cardEid,
            ecs.input.SCREEN_TOUCH_START,
            () => {
              handleCardFlip(i);
            },
          );
        }
      });
  },
});
