import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

window.CESIUM_BASE_URL = "/cesium";

Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkNDU5MGU2OC1kNDUyLTQ4YTktYTNjYS03YzNkMTU5ZmEzZDQiLCJpZCI6NDAxNzY3LCJpYXQiOjE3NzMyMjA1MjB9.LU9uXSoprPYPO_V_hITQNf6oeeFaanNlNKMuSzecrq4";

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

//////////////////////////////////////////////////////////
// USER POSITION SYSTEM (HIGH ACCURACY TRACKING)
//////////////////////////////////////////////////////////

let currentLon = 4.47917;
let currentLat = 51.9225;
let currentAlt = 2;

let smoothLon = currentLon;
let smoothLat = currentLat;

const smoothingFactor = 0.12;
let lastHeading = 0;
const minDuckHeightAboveGround = 2;
const maxDuckHeightAboveGround = 8;
const altitudeSmoothingFactor = 0.2;

let baselineGpsAltitude = null;
let smoothAltitudeOffset = minDuckHeightAboveGround;

function smoothPosition(newLon, newLat) {
    smoothLon = smoothLon + (newLon - smoothLon) * smoothingFactor;
    smoothLat = smoothLat + (newLat - smoothLat) * smoothingFactor;
}

async function getTerrainHeight(lon, lat) {
    try {
        const cartographic = Cesium.Cartographic.fromDegrees(lon, lat);
        const updated = await Cesium.sampleTerrainMostDetailed(
            viewer.terrainProvider,
            [cartographic]
        );
        return updated[0].height || 2;
    } catch {
        return 2;
    }
}

//////////////////////////////////////////////////////////
// 🦆 USER DUCK
//////////////////////////////////////////////////////////

let userDuck = viewer.entities.add({
    position: new Cesium.CallbackProperty(() => {
        return Cesium.Cartesian3.fromDegrees(currentLon, currentLat, currentAlt);
    }, false),
    model: {
        uri: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF/Duck.gltf",
        minimumPixelSize: 64,
        maximumScale: 100,
    },
    label: {
        text: "You 🦆",
        font: "bold 14px Arial",
        fillColor: Cesium.Color.YELLOW,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -30),
    },
});

//////////////////////////////////////////////////////////
// CAMERA FOLLOW SYSTEM
//////////////////////////////////////////////////////////

let cameraFollow = true;
let touchStartX = 0;
let touchStartY = 0;
let isDragging = false;

const canvas = viewer.scene.canvas;

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
    async (position) => {
        const accuracy = position.coords.accuracy;

        if (accuracy > 30) return;

        const lon = position.coords.longitude;
        const lat = position.coords.latitude;

        smoothPosition(lon, lat);

        currentLon = smoothLon;
        currentLat = smoothLat;

        const gpsAltitude = position.coords.altitude ?? 0;
        const gpsAltitudeAccuracy = position.coords.altitudeAccuracy;
        const terrainHeight = await getTerrainHeight(currentLon, currentLat);

        const hasReliableGpsAltitude =
            Number.isFinite(gpsAltitude) &&
            Number.isFinite(gpsAltitudeAccuracy) &&
            gpsAltitudeAccuracy <= 20;

        if (hasReliableGpsAltitude && baselineGpsAltitude === null) {
            baselineGpsAltitude = gpsAltitude;
        }

        let targetAltitudeOffset = minDuckHeightAboveGround;
        if (hasReliableGpsAltitude && baselineGpsAltitude !== null) {
            const relativeAltitudeChange = gpsAltitude - baselineGpsAltitude;
            const normalizedOffset = minDuckHeightAboveGround + relativeAltitudeChange;

            targetAltitudeOffset = Cesium.Math.clamp(
                normalizedOffset,
                minDuckHeightAboveGround,
                maxDuckHeightAboveGround
            );
        }

        smoothAltitudeOffset =
            smoothAltitudeOffset +
            (targetAltitudeOffset - smoothAltitudeOffset) * altitudeSmoothingFactor;

        currentAlt = terrainHeight + smoothAltitudeOffset;

        let heading = position.coords.heading;
        if (heading === null || Number.isNaN(heading)) {
            heading = lastHeading;
        } else {
            lastHeading = heading;
        }

        const speed = position.coords.speed || 0;
        const predictionTime = 0.4;
        const predictedDistance = speed * predictionTime;

        const headingRad = Cesium.Math.toRadians(heading);

        const predictedLon =
            currentLon +
            (predictedDistance * Math.cos(headingRad)) / 111320;

        const predictedLat =
            currentLat +
            (predictedDistance * Math.sin(headingRad)) /
                (111320 * Math.cos(Cesium.Math.toRadians(currentLat)));

        const duckPosition = Cesium.Cartesian3.fromDegrees(
            predictedLon,
            predictedLat,
            currentAlt
        );

        const offset = new Cesium.HeadingPitchRange(
            Cesium.Math.toRadians(heading),
            Cesium.Math.toRadians(-35),
            45
        );

        userDuck.orientation = Cesium.Transforms.headingPitchRollQuaternion(
            duckPosition,
            new Cesium.HeadingPitchRoll(
                Cesium.Math.toRadians(heading),
                0,
                0
            )
        );

        if (cameraFollow) {
            viewer.camera.lookAt(duckPosition, offset);
        }
    },
    (error) => {
        console.warn("GPS error, fallback location", error);
    },
    {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
    }
);

//////////////////////////////////////////////////////////
// 🎮 SCORE GAME
//////////////////////////////////////////////////////////

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
    const modelUrl = "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF/Duck.gltf";
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
        });
    }
}

const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
handler.setInputAction(function (click) {
    const picked = viewer.scene.pick(click.position);
    if (Cesium.defined(picked)) {
        clickCount++;
        score += 10;

        const message = score >= scoreGoal
            ? "🎉 Goal reached!"
            : "Nice click!";

        updateScoreUI(message);
    }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

updateScoreUI("Click objects to earn points.");
spawnRandomObjectsInArea(25, 4.42, 51.9, 4.52, 51.96);

//////////////////////////////////////////////////////////
// 🏙️ ROTTERDAM 3D TILES
//////////////////////////////////////////////////////////

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
                new Cesium.Matrix4()
            );
            if (url === urls[0]) viewer.zoomTo(tileset);
        } catch (err) {
            console.error("Tileset error", url, err);
        }
    }
})();

//////////////////////////////////////////////////////////
// 🗺️ CLEARLY DATASETS
//////////////////////////////////////////////////////////

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
                    const gj = await Cesium.GeoJsonDataSource.load(ds.url, { clampToGround: true });
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