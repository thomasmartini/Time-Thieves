// This is a component file. You can use this file to define a custom component for your project.
// This component will appear as a custom component in the editor.

import * as ecs from "@8thwall/ecs"; // This is how you access the ecs library.

type Speaker = "npc" | "player";
type DialogueTurn = {
  speaker: Speaker;
  text: string;
};

const npcDialogues: Record<string, DialogueTurn[][]> = {
  spyro: [[
    {
      speaker: "npc",
      text: "Ik ben Spyro en ik heet jullie van harte welkom bij de TimeThieves!",
    },
    { speaker: "player", text: "Wat is onze eerste opdracht?" },
    {
      speaker: "npc",
      text: "Deze stad zit vol geheimen. Jullie missie begint nu.",
    },
    { speaker: "player", text: "Top, we gaan op pad." },
  ]],
  student: [[
    {
      speaker: "player",
      text: "Hello ma'am, may I ask what you're doing here?",
    },
    {
      speaker: "npc",
      text: "Oh hi! My name is Leya, I'm a historic photographer. I'm not really sure why, but this statue here caught my attention.",
    },
    {
      speaker: "player",
      text: "I think I know why this statue here caught your attention.",
    },
    {
      speaker: "player",
      text: "You see, I believe this statue, and many others around the city, hold memories of important historic events.",
    },
    { speaker: "player", text: "What do you know about this one?" },
    {
      speaker: "npc",
      text: "Well... my grandmother told me some stories about the war and what it was like during that time.",
    },
    {
      speaker: "npc",
      text: "She told me that a big part of the city got destroyed and many people died... It was devastating...",
    },
    {
      speaker: "npc",
      text: "I remember a picture my grandmother took during the war. The war changed Rotterdam a lot. It left a scar right in the heart of the city.",
    },
    {
      speaker: "player",
      text: "It sounds like your grandmother went through a lot.",
    },
    {
      speaker: "player",
      text: "Do you remember any other historic events about Rotterdam?",
    },
    {
      speaker: "npc",
      text: "It feels like I should know more, but for some reason I can't remember. So I'm sorry but I don't.",
    },
    {
      speaker: "player",
      text: "Don't worry about it. Thanks for sharing your grandmothers story.",
    },
    { speaker: "npc", text: "You're welcome!" },
  ]],
};

const fallbackDialogueConversations = npcDialogues.spyro;
const queryParams = new URLSearchParams(window.location.search);
const requestedSceneId =
  queryParams.get("scene")?.trim().toLowerCase() || undefined;

const pendingSpeakerHideTimeoutByController = new Map<bigint, number>();
const exhaustedConversationText = "I have nothing more to say.";
const completedDialogueKeys = new Set<string>();
const CONVERSATION_COMPLETED_STORAGE_KEY_PREFIX = "conversation-completed3";

const dialogueKeyByNpcId: Record<string, string> = {
  "de-verwoeste-stad": "spyro",
  "de-boeg": "student",
  erasmusbeeld: "spyro",
  "monument-voor-alle-gevallen": "student",
  calandmonument: "spyro",
};

function normalizeNpcId(npcId: string | undefined): string {
  return npcId?.trim().toLowerCase() || "";
}

function getDialogueKeyForNpc(npcId: string | undefined): string {
  const normalizedId = normalizeNpcId(npcId);
  if (!normalizedId) {
    return "spyro";
  }

  return dialogueKeyByNpcId[normalizedId] || normalizedId;
}

function getDialoguesForNpc(npcId: string | undefined): DialogueTurn[][] {
  const dialogueKey = getDialogueKeyForNpc(npcId);
  const dialogues = npcDialogues[dialogueKey] || fallbackDialogueConversations;
  return dialogues.filter((dialogue) => dialogue.length > 0);
}

function getConversationCompletedStorageKey(dialogueKey: string): string {
  return `${CONVERSATION_COMPLETED_STORAGE_KEY_PREFIX}:${dialogueKey || "spyro"}`;
}

function markDialogueCompleted(dialogueKey: string) {
  const normalizedKey = dialogueKey || "spyro";
  completedDialogueKeys.add(normalizedKey);
  window.localStorage.setItem(
    getConversationCompletedStorageKey(normalizedKey),
    "1",
  );
}

