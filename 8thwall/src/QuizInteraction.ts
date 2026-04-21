import * as ecs from "@8thwall/ecs";

type QuizQuestion = {
  question: string;
  answers: [string, string, string];
};

const quizQuestions: QuizQuestion[] = [
  {
    question: "In welk jaar werd Rotterdam gebombardeerd?",
    answers: ["1940", "1945", "1939"],
  },
  {
    question: "Hoe heet dit bekende monument?",
    answers: ["De Boeg", "Erasmusbrug", "Witte Huis"],
  },
  {
    question: "Waar staat De Boeg vooral voor?",
    answers: [
      "Herdenking van zeelieden",
      "Een marktgebouw",
      "Een stationsplein",
    ],
  },
];

const queryParams = new URLSearchParams(window.location.search);
const requestedSceneId =
  queryParams.get("scene")?.trim().toLowerCase() || undefined;

const cameraNameBySceneId: Record<string, string> = {
  "de-boeg": "camera01",
  "de-boeg-01": "camera01",
  "de-boeg-02": "camera02",
};

function normalizeId(value: string | undefined): string {
  return value?.trim().toLowerCase() || "";
}

function applySceneCamera(world: ecs.World, sceneId: string | undefined) {
  const normalizedSceneId = normalizeId(sceneId);
  const targetCameraName = cameraNameBySceneId[normalizedSceneId];

  if (!targetCameraName) {
    return;
  }

  const normalizedCameraName = targetCameraName.toLowerCase();
  let targetCameraEid: bigint | null = null;

  for (const entity of world.eidToEntity.values()) {
    if (!entity.has(ecs.Camera)) {
      continue;
    }

    const runtimeName = (entity as unknown as { name?: string }).name;
    if ((runtimeName || "").trim().toLowerCase() !== normalizedCameraName) {
      continue;
    }

    targetCameraEid = entity.eid;
    break;
  }

  if (!targetCameraEid) {
    return;
  }

  if (world.camera.getActiveEid() !== targetCameraEid) {
    world.camera.setActiveEid(targetCameraEid);
  }
}

