# Vite + CesiumJS + AR.js + 8th Wall

A modern web application built with **Vite**, combining **CesiumJS** for 3D geospatial visualization, **AR.js** for marker-based and location-based augmented reality, and **8th Wall** for advanced WebAR experiences.

## Technology Stack

| Technology              | Purpose                                 |
| ----------------------- | --------------------------------------- |
| Vite                    | Build tool and development server       |
| CesiumJS                | 3D geospatial rendering                 |
| AR.js                   | Open-source augmented reality framework |
| 8th Wall                | Commercial WebAR platform               |
| JavaScript / TypeScript | Application logic                       |

## Prerequisites

Before running the application, ensure you have:

* Node.js 18+ installed
* npm, pnpm, or yarn
* An active 8th Wall developer account
* Valid 8th Wall application key
* Modern browser with WebGL and camera access support

## Installation

Clone the repository:

```bash
git clone https://github.com/thomasmartini/Time-Thieves
cd Time-Thieves
```

Install dependencies:

```bash
npm install
```

or

```bash
pnpm install
```

## Environment Variables

Create a `.env` file in the project root based on the .env.example file


### Cesium Access Token

1. Create a Cesium account.
2. Generate an access token from the Cesium dashboard.
3. Add the token to your `.env` file.


## Running the Development Server

Start the application:

```bash
npm run dev
```

The application will be available at:

```text
http://localhost:5173
```

## Building for Production

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Project Structure

```text
src/
├── ar/
│   ├── arjs/
│   └── eighthwall/
├── cesium/
│   ├── viewer/
│   └── layers/
├── components/
├── assets/
├── styles/
├── utils/
├── main.js
└── App.vue

public/
├── markers/
├── models/
└── textures/
```

## CesiumJS Setup

Initialize the Cesium viewer:

```javascript
import * as Cesium from 'cesium'

Cesium.Ion.defaultAccessToken =
  import.meta.env.VITE_CESIUM_ACCESS_TOKEN

const viewer = new Cesium.Viewer('cesiumContainer')
```


## Deployment

The application can be deployed to:

* Vercel
* Netlify
* AWS S3 + CloudFront
* Azure Static Web Apps
* GitHub Pages (with Vite base path configuration)

Ensure all required environment variables are configured in your deployment platform.

## Browser Requirements

Recommended browsers:

* Chrome (Android/Desktop)
* Safari (iOS)
* Edge
* Samsung Internet

Requirements:

* WebGL support
* Camera permissions
* HTTPS (required for camera access and WebAR)

## Performance Considerations

* Use compressed 3D models (glTF/glb)
* Optimize texture sizes
* Load Cesium terrain and imagery on demand
* Lazy-load AR assets where possible
* Minimize draw calls and scene complexity

## Troubleshooting

### Camera Not Starting

* Verify HTTPS is enabled
* Confirm camera permissions are granted
* Check browser compatibility

### Cesium Globe Not Rendering

* Verify the Cesium access token
* Inspect browser console for WebGL errors

## License

standard MIT license

## Acknowledgements

* CesiumJS
* AR.js
* 8th Wall
* Vite
