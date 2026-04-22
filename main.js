import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN;
let viewer;

try {
  viewer = new Cesium.Viewer("cesiumContainer", {
    terrainProvider: Cesium.createWorldTerrain({
      requestWaterMask: true,
      requestVertexNormals: true,
    }),
    imageryProvider: new Cesium.IonImageryProvider({ assetId: 2 }),
    baseLayerPicker: false,
    timeline: false,
    animation: true,
    shadows: true,
    shouldAnimate: true,
  });

  viewer.scene.globe.enableLighting = true;
  viewer.scene.globe.depthTestAgainstTerrain = true;

  viewer.scene.shadowMap = new Cesium.ShadowMap({
    context: viewer.scene.context,
    lightSource: viewer.scene.lightSource,
    enabled: true,
  });

  console.log("Viewer created");
} catch (e) {
  console.error("Fallback viewer", e);
  viewer = new Cesium.Viewer("cesiumContainer", {
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    infoBox: false,
    selectionIndicator: false,
    fullscreenButton: false,
    shadows: true,
    shouldAnimate: true,
  });
}

// USER LOCATION + MODEL
let currentLon = 4.4845575;
let currentLat = 51.9122727;

let userPlayer = viewer.entities.add({
  position: new Cesium.CallbackProperty(function () {
    return Cesium.Cartesian3.fromDegrees(currentLon, currentLat, 0);
  }, false),
  model: {
    uri: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/CesiumMan/glTF-Embedded/CesiumMan.gltf",
    minimumPixelSize: 500,
    maximumScale: 2,
  },
});

// GPS TRACKING + CAMERA FOLLOW
let cameraFollow = true;
let touchStartX = 0;
let touchStartY = 0;
let isDragging = false;

const canvas = viewer.scene.canvas;

// Touch drag detection to disable camera follow
canvas.addEventListener("touchstart", (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  isDragging = false;
});

canvas.addEventListener("touchmove", (e) => {
  const moveX = e.touches[0].clientX;
  const moveY = e.touches[0].clientY;
  const dx = Math.abs(moveX - touchStartX);
  const dy = Math.abs(moveY - touchStartY);
  if (dx > 10 || dy > 10) {
    isDragging = true;
    cameraFollow = false;
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
  }
});

canvas.addEventListener("dblclick", () => {
  cameraFollow = true;
});

navigator.geolocation.watchPosition(
  (position) => {
    currentLon = position.coords.longitude;
    currentLat = position.coords.latitude;

    const heading = position.coords.heading || 0;

    const playerPosition = Cesium.Cartesian3.fromDegrees(
      currentLon,
      currentLat,
      5,
    );

    const offset = new Cesium.HeadingPitchRange(
      Cesium.Math.toRadians(heading),
      Cesium.Math.toRadians(-15),
      20,
    );

    // Player direction based on GPS heading
    userPlayer.orientation = Cesium.Transforms.headingPitchRollQuaternion(
      playerPosition,
      new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(heading - 90), 0, 0),
    );

    if (cameraFollow) {
      viewer.camera.lookAt(playerPosition, offset);
    }
    updateZoneButtonsVisibility();
  },
  (error) => {
    console.warn("GPS error, using fallback Rotterdam", error);
    currentLon = 4.47917;
    currentLat = 51.9225;
    updateZoneButtonsVisibility();
  },
  { enableHighAccuracy: true, maximumAge: 3000, timeout: 5000 },
);

// SCORE
let score = 0;
let clickCount = 0;
const scoreGoal = 100;

function updateScoreUI(message = "") {
  const scoreEl = document.getElementById("scoreValue");
  const goalEl = document.getElementById("goalValue");
  const clickEl = document.getElementById("clickCount");
  const msgEl = document.getElementById("gameMessage");
  if (scoreEl) scoreEl.textContent = score.toString();
  if (goalEl) goalEl.textContent = scoreGoal.toString();
  if (clickEl) clickEl.textContent = clickCount.toString();
  if (msgEl) msgEl.textContent = message;
}

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

