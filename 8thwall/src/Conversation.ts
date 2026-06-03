// This is a component file. You can use this file to define a custom component for your project.
// This component will appear as a custom component in the editor.

import * as ecs from "@8thwall/ecs"; // This is how you access the ecs library.
import { hasInventoryItem } from "./Inventory";

type Speaker = "npc" | "player";
type DialogueTurn = {
  speaker: Speaker;
  text: string;
};

const npcDialogues: Record<string, DialogueTurn[][]> = {
  professor_introduction_dialogue: [
    [
      {
        speaker: "npc",
        text: "Hey jij daar vreemdeling! Kun je mij helpen? Ik heb al dagen een vreemd onderbuikgevoel. Alsof ik iets belangrijks vergeten ben.",
      },
      {
        speaker: "player",
        text: "Hallo! Natuurlijk help ik graag. Wat is er aan de hand?",
      },
      {
        speaker: "npc",
        text: "Soms flitsen er beelden door mijn hoofd. Oude gebouwen, mensen op straat, vuur, rook...",
      },
      {
        speaker: "npc",
        text: "Maar zodra ik probeer te begrijpen wat ik zie, verdwijnen de herinneringen weer.",
      },
      {
        speaker: "npc",
        text: "De geschiedenis van Rotterdam is gestolen door de mysterieuze Time Thieves.",
      },
      {
        speaker: "npc",
        text: "Zij geloven dat de pijnlijke geschiedenis van de stad vergeten moet worden zodat alleen mooie herinneringen overblijven.",
      },
      {
        speaker: "npc",
        text: "Maar zonder geschiedenis verliest Rotterdam zijn identiteit.",
      },
      {
        speaker: "player",
        text: "Dat klinkt vreselijk.",
      },
      {
        speaker: "npc",
        text: "Een van die verloren herinneringen gaat over het bombardement van Rotterdam in 1940.",
      },
      {
        speaker: "npc",
        text: "Slechts vier dagen na de Duitse inval werd een groot deel van het stadscentrum verwoest.",
      },
      {
        speaker: "npc",
        text: "Gelukkig zijn niet alle herinneringen verdwenen. In monumenten verspreid door de stad zitten nog fragmenten van het verleden opgeslagen.",
      },
      {
        speaker: "npc",
        text: "En er zijn nog inwoners die zich delen van het verleden herinneren.",
      },
      {
        speaker: "player",
        text: "Wat kunnen we doen om de Time Thieves tegen te houden?",
      },
      {
        speaker: "npc",
        text: "Ga met mij mee op onderzoek uit, los puzzels op, vind historische voorwerpen en herstel verloren herinneringen.",
      },
      {
        speaker: "npc",
        text: "Als het je lukt om genoeg herinneringen te herstellen, kunnen we de Time Thieves stoppen en voorkomen dat ze nog meer geschiedenis stelen.",
      },
      {
        speaker: "player",
        text: "Ik ben er klaar voor. Laten we de geschiedenis van Rotterdam terughalen!",
      },
      {
        speaker: "npc",
        text: "De tijd dringt... welkom bij de strijd tegen de Time Thieves.",
      },
    ],
  ],
  leya_dialogue: [
    [
      {
        speaker: "player",
        text: "Hallo mevrouw, mag ik vragen wat u hier aan het doen bent?",
      },
      {
        speaker: "npc",
        text: "Oh hallo! Mijn naam is Leya, ik ben historisch fotograaf. Ik weet eigenlijk niet precies waarom, maar dit standbeeld trok mijn aandacht.",
      },
      {
        speaker: "player",
        text: "Ik denk dat ik weet waarom dit standbeeld uw aandacht trok.",
      },
      {
        speaker: "player",
        text: "Ik geloof dat dit standbeeld herinneringen bevat aan een belangrijke historische gebeurtenis.",
      },
      {
        speaker: "player",
        text: "Wat kunt u me hierover vertellen?",
      },
      {
        speaker: "npc",
        text: "Nou... mijn oma vertelde me vroeger verhalen over de oorlog en hoe het was in die tijd.",
      },
      {
        speaker: "npc",
        text: "Ze vertelde dat een groot deel van de stad in 1940 werd verwoest tijdens het bombardement.",
      },
      {
        speaker: "npc",
        text: "Vooral het stadscentrum werd zwaar geraakt door de branden en explosies.",
      },
      {
        speaker: "npc",
        text: "Mijn oma zei altijd dat het bombardement maar ongeveer vijftien minuten duurde, maar dat het voor de mensen daar eindeloos voelde.",
      },
      {
        speaker: "npc",
        text: "Ik herinner me een reeks foto's die mijn oma tijdens de oorlog maakte. De oorlog heeft Rotterdam enorm veranderd. Het liet een litteken achter in het hart van de stad.",
      },
      {
        speaker: "player",
        text: "Het klinkt alsof uw oma veel heeft meegemaakt.",
      },
      {
        speaker: "player",
        text: "Herinnert u zich nog andere historische gebeurtenissen van Rotterdam?",
      },
      {
        speaker: "npc",
        text: "Het voelt alsof ik meer zou moeten weten, maar om de een of andere reden kan ik het me niet herinneren. Dus het spijt me, maar nee.",
      },
      {
        speaker: "player",
        text: "Maakt u zich geen zorgen. Bedankt dat u het verhaal van uw oma wilde delen.",
      },
    ],
    [
      {
        speaker: "npc",
        text: "Oh, je bent er weer. Sinds ons vorige gesprek blijf ik maar denken aan de verhalen van mijn oma.",
      },
      {
        speaker: "npc",
        text: "Het is vreemd... hoe meer ik hierover praat, hoe meer herinneringen terug lijken te komen.",
      },
      {
        speaker: "player",
        text: "Misschien herstellen de herinneringen zich langzaam weer.",
      },
      {
        speaker: "npc",
        text: "Misschien wel. Ik blijf steeds denken aan de rook boven de stad op die oude foto's. Ik kan je hulp gebruiken om meer van die foto's te vinden.",
      },
      {
        speaker: "npc",
        text: "Mijn oma zei altijd dat Rotterdam na het bombardement nooit meer hetzelfde was.",
      },
      {
        speaker: "npc",
        text: "Ze vertelde vroeger ook vaak over het monument.",
      },
      {
        speaker: "npc",
        text: "Mijn oma zei dat het ontbrekende hart van het beeld symbool staat voor het verloren hart van Rotterdam.",
      },
      {
        speaker: "player",
        text: "Elke herinnering helpt om de geschiedenis terug te brengen.",
      },
      {
        speaker: "npc",
        text: "Blijf verder zoeken. Het voelt alsof de stad haar verleden langzaam begint terug te krijgen.",
      },
      {
        speaker: "player",
        text: "Ik zal mijn best doen om nog meer herinneringen te vinden en te herstellen.",
      },
    ],
  ],
  timethieves_dialogue: [
    [
      {
        speaker: "player",
        text: "Hallo daar! Ik heb gehoord dat jullie de geschiedenis van Rotterdam stelen. Waarom?",
      },
      {
        speaker: "npc",
        text: "Waarom zouden mensen zich pijn en verdriet moeten blijven herinneren?",
      },
      {
        speaker: "npc",
        text: "Kijk naar dit monument... een hart ontnomen uit een lichaam. Een eeuwige herinnering aan verlies.",
      },
      {
        speaker: "npc",
        text: "De Time Thieves willen de mensen van Rotterdam juist bevrijden van die pijnlijke herinneringen.",
      },
      {
        speaker: "player",
        text: "Maar zonder geschiedenis weet niemand meer wat deze stad heeft doorgemaakt.",
      },
      {
        speaker: "npc",
        text: "Misschien is dat beter. Geen verdriet, geen trauma, geen littekens van oorlog.",
      },
      {
        speaker: "npc",
        text: "Alleen de mooie herinneringen blijven bestaan. Een gelukkiger Rotterdam.",
      },
      {
        speaker: "player",
        text: "Maar de geschiedenis hoort bij de identiteit van de stad.",
      },
      {
        speaker: "npc",
        text: "Identiteit gebouwd op pijn brengt alleen nieuwe pijn voort.",
      },
      {
        speaker: "npc",
        text: "Toen Ossip Zadkine dit monument maakte en het in 1953 werd onthuld, wilde hij dat niemand het bombardement ooit zou vergeten.",
      },
      {
        speaker: "npc",
        text: "De Duitsers gebruikten het bombardement om Nederland tot overgave te dwingen. Het kostte veel onschuldige levens en verwoestte de stad.",
      },
      {
        speaker: "npc",
        text: "Wij geloven dat sommige herinneringen beter verborgen kunnen blijven.",
      },
      {
        speaker: "player",
        text: "Ik denk dat mensen zelf moeten kunnen kiezen wat ze herinneren.",
      },
      {
        speaker: "npc",
        text: "Dan zul je de verloren herinneringen moeten herstellen... voordat ze voorgoed verdwijnen.",
      },
      {
        speaker: "player",
        text: "Ik ben niet bang voor jullie. Ik zal de geschiedenis van Rotterdam terughalen, wat er ook voor nodig is.",
      },
    ],
  ],
  timethieves_locked_dialogue: [
    [
      {
        speaker: "npc",
        text: "Je bent er nog niet klaar voor om ons te confronteren.",
      },
      {
        speaker: "npc",
        text: "Kom terug wanneer je meer herinneringen hebt hersteld en items hebt verzameld.",
      },
    ],
  ],
  timethieves_final_dialogue: [
    [
      {
        speaker: "npc",
        text: "Ha! Je bent terug. Er is niets wat je kunt doen om ons te stoppen. Je kunt de geschiedenis niet terugdraaien.",
      },
      {
        speaker: "player",
        text: "Als jullie denken dat ik zomaar zou toekijken, dan hebben jullie het mis. Samen met Professor E. Brown heb ik een plan bedacht.",
      },
      {
        speaker: "npc",
        text: "Een plan? Hahaha! Jullie zijn te laat. De herinneringen zijn verdwenen en binnenkort zal niemand zich nog herinneren wat hier ooit is gebeurd.",
      },
      {
        speaker: "player",
        text: "Niet alleen de professor heeft geholpen. Ook de mensen in de stad hebben geholpen om verloren herinneringen terug te vinden.",
      },
      {
        speaker: "npc",
        text: "Dat kan niet! Wij hebben alles uitgewist. De herinneringen zijn verdwenen!",
      },
      {
        speaker: "player",
        text: "Dat dachten jullie. De herinneringen zijn misschien verborgen, maar ze zijn niet verdwenen.",
      },
      {
        speaker: "player",
        text: "De monumenten van Rotterdam dragen de verhalen van het verleden met zich mee. Herinneringen verdwijnen niet zolang er iets is dat ze bewaart.",
      },
      {
        speaker: "npc",
        text: "Nee... Dat is onmogelijk.",
      },
      {
        speaker: "player",
        text: "De historische foto's, gebouwen en monumenten. Ze bewaren allemaal een stukje geschiedenis.",
      },
      {
        speaker: "npc",
        text: "Maar... die herinneringen... daar kun je toch niets mee?",
      },
      {
        speaker: "player",
        text: "Dat dachten jullie.",
      },
      {
        speaker: "player",
        text: "Met behulp van deze herinneringen hebben Professor E. Brown en ik iets in elkaar gezet.",
      },
      {
        speaker: "npc",
        text: "Wat bedoel je?",
      },
      {
        speaker: "player",
        text: "Dit.",
      },
      {
        speaker: "npc",
        text: "Nee... Dat is onmogelijk. De Zandloper der Tijden!",
      },
      {
        speaker: "player",
        text: "Met deze zandloper kunnen de verloren herinneringen worden hersteld en kunnen jullie je niet langer verschuilen achter leugens en vergetelheid.",
      },
      {
        speaker: "npc",
        text: "Stop! Als je de zandloper omdraait, komt alles terug wat wij hebben gestolen!",
      },
      {
        speaker: "player",
        text: "En dat is precies wat ik ga doen.",
      },
      {
        speaker: "player",
        text: "*Draait De Zandloper der Tijden om*",
      },
      {
        speaker: "npc",
        text: "Wat gebeurt er?!",
      },
      {
        speaker: "npc",
        text: "Onze dekmantels... ze verdwijnen!",
      },
      {
        speaker: "npc",
        text: "Ik voel het... De herinneringen herstellen zich. De verhalen keren terug.",
      },
      {
        speaker: "npc",
        text: "De foto's... de monumenten... alles wordt weer herinnerd!",
      },
      {
        speaker: "player",
        text: "De geschiedenis van Rotterdam hoort bij de mensen. Jullie kunnen die niet stelen.",
      },
      {
        speaker: "npc",
        text: "Dit is niet de laatste keer dat jullie van ons horen.",
      },
      {
        speaker: "npc",
        text: "Deze stad draagt nog steeds pijn en verdriet met zich mee. Vroeg of laat keren wij terug.",
      },
      {
        speaker: "player",
        text: "Zolang mensen hun verhalen blijven delen, zullen de Time Thieves nooit winnen.",
      },
      {
        speaker: "npc",
        text: "We zullen zien of de tijd ons inhaalt...",
      },
      {
        speaker: "npc",
        text: "Maar voor nu... is dit het einde van de Time Thieves.",
      },
      {
        speaker: "npc",
        text: "*De Time Thieves verdwijnen langzaam in de tijd*",
      },
      {
        speaker: "player",
        text: "Dit was het verhaal van de strijd tegen de Time Thieves. Bedankt dat je hebt geholpen om de geschiedenis van Rotterdam te herstellen.",
      },
    ],
  ],
};

