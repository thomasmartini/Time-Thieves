import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import {
  getInventoryItems,
  populateDummyInventory,
} from "./utils/inventory.js";
import scenesData from "./utils/scenes.json";

const CHARACTER_DATA = (scenesData && scenesData.characters) || [];

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
    shouldAnimate: true,
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
    shouldAnimate: true,
  });
  viewer._cesiumWidget._creditContainer.style.display = "none";
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

const inventoryPanel = document.getElementById("inventoryPanel");
const inventoryToggle = document.getElementById("inventoryToggle");
const inventoryItemsEl = document.getElementById("inventoryItems");
const inventoryCountEl = document.getElementById("inventoryCount");
const monumentSelectionEl = document.getElementById("monumentSelection");
const inventoryViewEl = document.getElementById("inventoryView");
const inventoryBackBtn = document.getElementById("inventoryBackBtn");

const ITEM_DISPLAY_DATA = {
  "boek-erasmus": {
    name: "Boek van Erasmus",
    icon: "📖",
  },
  "bakstenen-verwoeste-stad": {
    name: "Bakstenen van De Verwoeste Stad",
    icon: "📚",
  },
};

const monumentZones = [
  {
    name: "De Verwoeste Stad",
    slug: "de-verwoeste-stad",
    monumentId: "de-verwoeste-stad", // matches 8th wall scene id for testing, will be set in AR.js for production
    lon: 4.4830665,
    lat: 51.9176368,
    radius: 20,
    color: Cesium.Color.ORANGE.withAlpha(0.35),
    objects: [],
  },
];

const eighthWallSceneUrl = import.meta.env.VITE_8THWALL_SCENE_URL || "/ar/";

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
  { enableHighAccuracy: true, maximumAge: 1000, timeout: 2000 },
);

let selectedMonument = null;

function getItemDisplay(itemId) {
  return (
    ITEM_DISPLAY_DATA[itemId] || {
      name: itemId,
      icon: "📦",
    }
  );
}

function showMonumentSelection() {
  selectedMonument = null;
  if (monumentSelectionEl) monumentSelectionEl.style.display = "grid";
  if (inventoryViewEl) inventoryViewEl.style.display = "none";
}

function showInventoryView() {
  if (monumentSelectionEl) monumentSelectionEl.style.display = "none";
  if (inventoryViewEl) inventoryViewEl.style.display = "block";
  refreshInventoryUI();
}

function selectMonument(monumentSlug) {
  selectedMonument = monumentSlug;
  showInventoryView();
}

function renderMonumentSelection(monuments) {
  if (!monumentSelectionEl) return;
  monumentSelectionEl.innerHTML = monuments
    .map(
      (monument) =>
        `<div class="inventory-monument-item" data-slug="${monument.slug}">
          <div class="inventory-monument-name">${monument.name}</div>
        </div>`,
    )
    .join("");

  monumentSelectionEl
    .querySelectorAll(".inventory-monument-item")
    .forEach((el) => {
      el.addEventListener("click", () => {
        selectMonument(el.dataset.slug);
      });
      el.addEventListener("touchend", (e) => {
        e.preventDefault();
        selectMonument(el.dataset.slug);
      });
    });
}

function refreshInventoryUI() {
  const items = getInventoryItems();
  if (!inventoryItemsEl) return;

  if (items.length === 0) {
    inventoryItemsEl.innerHTML =
      '<div class="inventory-empty">Je hebt nog geen items.</div>';
  } else {
    inventoryItemsEl.innerHTML = items
      .map((item) => {
        const display = getItemDisplay(item.itemId);
        return `<div class="inventory-item">
          <div class="inventory-item-icon">${display.icon}</div>
          <div class="inventory-item-name">${display.name}</div>
        </div>`;
      })
      .join("");
  }

  if (inventoryCountEl) {
    inventoryCountEl.textContent = items.length.toString();
  }
}

function setInventoryPanelOpen(open) {
  if (!inventoryPanel || !inventoryToggle) return;
  inventoryPanel.classList.toggle("inventory-expanded", open);
  inventoryPanel.classList.toggle("inventory-collapsed", !open);
  inventoryToggle.setAttribute("aria-expanded", open ? "true" : "false");

  if (open && !selectedMonument) {
    showMonumentSelection();
  }
}

function toggleInventoryPanel() {
  if (!inventoryPanel) return;
  const open = !inventoryPanel.classList.contains("inventory-expanded");
  setInventoryPanelOpen(open);
}

if (inventoryToggle) {
  inventoryToggle.addEventListener("click", toggleInventoryPanel);
  inventoryToggle.addEventListener("touchend", (event) => {
    event.preventDefault();
    toggleInventoryPanel();
  });
}

if (inventoryBackBtn) {
  inventoryBackBtn.addEventListener("click", showMonumentSelection);
  inventoryBackBtn.addEventListener("touchend", (e) => {
    e.preventDefault();
    showMonumentSelection();
  });
}

window.addEventListener("inventory-item-added", refreshInventoryUI);
window.addEventListener("inventory-item-removed", refreshInventoryUI);

