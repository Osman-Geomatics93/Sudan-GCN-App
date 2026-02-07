<div align="center">

# 🌊 Sudan Hydrologic Curve Number Application

### Interactive SCS-CN Runoff Analysis for Sudan — Powered by Google Earth Engine

[![GEE App](https://img.shields.io/badge/🌍_Live_App-Launch_Now-0077B6?style=for-the-badge)](https://ee-osmangeomatics1993.projects.earthengine.app/view/sudan-hydrologic-curve-number-application)
[![License: MIT](https://img.shields.io/badge/License-MIT-2A9D8F?style=for-the-badge)](LICENSE)
[![GEE](https://img.shields.io/badge/Google_Earth_Engine-4285F4?style=for-the-badge&logo=google-earth&logoColor=white)](https://earthengine.google.com)
[![DOI](https://img.shields.io/badge/Method-GCN250-E76F51?style=for-the-badge)](https://doi.org/10.1038/s41597-019-0155-x)

**A free, open-source web application for computing improved hydrologic curve numbers, rainfall-runoff estimation, and flood risk assessment across Sudan.**

**No software installation. No coding required. Just open and analyze.**

[🚀 Launch App](https://ee-osmangeomatics1993.projects.earthengine.app/view/sudan-hydrologic-curve-number-application) · [📖 Documentation](#-documentation) · [🐛 Report Bug](../../issues) · [💡 Request Feature](../../issues)

</div>

---

<div align="center">

### 🎬 Application Demo

<a href="https://github.com/Osman-Geomatics93/Sudan-GCN-App/raw/main/Video/CN.mp4">
  <img src="https://img.shields.io/badge/▶_Watch_Full_Demo-FF0000?style=for-the-badge&logo=youtube&logoColor=white" alt="Watch Demo Video" width="280"/>
</a>

<br><br>

https://github.com/Osman-Geomatics93/Sudan-GCN-App/raw/main/Video/CN.mp4

<sub>📽 Interactive walkthrough — CN mapping, point queries, runoff calculation & data export</sub>

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Demo Video](#-application-demo)
- [Live Demo](#-live-demo)
- [Data Sources](#-data-sources)
- [Methodology](#-methodology)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Usage Guide](#-usage-guide)
- [Screenshots](#-screenshots)
- [Documentation](#-documentation)
- [Citation](#-citation)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🔬 Overview

Sudan faces increasing flood risks due to climate change, yet hydrologic data for the country remains scattered, hard to access, and often requires expensive software to process. This application addresses that gap by combining **6 global satellite datasets** into a single interactive tool.

The app computes improved **SCS Curve Numbers** for any location in Sudan using the **GCN250 methodology** (Jaafar et al., 2019), enhanced with:
- **10-meter land cover** resolution from ESA WorldCover
- **Slope-adjusted CN** using the Sharpley-Williams equation
- **Seasonal NDVI correction** for vegetation dynamics
- **Real-time satellite rainfall** from NASA GPM IMERG

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🗺 **12 Map Layers** | CN (5 variants), Land Cover, Soil Groups, Slope, Elevation, NDVI, Flood Risk, Population |
| 📌 **Flexible AOI** | Select by State, Locality, drawn polygon/rectangle/point, or uploaded shapefile |
| 💧 **Runoff Calculator** | SCS-CN method with manual rainfall input and 5 CN types |
| 🛰 **GPM Integration** | Fetch real NASA GPM IMERG satellite rainfall for any date |
| 📊 **Point Query** | Click anywhere for instant CN values + State + Locality info |
| 🎨 **Dynamic Legend** | Auto-updating gradient and categorical legends |
| 📈 **AOI Statistics** | Mean, StdDev, Min, Max for any selected area |
| 💾 **Data Export** | Download GeoTIFF via link or export to Google Drive |

---

## 🌍 Live Demo

**Launch the app now** — no login required:

### 🔗 [https://ee-osmangeomatics1993.projects.earthengine.app/view/sudan-hydrologic-curve-number-application](https://ee-osmangeomatics1993.projects.earthengine.app/view/sudan-hydrologic-curve-number-application)

> 🎥 **New to the app?** Watch the [video walkthrough above](#-application-demo) to see it in action before you start.

---

## 📡 Data Sources

| Dataset | Resolution | Source | Usage |
|---------|-----------|--------|-------|
| ESA WorldCover 2021 | 10 m | ESA / Copernicus | Land cover classification |
| OpenLandMap SoilGrids | 250 m | ISRIC | Hydrologic Soil Groups (HSG) |
| USGS SRTM | 30 m | NASA / USGS | Elevation & slope |
| MODIS MOD13A2 | 1 km | NASA | NDVI seasonal adjustment |
| NASA GPM IMERG V07 | 0.1° | NASA | Satellite rainfall |
| WorldPop 2020 | 100 m | WorldPop | Population density |
| FAO GAUL 2015 | Admin | FAO / UN | State & locality boundaries |

---

## 🧮 Methodology

<div align="center">

[![Full Methodology](https://img.shields.io/badge/📐_Full_Equations_&_Methodology-023E8A?style=for-the-badge)](docs/METHODOLOGY.md)
[![Interactive HTML](https://img.shields.io/badge/🔬_Interactive_Equations_(HTML)-0077B6?style=for-the-badge)](https://osman-geomatics93.github.io/Sudan-GCN-App/docs/Methodology_Equations.html)

</div>

The application follows the **GCN250 framework** (Jaafar et al., 2019) with slope and vegetation enhancements. The processing pipeline:

```
ESA WorldCover (10m) ──→ USDA Land Use ──┐
                                         ├──→ CN Lookup Table ──→ CN avg (ARC II) ──→ 5 CN Products
SoilGrids (Clay/Sand%) ──→ HSG (A/B/C/D)┘                             │
                                                          ┌────────────┼────────────┐
                                                      CN Dry (I)  CN Wet (III)  CN Slope  CN Seasonal
                                                                                   ↑          ↑
                                                                              SRTM Slope  MODIS NDVI
```

### Five CN Products

| Product | Description | Formula |
|---------|-------------|---------|
| **CN Average (ARC II)** | Standard antecedent conditions | Direct lookup |
| **CN Dry (ARC I)** | Dry soil conditions | CN(I) = 4.2×CN(II) / (10 - 0.058×CN(II)) |
| **CN Wet (ARC III)** | Saturated soil conditions | CN(III) = 23×CN(II) / (10 + 0.13×CN(II)) |
| **CN Slope-Adjusted** | Terrain-corrected CN | Sharpley-Williams equation |
| **CN Seasonal** | Vegetation-adjusted CN | NDVI-based reduction factor |

### Core Equations

| Equation | Formula | Description |
|----------|---------|-------------|
| **Retention** | `S = (25400 / CN) - 254` | Max soil water retention (mm) |
| **Abstraction** | `Ia = 0.2 × S` | Initial abstraction before runoff |
| **Runoff** | `Q = (P - Ia)² / (P - Ia + S)` | Direct surface runoff (P > Ia) |
| **Flood Risk** | `FRI = 0.4×CN + 0.3×Slope_inv + 0.3×Pop` | Composite risk index (0–1) |

> **📐 19 equations fully documented** — See [METHODOLOGY.md](docs/METHODOLOGY.md) for complete derivations, variable tables, and CN lookup values, or view the [Interactive HTML version](https://osman-geomatics93.github.io/Sudan-GCN-App/docs/Methodology_Equations.html) with rendered LaTeX equations.

---

## 📁 Project Structure

```
Sudan-GCN-App/
├── README.md                          # This file
├── LICENSE                            # MIT License
├── CHANGELOG.md                       # Version history
├── CONTRIBUTING.md                    # Contribution guidelines
├── .gitignore                         # Git ignore rules
├── .gitattributes                     # Git LFS config
│
├── scripts/
│   ├── Sudan_GCN_APP.js              # GEE App version (published)
│   └── Sudan_GCN_CodeEditor.js       # Code Editor version (with Export)
│
├── docs/
│   ├── METHODOLOGY.md                 # Full scientific methodology (19 equations)
│   ├── Methodology_Equations.html     # Interactive HTML with LaTeX rendering
│   └── Deployment_Guide.html         # How to publish as GEE App
│
├── assets/
│   ├── overview.png                   # App overview screenshot
│   ├── Point Query.png                # Point query screenshot
│   └── State Selection.png            # State selection screenshot
│
├── Video/
│   └── CN.mp4                         # Application demo video (LFS)
│
└── .github/
    └── ISSUE_TEMPLATE.md             # Bug report / feature request template
```

### Script Versions

| File | Use Case | Export Method |
|------|----------|--------------|
| `Sudan_GCN_APP.js` | Published GEE App | `getDownloadURL()` + `Export.toDrive()` |
| `Sudan_GCN_CodeEditor.js` | Personal research in Code Editor | `Export.toDrive()` + `print()` |

---

## 🚀 Getting Started

### Option 1: Use the Live App (Recommended)

Just open the link — no setup needed:

🔗 **[Launch App](https://ee-osmangeomatics1993.projects.earthengine.app/view/sudan-hydrologic-curve-number-application)**

### Option 2: Run in GEE Code Editor

1. Open [code.earthengine.google.com](https://code.earthengine.google.com)
2. Create a new script
3. Copy the contents of `scripts/Sudan_GCN_CodeEditor.js`
4. Paste into the editor
5. Click **▶ Run**

### Option 3: Deploy Your Own App

See the [Deployment Guide](https://osman-geomatics93.github.io/Sudan-GCN-App/docs/Deployment_Guide.html) for step-by-step instructions.

---

## 📖 Usage Guide

### 1. Select Area of Interest

| Method | How |
|--------|-----|
| **State** | Choose from dropdown → click "Apply State" |
| **Locality** | Select state first → choose locality → "Apply Locality" |
| **Draw** | Click Rectangle/Polygon/Point → draw on map → "Apply Drawn AOI" |
| **Shapefile** | Upload to GEE Assets → paste asset path → "Load Asset as AOI" |

### 2. Explore Map Layers

Select any of 12 layers from the dropdown. The map and legend update automatically.

### 3. Point Query

Click anywhere on the map to get:
- Land cover class, soil group, clay/sand %, elevation, slope, NDVI
- All 5 CN values
- Estimated runoff and flood risk
- State and locality name

### 4. Calculate Runoff

Enter rainfall (mm) → select CN type → click "Calculate Runoff Map"

### 5. Satellite Rainfall

Enter a date (YYYY-MM-DD) → click "Fetch Rainfall & Compute Runoff"

### 6. Download Data

- **In App**: Select product + scale → "Generate Download Link" → click blue link
- **In Code Editor**: "Export to Drive" → Tasks tab → click RUN

---

## 📸 Screenshots

<div align="center">

<details open>
<summary><b>🗺 App Overview — Hydrologic Soil Groups Layer</b></summary>
<br>
<img src="assets/overview.png" alt="App Overview — Hydrologic Soil Groups" width="90%"/>
<br>
<sub>Full Sudan view with Hydrologic Soil Groups (HSG) layer, legend, runoff calculator & satellite rainfall panel</sub>
<br><br>
</details>

<details open>
<summary><b>📌 Point Query — Interactive Map Click</b></summary>
<br>
<img src="assets/Point Query.png" alt="Point Query" width="90%"/>
<br>
<sub>Click anywhere to retrieve CN values, soil properties, elevation, slope, NDVI and administrative info</sub>
<br><br>
</details>

<details open>
<summary><b>🏛 State Selection — AOI by Administrative Boundary</b></summary>
<br>
<img src="assets/State Selection.png" alt="State Selection" width="90%"/>
<br>
<sub>Select any of Sudan's 18 states from the dropdown to focus analysis on a specific region</sub>
<br><br>
</details>

</div>

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Scientific Methodology](docs/METHODOLOGY.md) | Complete mathematical framework — 19 equations, CN lookup tables, all derivations |
| [Interactive Equations (HTML)](https://osman-geomatics93.github.io/Sudan-GCN-App/docs/Methodology_Equations.html) | Beautiful rendered version with KaTeX LaTeX, flowcharts, and variable tables |
| [Deployment Guide](https://osman-geomatics93.github.io/Sudan-GCN-App/docs/Deployment_Guide.html) | Step-by-step guide to publish as GEE App |

---

## 📝 Citation

If you use this application in your research, please cite:

```bibtex
@software{osman_sudan_gcn_2025,
  author    = {Osman},
  title     = {Sudan Hydrologic Curve Number Application},
  year      = {2025},
  url       = {https://github.com/Osman-Geomatics93/Sudan-GCN-App},
  note      = {Based on GCN250 methodology by Jaafar et al. (2019)}
}
```

And the underlying methodology:

```bibtex
@article{jaafar2019gcn250,
  title     = {GCN250, new global gridded curve numbers for hydrologic modeling and design},
  author    = {Jaafar, Hadi H. and Ahmad, Farah A. and El Beyrouthy, Naji},
  journal   = {Scientific Data},
  volume    = {6},
  number    = {145},
  year      = {2019},
  publisher = {Nature Publishing Group},
  doi       = {10.1038/s41597-019-0155-x}
}
```

---

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/new-analysis`)
3. Commit your changes (`git commit -m 'Add new analysis feature'`)
4. Push to the branch (`git push origin feature/new-analysis`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **ESA** — WorldCover 2021 land cover dataset
- **NASA** — GPM IMERG rainfall and SRTM elevation
- **ISRIC** — OpenLandMap SoilGrids
- **FAO** — GAUL administrative boundaries
- **Google** — Earth Engine platform
- **Jaafar et al.** — GCN250 methodology

---

<div align="center">

**Built with ❤️ for Sudan's water resources community**

[![Launch App](https://img.shields.io/badge/🚀_Launch_App-0077B6?style=for-the-badge)](https://ee-osmangeomatics1993.projects.earthengine.app/view/sudan-hydrologic-curve-number-application)

</div>