const fallbackDialogueConversations = npcDialogues.introduction_dialogue;
const queryParams = new URLSearchParams(window.location.search);
const requestedSceneId =
  queryParams.get("scene")?.trim().toLowerCase() || undefined;

const pendingSpeakerHideTimeoutByController = new Map<bigint, number>();
const exhaustedConversationText =
  "Ik heb op dit moment niets waarmee ik je kan helpen.";
const completedDialogueKeys = new Set<string>();
const CONVERSATION_COMPLETED_STORAGE_KEY_PREFIX = "conversation-completed";
const CONVERSATION_NEXT_INDEX_STORAGE_KEY_PREFIX = "conversation-next-index";

const dialogueKeyByNpcId: Record<string, string> = {
  "de-verwoeste-stad-00": "professor_introduction_dialogue",
  "de-verwoeste-stad-01": "leya_dialogue",
  "de-verwoeste-stad-03": "timethieves_dialogue",
  "de-verwoeste-stad-07": "timethieves_final_dialogue",
};

function normalizeNpcId(npcId: string | undefined): string {
  return npcId?.trim().toLowerCase() || "";
}

function getDialogueKeyForNpc(npcId: string | undefined): string {
  const normalizedId = normalizeNpcId(npcId);
  if (!normalizedId) {
    return "introduction_dialogue";
  }

  if (
    normalizedId === "de-verwoeste-stad-07" &&
    !hasInventoryItem("Zandloper onderdeel 3") &&
    !hasInventoryItem("Zandloper onderdeel 2")
  ) {
    return "timethieves_locked_dialogue";
  }

  return dialogueKeyByNpcId[normalizedId] || normalizedId;
}

