import * as ecs from "@8thwall/ecs";
import { addInventoryItem } from "./Inventory";

interface CardState {
  isFlipped: boolean;
  imageId: string;
  isMatched: boolean;
}

interface MemoryGameStateData {
  cards: CardState[];
  flippedCards: number[];
  moves: number;
  matchedPairs: number;
  isProcessing: boolean;
}

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

const BACK_IMAGE_URL = "#4a5568";

const CARD_IMAGE_MAP: Record<string, string> = {
  "image-1": "assets/Memory_Bosjeskerk.png",
  "image-2": "assets/Memory_Dijkstraat.png",
  "image-3": "assets/Memory_Maasstation.png",
  "image-4": "assets/Memory_Nassaustraat.png",
  "image-5": "assets/Memory_Puinruimers.png",
  "image-6": "assets/Memory_Scheepsmakershaven.png",
  "image-7": "assets/Memory_SintLaurensKerk.png",
  "image-8": "assets/Memory_Tivoli.png",
};

const MEMORY_GAME_STATE_KEY = "time-thieves-memory-game-state";
const MEMORY_GAME_JUST_COMPLETED_TEXT =
  "Goed gedaan! Je hebt Memory voltooid en een item als beloning ontvangen.";
const MEMORY_GAME_ALREADY_COMPLETED_TEXT =
  "Je hebt Memory al uitgespeeld en deze beloning al verdiend.";

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

function shuffleArray(array: string[]): string[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

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

function showCompletionReward(
  world: ecs.World,
  schema: any,
  text: string = MEMORY_GAME_JUST_COMPLETED_TEXT,
): void {
  const rewardEntity = resolveTargetEntity(world, schema.rewardItemTarget);
  if (rewardEntity) {
    if (rewardEntity.isHidden()) rewardEntity.show();
    if (rewardEntity.isDisabled()) rewardEntity.enable();
  }

  showCompletionText(world, schema, text);
}

function resolveTargetEntity(
  world: ecs.World,
  targetEid?: bigint,
): ecs.Entity | null {
  if (!targetEid || !world.eidToEntity.has(targetEid)) {
    return null;
  }

  return world.getEntity(targetEid);
}

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

  if (schema.cardEids && schema.cardEids.length > 0) {
    for (const cardEid of schema.cardEids) {
      const entity = resolveTargetEntity(world, cardEid);
      if (entity) {
        cardEntities.push(entity);
      }
    }
    return cardEntities;
  }

  const children = root.getChildren();
  return children.slice(0, 16);
}

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
    backgroundSize: showFace ? "stretch" : "stretch",
    image: showFace ? imageUrl : "assets/TimeThievesMemoryCard.png",
  };

  console.log(`Card ${card.imageId} visual update:`, uiUpdate);

  if (card.isMatched) {
    uiUpdate.opacity = 0.6;
  } else {
    uiUpdate.opacity = 1;
  }

  cardEntity.set(ecs.Ui, uiUpdate);
  console.log(`Card visual updated`);
}

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

ecs.registerComponent({
  name: "MemoryGame",
  schema: {
    sceneId: "string",
    gameRoot: "eid",
    cardEids: ["eid"],
    rewardItemTarget: "eid",
    rewardTextTarget: "eid",
  },
  schemaDefaults: {
    sceneId: "de-verwoeste-stad-05",
  },

  add: (world, component) => {
    const schema = component.schema;
    const root = getGameRoot(world, component.eid, schema.gameRoot);
    const shouldHandle = shouldHandleMemoryScene(schema.sceneId);

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

      if (gameState.flippedCards.length === 2) {
        isLocked = true;
        gameState.isProcessing = true;
        gameState.moves++;

        const [firstIndex, secondIndex] = gameState.flippedCards;
        const firstCard = gameState.cards[firstIndex];
        const secondCard = gameState.cards[secondIndex];

        if (firstCard.imageId === secondCard.imageId) {
          firstCard.isMatched = true;
          secondCard.isMatched = true;
          gameState.matchedPairs++;

          updateCardVisual(cardEntities[firstIndex], firstCard, false);
          updateCardVisual(cardEntities[secondIndex], secondCard, false);

          gameState.flippedCards = [];
          gameState.isProcessing = false;
          isLocked = false;

          if (gameState.matchedPairs === CARD_PAIRS.length / 2) {
            isGameComplete = true;
            showCompletionReward(world, schema);

            addInventoryItem(
              "Zandloper onderdeel 2",
              "memory",
              schema.sceneId,
              {
                moves: gameState.moves,
                pairs: gameState.matchedPairs,
              },
            );
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

        const root = getGameRoot(world, eid, schema.gameRoot);
        cardEntities = getCardEntities(world, eid, schema);
        console.log(`Found ${cardEntities.length} card entities in onEnter`);
        console.log(
          `Root entity:`,
          (root as unknown as { name?: string }).name || "unknown",
        );

        if (cardEntities.length === 0) {
          console.warn("No cards found - checking available entities:");

          const children = root.getChildren();
          console.warn(
            `Root has ${children.length} children:`,
            children.map((c: any) => c.name || "unnamed"),
          );
          return;
        }

        initialized = true;

        if (isGameComplete) {
          showCompletionReward(
            world,
            schema,
            MEMORY_GAME_ALREADY_COMPLETED_TEXT,
          );
        } else if (schema.rewardTextTarget) {
          const rewardTextEntity = resolveTargetEntity(
            world,
            schema.rewardTextTarget,
          );
        }

        cardEntities.forEach((cardEntity, index) => {
          if (index < gameState.cards.length) {
            console.log(`Initialized card ${index + 1}`);
            updateCardVisual(cardEntity, gameState.cards[index]);
          }
        });

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
