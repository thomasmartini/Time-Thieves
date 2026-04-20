// This is a component file. You can use this file to define a custom component for your project.
// This component will appear as a custom component in the editor.

import * as ecs from "@8thwall/ecs"; // This is how you access the ecs library.

const npcDialogues: Record<string, string[]> = {
  spyro: [
    "Ik ben Spyro en ik heet jullie van harte welkom bij de TimeThieves!",
    "Deze stad zit vol geheimen. Jullie missie begint nu.",
    "Klik door om mijn hints te lezen en vind de volgende locatie.",
    "Als je klaar bent, activeer AR en spreek met de volgende NPC.",
  ],
  student: [
    "Hoi! Ik ben de student van de TimeThieves.",
    "Ik heb een aanwijzing voor jullie: kijk goed om je heen.",
    "Volg de route en praat met iedereen voor het volledige verhaal.",
    "Top gedaan. Op naar het volgende monument!",
  ],
};

const fallbackDialogue = npcDialogues.spyro;
const queryParams = new URLSearchParams(window.location.search);
const requestedSceneId = queryParams.get("scene")?.trim().toLowerCase() || undefined;
const debugTapToStart =
  queryParams.get("debug") === "1" || queryParams.get("debug") === "true";

function debugLog(step: string, data: Record<string, unknown>) {
  if (!debugTapToStart) {
    return;
  }

  console.log(`[TapToStart:${step}]`, {
    scene: requestedSceneId || "(none)",
    ...data,
  });
}

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

function getDialogueForNpc(npcId: string | undefined): string[] {
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
    const root = world.getEntity(configuredRootEid);
    debugLog("root-configured", {
      entity: buttonEntity.eid.toString(),
      root: root.eid.toString(),
    });
    return root;
  }

  let current: ecs.Entity | null = buttonEntity;
  while (current) {
    if (isConversationContainer(current)) {
      debugLog("root-detected", {
        entity: buttonEntity.eid.toString(),
        root: current.eid.toString(),
      });
      return current;
    }

    current = current.getParent();
  }

  debugLog("root-fallback-self", {
    entity: buttonEntity.eid.toString(),
  });
  return buttonEntity;
}

function findDialogueBubble(rootEntity: ecs.Entity, currentEid: bigint): ecs.Entity | null {
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

function setConversationInteractionState(entity: ecs.Entity, isActive: boolean) {
  if (isActive) {
    entity.show();
    entity.enable();
  } else {
    entity.hide();
    entity.disable();
  }
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
  const rootEntity = getConversationRoot(world, buttonEntity, configuredRootEid);
  if (!rootEntity) {
    debugLog("initial-no-root", {
      entity: eid.toString(),
      componentNpcId,
    });
    return;
  }

  const shouldHandle = shouldButtonHandleNpc(componentNpcId);
  debugLog("initial-visibility", {
    entity: eid.toString(),
    componentNpcId,
    root: rootEntity.eid.toString(),
    shouldHandle,
  });

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
) {
  const buttonEntity = world.getEntity(currentEid);
  const rootEntity = getConversationRoot(world, buttonEntity, configuredRootEid);
  if (!rootEntity) {
    debugLog("dialogue-no-root", {
      entity: currentEid.toString(),
      componentNpcId,
      lineIndex,
    });
    return;
  }

  const shouldHandle = shouldButtonHandleNpc(componentNpcId);
  if (!shouldHandle) {
    debugLog("dialogue-hidden", {
      entity: currentEid.toString(),
      componentNpcId,
      root: rootEntity.eid.toString(),
    });
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
  const currentLine = dialogue[lineIndex % dialogue.length];
  dialogueBubble.set(ecs.Ui, { text: currentLine });
  debugLog("dialogue-updated", {
    entity: currentEid.toString(),
    componentNpcId,
    dialogueNpcId,
    root: rootEntity.eid.toString(),
    bubble: dialogueBubble.eid.toString(),
    lineIndex,
    line: currentLine,
  });
}

ecs.registerComponent({
  name: "TapToStart",
  schema: {
    npcId: "string",
    conversationRoot: "eid",
  },
  schemaDefaults: {
    npcId: "spyro",
  },
  // data: {
  // },
  add: (world, component) => {
    const componentNpcId = component.schema.npcId;
    const activeNpcId = requestedSceneId || componentNpcId;
    debugLog("add", {
      entity: component.eid.toString(),
      schemaNpcId: componentNpcId,
      activeNpcId,
      configuredRootEid: component.schema.conversationRoot?.toString(),
    });
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

        debugLog("state-default-enter", {
          entity: eid.toString(),
          schemaNpcId: componentNpcId,
          activeNpcId,
          dialogueLength: dialogue.length,
        });

        updateDialogueText(world, eid, 0, componentNpcId, schema.conversationRoot);
        currentDialogueIndex = dialogue.length > 1 ? 1 : 0;
      })
      .onEvent(ecs.input.SCREEN_TOUCH_START, "touched", {
        target: eid,
      });

    ecs
      .defineState("touched")
      .onEnter(() => {
        const schema = schemaAttribute.get(eid);
        const componentNpcId = schema.npcId;
        const activeNpcId = requestedSceneId || componentNpcId;
        const dialogue = getDialogueForNpc(activeNpcId);

        debugLog("state-touched-enter", {
          entity: eid.toString(),
          schemaNpcId: componentNpcId,
          activeNpcId,
          currentDialogueIndex,
          dialogueLength: dialogue.length,
        });

        updateDialogueText(
          world,
          eid,
          currentDialogueIndex,
          componentNpcId,
          schema.conversationRoot,
        );

        currentDialogueIndex = (currentDialogueIndex + 1) % dialogue.length;
      })
      .onEvent(ecs.input.SCREEN_TOUCH_END, "default", {
        target: eid,
      });
  },
});