function isDialogueCompleted(dialogueKey: string): boolean {
  const normalizedKey = dialogueKey || "spyro";
  if (completedDialogueKeys.has(normalizedKey)) {
    return true;
  }

  const isCompletedFromStorage =
    window.localStorage.getItem(
      getConversationCompletedStorageKey(normalizedKey),
    ) === "1";

  if (isCompletedFromStorage) {
    completedDialogueKeys.add(normalizedKey);
    return true;
  }

  return false;
}

function shouldButtonHandleNpc(buttonNpcId: string | undefined): boolean {
  if (!requestedSceneId) {
    return false;
  }

  return normalizeNpcId(buttonNpcId) === requestedSceneId;
}

function getConversationRoot(
  world: ecs.World,
  buttonEntity: ecs.Entity,
  configuredRootEid?: bigint,
): ecs.Entity | null {
  if (configuredRootEid && world.eidToEntity.has(configuredRootEid)) {
    return world.getEntity(configuredRootEid);
  }

  let current: ecs.Entity | null = buttonEntity;
  while (current) {
    if (isConversationContainer(current)) {
      return current;
    }

    current = current.getParent();
  }

  return buttonEntity;
}

function findDialogueBubble(
  rootEntity: ecs.Entity,
  currentEid: bigint,
): ecs.Entity | null {
  const queue: ecs.Entity[] = [rootEntity];

  while (queue.length > 0) {
    const entity = queue.shift();
    if (!entity) {
      continue;
    }

    if (entity.eid !== currentEid && entity.has(ecs.Ui)) {
      const ui = entity.get(ecs.Ui);
      if (ui.text && ui.background && !ui.image) {
        return entity;
      }
    }

    queue.push(...entity.getChildren());
  }

  return null;
}

function resolveTextTargetEntity(
  world: ecs.World,
  targetEid?: bigint,
): ecs.Entity | null {
  if (!targetEid) {
    return null;
  }

  if (!world.eidToEntity.has(targetEid)) {
    return null;
  }

  return world.getEntity(targetEid);
}

function findConversationTextEntities(
  world: ecs.World,
  rootEntity: ecs.Entity,
  currentEid: bigint,
  configuredNpcTextEid?: bigint,
  configuredPlayerTextEid?: bigint,
  configuredNpcBubbleEid?: bigint,
  configuredPlayerBubbleEid?: bigint,
): {
  npcTextEntity: ecs.Entity | null;
  playerTextEntity: ecs.Entity | null;
  npcBubbleEntity: ecs.Entity | null;
  playerBubbleEntity: ecs.Entity | null;
} {
  const queue: ecs.Entity[] = [rootEntity];
  let npcTextEntity: ecs.Entity | null = resolveTextTargetEntity(
    world,
    configuredNpcTextEid,
  );
  let playerTextEntity: ecs.Entity | null = resolveTextTargetEntity(
    world,
    configuredPlayerTextEid,
  );
  let npcBubbleEntity: ecs.Entity | null = resolveTextTargetEntity(
    world,
    configuredNpcBubbleEid,
  );
  let playerBubbleEntity: ecs.Entity | null = resolveTextTargetEntity(
    world,
    configuredPlayerBubbleEid,
  );

  if (npcTextEntity && playerTextEntity && npcBubbleEntity && playerBubbleEntity) {
    return { npcTextEntity, playerTextEntity, npcBubbleEntity, playerBubbleEntity };
  }

  while (queue.length > 0) {
    const entity = queue.shift();
    if (!entity) {
      continue;
    }

    if (entity.eid !== currentEid && entity.has(ecs.Ui)) {
      const ui = entity.get(ecs.Ui);
      const textValue = (ui.text || "").toLowerCase().trim();
      const runtimeName = (entity as unknown as { name?: string }).name;
      const entityName = (runtimeName || "").toLowerCase().trim();

      // Primary mapping: explicit named text entities in the scene graph.
      if (!npcTextEntity && entityName === "tekst npc") {
        npcTextEntity = entity;
      }

      if (!playerTextEntity && entityName === "tekst speler") {
        playerTextEntity = entity;
      }

      if (!npcBubbleEntity && entityName === "tekstwolk npc") {
        npcBubbleEntity = entity;
      }

      if (!playerBubbleEntity && entityName === "tekstwolk speler") {
        playerBubbleEntity = entity;
      }

      if (npcTextEntity && playerTextEntity && npcBubbleEntity && playerBubbleEntity) {
        queue.push(...entity.getChildren());
        continue;
      }

      if (textValue === "klik hier") {
        // Ignore the button label.
      } else if (!npcTextEntity && ui.text && ui.background && !ui.image) {
        npcTextEntity = entity;
      } else if (!playerTextEntity && ui.text && !ui.background && !ui.image) {
        playerTextEntity = entity;
      }
    }

    queue.push(...entity.getChildren());
  }

  return { npcTextEntity, playerTextEntity, npcBubbleEntity, playerBubbleEntity };
}