function getDialoguesForNpc(npcId: string | undefined): DialogueTurn[][] {
  const dialogueKey = getDialogueKeyForNpc(npcId);
  const dialogues = npcDialogues[dialogueKey];
  if (!Array.isArray(dialogues)) {
    return [];
  }

  return dialogues.filter((dialogue) => dialogue.length > 0);
}

function getConversationCompletedStorageKey(dialogueKey: string): string {
  return `${CONVERSATION_COMPLETED_STORAGE_KEY_PREFIX}:${dialogueKey || "introduction_dialogue"}`;
}

function markDialogueCompleted(dialogueKey: string) {
  const normalizedKey = dialogueKey || "introduction_dialogue";
  completedDialogueKeys.add(normalizedKey);
  window.localStorage.setItem(
    getConversationCompletedStorageKey(normalizedKey),
    "1",
  );
}

function isDialogueCompleted(dialogueKey: string): boolean {
  const normalizedKey = dialogueKey || "introduction_dialogue";
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

function getConversationNextIndexStorageKey(dialogueKey: string): string {
  return `${CONVERSATION_NEXT_INDEX_STORAGE_KEY_PREFIX}:${dialogueKey || "introduction_dialogue"}`;
}

function getStoredNextConversationIndex(dialogueKey: string): number {
  const rawValue = window.localStorage.getItem(
    getConversationNextIndexStorageKey(dialogueKey),
  );
  const parsedValue = Number(rawValue);

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    return 0;
  }

  return parsedValue;
}

