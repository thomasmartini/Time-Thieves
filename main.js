import * as Cesium from "cesium";
// Styles so the widgets look correct
import "cesium/Build/Cesium/Widgets/widgets.css";

// where to load Cesium static assets from (workers, widgets, etc.)
window.CESIUM_BASE_URL = "/cesium";

// Ion access token (hard‑coded as requested)
Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkNDU5MGU2OC1kNDUyLTQ4YTktYTNjYS03YzNkMTU5ZmEzZDQiLCJpZCI6NDAxNzY3LCJpYXQiOjE3NzMyMjA1MjB9.LU9uXSoprPYPO_V_hITQNf6oeeFaanNlNKMuSzecrq4";

// create the viewer with high‑precision world terrain and lighting enabled
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
    // improve globe realism
    viewer.scene.globe.enableLighting = true;
    viewer.scene.globe.depthTestAgainstTerrain = true;

    // configure shadow map for the scene
    viewer.scene.shadowMap = new Cesium.ShadowMap({
        context: viewer.scene.context,
        lightSource: viewer.scene.lightSource,
        enabled: true,
    });

    console.log("Viewer successfully created with shadows", viewer);
} catch (e) {
    console.error("Failed to create Cesium viewer, falling back to basic viewer", e);
    viewer = new Cesium.Viewer("cesiumContainer");
}

// move to user location if available, otherwise default to Rotterdam
async function gotoInitialLocation() {
    const fallback = {
        lon: 4.47917,
        lat: 51.9225,
        height: 80,
    };

    if (!navigator.geolocation) {
        console.warn("Geolocation not supported, using fallback location.");
        viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(fallback.lon, fallback.lat, fallback.height),
            orientation: {
                heading: Cesium.Math.toRadians(0.0),
                pitch: Cesium.Math.toRadians(-30.0),
                roll: 0.0,
            },

        });

        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lon = position.coords.longitude;
            const lat = position.coords.latitude;
            const height = 5;

            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(lon, lat, height),
                orientation: {
                    heading: Cesium.Math.toRadians(90.0),
                    pitch: Cesium.Math.toRadians(1.0),
                    roll: 0.0,
                },
                duration: 2,

            });
        },
        (error) => {
            console.warn("Geolocation failed, falling back to Rotterdam.", error);
            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(fallback.lon, fallback.lat, fallback.height),
                orientation: {
                    heading: Cesium.Math.toRadians(90.0),
                    pitch: Cesium.Math.toRadians(-75.0),
                    roll: 0.0,
                },
                duration: 2,
            });
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
    );

}

gotoInitialLocation();

// simple score gamification
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

const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
handler.setInputAction(function (click) {
    const picked = viewer.scene.pick(click.position);
    if (Cesium.defined(picked)) {
        clickCount += 1;
        score += 10;
        const message = score >= scoreGoal ? "🎉 Goal reached! You won the Rotterdam score game." : "Nice click!";
        updateScoreUI(message);
        if (score >= scoreGoal) {
            viewer.scene.requestRender();
        }
    }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

updateScoreUI("Click objects to earn points.");

// add random objects in Rotterdam bounds (lon/lat area)
spawnRandomObjectsInArea(25, 4.42, 51.9, 4.52, 51.96);

// fetch and display the Rotterdam 3D-tiles from the provided URL
// the API call is simply a fetch to get the JSON, but Cesium can load it directly
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
            // enable shadows and clamp tiles to terrain
            tileset.shadows = Cesium.ShadowMode.ENABLED;
            tileset.clampToGround = true;
            viewer.scene.primitives.add(tileset);
            await tileset.readyPromise;
            // apply a slight downward shift to align with ground
            const translation = Cesium.Cartesian3.fromElements(0, 0, -5);
            const transform = Cesium.Matrix4.fromTranslation(translation);
            tileset.modelMatrix = Cesium.Matrix4.multiply(tileset.modelMatrix, transform, new Cesium.Matrix4());
            console.log("Rotterdam tileset loaded", url, tileset);
            // optionally fly to the first one only
            if (url === urls[0]) {
                viewer.zoomTo(tileset);
            }
        } catch (err) {
            console.error("Failed to load Rotterdam tileset", url, err);
        }
    }
})();

// --- load all logical datasets from Clearly hub (GeoJSON) ---
(async function () {
    try {
        const resp = await fetch("https://hub.clearly.app/datasets");
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const datasets = await resp.json();
        console.log("datasets list", datasets);
        for (const ds of datasets) {
            // only load GeoJSON datasets hosted by Rotterdam (url contains 'rotterdam')
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
                    console.log("loaded Rotterdam dataset", ds.id, ds.name);
                } catch (e) {
                    console.error("failed to load Rotterdam dataset", ds.id, e);
                }
            }
        }
    } catch (e) {
        console.error("error fetching datasets list", e);
    }
})();
