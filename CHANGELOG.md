# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [4.2] — 2025-02-07

### 🚀 Published as GEE App
- First public release as a Google Earth Engine Application
- Live at: [Sudan Hydrologic CN App](https://ee-osmangeomatics1993.projects.earthengine.app/view/sudan-hydrologic-curve-number-application)

### Added
- **Area of Interest (AOI) system** with 4 selection methods:
  - State selector (18 Sudan states via FAO GAUL Level 1)
  - Locality selector (dynamic population via FAO GAUL Level 2)
  - GEE Asset / shapefile upload with validation
  - Drawing tools (Rectangle, Polygon, Point with 10 km buffer)
- **Download system** with `getDownloadURL()` for App + `Export.toDrive()` for Code Editor
- **Enhanced point query** showing State and Locality names
- **Reset to Full Sudan** button
- **Dynamic legend** with gradient and categorical modes
- AOI-aware processing for all operations (layers, runoff, statistics, export)

### Fixed
- Removed all invalid GEE UI styles (`letterSpacing`, `borderRadius`)
- Fixed button text visibility (removed custom `color` on buttons)
- Fixed `drawingTools.addLayer()` — replaced with proper `ui.Map.GeometryLayer` API
- Fixed WorldCover resolution — resampled to 250 m with `reproject()` to prevent tile timeout
- Removed `print()` and adapted `Export.toDrive()` for App compatibility

---

## [4.0] — 2025-02-06

### Added
- 12 interactive map layers with visualization configs
- 5 CN products: Average, Dry, Wet, Slope-Adjusted, Seasonal
- SCS-CN runoff calculator with manual rainfall input
- NASA GPM IMERG V07 satellite rainfall integration
- Flood Risk composite index
- Point click query with full data stack
- AOI statistics computation
- Export 5 GeoTIFFs to Google Drive

### Data Sources
- ESA WorldCover 2021 (10 m)
- OpenLandMap SoilGrids (250 m)
- USGS SRTM DEM (30 m)
- MODIS NDVI MOD13A2 (1 km)
- NASA GPM IMERG V07 (0.1°)
- WorldPop 2020 (100 m)

---

## [3.0] — 2025-01-25

### Added
- Initial Curve Number computation using GCN250 methodology
- Basic map visualization
- Simple point query

---

## References

- Jaafar, H.H., Ahmad, F.A. & El Beyrouthy, N. (2019). GCN250, new global gridded curve numbers for hydrologic modeling and design. *Scientific Data*, 6, 145. https://doi.org/10.1038/s41597-019-0155-x
