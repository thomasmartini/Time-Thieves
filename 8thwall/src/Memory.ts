import * as ecs from "@8thwall/ecs";

const queryParams = new URLSearchParams(window.location.search);
const requestedSceneId =
  queryParams.get("scene")?.trim().toLowerCase() || undefined;

function normalizeId(value: string | undefined): string {
  return value?.trim().toLowerCase() || "";
}

function shouldHandleMemoryScene(componentNpcId: string | undefined): boolean {
  if (!requestedSceneId) return true;
  return normalizeId(componentNpcId) === requestedSceneId;
}

function findCardEntities(root: ecs.Entity): ecs.Entity[] {
  const results: ecs.Entity[] = [];
  const queue: ecs.Entity[] = [root];

  while (queue.length > 0) {
    const e = queue.shift();
    if (!e) continue;
    const name = (e as unknown as { name?: string }).name || "";
    // accept English/Dutch card names and the exported 8thWall 'Image' nodes
    if (/card|kaart|^image( \(\d+\))?$/i.test(name)) {
      results.push(e);
    }
    queue.push(...e.getChildren());
  }

  return results;
}

function setCardImage(entity: ecs.Entity, imagePath: string) {
  const ui = entity.get(ecs.Ui);
  console.log("setCardImage called:", imagePath, "ui exists:", !!ui);
  if (ui) {
    console.log("setting image to:", imagePath);
    entity.set(ecs.Ui, { 
      ...ui, 
      image: {
        type: "asset",
        asset: imagePath
      } as any
    });
  }
}

const CARD_FACE_IMAGES = [
  "assets/TT_Photographer_Style2_1.png",
  "assets/TT_Photographer_Style2_1.png",
  "assets/TT_Student_Style2_1.png",
  "assets/TT_Student_Style2_1.png",
  "assets/TT_Professor_Style2_1.png",
  "assets/TT_Professor_Style2_1.png",
  "assets/Time_Thief.png",
  "assets/Time_Thief.png",
  "assets/Student.png",
  "assets/Student.png",
  "assets/Professor.png",
  "assets/Professor.png",
  "assets/Photographer.png",
  "assets/Photographer.png",
  "assets/Photographer_1.png",
  "assets/Photographer_1.png",
];

