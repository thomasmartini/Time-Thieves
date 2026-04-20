// This is a component file. You can use this file to define a custom component for your project.
// This component will appear as a custom component in the editor.

import * as ecs from "@8thwall/ecs"; // This is how you access the ecs library.

type Speaker = "npc" | "player";
type DialogueTurn = {
  speaker: Speaker;
  text: string;
};

const npcDialogues: Record<string, DialogueTurn[]> = {
  spyro: [
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
  ],
  student: [
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
  ],
};

const fallbackDialogue = npcDialogues.spyro;
const queryParams = new URLSearchParams(window.location.search);
const requestedSceneId =
  queryParams.get("scene")?.trim().toLowerCase() || undefined;

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

function getDialogueForNpc(npcId: string | undefined): DialogueTurn[] {
  const normalizedId = normalizeNpcId(npcId);
  if (!normalizedId) {
    return fallbackDialogue;
  }

  const dialogueKey = dialogueKeyByNpcId[normalizedId] || normalizedId;
  return npcDialogues[dialogueKey] || fallbackDialogue;
}

function shouldButtonHandleNpc(buttonNpcId: string | undefined): boolean {
  if (!requestedSceneId) {
    return true;
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
): {
  npcTextEntity: ecs.Entity | null;
  playerTextEntity: ecs.Entity | null;
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

  if (npcTextEntity && playerTextEntity) {
    return { npcTextEntity, playerTextEntity };
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

      if (npcTextEntity && playerTextEntity) {
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

  return { npcTextEntity, playerTextEntity };
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
    entity.show();
    entity.enable();
  } else {
    entity.hide();
    entity.disable();
  }
}

function setTextVisibility(entity: ecs.Entity | null, isVisible: boolean) {
  if (!entity) {
    return;
  }

  if (isVisible) {
    entity.show();
    entity.enable();
  } else {
    entity.hide();
    entity.disable();
  }
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
}

function updateDialogueText(
  world: ecs.World,
  currentEid: bigint,
  lineIndex: number,
  componentNpcId: string | undefined,
  configuredRootEid?: bigint,
  configuredNpcTextEid?: bigint,
  configuredPlayerTextEid?: bigint,
) {
  const buttonEntity = world.getEntity(currentEid);
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

  const dialogueBubble = findDialogueBubble(rootEntity, currentEid);
  if (!dialogueBubble) {
    return;
  }

  const dialogueNpcId = requestedSceneId || componentNpcId;
  const dialogue = getDialogueForNpc(dialogueNpcId);
  const currentTurn = dialogue[lineIndex % dialogue.length];

  const { npcTextEntity, playerTextEntity } = findConversationTextEntities(
    world,
    rootEntity,
    currentEid,
    configuredNpcTextEid,
    configuredPlayerTextEid,
  );

  if (currentTurn.speaker === "npc") {
    if (npcTextEntity) {
      npcTextEntity.set(ecs.Ui, { text: currentTurn.text });
    } else {
      dialogueBubble.set(ecs.Ui, { text: currentTurn.text });
    }
    setTextVisibility(npcTextEntity || dialogueBubble, true);
    setTextVisibility(playerTextEntity, false);
    return;
  }

  if (playerTextEntity) {
    playerTextEntity.set(ecs.Ui, { text: currentTurn.text });
    setTextVisibility(playerTextEntity, true);
    setTextVisibility(npcTextEntity || dialogueBubble, false);
    return;
  }

  // Fallback when no separate player text field exists.
  dialogueBubble.set(ecs.Ui, { text: `Jij: ${currentTurn.text}` });
  setTextVisibility(dialogueBubble, true);
}

ecs.registerComponent({
  name: "TapToStart",
  schema: {
    npcId: "string",
    conversationRoot: "eid",
    npcTextTarget: "eid",
    playerTextTarget: "eid",
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
    );
  },
  // tick: (world, component) => {
  // },
  // remove: (world, component) => {
  // },
  stateMachine: ({ world, eid, schemaAttribute, dataAttribute }) => {
    let initialized = false;
    let currentDialogueIndex = 0;

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
        const dialogue = getDialogueForNpc(activeNpcId);

        updateDialogueText(
          world,
          eid,
          0,
          componentNpcId,
          schema.conversationRoot,
          schema.npcTextTarget,
          schema.playerTextTarget,
        );
        currentDialogueIndex = dialogue.length > 1 ? 1 : 0;
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

        const componentNpcId = schema.npcId;
        const activeNpcId = requestedSceneId || componentNpcId;
        const dialogue = getDialogueForNpc(activeNpcId);

        updateDialogueText(
          world,
          eid,
          currentDialogueIndex,
          componentNpcId,
          schema.conversationRoot,
          schema.npcTextTarget,
          schema.playerTextTarget,
        );

        currentDialogueIndex = (currentDialogueIndex + 1) % dialogue.length;
      })
      .onEvent(ecs.input.SCREEN_TOUCH_END, "default", {
        target: world.events.globalId,
      });
  },
});