function isConversationContainer(entity: ecs.Entity): boolean {
  const queue: ecs.Entity[] = [entity];
  let hasDialogueBubble = false;
  let hasNpcImage = false;

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    if (current.has(ecs.Ui)) {
      const ui = current.get(ecs.Ui);
      if (ui.text && ui.background && !ui.image) {
        hasDialogueBubble = true;
      }

      if (ui.image) {
        hasNpcImage = true;
      }
    }

    if (hasDialogueBubble && hasNpcImage) {
      return true;
    }

    queue.push(...current.getChildren());
  }

  return false;
}

function setConversationInteractionState(
  entity: ecs.Entity,
  isActive: boolean,
) {
  if (isActive) {
    if (entity.isHidden()) {
      entity.show();
    }
    if (entity.isDisabled()) {
      entity.enable();
    }
  } else {
    if (!entity.isHidden()) {
      entity.hide();
    }
    if (!entity.isDisabled()) {
      entity.disable();
    }
  }
}

function setTextVisibility(entity: ecs.Entity | null, isVisible: boolean) {
  if (!entity) {
    return;
  }

  if (isVisible) {
    if (entity.isHidden()) {
      entity.show();
    }
  } else {
    if (!entity.isHidden()) {
      entity.hide();
    }
  }
}

function setSpeechBubbleVisibility(entity: ecs.Entity | null, isVisible: boolean) {
  if (!entity) {
    return;
  }

  if (isVisible) {
    if (entity.isHidden()) {
      entity.show();
    }
  } else {
    if (!entity.isHidden()) {
      entity.hide();
    }
  }
}

function schedulePreviousSpeakerHide(currentEid: bigint, hideFn: () => void) {
  const pendingTimeout = pendingSpeakerHideTimeoutByController.get(currentEid);
  if (pendingTimeout !== undefined) {
    window.clearTimeout(pendingTimeout);
  }

  const timeoutId = window.setTimeout(() => {
    pendingSpeakerHideTimeoutByController.delete(currentEid);
    hideFn();
  }, 0);

  pendingSpeakerHideTimeoutByController.set(currentEid, timeoutId);
}

function switchSpeakerVisibility(
  currentEid: bigint,
  previousSpeaker: Speaker | null,
  currentSpeaker: Speaker,
  npcTextEntity: ecs.Entity | null,
  playerTextEntity: ecs.Entity | null,
  npcBubbleEntity: ecs.Entity | null,
  playerBubbleEntity: ecs.Entity | null,
  fallbackTextEntity: ecs.Entity | null,
) {
  const npcTextTarget = npcTextEntity || fallbackTextEntity;

  const showCurrentSpeaker = () => {
    if (currentSpeaker === "npc") {
      setTextVisibility(npcTextTarget, true);
      setSpeechBubbleVisibility(npcBubbleEntity, true);
      return;
    }

    setTextVisibility(playerTextEntity || fallbackTextEntity, true);
    setSpeechBubbleVisibility(playerBubbleEntity, true);
  };

  const hideOtherSpeaker = () => {
    if (currentSpeaker === "npc") {
      setTextVisibility(playerTextEntity, false);
      setSpeechBubbleVisibility(playerBubbleEntity, false);
      return;
    }

    setTextVisibility(npcTextTarget, false);
    setSpeechBubbleVisibility(npcBubbleEntity, false);
  };

  showCurrentSpeaker();

  if (previousSpeaker && previousSpeaker !== currentSpeaker) {
    schedulePreviousSpeakerHide(currentEid, hideOtherSpeaker);
    return;
  }

  hideOtherSpeaker();
}

