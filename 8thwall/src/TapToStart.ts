// This is a component file. You can use this file to define a custom component for your project.
// This component will appear as a custom component in the editor.

import * as ecs from "@8thwall/ecs"; // This is how you access the ecs library.

const hiddenUiQuery = ecs.defineQuery([ecs.Ui, ecs.Hidden]);

ecs.registerComponent({
  name: "TapToStart",
  // schema: {
  // },
  // schemaDefaults: {
  // },
  // data: {
  // },
  // add: (world, component) => {
  // },
  // tick: (world, component) => {
  // },
  // remove: (world, component) => {
  // },
  stateMachine: ({ world, eid, schemaAttribute, dataAttribute }) => {
    ecs
      .defineState("default")
      .initial()
      .onEvent(ecs.input.SCREEN_TOUCH_START, "touched", {
        target: eid,
      });

    ecs
      .defineState("touched")
      .onEnter(() => {
        // Reveal hidden UI image elements after the button is pressed.
        for (const targetEid of hiddenUiQuery(world)) {
          if (targetEid !== eid) {
            const targetEntity = world.getEntity(targetEid);
            const ui = targetEntity.get(ecs.Ui);

            if (ui.image) {
              targetEntity.show();
            }
          }
        }
      })
      .onEvent(ecs.input.SCREEN_TOUCH_END, "default", {
        target: eid,
      });
  },
});
