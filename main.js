import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { getInventoryItems } from "./utils/inventory.js";
import scenesData from "./utils/scenes.json";
import { getCompletionData } from "./utils/sceneCompletion.js";

const CHARACTER_DATA = (scenesData && scenesData.characters) || [];

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN;
let viewer;

try {
  viewer = new Cesium.Viewer("cesiumContainer", {
    terrainProvider: Cesium.createWorldTerrain({}),
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
    shouldAnimate: false,
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

// fallback items for testing without AR scene completion
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

/**
 * Monument zones with GPS coordinates, radius, and associated AR scene data (slug, munumentId and objects).
 */

const monumentZones = [
  {
    name: "De Verwoeste Stad",
    slug: "de-verwoeste-stad-01",
    monumentId: "de-verwoeste-stad-", // matches 8th wall scene id for testing, will be set in AR.js for production
    lon: 4.4830665,
    lat: 51.9176368,
    radius: 100,
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

/**
 * Get display data for an inventory item, with fallback for unknown items.
 * @param {string} itemId - The ID of the inventory item.
 * @returns {Object} An object containing the name and icon for the item.
 */

function getItemDisplay(itemId) {
  return (
    ITEM_DISPLAY_DATA[itemId] || {
      name: itemId,
      icon: "📦",
    }
  );
}

/** Show the monument selection view in the inventory panel.
 * Resets the selected monument and updates the UI to show the monument selection and hide the inventory view.
 */

function showMonumentSelection() {
  selectedMonument = null;
  if (monumentSelectionEl) monumentSelectionEl.style.display = "grid";
  if (inventoryViewEl) inventoryViewEl.style.display = "none";
}

/** Show the inventory view for the selected monument.
 * Hides the monument selection and displays the inventory view, then refreshes the inventory UI to show the items collected for the selected monument.
 */

function showInventoryView() {
  if (monumentSelectionEl) monumentSelectionEl.style.display = "none";
  if (inventoryViewEl) inventoryViewEl.style.display = "block";
  refreshInventoryUI();
}

/** Handle monument selection by setting the selected monument and showing the inventory view for that monument.
 * @param {string} monumentSlug - The slug identifier for the selected monument.
 */

function selectMonument(monumentSlug) {
  selectedMonument = monumentSlug;
  showInventoryView();
}

/** Get the progress for a specific monument based on the number of items collected for that monument.
 * @param {string} monumentSlug - The slug identifier for the monument to get progress for.
 * @returns {Object} An object containing the progress percentage, number of items collected, and maximum items for the monument.
 */

function getMonumentProgress(monumentSlug) {
  const items = getInventoryItems();
  const itemsCollected = items.length;
  const maxItems = 4;
  const progress = Math.min(itemsCollected / maxItems * 100, 100);
  return {
    progress,
    itemsCollected,
    maxItems,
  };
}

/** Render the monument selection UI by creating HTML elements for each monument and adding event listeners for selection.
 * @param {Array} monuments - An array of monument objects to render in the selection UI.
 */

function renderMonumentSelection(monuments) {
  if (!monumentSelectionEl) return;
  monumentSelectionEl.innerHTML = monuments
    .map((monument) => {
      const { progress, itemsCollected, maxItems } = getMonumentProgress(monument.slug);
      return `<div class="inventory-monument-item" data-slug="${monument.slug}">
          <div class="inventory-monument-name">${monument.name}</div>
          <div class="inventory-monument-progress-container">
            <div class="inventory-monument-progress-bar" style="width: ${progress}%"></div>
          </div>
          <div class="inventory-monument-progress-text">${itemsCollected}/${maxItems} items</div>
        </div>`;
    })
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

/** Refresh the inventory UI to show the current items collected for the selected monument and update the progress bars in the monument selection.
 * Gets the inventory items, updates the inventory list in the UI, and updates the progress bars for each monument in the selection view.
 */

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

  // Update progress bars in monument selection
  renderMonumentSelection(monumentZones);
}

/** Set the inventory panel to open or closed state and update the UI accordingly.
 * @param {boolean} open - Whether to open (true) or close (false) the inventory panel.
 * If opening and no monument is currently selected, it will show the monument selection view.
 */

function setInventoryPanelOpen(open) {
  if (!inventoryPanel || !inventoryToggle) return;
  inventoryPanel.classList.toggle("inventory-expanded", open);
  inventoryPanel.classList.toggle("inventory-collapsed", !open);
  inventoryToggle.setAttribute("aria-expanded", open ? "true" : "false");

  if (open && !selectedMonument) {
    showMonumentSelection();
  }
}

/** Toggle the inventory panel open or closed when the inventory toggle button is clicked.
 * If the panel is currently closed, it will open it; if it's open, it will close it.
 */

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
/** Spawn objects in the monument zones based on the CHARACTER_DATA.
 * For each monument zone, it calculates the area based on the radius and spawns objects with random positions within that area.
 * Each object is associated with a character from the CHARACTER_DATA and added to the Cesium viewer as an entity with a billboard and label.
 */
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
          width: 84,
          height: 84,
        },
        label: {
          text: character.name,
          font: "bold 10px Arial",
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 1,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -40),
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
/** Calculate the meters per degree of latitude and longitude at a given geographic location.
 * This is used to convert between geographic coordinates and distances in meters for accurate placement of objects and zones on the map.
 * @param {number} longitude - The longitude of the location to calculate for.
 * @param {number} latitude - The latitude of the location to calculate for.
 * @return {Object} An object containing the meters per degree of latitude (metersPerDegLat) and longitude (metersPerDegLon) at the specified location.
 */
function getMetersPerDegree(longitude, latitude) {
  const latRad = Cesium.Math.toRadians(latitude);
  const metersPerDegLat =
    111132.92 - 559.82 * Math.cos(2 * latRad) + 1.175 * Math.cos(4 * latRad);
  const metersPerDegLon =
    (Math.PI / 180) * Cesium.Ellipsoid.WGS84.maximumRadius * Math.cos(latRad);
  return { metersPerDegLat, metersPerDegLon };
}
/** Get the corner positions of a square zone based on its center and radius.
 * @param {Object} zone - The zone object containing center coordinates and radius.
 * @return {Array} An array of Cartesian3 positions representing the corners of the square zone.
 */
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
/** Check if the user's current location is within a specified zone.
 * This function calculates the distance from the user's current location to the center of the zone and checks if it is within the zone's radius.
 * @param {Object} zone - The zone object containing center coordinates and radius.
 * @return {boolean} True if the user is within the zone, false otherwise.
 */
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
/** Create visual zones on the Cesium map for each monument zone defined in the monumentZones array.
 * Each zone is represented as a polygon with a specified color and an outline, along with a label displaying the zone's name.
 * The zones are added to the Cesium viewer as entities, allowing users to see the areas where they can activate AR experiences.
 */
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
/** Generate the URL for the 8th Wall AR scene based on the zone and character data, as well as the completion data stored in sessionStorage.
 * @param {Object} zone - The zone object containing the AR URL and other properties.
 * @param {Object} character - The character object containing the scene ID and other properties.
 * @return {string} The generated URL for the 8th Wall AR scene.
 */
function getArUrlForZone(zone, character) {
  const url = new URL(zone.arUrl || eighthWallSceneUrl, window.location.href);

  const completionData = getCompletionData();
  const characterKey = character.name.split(" ")[0].toLowerCase();

  const count = (completionData.match(
    new RegExp(characterKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")
  ) || []).length;

  const characterSceneId =
    character.sceneId[Math.min(count, character.sceneId.length)] ||
    character.sceneId[0];
  // Without a trailing slash, relative assets (bundle.js, ./external/...) resolve to the app root.
  if (url.origin === window.location.origin && url.pathname === "/ar") {
    url.pathname = "/ar/";
  }

  const sceneId = zone.monumentId + characterSceneId || zone.slug || "default";
  url.searchParams.set("scene", sceneId);
  url.searchParams.set("source", "cesium");
  return url.toString();
}
/** Ensure that the AR overlay and iframe elements are created and added to the DOM.
  * If the elements already exist, it does nothing. If they do not exist, it creates a full-screen overlay with a close button and an iframe for loading the 8th Wall AR scene.
 */
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
  closeButton.style.background = "linear-gradient(135deg, #c6f321 0%, #4dabf7 100%)";

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
/** Open the 8th Wall AR scene for a specific zone and character.
 * @param {Object} zone - The zone object containing the AR URL and other properties.
 * @param {Object} character - The character object containing the scene ID and other properties.
 * @param {string} source - The source of the AR scene activation (default is "manual").
 */
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
  } else { return }
}

/** Start the AR experience for a specific zone by hiding the Cesium view and UI, creating an A-Frame scene with AR.js, and adding entities for the objects in the zone.
 * @param {Object} zone - The zone object containing the AR URL and other properties.
 */
function startAR(zone) {
  // hide Cesium view and UI
  document.getElementById("cesiumContainer").style.display = "none";
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
      sceneId: character.sceneId[0],
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
  backButton.style.fontWeight = "700";
  backButton.style.right = "20px";
  backButton.style.zIndex = "1000";
  backButton.style.padding = "10px";
  backButton.style.background = "linear-gradient(135deg, #c6f321 0%, #4dabf7 100%)";

  backButton.style.color = "#150000";
  backButton.style.border = "none";
  backButton.style.borderRadius = "4px";
  backButton.style.cursor = "pointer";
  backButton.addEventListener("click", stopAR);
  document.body.appendChild(backButton);

  document.body.appendChild(arScene);
}
/** Stop the AR experience by removing the AR scene and back button, showing the Cesium view and UI again, and refreshing the inventory UI.
 * This function is called when the user clicks the back button in the AR view or when they click on an object to open the 8th Wall scene.
 */
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

  if (viewer && typeof viewer.resize === "function") {
    viewer.resize();
  }

  refreshInventoryUI();
}
/** Update the visibility of the zone buttons based on whether the user is currently within each zone.
 * This function iterates through each monument zone and checks if the user is within that zone using the isInZone function.
 * If the user is within the zone, the corresponding button is shown; otherwise, it is hidden.
 */
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
/** Create buttons for each monument zone and add them to the zone panel in the UI. Each button is styled and has an event listener that activates the AR experience for the corresponding zone when clicked.
 * The buttons are initially hidden and will be shown based on the user's location relative to the zones.
 */
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
    button.style.width = "40%";
    button.style.padding = "16px 18px";
    button.style.minHeight = "42px";
    button.style.justifySelf = "center";
    button.style.fontSize = "14px";
    button.style.fontWeight = "700";
    button.style.border = "none";
    button.style.borderRadius = "16px";
    button.style.background =
      "linear-gradient(135deg, #c6f321 0%, #4dabf7 100%)";
    button.style.color = "#150000";
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