function spawnObjectsInMonumentZones() {
  const imageUrl = `${import.meta.env.BASE_URL}images/image27.png`;
  const objectsPerZone = 5;
  let objectIndex = 1;

  for (const zone of monumentZones) {
    const { metersPerDegLat, metersPerDegLon } = getMetersPerDegree(
      zone.lon,
      zone.lat,
    );
    const deltaLon = zone.radius / metersPerDegLon;
    const deltaLat = zone.radius / metersPerDegLat;

    for (let i = 0; i < objectsPerZone; i++) {
      const lon = randomInRange(zone.lon - deltaLon, zone.lon + deltaLon);
      const lat = randomInRange(zone.lat - deltaLat, zone.lat + deltaLat);
      const alt = 1;

      zone.objects.push({ lon, lat, alt });

      viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
        billboard: {
          image: imageUrl,
          width: 48,
          height: 48,
        },
        label: {
          text: `Object ${objectIndex}`,
          font: "bold 10px Arial",
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 1,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -16),
        },
      });
      objectIndex++;
    }
  }
}

const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
handler.setInputAction(function (click) {
  const picked = viewer.scene.pick(click.position);
  if (Cesium.defined(picked)) {
    clickCount++;
    score += 10;
    const message =
      score >= scoreGoal
        ? "🎉 Doel bereikt! De Time Thieves zijn verslagen!"
        : "Ga door om het doel te bereiken.";
    updateScoreUI(message);
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

updateScoreUI("klik op de objecten om punten te verdienen!");
// Monument Zones
const monumentZones = [
  {
    name: "De Verwoeste Stad",
    slug: "de-boeg",
    sceneId: "de-boeg", // -02 for test
    lon: 4.4830665,
    lat: 51.9176368,
    radius: 20,
    color: Cesium.Color.ORANGE.withAlpha(0.35),
    objects: [],
  },
  {
    name: "De Boeg",
    slug: "de-verwoeste-stad",
    sceneId: "de-verwoeste-stad",
    lon: 4.4845575,
    lat: 51.9122727,
    radius: 20,
    color: Cesium.Color.CYAN.withAlpha(0.35),
    objects: [],
  },
  {
    name: "Erasmusbeeld",
    slug: "erasmusbeeld",
    sceneId: "erasmusbeeld",
    lon: 4.4843267,
    lat: 51.9215122,
    radius: 20,
    color: Cesium.Color.LIME.withAlpha(0.35),
    objects: [],
  },
  {
    name: "Monument voor alle gevallen",
    slug: "monument-voor-alle-gevallen",
    sceneId: "monument-voor-alle-gevallen",
    lon: 4.4779143,
    lat: 51.9224434,
    radius: 20,
    color: Cesium.Color.MAGENTA.withAlpha(0.35),
    objects: [],
  },
  {
    name: "Calandmonument",
    slug: "calandmonument",
    sceneId: "calandmonument",
    lon: 4.4797535,
    lat: 51.9080186,
    radius: 20,
    color: Cesium.Color.YELLOW.withAlpha(0.35),
    objects: [],
  },
];

let currentActiveMonument = null;

function kilometersToMeters(km) {
  return km * 1000;
}

function getMetersPerDegree(longitude, latitude) {
  const latRad = Cesium.Math.toRadians(latitude);
  const metersPerDegLat =
    111132.92 - 559.82 * Math.cos(2 * latRad) + 1.175 * Math.cos(4 * latRad);
  const metersPerDegLon =
    (Math.PI / 180) * Cesium.Ellipsoid.WGS84.maximumRadius * Math.cos(latRad);
  return { metersPerDegLat, metersPerDegLon };
}

function getSquareCorners(zone) {
  const { metersPerDegLat, metersPerDegLon } = getMetersPerDegree(
    zone.lon,
    zone.lat,
  );
  const deltaLon = zone.radius / metersPerDegLon;
  const deltaLat = zone.radius / metersPerDegLat;
  return [
    Cesium.Cartesian3.fromDegrees(zone.lon - deltaLon, zone.lat - deltaLat, 0),
    Cesium.Cartesian3.fromDegrees(zone.lon + deltaLon, zone.lat - deltaLat, 0),
    Cesium.Cartesian3.fromDegrees(zone.lon + deltaLon, zone.lat + deltaLat, 0),
    Cesium.Cartesian3.fromDegrees(zone.lon - deltaLon, zone.lat + deltaLat, 0),
  ];
}

function isInZone(zone) {
  const { metersPerDegLat, metersPerDegLon } = getMetersPerDegree(
    currentLon,
    currentLat,
  );
  const deltaLon = Math.abs(currentLon - zone.lon) * metersPerDegLon;
  const deltaLat = Math.abs(currentLat - zone.lat) * metersPerDegLat;
  return deltaLon <= zone.radius && deltaLat <= zone.radius;
}

function distanceToZone(zone) {
  const userPosition = Cesium.Cartesian3.fromDegrees(currentLon, currentLat, 0);
  const zonePosition = Cesium.Cartesian3.fromDegrees(zone.lon, zone.lat, 0);
  return Cesium.Cartesian3.distance(userPosition, zonePosition);
}

function createMonumentZones() {
  for (const zone of monumentZones) {
    viewer.entities.add({
      name: zone.name,
      position: Cesium.Cartesian3.fromDegrees(zone.lon, zone.lat, 0.1),
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(getSquareCorners(zone)),
        material: zone.color,
        outline: true,
        outlineColor: Cesium.Color.WHITE,
        height: 0.1,
      },
      label: {
        text: zone.name,
        font: "bold 14px Arial",
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -30),
      },
    });
  }
}

function setGameMessage(message, color = "#b8f5c0") {
  const msgEl = document.getElementById("gameMessage");
  if (msgEl) {
    msgEl.textContent = message;
    msgEl.style.color = color;
  }
}

const eighthWallSceneUrl = import.meta.env.VITE_8THWALL_SCENE_URL || "/ar/";
let arOverlayEl = null;
let arFrameEl = null;

function getArUrlForZone(zone) {
  const url = new URL(zone.arUrl || eighthWallSceneUrl, window.location.href);

  // Without a trailing slash, relative assets (bundle.js, ./external/...) resolve to the app root.
  if (url.origin === window.location.origin && url.pathname === "/ar") {
    url.pathname = "/ar/";
  }

  const sceneId = zone.sceneId || zone.slug || "default";
  url.searchParams.set("scene", sceneId);
  url.searchParams.set("source", "cesium");

  return url.toString();
}

function ensureArOverlay() {
  if (arOverlayEl && arFrameEl) {
    return;
  }

  arOverlayEl = document.createElement("div");
  arOverlayEl.id = "arOverlay";
  arOverlayEl.style.position = "fixed";
  arOverlayEl.style.inset = "0";
  arOverlayEl.style.zIndex = "3000";
  arOverlayEl.style.background = "rgba(0, 0, 0, 0.92)";
  arOverlayEl.style.display = "none";

  const closeButton = document.createElement("button");
  closeButton.textContent = "Terug naar kaart";
  closeButton.style.position = "absolute";
  closeButton.style.top = "14px";
  closeButton.style.right = "14px";
  closeButton.style.zIndex = "3001";
  closeButton.style.padding = "10px 14px";
  closeButton.style.border = "none";
  closeButton.style.borderRadius = "8px";
  closeButton.style.background = "#1f8fff";
  closeButton.style.color = "#fff";
  closeButton.style.cursor = "pointer";
  closeButton.addEventListener("click", () => {
    if (!arOverlayEl || !arFrameEl) return;
    arOverlayEl.style.display = "none";
    arFrameEl.src = "about:blank";
    setGameMessage("Terug in Cesium.", "#b8f5c0");
  });

  arFrameEl = document.createElement("iframe");
  arFrameEl.id = "arFrame";
  arFrameEl.style.width = "100%";
  arFrameEl.style.height = "100%";
  arFrameEl.style.border = "0";
  arFrameEl.style.background = "#000";
  arFrameEl.allow =
    "camera; geolocation; accelerometer; gyroscope; magnetometer; xr-spatial-tracking";
  arFrameEl.setAttribute("allowfullscreen", "true");

  arOverlayEl.appendChild(closeButton);
  arOverlayEl.appendChild(arFrameEl);
  document.body.appendChild(arOverlayEl);
}

function open8thWallScene(zone, source = "manual") {
  const targetUrl = getArUrlForZone(zone);
  ensureArOverlay();
  currentActiveMonument = zone.name;
  setGameMessage(`8th Wall start voor ${zone.name}...`, "#8efc8e");
  const infoEl = document.getElementById("zoneMessage");
  if (infoEl) {
    infoEl.textContent = `Je bent in de zone van ${zone.name}. AR wordt in de app geopend.`;
    infoEl.style.color = "#b8f5c0";
  }
  console.log(
    `Opening embedded 8th Wall scene for ${zone.name} via ${source}: ${targetUrl}`,
  );
  arFrameEl.src = targetUrl;
  arOverlayEl.style.display = "block";
}

function activateAR(zone) {
  if (isInZone(zone)) {
    startAR(zone);
    setGameMessage(`AR.js geactiveerd voor ${zone.name}!`, "#8efc8e");
    const infoEl = document.getElementById("zoneMessage");
    if (infoEl) {
      infoEl.textContent = `Je bevindt je binnen ${zone.radius} meter van ${zone.name}. AR.js is nu actief.`;
    }
    console.log(`AR.js activated for ${zone.name}`);
  } else {
    setGameMessage(
      `Je moet dichter bij ${zone.name} zijn om AR te activeren.`,
      "#f4b8b8",
    );
    const infoEl = document.getElementById("zoneMessage");
    if (infoEl) {
      const distance = Math.round(distanceToZone(zone));
      infoEl.textContent = `Je bent ${distance} meter van ${zone.name}. Beweeg dichterbij en probeer het opnieuw.`;
    }
  }
}

function startAR(zone) {
  // hide Cesium view and UI
  document.getElementById("cesiumContainer").style.display = "none";
  document.getElementById("gamePanel").style.display = "none";
  document.getElementById("zonePanel").style.display = "none";

  // create AR scene
  const arScene = document.createElement("a-scene");
  arScene.setAttribute("vr-mode-ui", "enabled: false");
  arScene.setAttribute(
    "arjs",
    "sourceType: webcam; videoTexture: true; debugUIEnabled: false",
  );
  arScene.setAttribute("renderer", "antialias: true; alpha: true");
  arScene.style.width = "100%";
  arScene.style.height = "100%";
  arScene.style.position = "absolute";
  arScene.style.top = "0";
  arScene.style.left = "0";

  // Camera
  const camera = document.createElement("a-camera");
  camera.setAttribute("gps-new-camera", "gpsMinDistance: 5");
  camera.setAttribute("cursor", "rayOrigin: mouse; fuse: false");
  arScene.appendChild(camera);

  // Entity for the zone center (for testing)
  const entity = document.createElement("a-entity");
  entity.setAttribute("material", "color: red");
  entity.setAttribute("geometry", "primitive: box");
  entity.setAttribute(
    "gps-new-entity-place",
    `latitude: ${zone.lat}; longitude: ${zone.lon}`,
  );
  arScene.appendChild(entity);

  const arImageUrl = `${import.meta.env.BASE_URL}images/image27.png`;

  // Entities for objects in the zone
  zone.objects.forEach((obj, index) => {
    const objectEntity = document.createElement("a-entity");
    objectEntity.setAttribute(
      "geometry",
      "primitive: plane; width: 5; height: 5",
    );
    objectEntity.setAttribute(
      "material",
      `src: ${arImageUrl}; transparent: true; opacity: 1`,
    );
    objectEntity.setAttribute(
      "look-at",
      "[gps-camera]"
    );
    objectEntity.setAttribute(
      "gps-new-entity-place",
      `latitude: ${obj.lat}; longitude: ${obj.lon}`,
    );
    objectEntity.addEventListener("click", () => {
      updateScoreUI(`Je hebt op een AR element geklikt! Switching to 8th Wall...`);
      stopAR();
      open8thWallScene(zone);
    });
    arScene.appendChild(objectEntity);
  });

  const backButton = document.createElement("button");
  backButton.id = "arBackButton";
  backButton.textContent = "Terug naar kaart";
  backButton.style.position = "absolute";
  backButton.style.top = "20px";
  backButton.style.right = "20px";
  backButton.style.zIndex = "1000";
  backButton.style.padding = "10px";
  backButton.style.background = "#24a0ff";
  backButton.style.color = "white";
  backButton.style.border = "none";
  backButton.style.borderRadius = "4px";
  backButton.style.cursor = "pointer";
  backButton.addEventListener("click", stopAR);
  document.body.appendChild(backButton);

  document.body.appendChild(arScene);
}

function stopAR() {
  // Remove AR scene and back button
  const arScene = document.querySelector("a-scene");
  if (arScene) document.body.removeChild(arScene);
  const backButton = document.getElementById("arBackButton");
  if (backButton) document.body.removeChild(backButton);

  // Go back to Cesium view
  document.getElementById("cesiumContainer").style.display = "block";
  document.getElementById("gamePanel").style.display = "block";
  document.getElementById("zonePanel").style.display = "block";
}

function updateZoneButtonsVisibility() {
  const infoEl = document.getElementById("zoneMessage");
  let visibleCount = 0;

  monumentZones.forEach((zone) => {
    if (!zone.rowElement) return;
    if (isInZone(zone)) {
      zone.rowElement.style.display = "block";
      visibleCount++;
    } else {
      zone.rowElement.style.display = "none";
    }
  });

  if (infoEl) {
    if (visibleCount > 0) {
      infoEl.textContent = "Je bent dichtbij een monument. Activeer AR.";
      infoEl.style.color = "#b8f5c0";
    } else {
      infoEl.textContent = "Beweeg dichterbij een monument om AR te activeren.";
      infoEl.style.color = "#f4b8b8";
    }
  }
}

function createZoneButtons() {
  const panel = document.getElementById("zonePanel");
  if (!panel) return;
  monumentZones.forEach((zone) => {
    const row = document.createElement("div");
    row.style.marginBottom = "8px";
    row.style.display = "none";

    const label = document.createElement("div");
    label.textContent = `${zone.name} — radius ${zone.radius} m`;
    label.style.fontSize = "13px";
    label.style.marginBottom = "4px";
    row.appendChild(label);

    const button = document.createElement("button");
    button.textContent = "Activeer AR";
    button.style.padding = "6px 10px";
    button.style.border = "none";
    button.style.borderRadius = "4px";
    button.style.background = "#24a0ff";
    button.style.color = "white";
    button.style.cursor = "pointer";
    button.addEventListener("click", () => activateAR(zone));
    row.appendChild(button);

    panel.appendChild(row);
    zone.rowElement = row;
  });
}

createMonumentZones();
createZoneButtons();
updateZoneButtonsVisibility();
spawnObjectsInMonumentZones();
// OUP TILES
(async function () {
  const urls = [
    "https://www.3drotterdam.nl/datasource-data/69926a30-444d-46bb-995e-bb14b151d3ab/tileset.json",
    "https://www.3drotterdam.nl/datasource-data/3adbe5af-d05c-475a-b34c-59e69ba8dadc/tileset.json",
    "https://www.3drotterdam.nl/datasource-data/77256bbf-f240-45ac-8114-04d40d654431/tileset.json",
    "https://www.3drotterdam.nl/datasource-data/383dc58b-0fb1-4d8a-a476-12fa01ba8809/tileset.json",
  ];
  for (const url of urls) {
    try {
      const tileset = await Cesium.Cesium3DTileset.fromUrl(url);
      tileset.shadows = Cesium.ShadowMode.ENABLED;
      tileset.clampToGround = true;
      viewer.scene.primitives.add(tileset);
      await tileset.readyPromise;
      const translation = Cesium.Cartesian3.fromElements(0, 0, -5);
      const transform = Cesium.Matrix4.fromTranslation(translation);
      tileset.modelMatrix = Cesium.Matrix4.multiply(
        tileset.modelMatrix,
        transform,
        new Cesium.Matrix4(),
      );
      if (url === urls[0]) viewer.zoomTo(tileset);
    } catch (err) {
      console.error("Tileset error", url, err);
    }
  }
})();