populateDummyInventory();
refreshInventoryUI();

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

function resolveSceneUrl(url) {
  return String(url || "").replace(
    /\$\{import\.meta\.env\.BASE_URL\}/g,
    import.meta.env.BASE_URL,
  );
}

function getCharacterImageUrl(character) {
  return (
    resolveSceneUrl(character?.imageUrl) ||
    `${import.meta.env.BASE_URL}images/image27.png`
  );
}

function spawnObjectsInMonumentZones() {
  for (const zone of monumentZones) {
    const { metersPerDegLat, metersPerDegLon } = getMetersPerDegree(
      zone.lon,
      zone.lat,
    );
    const deltaLon = zone.radius / metersPerDegLon;
    const deltaLat = zone.radius / metersPerDegLat;

    for (let i = 0; i < CHARACTER_DATA.length; i++) {
      const character = CHARACTER_DATA[i];
      const lon = randomInRange(zone.lon - deltaLon, zone.lon + deltaLon);
      const lat = randomInRange(zone.lat - deltaLat, zone.lat + deltaLat);
      const alt = 1;

      zone.objects.push({ lon, lat, alt, character });

      viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
        billboard: {
          image: getCharacterImageUrl(character),
          width: 48,
          height: 48,
        },
        label: {
          text: character.name,
          font: "bold 10px Arial",
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 1,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -16),
        },
      });
    }
  }
}

renderMonumentSelection(monumentZones);

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

let arOverlayEl = null;
let arFrameEl = null;

function getArUrlForZone(zone, character) {
  const sourceUrl =
    zone.slug + character?.sceneId || zone.arUrl || eighthWallSceneUrl;
  if (
    zone.slug + character?.sceneId &&
    /\.(glb|gltf|usdz)(\?.*)?$/i.test(sourceUrl)
  ) {
    return sourceUrl;
  }

  const url = new URL(sourceUrl, window.location.href);

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

function open8thWallScene(zone, character, source = "manual") {
  const targetUrl = getArUrlForZone(zone, character);
  ensureArOverlay();
  currentActiveMonument = zone.name;
  arFrameEl.src = targetUrl;
  arOverlayEl.style.display = "block";
}

function activateAR(zone) {
  if (isInZone(zone)) {
    startAR(zone);
  } else {
    return;
  }
}

function startAR(zone) {
  // hide Cesium view and UI
  //document.getElementById("cesiumContainer").style.display = "none";
  document.getElementById("zonePanel").style.display = "none";
  document.getElementById("inventoryPanel").style.display = "none";

  // create AR scene
  const arScene = document.createElement("a-scene");
  arScene.setAttribute("xr-mode-ui", "enabled: false");
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

  // Entities for objects in the zone
  zone.objects.forEach((obj) => {
    const character = obj.character || {
      name: character.name,
      imageUrl: `${import.meta.env.BASE_URL}${character.imageUrl}`,
      sceneId: null,
    };

    const objectEntity = document.createElement("a-entity");
    objectEntity.setAttribute(
      "geometry",
      "primitive: plane; width: 5; height: 5",
    );
    objectEntity.setAttribute(
      "material",
      `src: ${getCharacterImageUrl(character)}; transparent: true; opacity: 1`,
    );
    objectEntity.setAttribute("look-at", "[gps-camera]");
    objectEntity.setAttribute(
      "gps-new-entity-place",
      `latitude: ${obj.lat}; longitude: ${obj.lon}`,
    );
    objectEntity.addEventListener("click", () => {
      stopAR();
      open8thWallScene(zone, character);
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
  document.getElementById("zonePanel").style.display = "block";
  document.getElementById("inventoryPanel").style.display = "block";
  refreshInventoryUI();
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
}

function createZoneButtons() {
  const panel = document.getElementById("zonePanel");
  if (!panel) return;
  monumentZones.forEach((zone) => {
    const row = document.createElement("div");
    row.style.width = "100%";
    row.style.marginBottom = "8px";
    row.style.display = "none";

    const button = document.createElement("button");
    button.textContent = `Activeer AR`;
    button.style.width = "100%";
    button.style.padding = "22px 24px";
    button.style.minHeight = "72px";
    button.style.fontSize = "26px";
    button.style.fontWeight = "700";
    button.style.border = "none";
    button.style.borderRadius = "16px";
    button.style.background =
      "linear-gradient(135deg, #2196f3 0%, #4dabf7 100%)";
    button.style.color = "white";
    button.style.cursor = "pointer";
    button.style.boxShadow = "0 10px 24px rgba(0, 0, 0, 0.2)";
    button.style.transition = "transform 0.2s ease, box-shadow 0.2s ease";
    button.style.display = "block";
    button.style.textAlign = "center";
    button.addEventListener("mouseenter", () => {
      button.style.transform = "translateY(-1px)";
      button.style.boxShadow = "0 10px 22px rgba(0, 0, 0, 0.22)";
    });
    button.addEventListener("mouseleave", () => {
      button.style.transform = "translateY(0)";
      button.style.boxShadow = "0 8px 20px rgba(0, 0, 0, 0.18)";
    });
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
