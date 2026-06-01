import * as ecs from "@8thwall/ecs";
import { addInventoryItem, hasInventoryItem } from "./Inventory";

const queryParams = new URLSearchParams(window.location.search);
const requestedSceneId =
  queryParams.get("scene")?.trim().toLowerCase() || undefined;

const CONVERSATION_COMPLETED_STORAGE_KEY_PREFIX = "conversation-completed";
const QUIZ_ITEM_GRANTED_STORAGE_KEY_PREFIX = "time-thieves-quiz-item-granted";
const MEMORY_GAME_STATE_KEY = "time-thieves-memory-game-state";

const REQUIRED_DIALOGUE_KEYS = [
  "professor_introduction_dialogue",
  "leya_dialogue",
  "timethieves_dialogue",
];
const REQUIRED_QUIZ_IDS = ["professor_quiz", "benjamin_quiz"];
const MEMORY_REWARD_ITEM_ID = "Zandloper onderdeel 2";

function normalizeId(value: string | undefined): string {
  return value?.trim().toLowerCase() || "";
}

function shouldHandleItemScene(componentSceneId: string | undefined): boolean {
  if (!requestedSceneId) {
    return false;
  }

  return normalizeId(componentSceneId) === requestedSceneId;
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

function getItemRoot(
  world: ecs.World,
  eid: bigint,
  configuredRootEid?: bigint,
): ecs.Entity {
  if (configuredRootEid && world.eidToEntity.has(configuredRootEid)) {
    return world.getEntity(configuredRootEid);
  }

  return world.getEntity(eid);
}

function setInteractionState(entity: ecs.Entity, isActive: boolean) {
  if (isActive) {
    if (entity.isHidden()) {
      entity.show();
    }
    if (entity.isDisabled()) {
      entity.enable();
    }
    return;
  }

  if (!entity.isHidden()) {
    entity.hide();
  }
  if (!entity.isDisabled()) {
    entity.disable();
  }
}

function setUiText(entity: ecs.Entity | null, text: string) {
  if (!entity || !entity.has(ecs.Ui)) {
    return;
  }

  if (entity.isHidden()) {
    entity.show();
  }
  if (entity.isDisabled()) {
    entity.enable();
  }

  entity.set(ecs.Ui, { text });
}

function setEntityEnabledAndVisible(
  entity: ecs.Entity | null,
  isActive: boolean,
) {
  if (!entity) {
    return;
  }

  if (isActive) {
    if (entity.isHidden()) {
      entity.show();
    }
    if (entity.isDisabled()) {
      entity.enable();
    }
    return;
  }

  if (!entity.isHidden()) {
    entity.hide();
  }
  if (!entity.isDisabled()) {
    entity.disable();
  }
}

function isDialogueCompleted(dialogueKey: string): boolean {
  return (
    window.sessionStorage.getItem(
      `${CONVERSATION_COMPLETED_STORAGE_KEY_PREFIX}:${dialogueKey}`,
    ) === "1"
  );
}

function isQuizCompleted(quizId: string): boolean {
  return (
    window.sessionStorage.getItem(
      `${QUIZ_ITEM_GRANTED_STORAGE_KEY_PREFIX}:${quizId}`,
    ) === "1"
  );
}

function isMemoryGameCompleted(): boolean {
  if (hasInventoryItem(MEMORY_REWARD_ITEM_ID)) {
    return true;
  }

  const rawState = window.sessionStorage.getItem(MEMORY_GAME_STATE_KEY);
  if (!rawState) {
    return false;
  }

  try {
    const parsedState = JSON.parse(rawState) as { matchedPairs?: number };
    return Number(parsedState.matchedPairs) >= 8;
  } catch {
    return false;
  }
}

function getMissingRequirements(): string[] {
  const missing: string[] = [];

  for (const dialogueKey of REQUIRED_DIALOGUE_KEYS) {
    if (!isDialogueCompleted(dialogueKey)) {
      if (dialogueKey === "professor_introduction_dialogue") {
        missing.push("introgesprek");
      } else if (dialogueKey === "leya_dialogue") {
        missing.push("gesprek met Leya");
      } else if (dialogueKey === "timethieves_dialogue") {
        missing.push("gesprek met de Time Thieves");
      }
    }
  }

  for (const quizId of REQUIRED_QUIZ_IDS) {
    if (!isQuizCompleted(quizId)) {
      missing.push(quizId === "professor_quiz" ? "quiz 1" : "quiz 2");
    }
  }

  if (!isMemoryGameCompleted()) {
    missing.push("memory game");
  }

  return missing;
}

function getProfessorTextEntity(
  world: ecs.World,
  root: ecs.Entity,
  schema: { textTarget?: bigint },
): ecs.Entity | null {
  return (
    resolveTargetEntity(world, schema.textTarget) ||
    findByName(root, "Text") ||
    findByName(root, "ProfessorTekst")
  );
}

function getRewardItemId(schema: { rewardItemId?: string }): string {
  try {
    return schema.rewardItemId || "mystery-time-thieves";
  } catch {
    return "mystery-time-thieves";
  }
}

function getRewardItemEntity(
  world: ecs.World,
  root: ecs.Entity,
  schema: { rewardItemTarget?: bigint },
): ecs.Entity | null {
  return (
    resolveTargetEntity(world, schema.rewardItemTarget) ||
    findByName(root, "Item") ||
    findByName(root, "Beloning")
  );
}

function syncRewardItemVisibility(
  world: ecs.World,
  root: ecs.Entity,
  schema: { rewardItemTarget?: bigint; rewardItemId?: string },
) {
  const rewardItemEntity = getRewardItemEntity(world, root, schema);
  const rewardItemId = getRewardItemId(schema);
  setEntityEnabledAndVisible(rewardItemEntity, hasInventoryItem(rewardItemId));
}

function getProfessorMessage(rewardItemId: string): string {
  if (hasInventoryItem(rewardItemId)) {
    return "Uitstekend werk. Met dit voorwerp kun je het mysterie van de Time Thieves ontrafelen.";
  }

  const missingRequirements = getMissingRequirements();
  if (missingRequirements.length > 0) {
    return `Je bent er bijna. Rond eerst dit af: ${missingRequirements.join(", ")}.`;
  }

  return "Fantastisch! Alles is voltooid. Tik op mij om het laatste item te ontvangen.";
}

ecs.registerComponent({
  name: "Item",
  schema: {
    sceneId: "string",
    itemRoot: "eid",
    professorTarget: "eid",
    textTarget: "eid",
    rewardItemTarget: "eid",
    rewardItemId: "string",
    rewardSourceId: "string",
  },
  schemaDefaults: {
    sceneId: "de-verwoeste-stad-06",
    rewardItemId: "mystery-time-thieves",
    rewardSourceId: "de-verwoeste-stad-06",
  },
  add: (world, component) => {
    const schema = component.schema;
    const root = getItemRoot(world, component.eid, schema.itemRoot);
    const shouldHandle = shouldHandleItemScene(schema.sceneId);
    setInteractionState(root, shouldHandle);

    if (shouldHandle) {
      window.setTimeout(() => {
        const resolvedSchema = component.schema;
        const textEntity = getProfessorTextEntity(world, root, resolvedSchema);
        syncRewardItemVisibility(world, root, resolvedSchema);
        setUiText(
          textEntity,
          getProfessorMessage(getRewardItemId(resolvedSchema)),
        );
      }, 0);
    }
  },
  tick: (world, component) => {
    const schema = component.schema;
    if (!shouldHandleItemScene(schema.sceneId)) {
      return;
    }

    const root = getItemRoot(world, component.eid, schema.itemRoot);
    const textEntity = getProfessorTextEntity(world, root, schema);
    if (!textEntity) {
      return;
    }

    const rewardItemId = schema.rewardItemId || "mystery-time-thieves";
    const nextText = getProfessorMessage(rewardItemId);

    const currentUi = textEntity.has(ecs.Ui) ? textEntity.get(ecs.Ui) : null;
    if (!currentUi || currentUi.text !== nextText) {
      setUiText(textEntity, nextText);
    }
  },
  stateMachine: ({ world, eid, schemaAttribute }) => {
    let initialized = false;
    const initialSchema = schemaAttribute.get(eid);
    const professorTouchTarget =
      initialSchema.professorTarget || world.events.globalId;

    const updateProfessorText = (schema: {
      textTarget?: bigint;
      rewardItemId?: string;
    }) => {
      const root = getItemRoot(world, eid, schemaAttribute.get(eid).itemRoot);
      const textEntity = getProfessorTextEntity(world, root, schema);
      const rewardItemId = getRewardItemId(schema);
      setUiText(textEntity, getProfessorMessage(rewardItemId));
    };

    ecs
      .defineState("default")
      .initial()
      .onEnter(() => {
        const schema = schemaAttribute.get(eid);
        const root = getItemRoot(world, eid, schema.itemRoot);
        const shouldHandle = shouldHandleItemScene(schema.sceneId);
        setInteractionState(root, shouldHandle);

        if (!shouldHandle) {
          return;
        }

        if (!initialized) {
          initialized = true;
        }

        syncRewardItemVisibility(world, root, schema);
        updateProfessorText(schema);
      })
      .onEvent(ecs.input.SCREEN_TOUCH_START, "claimReward", {
        target: professorTouchTarget,
      });

    ecs
      .defineState("claimReward")
      .onEnter(() => {
        const schema = schemaAttribute.get(eid);
        if (!shouldHandleItemScene(schema.sceneId)) {
          return;
        }

        const rewardItemId = getRewardItemId(schema);
        const rewardSourceId = schema.rewardSourceId || "de-verwoeste-stad-06";

        if (hasInventoryItem(rewardItemId)) {
          updateProfessorText(schema);
          return;
        }

        const missingRequirements = getMissingRequirements();
        if (missingRequirements.length > 0) {
          updateProfessorText(schema);
          return;
        }

        addInventoryItem(rewardItemId, "npc", rewardSourceId, {
          grantedBy: "professor",
          sceneId: schema.sceneId,
          rewardType: "final-mystery-item",
        });

        syncRewardItemVisibility(
          world,
          getItemRoot(world, eid, schema.itemRoot),
          schema,
        );

        window.dispatchEvent(
          new CustomEvent("final-mystery-item-earned", {
            detail: {
              sceneId: schema.sceneId,
              rewardItemId,
            },
          }),
        );

        const textEntity = resolveTargetEntity(world, schema.textTarget);
        setUiText(
          textEntity,
          "Hier is het laatste item. Gebruik het om de waarheid achter de Time Thieves te ontdekken.",
        );
      })
      .onEvent(ecs.input.SCREEN_TOUCH_END, "default", {
        target: world.events.globalId,
      });
  },
});