function isPrimaryConversationController(
  world: ecs.World,
  eid: bigint,
  configuredRootEid?: bigint,
): boolean {
  if (!world.eidToEntity.has(eid)) {
    return false;
  }

  const entity = world.getEntity(eid);
  const rootEntity = getConversationRoot(world, entity, configuredRootEid);
  return Boolean(rootEntity && rootEntity.eid === eid);
}

function showOnlyActiveConversation(activeRoot: ecs.Entity) {
  // Always unhide and enable the selected root first, even during early scene init.
  setConversationInteractionState(activeRoot, true);

  const parent = activeRoot.getParent();
  if (!parent) {
    return;
  }

  for (const sibling of parent.getChildren()) {
    if (sibling.eid === activeRoot.eid) {
      continue;
    }

    if (!isConversationContainer(sibling)) {
      continue;
    }

    setConversationInteractionState(sibling, false);
  }
}

function applyInitialConversationVisibility(
  world: ecs.World,
  eid: bigint,
  componentNpcId: string | undefined,
  configuredRootEid?: bigint,
  configuredNpcBubbleEid?: bigint,
  configuredPlayerBubbleEid?: bigint,
) {
  const buttonEntity = world.getEntity(eid);
  const rootEntity = getConversationRoot(
    world,
    buttonEntity,
    configuredRootEid,
  );
  if (!rootEntity) {
    return;
  }

  const shouldHandle = shouldButtonHandleNpc(componentNpcId);

  if (!shouldHandle) {
    setConversationInteractionState(rootEntity, false);
    return;
  }

  showOnlyActiveConversation(rootEntity);

  const { npcBubbleEntity, playerBubbleEntity } = findConversationTextEntities(
    world,
    rootEntity,
    eid,
    undefined,
    undefined,
    configuredNpcBubbleEid,
    configuredPlayerBubbleEid,
  );
  setSpeechBubbleVisibility(npcBubbleEntity, false);
  setSpeechBubbleVisibility(playerBubbleEntity, false);
}

function updateDialogueText(
  world: ecs.World,
  currentEid: bigint,
  dialogue: DialogueTurn[],
  lineIndex: number,
  componentNpcId: string | undefined,
  previousSpeaker: Speaker | null,
  configuredRootEid?: bigint,
  configuredNpcTextEid?: bigint,
  configuredPlayerTextEid?: bigint,
  configuredNpcBubbleEid?: bigint,
  configuredPlayerBubbleEid?: bigint,
): Speaker | null {
  const buttonEntity = world.getEntity(currentEid);
  const rootEntity = getConversationRoot(
    world,
    buttonEntity,
    configuredRootEid,
  );
  if (!rootEntity) {
    return previousSpeaker;
  }

  const shouldHandle = shouldButtonHandleNpc(componentNpcId);
  if (!shouldHandle) {
    setConversationInteractionState(rootEntity, false);
    return previousSpeaker;
  }

  showOnlyActiveConversation(rootEntity);

  const dialogueBubble = findDialogueBubble(rootEntity, currentEid);
  if (!dialogueBubble) {
    return previousSpeaker;
  }

  if (dialogue.length === 0) {
    return previousSpeaker;
  }

  const currentTurn = dialogue[Math.min(lineIndex, dialogue.length - 1)];

  const { npcTextEntity, playerTextEntity, npcBubbleEntity, playerBubbleEntity } = findConversationTextEntities(
    world,
    rootEntity,
    currentEid,
    configuredNpcTextEid,
    configuredPlayerTextEid,
    configuredNpcBubbleEid,
    configuredPlayerBubbleEid,
  );

  if (currentTurn.speaker === "npc") {
    if (npcTextEntity) {
      npcTextEntity.set(ecs.Ui, { text: currentTurn.text });
    } else {
      dialogueBubble.set(ecs.Ui, { text: currentTurn.text });
    }
    switchSpeakerVisibility(
      currentEid,
      previousSpeaker,
      "npc",
      npcTextEntity,
      playerTextEntity,
      npcBubbleEntity,
      playerBubbleEntity,
      dialogueBubble,
    );
    return "npc";
  }

  if (playerTextEntity) {
    playerTextEntity.set(ecs.Ui, { text: currentTurn.text });
    switchSpeakerVisibility(
      currentEid,
      previousSpeaker,
      "player",
      npcTextEntity,
      playerTextEntity,
      npcBubbleEntity,
      playerBubbleEntity,
      dialogueBubble,
    );
    return "player";
  }

  // Fallback when no separate player text field exists.
  dialogueBubble.set(ecs.Ui, { text: `Jij: ${currentTurn.text}` });
  switchSpeakerVisibility(
    currentEid,
    previousSpeaker,
    "player",
    npcTextEntity,
    playerTextEntity,
    npcBubbleEntity,
    playerBubbleEntity,
    dialogueBubble,
  );
  return "player";
}