function shouldHandleQuizScene(componentNpcId: string | undefined): boolean {
  if (!requestedSceneId) {
    return false;
  }

  return normalizeId(componentNpcId) === requestedSceneId;
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

function setText(entity: ecs.Entity | null, text: string) {
  if (!entity || !entity.has(ecs.Ui)) {
    return;
  }

  entity.set(ecs.Ui, { text });
}

function setVisible(entity: ecs.Entity | null, isVisible: boolean) {
  if (!entity) {
    return;
  }

  if (isVisible && entity.isHidden()) {
    entity.show();
  }

  if (!isVisible && !entity.isHidden()) {
    entity.hide();
  }
}

function getQuizRoot(
  world: ecs.World,
  eid: bigint,
  configuredRootEid?: bigint,
): ecs.Entity {
  if (configuredRootEid && world.eidToEntity.has(configuredRootEid)) {
    return world.getEntity(configuredRootEid);
  }

  return world.getEntity(eid);
}

function renderQuestion(
  world: ecs.World,
  eid: bigint,
  questionIndex: number,
  schema: {
    questionTextTarget?: bigint;
    answer1TextTarget?: bigint;
    answer2TextTarget?: bigint;
    answer3TextTarget?: bigint;
    quizRoot?: bigint;
  },
) {
  const root = getQuizRoot(world, eid, schema.quizRoot);
  const question = quizQuestions[questionIndex % quizQuestions.length];

  const questionTextEntity =
    resolveTargetEntity(world, schema.questionTextTarget) ||
    findByName(root, "Tekst npc");
  const answer1TextEntity =
    resolveTargetEntity(world, schema.answer1TextTarget) ||
    findByName(root, "Antwoord1 tekst");
  const answer2TextEntity =
    resolveTargetEntity(world, schema.answer2TextTarget) ||
    findByName(root, "Antwoord2 tekst");
  const answer3TextEntity =
    resolveTargetEntity(world, schema.answer3TextTarget) ||
    findByName(root, "Antwoord3 tekst");

  setText(questionTextEntity, question.question);
  setText(answer1TextEntity, question.answers[0]);
  setText(answer2TextEntity, question.answers[1]);
  setText(answer3TextEntity, question.answers[2]);

  setVisible(questionTextEntity, true);
  setVisible(answer1TextEntity, true);
  setVisible(answer2TextEntity, true);
  setVisible(answer3TextEntity, true);
}

ecs.registerComponent({
  name: "QuizInteraction",
  schema: {
    npcId: "string",
    quizRoot: "eid",
    questionTextTarget: "eid",
    answer1Button: "eid",
    answer2Button: "eid",
    answer3Button: "eid",
    answer1TextTarget: "eid",
    answer2TextTarget: "eid",
    answer3TextTarget: "eid",
  },
  schemaDefaults: {
    npcId: "de-boeg-02",
  },
  add: (world, component) => {
    const schema = component.schema;
    applySceneCamera(world, requestedSceneId || schema.npcId);

    const root = getQuizRoot(world, component.eid, schema.quizRoot);
    const shouldHandle = shouldHandleQuizScene(schema.npcId);
    setInteractionState(root, shouldHandle);

    if (shouldHandle) {
      renderQuestion(world, component.eid, 0, schema);
    }
  },
  stateMachine: ({ world, eid, schemaAttribute }) => {
    let initialized = false;
    let currentQuestionIndex = 0;
    const initialSchema = schemaAttribute.get(eid);

    const answer1Target = initialSchema.answer1TextTarget;
    const answer2Target = initialSchema.answer2TextTarget;
    const answer3Target = initialSchema.answer3TextTarget;

    const handleAnswer = () => {
      const schema = schemaAttribute.get(eid);
      if (!shouldHandleQuizScene(schema.npcId)) {
        return;
      }

      currentQuestionIndex = (currentQuestionIndex + 1) % quizQuestions.length;
      renderQuestion(world, eid, currentQuestionIndex, schema);
    };

    ecs
      .defineState("default")
      .initial()
      .onEnter(() => {
        const schema = schemaAttribute.get(eid);
        applySceneCamera(world, requestedSceneId || schema.npcId);

        const root = getQuizRoot(world, eid, schema.quizRoot);
        const shouldHandle = shouldHandleQuizScene(schema.npcId);

        setInteractionState(root, shouldHandle);
        if (!shouldHandle) {
          return;
        }

        if (!initialized) {
          initialized = true;
          currentQuestionIndex = 0;
          renderQuestion(world, eid, currentQuestionIndex, schema);
        }
      })
      .onTick(() => {
        const schema = schemaAttribute.get(eid);
        applySceneCamera(world, requestedSceneId || schema.npcId);
      })
      .onEvent(ecs.input.SCREEN_TOUCH_START, "pickedAnswer1", {
        target: answer1Target,
      })
      .onEvent(ecs.input.SCREEN_TOUCH_START, "pickedAnswer2", {
        target: answer2Target,
      })
      .onEvent(ecs.input.SCREEN_TOUCH_START, "pickedAnswer3", {
        target: answer3Target,
      });

    ecs
      .defineState("pickedAnswer1")
      .onEnter(() => {
        handleAnswer();
      })
      .onEvent(ecs.input.SCREEN_TOUCH_END, "default", {
        target: world.events.globalId,
      });

    ecs
      .defineState("pickedAnswer2")
      .onEnter(() => {
        handleAnswer();
      })
      .onEvent(ecs.input.SCREEN_TOUCH_END, "default", {
        target: world.events.globalId,
      });

    ecs
      .defineState("pickedAnswer3")
      .onEnter(() => {
        handleAnswer();
      })
      .onEvent(ecs.input.SCREEN_TOUCH_END, "default", {
        target: world.events.globalId,
      });
  },
});
