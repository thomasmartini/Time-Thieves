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
    animation: false,
    shadows: true,
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
  viewer = new Cesium.Viewer("cesiumContainer");
}

// USER LOCATION + MODEL
let currentLon = 4.47917;
let currentLat = 51.9225;

let userDuck = viewer.entities.add({
  position: new Cesium.CallbackProperty(function () {
    return Cesium.Cartesian3.fromDegrees(currentLon, currentLat, 2);
  }, false),
  model: {
    uri: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF/Duck.gltf",
    minimumPixelSize: 64,
    maximumScale: 100,
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
    currentLon = 4.4845575;
    currentLat = 51.9122727;

    const heading = position.coords.heading || 0;

    const duckPosition = Cesium.Cartesian3.fromDegrees(
      currentLon,
      currentLat,
      2,
    );

    const offset = new Cesium.HeadingPitchRange(
      Cesium.Math.toRadians(heading),
      Cesium.Math.toRadians(-35),
      50,
    );

    // Player direction based on GPS heading
    userDuck.orientation = Cesium.Transforms.headingPitchRollQuaternion(
      duckPosition,
      new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(heading), 0, 0),
    );

    if (cameraFollow) {
      viewer.camera.lookAt(duckPosition, offset);
    }
    updateZoneButtonsVisibility();
  },
  (error) => {
    console.warn("GPS error, using fallback Rotterdam", error);
    currentLon = 4.47917;
    currentLat = 51.9225;
    updateZoneButtonsVisibility();
  },
  { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 },
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

function spawnRandomObjectsInArea(count, west, south, east, north) {
  const modelUrl =
    "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF/Duck.gltf";
  for (let i = 0; i < count; i++) {
    const lon = randomInRange(west, east);
    const lat = randomInRange(south, north);
    const alt = randomInRange(1, 20);
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
      model: {
        uri: modelUrl,
        minimumPixelSize: 32,
        maximumScale: 50,
      },
      label: {
        text: `Duck ${i + 1}`,
        font: "bold 12px Arial",
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -24),
      },
    });
  }
}

function spawnDucksInMonumentZones() {
  const modelUrl =
    "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF/Duck.gltf";
  const ducksPerZone = 5;
  let duckIndex = 1;

  for (const zone of monumentZones) {
    const { metersPerDegLat, metersPerDegLon } = getMetersPerDegree(
      zone.lon,
      zone.lat,
    );
    const deltaLon = zone.radius / metersPerDegLon;
    const deltaLat = zone.radius / metersPerDegLat;

    for (let i = 0; i < ducksPerZone; i++) {
      const lon = randomInRange(zone.lon - deltaLon, zone.lon + deltaLon);
      const lat = randomInRange(zone.lat - deltaLat, zone.lat + deltaLat);
      const alt = 0;

      viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
        model: {
          uri: modelUrl,
          minimumPixelSize: 16,
          maximumScale: 25,
        },
        label: {
          text: `Duck ${duckIndex}`,
          font: "bold 10px Arial",
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 1,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -16),
        },
      });
      duckIndex++;
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
        ? "🎉 Goal reached! The Time Thieves are beat"
        : "Nice click!";
    updateScoreUI(message);
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

updateScoreUI("Click objects to earn points.");
// Monument Zones
const monumentZones = [
  {
    name: "De Verwoeste Stad",
    slug: "de-verwoeste-stad",
    sceneId: "de-verwoeste-stad",
    lon: 4.4830665,
    lat: 51.9176368,
    radius: 100,
    color: Cesium.Color.ORANGE.withAlpha(0.35),
  },
  {
    name: "De Boeg",
    slug: "de-boeg",
    sceneId: "de-boeg",
    lon: 4.4845575,
    lat: 51.9122727,
    radius: 20,
    color: Cesium.Color.CYAN.withAlpha(0.35),
  },
  {
    name: "Erasmusbeeld",
    slug: "erasmusbeeld",
    sceneId: "erasmusbeeld",
    lon: 4.4843267,
    lat: 51.9215122,
    radius: 20,
    color: Cesium.Color.LIME.withAlpha(0.35),
  },
  {
    name: "Monument voor alle gevallen",
    slug: "monument-voor-alle-gevallen",
    sceneId: "monument-voor-alle-gevallen",
    lon: 4.4779143,
    lat: 51.9224434,
    radius: 20,
    color: Cesium.Color.MAGENTA.withAlpha(0.35),
  },
  {
    name: "Calandmonument",
    slug: "calandmonument",
    sceneId: "calandmonument",
    lon: 4.4797535,
    lat: 51.9080186,
    radius: 20,
    color: Cesium.Color.YELLOW.withAlpha(0.35),
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
    "camera; microphone; geolocation; accelerometer; gyroscope; magnetometer; xr-spatial-tracking";
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
    open8thWallScene(zone, "manual");
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
spawnDucksInMonumentZones();
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

// CLEARLY DATASETS
(async function () {
  try {
    const resp = await fetch("https://hub.clearly.app/datasets");
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const datasets = await resp.json();
    for (const ds of datasets) {
      if (
        ds.format &&
        ds.format.toLowerCase().includes("geojson") &&
        ds.url &&
        ds.url.toLowerCase().includes("rotterdam")
      ) {
        try {
          const gj = await Cesium.GeoJsonDataSource.load(ds.url, {
            clampToGround: true,
          });
          viewer.dataSources.add(gj);
        } catch (e) {
          console.error("GeoJSON error", ds.id);
        }
      }
    }
  } catch (e) {
    console.error("Dataset fetch error", e);
  }
})();