function applyExhaustedConversationState(
  world: ecs.World,
  currentEid: bigint,
  componentNpcId: string | undefined,
  configuredRootEid?: bigint,
  configuredNpcTextEid?: bigint,
  configuredPlayerTextEid?: bigint,
  configuredNpcBubbleEid?: bigint,
  configuredPlayerBubbleEid?: bigint,
) {
  if (!world.eidToEntity.has(currentEid)) {
    return;
  }

  const buttonEntity = world.getEntity(currentEid);
  const rootEntity = getConversationRoot(world, buttonEntity, configuredRootEid);
  if (!rootEntity) {
    return;
  }

  if (!shouldButtonHandleNpc(componentNpcId)) {
    return;
  }

  showOnlyActiveConversation(rootEntity);

  const dialogueBubble = findDialogueBubble(rootEntity, currentEid);
  const { npcTextEntity, playerTextEntity, npcBubbleEntity, playerBubbleEntity } = findConversationTextEntities(
    world,
    rootEntity,
    currentEid,
    configuredNpcTextEid,
    configuredPlayerTextEid,
    configuredNpcBubbleEid,
    configuredPlayerBubbleEid,
  );

  const npcTextTarget = npcTextEntity || dialogueBubble;
  if (npcTextTarget) {
    npcTextTarget.set(ecs.Ui, { text: exhaustedConversationText });
  }

  setTextVisibility(npcTextTarget, true);
  setTextVisibility(playerTextEntity, false);
  setSpeechBubbleVisibility(npcBubbleEntity, true);
  setSpeechBubbleVisibility(playerBubbleEntity, false);
  setConversationInteractionState(rootEntity, true);
}

