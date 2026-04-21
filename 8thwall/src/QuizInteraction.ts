import * as ecs from "@8thwall/ecs";

type QuizQuestion = {
  question: string;
  answers: [string, string, string];
  correctAnswerIndex: 0 | 1 | 2;
};

const quizQuestions: QuizQuestion[] = [
  {
    question: "In welk jaar werd Rotterdam gebombardeerd?",
    answers: ["1940", "1945", "1939"],
    correctAnswerIndex: 0,
  },
  {
    question: "Hoe heet dit bekende monument?",
    answers: ["De Boeg", "Erasmusbrug", "Witte Huis"],
    correctAnswerIndex: 0,
  },
  {
    question: "Waar staat De Boeg vooral voor?",
    answers: [
      "Herdenking van zeelieden",
      "Een marktgebouw",
      "Een stationsplein",
    ],
    correctAnswerIndex: 0,
  },
];

const queryParams = new URLSearchParams(window.location.search);
const requestedSceneId =
  queryParams.get("scene")?.trim().toLowerCase() || undefined;

const ITEM_GRANTED_STORAGE_KEY_PREFIX = "time-thieves-quiz-item-granted";

function normalizeId(value: string | undefined): string {
  return value?.trim().toLowerCase() || "";
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

function getQuizButtonEntities(
  world: ecs.World,
  eid: bigint,
  schema: {
    answer1Button?: bigint;
    answer2Button?: bigint;
    answer3Button?: bigint;
    quizRoot?: bigint;
  },
): Array<ecs.Entity | null> {
  const root = getQuizRoot(world, eid, schema.quizRoot);

  const answer1ButtonEntity =
    resolveTargetEntity(world, schema.answer1Button) ||
    findByName(root, "Antwoord1");
  const answer2ButtonEntity =
    resolveTargetEntity(world, schema.answer2Button) ||
    findByName(root, "Antwoord2");
  const answer3ButtonEntity =
    resolveTargetEntity(world, schema.answer3Button) ||
    findByName(root, "Antwoord3");

  return [answer1ButtonEntity, answer2ButtonEntity, answer3ButtonEntity];
}

function getRewardItemEntity(
  world: ecs.World,
  eid: bigint,
  schema: {
    rewardItemTarget?: bigint;
    quizRoot?: bigint;
  },
): ecs.Entity | null {
  const root = getQuizRoot(world, eid, schema.quizRoot);
  return (
    resolveTargetEntity(world, schema.rewardItemTarget) ||
    findByName(root, "Item") ||
    findByName(root, "Beloning")
  );
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

function setAnswerButtonsVisible(
  world: ecs.World,
  eid: bigint,
  schema: {
    answer1Button?: bigint;
    answer2Button?: bigint;
    answer3Button?: bigint;
    quizRoot?: bigint;
  },
  isVisible: boolean,
) {
  const answerButtonEntities = getQuizButtonEntities(world, eid, schema);
  for (const entity of answerButtonEntities) {
    setEntityEnabledAndVisible(entity, isVisible);
  }
}

function getItemGrantedStorageKey(componentNpcId: string | undefined): string {
  return `${ITEM_GRANTED_STORAGE_KEY_PREFIX}:${normalizeId(componentNpcId) || "de-boeg-02"}`;
}

function getQuizTextEntities(
  world: ecs.World,
  eid: bigint,
  schema: {
    questionTextTarget?: bigint;
    answer1TextTarget?: bigint;
    answer2TextTarget?: bigint;
    answer3TextTarget?: bigint;
    quizRoot?: bigint;
  },
): {
  questionTextEntity: ecs.Entity | null;
  answerTextEntities: Array<ecs.Entity | null>;
} {
  const root = getQuizRoot(world, eid, schema.quizRoot);

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

  return {
    questionTextEntity,
    answerTextEntities: [
      answer1TextEntity,
      answer2TextEntity,
      answer3TextEntity,
    ],
  };
}

function renderQuestion(
  world: ecs.World,
  eid: bigint,
  questionIndex: number,
  schema: {
    answer1Button?: bigint;
    answer2Button?: bigint;
    answer3Button?: bigint;
    questionTextTarget?: bigint;
    answer1TextTarget?: bigint;
    answer2TextTarget?: bigint;
    answer3TextTarget?: bigint;
    quizRoot?: bigint;
  },
) {
  const question = quizQuestions[questionIndex % quizQuestions.length];
  const { questionTextEntity, answerTextEntities } = getQuizTextEntities(
    world,
    eid,
    schema,
  );

  setText(questionTextEntity, question.question);
  setText(answerTextEntities[0], question.answers[0]);
  setText(answerTextEntities[1], question.answers[1]);
  setText(answerTextEntities[2], question.answers[2]);

  setVisible(questionTextEntity, true);
  setVisible(answerTextEntities[0], true);
  setVisible(answerTextEntities[1], true);
  setVisible(answerTextEntities[2], true);
  setAnswerButtonsVisible(world, eid, schema, true);
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
    rewardItemTarget: "eid",
  },
  schemaDefaults: {
    npcId: "de-boeg-02",
  },
  add: (world, component) => {
    const schema = component.schema;
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
    let score = 0;
    let answeredCount = 0;
    let isLocked = false;
    let isQuizComplete = false;
    let isAwaitingReplayChoice = false;
    let isPermanentlyCompleted = false;
    let pendingAdvanceTimeout: number | null = null;
    const initialSchema = schemaAttribute.get(eid);

    const answer1Target = initialSchema.answer1TextTarget;
    const answer2Target = initialSchema.answer2TextTarget;
    const answer3Target = initialSchema.answer3TextTarget;

    const clearPendingAdvance = () => {
      if (pendingAdvanceTimeout !== null) {
        window.clearTimeout(pendingAdvanceTimeout);
        pendingAdvanceTimeout = null;
      }
    };

    const resetQuizProgress = (schema: {
      answer1Button?: bigint;
      answer2Button?: bigint;
      answer3Button?: bigint;
      questionTextTarget?: bigint;
      answer1TextTarget?: bigint;
      answer2TextTarget?: bigint;
      answer3TextTarget?: bigint;
      quizRoot?: bigint;
    }) => {
      clearPendingAdvance();
      currentQuestionIndex = 0;
      score = 0;
      answeredCount = 0;
      isLocked = false;
      isQuizComplete = false;
      isAwaitingReplayChoice = false;
      renderQuestion(world, eid, currentQuestionIndex, schema);
    };

    const grantRewardItem = (schema: {
      npcId?: string;
      rewardItemTarget?: bigint;
      quizRoot?: bigint;
    }) => {
      const rewardItemEntity = getRewardItemEntity(world, eid, schema);
      setEntityEnabledAndVisible(rewardItemEntity, true);

      const storageKey = getItemGrantedStorageKey(schema.npcId);
      window.localStorage.setItem(storageKey, "1");
      isPermanentlyCompleted = true;

      window.dispatchEvent(
        new CustomEvent("quiz-item-earned", {
          detail: {
            npcId: schema.npcId,
            score,
            total: quizQuestions.length,
          },
        }),
      );
    };

    const renderFinalScore = (schema: {
      questionTextTarget?: bigint;
      answer1TextTarget?: bigint;
      answer2TextTarget?: bigint;
      answer3TextTarget?: bigint;
      quizRoot?: bigint;
    }) => {
      const { questionTextEntity, answerTextEntities } = getQuizTextEntities(
        world,
        eid,
        schema,
      );
      const total = quizQuestions.length;
      const hasPerfectScore = score === total;

      setText(
        questionTextEntity,
        `Quiz klaar! Score: ${score}/${total} (${Math.round((score / total) * 100)}%)`,
      );

      if (hasPerfectScore) {
        setText(answerTextEntities[0], "Bedankt voor het spelen.");
        setText(answerTextEntities[1], "Je hebt het item ontvangen!");
        setText(answerTextEntities[2], "Quiz voltooid.");
        isAwaitingReplayChoice = false;
        grantRewardItem(schema);
        return;
      }

      setText(answerTextEntities[0], "Bedankt voor het spelen.");
      setText(answerTextEntities[1], "Niet alles goed. Probeer opnieuw.");
      setText(answerTextEntities[2], "Speel opnieuw");
      isAwaitingReplayChoice = true;
    };

    const handleAnswer = (selectedAnswerIndex: 0 | 1 | 2) => {
      const schema = schemaAttribute.get(eid);
      if (
        !shouldHandleQuizScene(schema.npcId) ||
        isLocked ||
        isPermanentlyCompleted
      ) {
        return;
      }

      if (isAwaitingReplayChoice) {
        if (selectedAnswerIndex === 2) {
          resetQuizProgress(schema);
        }
        return;
      }

      if (isQuizComplete) {
        return;
      }

      const question = quizQuestions[currentQuestionIndex];
      const isCorrect = selectedAnswerIndex === question.correctAnswerIndex;
      if (isCorrect) {
        score += 1;
      }

      answeredCount += 1;
      isLocked = true;

      const { questionTextEntity, answerTextEntities } = getQuizTextEntities(
        world,
        eid,
        schema,
      );

      setText(
        questionTextEntity,
        isCorrect ? "Correct!" : "Helaas, dat is niet correct.",
      );

      setText(
        answerTextEntities[selectedAnswerIndex],
        `${question.answers[selectedAnswerIndex]} ${isCorrect ? "(correct)" : "(jouw keuze)"}`,
      );

      if (!isCorrect) {
        setText(
          answerTextEntities[question.correctAnswerIndex],
          `${question.answers[question.correctAnswerIndex]}`,
        );
      }

      clearPendingAdvance();
      pendingAdvanceTimeout = window.setTimeout(() => {
        pendingAdvanceTimeout = null;

        if (answeredCount >= quizQuestions.length) {
          isQuizComplete = true;
          renderFinalScore(schema);
          isLocked = false;
          return;
        }

        currentQuestionIndex += 1;
        renderQuestion(world, eid, currentQuestionIndex, schema);
        isLocked = false;
      }, 1500);
    };

    ecs
      .defineState("default")
      .initial()
      .onEnter(() => {
        const schema = schemaAttribute.get(eid);
        const root = getQuizRoot(world, eid, schema.quizRoot);
        const shouldHandle = shouldHandleQuizScene(schema.npcId);

        setInteractionState(root, shouldHandle);
        if (!shouldHandle) {
          clearPendingAdvance();
          return;
        }

        const storageKey = getItemGrantedStorageKey(schema.npcId);
        const isItemAlreadyGranted =
          window.localStorage.getItem(storageKey) === "1";
        if (isItemAlreadyGranted) {
          setAnswerButtonsVisible(world, eid, schema, false);
          isPermanentlyCompleted = true;
          isQuizComplete = true;
          isAwaitingReplayChoice = false;

          const { questionTextEntity, answerTextEntities } =
            getQuizTextEntities(world, eid, schema);
          setText(questionTextEntity, "Quiz al voltooid.");
          setText(answerTextEntities[0], "");
          setText(answerTextEntities[1], "");
          setText(answerTextEntities[2], "");
          setVisible(questionTextEntity, true);
          setVisible(answerTextEntities[0], false);
          setVisible(answerTextEntities[1], false);
          setVisible(answerTextEntities[2], false);
          setEntityEnabledAndVisible(
            getRewardItemEntity(world, eid, schema),
            true,
          );
          return;
        }

        if (!initialized) {
          initialized = true;
          resetQuizProgress(schema);
        }
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
        handleAnswer(0);
      })
      .onEvent(ecs.input.SCREEN_TOUCH_END, "default", {
        target: world.events.globalId,
      });

    ecs
      .defineState("pickedAnswer2")
      .onEnter(() => {
        handleAnswer(1);
      })
      .onEvent(ecs.input.SCREEN_TOUCH_END, "default", {
        target: world.events.globalId,
      });

    ecs
      .defineState("pickedAnswer3")
      .onEnter(() => {
        handleAnswer(2);
      })
      .onEvent(ecs.input.SCREEN_TOUCH_END, "default", {
        target: world.events.globalId,
      });
  },
});