ecs.registerComponent({
  name: "Memory",
  schema: {
    npcId: "string",
    cardRoot: "eid",
  },
  schemaDefaults: {
    npcId: "de-verwoeste-stad-05",
  },
  add: (world, component) => {
    const schema = component.schema;
    // If cardRoot not provided, attempt to find the scene root by name
    if (!schema.cardRoot) {
      // find entity named 'De verwoeste stad 05 (memory)'
      for (const [eidKey, ent] of world.eidToEntity) {
        const nm = (ent as unknown as { name?: string }).name || "";
        if (
          (nm || "").trim().toLowerCase() === "de verwoeste stad 05 (memory)"
        ) {
          schema.cardRoot = eidKey as unknown as bigint;
          break;
        }
      }
    }

    const root =
      schema.cardRoot && world.eidToEntity.has(schema.cardRoot)
        ? world.getEntity(schema.cardRoot)
        : world.getEntity(component.eid);

    const shouldHandle = shouldHandleMemoryScene(schema.npcId);
    // hide or disable root when not the requested scene
    if (!shouldHandle) {
      if (!root.isHidden()) root.hide();
      if (!root.isDisabled()) root.disable();
      return;
    }

    if (root.isHidden()) root.show();
    if (root.isDisabled()) root.enable();
  },
  stateMachine: ({ world, eid, schemaAttribute }) => {
    let initialized = false;
    let totalCards = 0;
    let flipped: { entity: ecs.Entity; faceImage: string }[] = [];
    const matched = new Set<ecs.Entity>();
    const pendingHideTimeouts: number[] = [];
    const cardFaceImages = new Map<bigint, string>();
    const BACK_IMAGE = "assets/Group_6.png";

    const revealCard = (entity: ecs.Entity) => {
      const faceImage = cardFaceImages.get(entity.eid);
      if (faceImage) {
        setCardImage(entity, faceImage);
      }
    };

    const hideCard = (entity: ecs.Entity) => {
      setCardImage(entity, BACK_IMAGE);
    };

    const clearPending = () => {
      for (const t of pendingHideTimeouts) {
        window.clearTimeout(t);
      }
      pendingHideTimeouts.length = 0;
    };

    const defaultState = ecs.defineState("default");

    const initialize = () => {
      const initialSchema = schemaAttribute.get(eid);
      const root =
        initialSchema.cardRoot && world.eidToEntity.has(initialSchema.cardRoot)
          ? world.getEntity(initialSchema.cardRoot)
          : world.getEntity(eid);

      const cardEntities = findCardEntities(root);
      totalCards = cardEntities.length;
      console.log("Memory game initialized with", totalCards, "cards");

      // Assign each card a face image source from code, then set to back image
      cardEntities.forEach((card, idx) => {
        const faceImage = CARD_FACE_IMAGES[idx] || BACK_IMAGE;
        cardFaceImages.set(card.eid, faceImage);
        console.log(`Card ${idx}:`, faceImage);

        // Set all cards to the back image initially
        setCardImage(card, BACK_IMAGE);
      });

      // map each card to a state so we can target touches
      cardEntities.forEach((card, idx) => {
        const target = card.eid;
        const stateName = `pickedCard${idx}`;

        ecs
          .defineState(stateName)
          .onEnter(() => {
            console.log("Card clicked:", stateName);
            // ignore already matched
            if (matched.has(card)) return;
            // ignore if already flipped
            if (flipped.some((f) => f.entity === card)) return;

            const faceImage = cardFaceImages.get(card.eid) || BACK_IMAGE;
            console.log("Revealing card", idx, "with image:", faceImage);
            revealCard(card);
            flipped.push({ entity: card, faceImage });

            if (flipped.length === 2) {
              const a = flipped[0];
              const b = flipped[1];
              if (a.faceImage === b.faceImage) {
                // match!
                matched.add(a.entity);
                matched.add(b.entity);
                flipped = [];
                window.dispatchEvent(
                  new CustomEvent("memory-match", {
                    detail: { image: a.faceImage },
                  }),
                );
                // all matched?
                if (matched.size >= totalCards && totalCards > 0) {
                  window.dispatchEvent(new CustomEvent("memory-complete", {}));
                }
                return;
              }

              // not a match -> flip back after delay
              const delay = 800;
              const t = window.setTimeout(() => {
                hideCard(a.entity);
                hideCard(b.entity);
                flipped = [];
              }, delay);
              pendingHideTimeouts.push(t);
            }
          })
          .onEvent(ecs.input.SCREEN_TOUCH_END, "default", {
            target: world.events.globalId,
          });

        // wire a touch start event on this target to transition into the state
        defaultState.onEvent(ecs.input.SCREEN_TOUCH_START, stateName, {
          target,
        });
      });

      initialized = true;
    };

    defaultState
      .initial()
      .onEnter(() => {
        const schema = schemaAttribute.get(eid);
        const root =
          schema.cardRoot && world.eidToEntity.has(schema.cardRoot)
            ? world.getEntity(schema.cardRoot)
            : world.getEntity(eid);

        const shouldHandle = shouldHandleMemoryScene(schema.npcId);
        if (!shouldHandle) {
          if (!root.isHidden()) root.hide();
          if (!root.isDisabled()) root.disable();
          return;
        }

        if (root.isHidden()) root.show();
        if (root.isDisabled()) root.enable();

        if (!initialized) {
          initialize();
        }
      });

    return {
      teardown: () => {
        clearPending();
      },
    };
  },
});