function storeNextConversationIndex(dialogueKey: string, nextIndex: number) {
  const normalizedKey = dialogueKey || "introduction_dialogue";
  window.localStorage.setItem(
    getConversationNextIndexStorageKey(normalizedKey),
    String(Math.max(0, Math.floor(nextIndex))),
  );
}

function clearStoredNextConversationIndex(dialogueKey: string) {
  const normalizedKey = dialogueKey || "introduction_dialogue";
  window.localStorage.removeItem(
    getConversationNextIndexStorageKey(normalizedKey),
  );
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

function findNamedChildEntity(
  rootEntity: ecs.Entity,
  targetName: string,
): ecs.Entity | null {
  const normalizedTargetName = targetName.trim().toLowerCase();
  const queue: ecs.Entity[] = [rootEntity];

  while (queue.length > 0) {
    const entity = queue.shift();
    if (!entity) {
      continue;
    }

    const runtimeName = (entity as unknown as { name?: string }).name;
    if ((runtimeName || "").trim().toLowerCase() === normalizedTargetName) {
      return entity;
    }

    queue.push(...entity.getChildren());
  }

  return null;
}

function setHourglassVisibility(
  world: ecs.World,
  rootEntity: ecs.Entity,
  isVisible: boolean,
  configuredHourglassEid?: bigint,
) {
  const hourglassEntity =
    resolveTextTargetEntity(world, configuredHourglassEid) ||
    findNamedChildEntity(rootEntity, "Hourglass");
  if (!hourglassEntity) {
    return;
  }

  setTextVisibility(hourglassEntity, isVisible);
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
    return {
      npcTextEntity,
      playerTextEntity,
    };
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

  return {
    npcTextEntity,
    playerTextEntity,
  };
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
  fallbackTextEntity: ecs.Entity | null,
) {
  const npcTextTarget = npcTextEntity || fallbackTextEntity;

  const showCurrentSpeaker = () => {
    if (currentSpeaker === "npc") {
      setTextVisibility(npcTextTarget, true);
      return;
    }

    setTextVisibility(playerTextEntity || fallbackTextEntity, true);
  };

  const hideOtherSpeaker = () => {
    if (currentSpeaker === "npc") {
      setTextVisibility(playerTextEntity, false);
      return;
    }

    setTextVisibility(npcTextTarget, false);
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
  configuredHourglassEid?: bigint,
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
  if (normalizeNpcId(componentNpcId) === "de-verwoeste-stad-07") {
    setHourglassVisibility(world, rootEntity, false, configuredHourglassEid);
  }
}

function updateDialogueText(
  world: ecs.World,
  currentEid: bigint,
  dialogue: DialogueTurn[],
  lineIndex: number,
  componentNpcId: string | undefined,
  previousSpeaker: Speaker | null,
  configuredRootEid?: bigint,
  configuredHourglassEid?: bigint,
  configuredNpcTextEid?: bigint,
  configuredPlayerTextEid?: bigint,
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
    switchSpeakerVisibility(
      currentEid,
      previousSpeaker,
      "npc",
      npcTextEntity,
      playerTextEntity,
      dialogueBubble,
    );
    return "npc";
  }

  if (playerTextEntity) {
    playerTextEntity.set(ecs.Ui, { text: currentTurn.text });
    if (
      normalizeNpcId(componentNpcId) === "de-verwoeste-stad-07" &&
      currentTurn.text.trim() === "Dit."
    ) {
      setHourglassVisibility(world, rootEntity, true, configuredHourglassEid);
    }
    switchSpeakerVisibility(
      currentEid,
      previousSpeaker,
      "player",
      npcTextEntity,
      playerTextEntity,
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
    dialogueBubble,
  );
  return "player";
}

function applyExhaustedConversationState(
  world: ecs.World,
  currentEid: bigint,
  componentNpcId: string | undefined,
  configuredRootEid?: bigint,
  configuredHourglassEid?: bigint,
  configuredNpcTextEid?: bigint,
  configuredPlayerTextEid?: bigint,
) {
  if (!world.eidToEntity.has(currentEid)) {
    return;
  }

  const buttonEntity = world.getEntity(currentEid);
  const rootEntity = getConversationRoot(
    world,
    buttonEntity,
    configuredRootEid,
  );
  if (!rootEntity) {
    return;
  }

  if (!shouldButtonHandleNpc(componentNpcId)) {
    return;
  }

  showOnlyActiveConversation(rootEntity);
  if (normalizeNpcId(componentNpcId) === "de-verwoeste-stad-07") {
    setHourglassVisibility(world, rootEntity, false, configuredHourglassEid);
  }

  const dialogueBubble = findDialogueBubble(rootEntity, currentEid);
  const { npcTextEntity, playerTextEntity } = findConversationTextEntities(
    world,
    rootEntity,
    currentEid,
    configuredNpcTextEid,
    configuredPlayerTextEid,
  );

  const npcTextTarget = npcTextEntity || dialogueBubble;
  if (npcTextTarget) {
    npcTextTarget.set(ecs.Ui, { text: exhaustedConversationText });
  }

  setTextVisibility(npcTextTarget, true);
  setTextVisibility(playerTextEntity, false);
  setConversationInteractionState(rootEntity, true);
}

ecs.registerComponent({
  name: "TapToStart",
  schema: {
    npcId: "string",
    conversationRoot: "eid",
    hourglassTarget: "eid",
    npcTextTarget: "eid",
    playerTextTarget: "eid",
  },
  schemaDefaults: {
    npcId: "introduction_dialogue",
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
      component.schema.hourglassTarget,
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
    let isWaitingForReopenToStartNextConversation = false;
    let skipExhaustedMessageOnce = false;
    let activeDialogueKey = "introduction_dialogue";
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
        const dialogues = getDialoguesForNpc(activeNpcId);
        const storedNextIndex =
          getStoredNextConversationIndex(activeDialogueKey);
        currentConversationIndex = Math.min(
          storedNextIndex,
          Math.max(dialogues.length - 1, 0),
        );

        if (isDialogueCompleted(activeDialogueKey)) {
          hasRemainingConversations = false;
          isWaitingForReopenToStartNextConversation = false;
          skipExhaustedMessageOnce = false;
          if (!exhaustedStateApplied) {
            applyExhaustedConversationState(
              world,
              eid,
              componentNpcId,
              schema.conversationRoot,
              schema.hourglassTarget,
              schema.npcTextTarget,
              schema.playerTextTarget,
            );
            exhaustedStateApplied = true;
          }
          return;
        }

        if (dialogues.length === 0) {
          hasRemainingConversations = false;
          markDialogueCompleted(activeDialogueKey);
          clearStoredNextConversationIndex(activeDialogueKey);
          isWaitingForReopenToStartNextConversation = false;
          skipExhaustedMessageOnce = false;
          return;
        }

        const currentDialogue = dialogues[currentConversationIndex];
        if (!currentDialogue) {
          hasRemainingConversations = false;
          markDialogueCompleted(activeDialogueKey);
          clearStoredNextConversationIndex(activeDialogueKey);
          isWaitingForReopenToStartNextConversation = false;
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
          schema.hourglassTarget,
          schema.npcTextTarget,
          schema.playerTextTarget,
        );

        if (currentDialogue.length > 1) {
          currentDialogueLineIndex = 1;
          isWaitingForReopenToStartNextConversation = false;
          return;
        }

        if (currentConversationIndex < dialogues.length - 1) {
          storeNextConversationIndex(
            activeDialogueKey,
            currentConversationIndex + 1,
          );
          hasRemainingConversations = false;
          isWaitingForReopenToStartNextConversation = true;
          skipExhaustedMessageOnce = false;
          return;
        }

        hasRemainingConversations = false;
        markDialogueCompleted(activeDialogueKey);
        clearStoredNextConversationIndex(activeDialogueKey);
        isWaitingForReopenToStartNextConversation = true;
        skipExhaustedMessageOnce = false;
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
          if (isWaitingForReopenToStartNextConversation) {
            return;
          }

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
          isWaitingForReopenToStartNextConversation = false;
          skipExhaustedMessageOnce = false;
          if (!exhaustedStateApplied) {
            applyExhaustedConversationState(
              world,
              eid,
              componentNpcId,
              schema.conversationRoot,
              schema.hourglassTarget,
              schema.npcTextTarget,
              schema.playerTextTarget,
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
          clearStoredNextConversationIndex(activeDialogueKey);
          isWaitingForReopenToStartNextConversation = false;
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
          schema.hourglassTarget,
          schema.npcTextTarget,
          schema.playerTextTarget,
        );

        if (currentDialogueLineIndex < currentDialogue.length - 1) {
          currentDialogueLineIndex += 1;
          return;
        }

        if (currentConversationIndex < dialogues.length - 1) {
          storeNextConversationIndex(
            activeDialogueKey,
            currentConversationIndex + 1,
          );
          hasRemainingConversations = false;
          isWaitingForReopenToStartNextConversation = true;
          skipExhaustedMessageOnce = false;
          return;
        }

        hasRemainingConversations = false;
        markDialogueCompleted(activeDialogueKey);
        clearStoredNextConversationIndex(activeDialogueKey);
        isWaitingForReopenToStartNextConversation = true;
        skipExhaustedMessageOnce = false;
      })
      .onEvent(ecs.input.SCREEN_TOUCH_END, "default", {
        target: world.events.globalId,
      });
  },
});