ecs.registerComponent({
  name: "TapToStart",
  schema: {
    npcId: "string",
    conversationRoot: "eid",
    npcTextTarget: "eid",
    playerTextTarget: "eid",
    npcBubbleTarget: "eid",
    playerBubbleTarget: "eid",
  },
  schemaDefaults: {
    npcId: "spyro",
  },
  // data: {
  // },
  add: (world, component) => {
    const componentNpcId = component.schema.npcId;
    applyInitialConversationVisibility(
      world,
      component.eid,
      componentNpcId,
      component.schema.conversationRoot,
      component.schema.npcBubbleTarget,
      component.schema.playerBubbleTarget,
    );
  },
  // tick: (world, component) => {
  // },
  // remove: (world, component) => {
  // },
  stateMachine: ({ world, eid, schemaAttribute, dataAttribute }) => {
    let initialized = false;
    let currentConversationIndex = 0;
    let currentDialogueLineIndex = 0;
    let hasRemainingConversations = true;
    let skipExhaustedMessageOnce = false;
    let activeDialogueKey = "spyro";
    let exhaustedStateApplied = false;
    let currentSpeaker: Speaker | null = null;

    ecs
      .defineState("default")
      .initial()
      .onEnter(() => {
        if (initialized) {
          return;
        }

        initialized = true;
        const schema = schemaAttribute.get(eid);
        const componentNpcId = schema.npcId;
        const activeNpcId = requestedSceneId || componentNpcId;
        activeDialogueKey = getDialogueKeyForNpc(activeNpcId);

        if (isDialogueCompleted(activeDialogueKey)) {
          hasRemainingConversations = false;
          skipExhaustedMessageOnce = false;
          if (!exhaustedStateApplied) {
            applyExhaustedConversationState(
              world,
              eid,
              componentNpcId,
              schema.conversationRoot,
              schema.npcTextTarget,
              schema.playerTextTarget,
              schema.npcBubbleTarget,
              schema.playerBubbleTarget,
            );
            exhaustedStateApplied = true;
          }
          return;
        }

        const dialogues = getDialoguesForNpc(activeNpcId);
        if (dialogues.length === 0) {
          hasRemainingConversations = false;
          markDialogueCompleted(activeDialogueKey);
          skipExhaustedMessageOnce = false;
          return;
        }

        const currentDialogue = dialogues[currentConversationIndex];
        if (!currentDialogue) {
          hasRemainingConversations = false;
          markDialogueCompleted(activeDialogueKey);
          skipExhaustedMessageOnce = false;
          return;
        }

        currentSpeaker = updateDialogueText(
          world,
          eid,
          currentDialogue,
          0,
          componentNpcId,
          currentSpeaker,
          schema.conversationRoot,
          schema.npcTextTarget,
          schema.playerTextTarget,
          schema.npcBubbleTarget,
          schema.playerBubbleTarget,
        );

        if (currentDialogue.length > 1) {
          currentDialogueLineIndex = 1;
          return;
        }

        if (dialogues.length > 1) {
          currentConversationIndex = 1;
          currentDialogueLineIndex = 0;
          currentSpeaker = null;
          return;
        }

        hasRemainingConversations = false;
        markDialogueCompleted(activeDialogueKey);
        skipExhaustedMessageOnce = true;
      })
      .onEvent(ecs.input.SCREEN_TOUCH_START, "touched", {
        target: world.events.globalId,
      });

    ecs
      .defineState("touched")
      .onEnter(() => {
        const schema = schemaAttribute.get(eid);

        if (
          !isPrimaryConversationController(world, eid, schema.conversationRoot)
        ) {
          return;
        }

        if (!hasRemainingConversations) {
          if (skipExhaustedMessageOnce) {
            skipExhaustedMessageOnce = false;
            return;
          }

          if (!exhaustedStateApplied) {
            applyExhaustedConversationState(
              world,
              eid,
              schema.npcId,
              schema.conversationRoot,
              schema.npcTextTarget,
              schema.playerTextTarget,
              schema.npcBubbleTarget,
              schema.playerBubbleTarget,
            );
            exhaustedStateApplied = true;
          }
          return;
        }

        const componentNpcId = schema.npcId;
        const activeNpcId = requestedSceneId || componentNpcId;
        activeDialogueKey = getDialogueKeyForNpc(activeNpcId);
        if (isDialogueCompleted(activeDialogueKey)) {
          hasRemainingConversations = false;
          skipExhaustedMessageOnce = false;
          if (!exhaustedStateApplied) {
            applyExhaustedConversationState(
              world,
              eid,
              componentNpcId,
              schema.conversationRoot,
              schema.npcTextTarget,
              schema.playerTextTarget,
              schema.npcBubbleTarget,
              schema.playerBubbleTarget,
            );
            exhaustedStateApplied = true;
          }
          return;
        }

        const dialogues = getDialoguesForNpc(activeNpcId);
        const currentDialogue = dialogues[currentConversationIndex];
        if (!currentDialogue || currentDialogue.length === 0) {
          hasRemainingConversations = false;
          markDialogueCompleted(activeDialogueKey);
          skipExhaustedMessageOnce = false;
          return;
        }

        currentSpeaker = updateDialogueText(
          world,
          eid,
          currentDialogue,
          currentDialogueLineIndex,
          componentNpcId,
          currentSpeaker,
          schema.conversationRoot,
          schema.npcTextTarget,
          schema.playerTextTarget,
          schema.npcBubbleTarget,
          schema.playerBubbleTarget,
        );

        if (currentDialogueLineIndex < currentDialogue.length - 1) {
          currentDialogueLineIndex += 1;
          return;
        }

        if (currentConversationIndex < dialogues.length - 1) {
          currentConversationIndex += 1;
          currentDialogueLineIndex = 0;
          currentSpeaker = null;
          return;
        }

        hasRemainingConversations = false;
        markDialogueCompleted(activeDialogueKey);
        skipExhaustedMessageOnce = true;
      })
      .onEvent(ecs.input.SCREEN_TOUCH_END, "default", {
        target: world.events.globalId,
      });
  },
});
