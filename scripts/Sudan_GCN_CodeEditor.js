// ═══════════════════════════════════════════════════════════════
//  SUDAN IMPROVED HYDROLOGIC CURVE NUMBER — v4.2
//  Based on GCN250 (Jaafar et al., 2019, Sci Data 6:145)
//  WorldCover 10m | SoilGrids HSG | SRTM Slope
//  MODIS NDVI | GPM IMERG | Flood Risk
//  State/Locality | Upload Asset | Draw AOI | Dynamic Legend
// ═══════════════════════════════════════════════════════════════

// ╔═══════════════════════════════════╗
// ║  1. STUDY AREA & ADMIN DATA      ║
// ╚═══════════════════════════════════╝
var countries = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017');
var sudan = countries.filter(ee.Filter.eq('country_na', 'Sudan'));
var sudanGeom = sudan.geometry();
var proj250 = ee.Projection('EPSG:4326').atScale(250);

var adminLevel1 = ee.FeatureCollection('FAO/GAUL/2015/level1')
  .filter(ee.Filter.eq('ADM0_NAME', 'Sudan'));
var adminLevel2 = ee.FeatureCollection('FAO/GAUL/2015/level2')
  .filter(ee.Filter.eq('ADM0_NAME', 'Sudan'));

var activeAOI = sudanGeom;
var activeAOIname = 'Sudan (Full Country)';

// ╔═══════════════════════════════════╗
// ║  2. LOAD DATASETS                ║
// ╚═══════════════════════════════════╝
// ESA WorldCover 2021 (10m) — keep original for display
var worldcover = ee.ImageCollection('ESA/WorldCover/v200')
  .filterBounds(sudanGeom).mosaic().select('Map');

// Resample to 250m for CN computation (nearest-neighbor — appropriate for categorical)
var worldcover250 = worldcover.reproject({crs: 'EPSG:4326', scale: 250});

var clay = ee.Image('OpenLandMap/SOL/SOL_CLAY-WFRACTION_USDA-3A1A1A_M/v02').select('b0');
var sand = ee.Image('OpenLandMap/SOL/SOL_SAND-WFRACTION_USDA-3A1A1A_M/v02').select('b0');

var hsg = ee.Image(3);
hsg = hsg.where(clay.gt(40), 4);
hsg = hsg.where(clay.gte(20).and(clay.lte(40)), 3);
hsg = hsg.where(clay.gte(10).and(clay.lt(20)).and(sand.gte(50)), 2);
hsg = hsg.where(sand.gt(85).and(clay.lt(10)), 1);
hsg = hsg.rename('HSG').toByte();

var dem = ee.Image('USGS/SRTMGL1_003');
var slopeImg = ee.Terrain.slope(dem);

var ndvi = ee.ImageCollection('MODIS/061/MOD13A2')
  .filterDate('2023-01-01', '2023-12-31')
  .select('NDVI').mean().multiply(0.0001);

var population = ee.ImageCollection('WorldPop/GP/100m/pop')
  .filter(ee.Filter.eq('country', 'SDN'))
  .filter(ee.Filter.eq('year', 2020)).mosaic();

// ╔═══════════════════════════════════╗
// ║  3. CURVE NUMBER COMPUTATION     ║
// ╚═══════════════════════════════════╝
function cnForHSG(cnMap) {
  var cnImg = ee.Image(0);
  var keys = Object.keys(cnMap);
  for (var i = 0; i < keys.length; i++) {
    cnImg = cnImg.where(worldcover250.eq(parseInt(keys[i])), cnMap[keys[i]]);
  }
  return cnImg;
}

var cn_A = cnForHSG({10:33,20:42,30:39,40:57,50:89,60:77,80:100,90:100,95:100,100:49});
var cn_B = cnForHSG({10:58,20:62,30:61,40:68,50:92,60:86,80:100,90:100,95:100,100:69});
var cn_C = cnForHSG({10:72,20:75,30:74,40:75,50:94,60:91,80:100,90:100,95:100,100:79});
var cn_D = cnForHSG({10:78,20:81,30:80,40:78,50:95,60:94,80:100,90:100,95:100,100:84});

var cnRaw = cn_A.multiply(hsg.eq(1))
  .add(cn_B.multiply(hsg.eq(2)))
  .add(cn_C.multiply(hsg.eq(3)))
  .add(cn_D.multiply(hsg.eq(4)));
cnRaw = cnRaw.where(cnRaw.lte(0), cn_C);
cnRaw = cnRaw.where(cnRaw.lte(0), 80);

var cnAverage = cnRaw.setDefaultProjection(proj250)
  .clip(sudanGeom).rename('CN_average').toFloat();

function cnToDry(cn2) {
  return cn2.multiply(4.2)
    .divide(ee.Image.constant(10).subtract(cn2.multiply(0.058)))
    .clamp(0,100).rename('CN_dry');
}
function cnToWet(cn2) {
  return cn2.multiply(23)
    .divide(ee.Image.constant(10).add(cn2.multiply(0.13)))
    .clamp(0,100).rename('CN_wet');
}
var cnDry = cnToDry(cnAverage);
var cnWet = cnToWet(cnAverage);

var cn3 = cnToWet(cnAverage);
var slopeFrac = slopeImg.multiply(Math.PI/180).tan();
var expTerm = slopeFrac.multiply(-13.86).exp().multiply(2);
var cnSlopeAdj = cn3.subtract(cnAverage)
  .multiply(ee.Image.constant(1).subtract(expTerm))
  .add(cnAverage).clamp(0,100).clip(sudanGeom).rename('CN_slope_adjusted');

var vegFactor = ndvi.subtract(0.1).divide(0.4).clamp(0,1).multiply(0.15);
var cnSeasonal = cnAverage.multiply(ee.Image.constant(1).subtract(vegFactor))
  .clamp(0,100).clip(sudanGeom).rename('CN_seasonal');

function calculateRunoff(P, cnImg) {
  var S = ee.Image.constant(25400).divide(cnImg).subtract(254);
  var Ia = S.multiply(0.2);
  var PminusIa = P.subtract(Ia);
  return PminusIa.pow(2).divide(PminusIa.add(S))
    .where(P.lte(Ia), 0).max(0).rename('runoff_mm');
}

function getDailyGPM(dateStr) {
  var start = ee.Date(dateStr);
  return ee.ImageCollection('NASA/GPM_L3/IMERG_V07')
    .filterDate(start, start.advance(1,'day'))
    .select('precipitation').mean().multiply(24)
    .clip(sudanGeom).rename('rainfall_mm');
}

var cnNorm = cnAverage.subtract(30).divide(70).clamp(0,1);
var slopeNorm = ee.Image(1).subtract(slopeImg.divide(30).clamp(0,1));
var popClip = population.clip(sudanGeom);
var popNorm = popClip.max(0).add(1).log10().divide(4).clamp(0,1);
var floodRisk = cnNorm.multiply(0.4)
  .add(slopeNorm.clip(sudanGeom).multiply(0.3))
  .add(popNorm.multiply(0.3))
  .clip(sudanGeom).rename('flood_risk');

// ╔═══════════════════════════════════╗
// ║  4. VISUALIZATION CONFIGS        ║
// ╚═══════════════════════════════════╝
var PALETTES = {
  cn:    ['#1a9850','#66bd63','#a6d96a','#d9ef8b','#fee08b','#fdae61','#f46d43','#d73027'],
  runoff:['#f7fbff','#deebf7','#c6dbef','#9ecae1','#6baed6','#4292c6','#2171b5','#084594'],
  flood: ['#ffffcc','#ffeda0','#fed976','#feb24c','#fd8d3c','#fc4e2a','#e31a1c','#b10026'],
  ndvi:  ['#d73027','#f46d43','#fdae61','#fee08b','#d9ef8b','#a6d96a','#66bd63','#1a9850'],
  slope: ['#ffffcc','#d9f0a3','#addd8e','#78c679','#41ab5d','#238443','#006837'],
  elev:  ['#006837','#31a354','#78c679','#d9ef8b','#fee08b','#fdae61','#f46d43','#d73027','#ffffff'],
  pop:   ['#fff5f0','#fee0d2','#fcbba1','#fc9272','#fb6a4a','#ef3b2c','#cb181d','#99000d'],
  hsg:   ['#2166ac','#67a9cf','#ef8a62','#b2182b'],
  rain:  ['#f7fbff','#c6dbef','#6baed6','#2171b5','#084594']
};

var LAYERS = {
  'CN Average (ARC II)':     {img: cnAverage,  vis: {min:30, max:100, palette:PALETTES.cn},
    legendType:'gradient', legendLabels:['30 Low','50','65','80','100 High'], unit:'CN'},
  'CN Dry (ARC I)':          {img: cnDry,      vis: {min:30, max:100, palette:PALETTES.cn},
    legendType:'gradient', legendLabels:['30 Low','50','65','80','100 High'], unit:'CN'},
  'CN Wet (ARC III)':        {img: cnWet,      vis: {min:30, max:100, palette:PALETTES.cn},
    legendType:'gradient', legendLabels:['30 Low','50','65','80','100 High'], unit:'CN'},
  'CN Slope-Adjusted':       {img: cnSlopeAdj, vis: {min:30, max:100, palette:PALETTES.cn},
    legendType:'gradient', legendLabels:['30 Low','50','65','80','100 High'], unit:'CN'},
  'CN Seasonal (NDVI)':      {img: cnSeasonal, vis: {min:30, max:100, palette:PALETTES.cn},
    legendType:'gradient', legendLabels:['30 Low','50','65','80','100 High'], unit:'CN'},
  'Land Cover':              {img: worldcover,  vis: {min:10, max:100,
    palette:['#006400','#ffbb22','#ffff4c','#f096ff','#fa0000','#b4b4b4','#f0f0f0','#0064c8','#0096a0','#00cf75','#fae6a0']},
    legendType:'categorical', legendItems:[
      {color:'#006400',label:'Tree Cover'},{color:'#ffbb22',label:'Shrubland'},
      {color:'#ffff4c',label:'Grassland'},{color:'#f096ff',label:'Cropland'},
      {color:'#fa0000',label:'Built-up'},{color:'#b4b4b4',label:'Bare / Sparse'},
      {color:'#0064c8',label:'Water'},{color:'#0096a0',label:'Wetland'},
      {color:'#00cf75',label:'Mangroves'},{color:'#fae6a0',label:'Moss / Lichen'}
    ], clip: true},
  'Hydrologic Soil Groups':  {img: hsg,  vis: {min:1, max:4, palette:PALETTES.hsg},
    legendType:'categorical', legendItems:[
      {color:'#2166ac',label:'A - Sandy (Low Runoff)'},
      {color:'#67a9cf',label:'B - Loamy (Moderate)'},
      {color:'#ef8a62',label:'C - Clay-Loam (Slow)'},
      {color:'#b2182b',label:'D - Clay (High Runoff)'}
    ], clip: true},
  'NDVI Vegetation':         {img: ndvi, vis: {min:0, max:0.6, palette:PALETTES.ndvi},
    legendType:'gradient', legendLabels:['0.0 Bare','0.15','0.30','0.45','0.60 Dense'], unit:'NDVI', clip:true},
  'Slope':                   {img: slopeImg, vis: {min:0, max:20, palette:PALETTES.slope},
    legendType:'gradient', legendLabels:['0 Flat','5','10','15','20+ Steep'], unit:'Degrees', clip:true},
  'Elevation':               {img: dem, vis: {min:0, max:2500, palette:PALETTES.elev},
    legendType:'gradient', legendLabels:['0 m','625','1250','1875','2500 m'], unit:'Meters', clip:true},
  'Flood Risk Index':        {img: floodRisk, vis: {min:0, max:1, palette:PALETTES.flood},
    legendType:'gradient', legendLabels:['0.0 Low','0.25','0.50','0.75','1.0 High'], unit:'Risk Score'},
  'Population Density':      {img: popClip, vis: {min:0, max:500, palette:PALETTES.pop},
    legendType:'gradient', legendLabels:['0','125','250','375','500+'], unit:'People/km2'}
};

// ╔═══════════════════════════════════════════════╗
// ║  5. UI HELPERS (GEE-COMPATIBLE STYLES ONLY)  ║
// ╚═══════════════════════════════════════════════╝

// Section header — dark label on light panel
function sectionHeader(title) {
  return ui.Label(title, {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#023E8A',
    backgroundColor: '#EDF2F7',
    padding: '8px 10px',
    margin: '12px 0 6px 0',
    stretch: 'horizontal'
  });
}

// Standard button (uses GEE default style - always readable)
function makeButton(label, callback) {
  return ui.Button({
    label: label,
    onClick: callback,
    style: {stretch: 'horizontal', margin: '3px 0'}
  });
}

// Info text
function infoLabel(text) {
  return ui.Label(text, {
    fontSize: '11px', color: '#555555', margin: '4px 0 1px 0'
  });
}

// Divider line
function divider() {
  return ui.Panel({
    style: {height: '1px', backgroundColor: '#DDDDDD',
            margin: '8px 0', stretch: 'horizontal'}
  });
}

// ╔═══════════════════════════════════╗
// ║  6. DYNAMIC LEGEND               ║
// ╚═══════════════════════════════════╝

var legendPanel = ui.Panel({style: {padding: '0', margin: '0'}});

function buildGradientLegend(title, palette, labels, unit) {
  legendPanel.clear();

  // Title
  legendPanel.add(ui.Label(title, {
    fontSize: '12px', fontWeight: 'bold', color: '#333333', margin: '0 0 6px 0'
  }));

  // Color bar
  var barPanel = ui.Panel({
    layout: ui.Panel.Layout.flow('horizontal'),
    style: {stretch: 'horizontal', height: '16px', margin: '0', padding: '0'}
  });
  for (var c = 0; c < palette.length; c++) {
    barPanel.add(ui.Label('', {
      backgroundColor: palette[c], height: '16px',
      margin: '0', padding: '0', stretch: 'horizontal'
    }));
  }
  legendPanel.add(barPanel);

  // Labels
  var labelRow = ui.Panel({
    layout: ui.Panel.Layout.flow('horizontal'),
    style: {stretch: 'horizontal', margin: '2px 0 0 0', padding: '0'}
  });
  for (var l = 0; l < labels.length; l++) {
    var align = l === 0 ? 'left' : (l === labels.length - 1 ? 'right' : 'center');
    labelRow.add(ui.Label(labels[l], {
      fontSize: '10px', color: '#666666',
      textAlign: align, stretch: 'horizontal',
      margin: '0', padding: '0'
    }));
  }
  legendPanel.add(labelRow);

  if (unit) {
    legendPanel.add(ui.Label('Unit: ' + unit, {
      fontSize: '10px', color: '#888888', fontStyle: 'italic', margin: '4px 0 0 0'
    }));
  }
}

function buildCategoricalLegend(title, items) {
  legendPanel.clear();

  legendPanel.add(ui.Label(title, {
    fontSize: '12px', fontWeight: 'bold', color: '#333333', margin: '0 0 6px 0'
  }));

  for (var i = 0; i < items.length; i++) {
    var row = ui.Panel({
      layout: ui.Panel.Layout.flow('horizontal'),
      style: {margin: '2px 0', padding: '0'}
    });
    // Color swatch
    row.add(ui.Label('██', {
      color: items[i].color,
      fontSize: '14px',
      margin: '0 6px 0 0',
      padding: '0'
    }));
    // Label
    row.add(ui.Label(items[i].label, {
      fontSize: '11px', color: '#333333', margin: '2px 0 0 0', padding: '0'
    }));
    legendPanel.add(row);
  }
}

function updateLegend(layerName) {
  var cfg = LAYERS[layerName];
  if (!cfg) { legendPanel.clear(); return; }
  if (cfg.legendType === 'gradient') {
    buildGradientLegend(layerName, cfg.vis.palette, cfg.legendLabels, cfg.unit);
  } else {
    buildCategoricalLegend(layerName, cfg.legendItems);
  }
}

// ╔═══════════════════════════════════╗
// ║  7. MAP SETUP & AOI ENGINE       ║
// ╚═══════════════════════════════════╝

Map.centerObject(sudan, 6);
Map.setOptions('SATELLITE');

function addAOIBorder(geom, name) {
  var fc = ee.FeatureCollection([ee.Feature(geom)]);
  Map.addLayer(fc.style({color: '00E5FF', fillColor: '00000000', width: 2}),
    {}, name || 'AOI', true, 0.9);
}

function showLayer(name) {
  Map.layers().reset();
  var cfg = LAYERS[name];
  if (!cfg) return;
  var img = cfg.img.clip(activeAOI);
  Map.addLayer(img, cfg.vis, name);
  addAOIBorder(activeAOI, activeAOIname);
  updateLegend(name);
}

function setAOI(geom, name) {
  activeAOI = geom;
  activeAOIname = name;
  aoiStatusLabel.setValue('Active AOI:  ' + name);
  showLayer(layerSelect.getValue());
  Map.centerObject(ee.Geometry(geom), null);
}

// ╔═══════════════════════════════════════════════╗
// ║  8. BUILD THE UI PANEL                       ║
// ╚═══════════════════════════════════════════════╝

var mainPanel = ui.Panel({
  style: {width: '340px', padding: '0'}
});

// ── HEADER ──
mainPanel.add(ui.Label('SUDAN HYDROLOGIC CURVE NUMBER', {
  fontSize: '15px', fontWeight: 'bold', color: '#023E8A',
  margin: '12px 10px 2px 10px'
}));
mainPanel.add(ui.Label('GCN250 Improved v4.2  |  WorldCover 10m  |  SoilGrids HSG  |  GPM IMERG', {
  fontSize: '10px', color: '#666666', margin: '0 10px 4px 10px'
}));
mainPanel.add(ui.Label('State/Locality + Draw AOI + Upload Shapefile + 12 Layers + Dynamic Legend', {
  fontSize: '10px', color: '#888888', margin: '0 10px 8px 10px'
}));
mainPanel.add(divider());

// ════════════════════════════════
//  AREA OF INTEREST (AOI)
// ════════════════════════════════
mainPanel.add(sectionHeader('📌  AREA OF INTEREST (AOI)'));

var aoiStatusLabel = ui.Label('Active AOI:  Sudan (Full Country)', {
  fontSize: '12px', fontWeight: 'bold', color: '#2A9D8F',
  margin: '4px 10px', padding: '6px 10px',
  backgroundColor: '#E8F5E9'
});
mainPanel.add(aoiStatusLabel);

// -- 1. State --
mainPanel.add(infoLabel('1. Select by State:'));
var stateSelect = ui.Select({
  items: [], placeholder: 'Loading states...',
  style: {stretch: 'horizontal', margin: '2px 0'}
});
mainPanel.add(stateSelect);

adminLevel1.aggregate_array('ADM1_NAME').sort().evaluate(function(names) {
  if (names) {
    stateSelect.items().reset(names);
    stateSelect.setPlaceholder('-- Choose a State --');
  }
});

mainPanel.add(makeButton('>> Apply State', function() {
  var name = stateSelect.getValue();
  if (!name) { resultLabel.setValue('Please select a state first.'); return; }
  resultLabel.setValue('Loading ' + name + '...');
  var fc = adminLevel1.filter(ee.Filter.eq('ADM1_NAME', name));
  setAOI(fc.geometry(), name + ' State');

  localitySelect.items().reset([]);
  localitySelect.setPlaceholder('Loading localities...');
  adminLevel2.filter(ee.Filter.eq('ADM1_NAME', name))
    .aggregate_array('ADM2_NAME').sort().evaluate(function(locs) {
      if (locs && locs.length > 0) {
        localitySelect.items().reset(locs);
        localitySelect.setPlaceholder('-- Choose Locality --');
      } else {
        localitySelect.setPlaceholder('No localities found');
      }
    });
}));

// -- 2. Locality --
mainPanel.add(infoLabel('2. Select by Locality (choose state first):'));
var localitySelect = ui.Select({
  items: [], placeholder: '-- Select state first --',
  style: {stretch: 'horizontal', margin: '2px 0'}
});
mainPanel.add(localitySelect);

mainPanel.add(makeButton('>> Apply Locality', function() {
  var name = localitySelect.getValue();
  if (!name) { resultLabel.setValue('Select a locality first.'); return; }
  resultLabel.setValue('Loading ' + name + '...');
  var fc = adminLevel2.filter(ee.Filter.eq('ADM2_NAME', name));
  setAOI(fc.geometry(), name + ' Locality');
}));

mainPanel.add(divider());

// -- 3. GEE Asset --
mainPanel.add(infoLabel('3. Load GEE Asset (uploaded shapefile):'));
var assetInput = ui.Textbox({
  placeholder: 'e.g. users/yourname/my_boundary',
  style: {stretch: 'horizontal', margin: '2px 0'}
});
mainPanel.add(assetInput);

mainPanel.add(makeButton('>> Load Asset as AOI', function() {
  var id = assetInput.getValue();
  if (!id || id.length < 3) {
    resultLabel.setValue(
      'Enter a valid GEE asset path.\n\n' +
      'HOW TO UPLOAD A SHAPEFILE:\n' +
      '1. Click "Assets" tab (top-left of Code Editor)\n' +
      '2. Click NEW > Shape files\n' +
      '3. Upload .shp + .dbf + .shx + .prj files\n' +
      '4. Wait for ingestion to complete\n' +
      '5. Copy the asset ID and paste here\n' +
      '   Example: projects/ee-myuser/assets/my_aoi');
    return;
  }
  resultLabel.setValue('Loading asset: ' + id + '...');
  var userFC = ee.FeatureCollection(id);
  userFC.size().evaluate(function(n) {
    if (n !== null && n > 0) {
      setAOI(userFC.geometry(), 'Asset (' + n + ' features)');
      resultLabel.setValue('Asset loaded successfully!\nPath: ' + id + '\nFeatures: ' + n);
    } else {
      resultLabel.setValue('Asset empty or not found.\nCheck path and sharing permissions.');
    }
  });
}));

mainPanel.add(divider());

// -- 4. Draw on Map --
mainPanel.add(infoLabel('4. Draw a custom region on the map:'));

var drawRow = ui.Panel({
  layout: ui.Panel.Layout.flow('horizontal'),
  style: {margin: '2px 0', padding: '0'}
});
drawRow.add(ui.Button({
  label: 'Rectangle', onClick: function() {
    Map.drawingTools().setShape('rectangle');
    Map.drawingTools().draw();
    resultLabel.setValue('Draw a RECTANGLE on the map.\nThen click ">> Apply Drawn AOI".');
  }, style: {margin: '2px'}
}));
drawRow.add(ui.Button({
  label: 'Polygon', onClick: function() {
    Map.drawingTools().setShape('polygon');
    Map.drawingTools().draw();
    resultLabel.setValue('Draw a POLYGON on the map.\nDouble-click to finish.\nThen click ">> Apply Drawn AOI".');
  }, style: {margin: '2px'}
}));
drawRow.add(ui.Button({
  label: 'Point+10km', onClick: function() {
    Map.drawingTools().setShape('point');
    Map.drawingTools().draw();
    resultLabel.setValue('Click a POINT on the map.\n10 km buffer will be applied.\nThen click ">> Apply Drawn AOI".');
  }, style: {margin: '2px'}
}));
mainPanel.add(drawRow);

mainPanel.add(makeButton('>> Apply Drawn AOI', function() {
  var layers = Map.drawingTools().layers();
  if (layers.length() === 0) {
    resultLabel.setValue('No drawing found. Draw a shape first.');
    return;
  }
  var drawnGeom = layers.get(0).toGeometry();
  drawnGeom = ee.Algorithms.If(
    ee.Geometry(drawnGeom).type().compareTo('Point').eq(0),
    ee.Geometry(drawnGeom).buffer(10000),
    drawnGeom
  );
  setAOI(ee.Geometry(drawnGeom), 'Drawn Region');
  resultLabel.setValue('Drawn AOI applied successfully.');
}));

mainPanel.add(makeButton('Clear Drawings', function() {
  var layers = Map.drawingTools().layers();
  while (layers.length() > 0) {
    layers.remove(layers.get(0));
  }
  var _nl = ui.Map.GeometryLayer({geometries: null, name: 'geometry', color: '23cba7'}); Map.drawingTools().layers().add(_nl);
  resultLabel.setValue('All drawings cleared.');
}));

mainPanel.add(divider());

mainPanel.add(makeButton('RESET TO FULL SUDAN', function() {
  activeAOI = sudanGeom;
  activeAOIname = 'Sudan (Full Country)';
  aoiStatusLabel.setValue('Active AOI:  Sudan (Full Country)');
  var layers = Map.drawingTools().layers();
  while (layers.length() > 0) {
    layers.remove(layers.get(0));
  }
  var _nl = ui.Map.GeometryLayer({geometries: null, name: 'geometry', color: '23cba7'}); Map.drawingTools().layers().add(_nl);
  showLayer(layerSelect.getValue());
  Map.centerObject(sudan, 6);
  resultLabel.setValue('Reset to full Sudan.');
}));

// ════════════════════════════════
//  MAP LAYERS
// ════════════════════════════════
mainPanel.add(sectionHeader('🗺  MAP LAYERS'));

var layerNames = Object.keys(LAYERS);
var layerSelect = ui.Select({
  items: layerNames, value: layerNames[0],
  style: {stretch: 'horizontal', margin: '4px 0'}
});
mainPanel.add(layerSelect);

// Auto-show on change
layerSelect.onChange(function(val) { showLayer(val); });

mainPanel.add(makeButton('Show Selected Layer', function() {
  showLayer(layerSelect.getValue());
}));

mainPanel.add(makeButton('Clear Map', function() {
  Map.layers().reset();
  legendPanel.clear();
}));

// ════════════════════════════════
//  LEGEND
// ════════════════════════════════
mainPanel.add(sectionHeader('🎨  LEGEND'));

var legendContainer = ui.Panel({
  widgets: [legendPanel],
  style: {
    backgroundColor: '#F8F9FA',
    border: '1px solid #DDDDDD',
    padding: '10px',
    margin: '4px 0'
  }
});
mainPanel.add(legendContainer);

// ════════════════════════════════
//  RUNOFF CALCULATOR
// ════════════════════════════════
mainPanel.add(sectionHeader('💧  RUNOFF CALCULATOR'));

mainPanel.add(infoLabel('Rainfall (mm):'));
var rainInput = ui.Textbox({
  placeholder: 'Enter rainfall in mm', value: '50',
  style: {stretch: 'horizontal', margin: '2px 0'}
});
mainPanel.add(rainInput);

mainPanel.add(infoLabel('CN Type:'));
var cnType = ui.Select({
  items: ['Average','Dry','Wet','Slope-Adjusted','Seasonal'],
  value: 'Average',
  style: {stretch: 'horizontal', margin: '2px 0'}
});
mainPanel.add(cnType);

mainPanel.add(makeButton('Calculate Runoff Map', function() {
  var P = parseFloat(rainInput.getValue());
  if (isNaN(P) || P <= 0) { resultLabel.setValue('Enter a valid rainfall value.'); return; }

  var cn = cnAverage;
  var t = cnType.getValue();
  if (t === 'Dry') cn = cnDry;
  else if (t === 'Wet') cn = cnWet;
  else if (t === 'Slope-Adjusted') cn = cnSlopeAdj;
  else if (t === 'Seasonal') cn = cnSeasonal;

  var Q = calculateRunoff(ee.Image.constant(P), cn).clip(activeAOI);
  Map.layers().reset();
  Map.addLayer(Q, {min:0, max:P*0.6, palette:PALETTES.runoff}, 'Runoff (P=' + P + 'mm)');
  addAOIBorder(activeAOI, activeAOIname);

  var maxQ = Math.round(P * 0.6);
  buildGradientLegend('Runoff (P=' + P + 'mm)', PALETTES.runoff,
    ['0 mm', Math.round(maxQ*0.25)+'', Math.round(maxQ*0.5)+'', Math.round(maxQ*0.75)+'', maxQ+' mm'], 'mm');

  resultLabel.setValue('Computing mean runoff for ' + activeAOIname + '...');
  Q.reduceRegion({
    reducer: ee.Reducer.mean(), geometry: activeAOI,
    scale: 5000, maxPixels: 1e10, bestEffort: true
  }).get('runoff_mm').evaluate(function(v) {
    if (v !== null) {
      resultLabel.setValue(
        '=== RUNOFF RESULT ===\n' +
        'AOI:            ' + activeAOIname + '\n' +
        'Rainfall:      ' + P + ' mm\n' +
        'Mean Runoff: ' + v.toFixed(2) + ' mm\n' +
        'Runoff Ratio: ' + (v / P * 100).toFixed(1) + '%\n' +
        'CN Type:      ' + t);
    }
  });
}));

// ════════════════════════════════
//  GPM SATELLITE RAINFALL
// ════════════════════════════════
mainPanel.add(sectionHeader('🛰  GPM SATELLITE RAINFALL'));

mainPanel.add(infoLabel('Date (YYYY-MM-DD):'));
var dateInput = ui.Textbox({
  placeholder: '2024-08-15', value: '2024-08-15',
  style: {stretch: 'horizontal', margin: '2px 0'}
});
mainPanel.add(dateInput);

mainPanel.add(makeButton('Fetch Rainfall & Compute Runoff', function() {
  var d = dateInput.getValue();
  resultLabel.setValue('Fetching GPM IMERG for ' + d + '...');

  var rain = getDailyGPM(d).clip(activeAOI);
  var Q = calculateRunoff(rain, cnAverage.clip(activeAOI));
  Map.layers().reset();
  Map.addLayer(rain, {min:0, max:60, palette:PALETTES.rain}, 'Rainfall ' + d);
  Map.addLayer(Q, {min:0, max:30, palette:PALETTES.runoff}, 'Runoff ' + d, false);
  addAOIBorder(activeAOI, activeAOIname);

  buildGradientLegend('Daily Rainfall - ' + d, PALETTES.rain,
    ['0 mm','15','30','45','60+ mm'], 'mm/day');

  rain.addBands(Q).reduceRegion({
    reducer: ee.Reducer.mean(), geometry: activeAOI,
    scale: 10000, maxPixels: 1e10, bestEffort: true
  }).evaluate(function(v) {
    if (v) {
      resultLabel.setValue(
        '=== GPM RESULT: ' + d + ' ===\n' +
        'AOI:             ' + activeAOIname + '\n' +
        'Mean Rainfall: ' + (v.rainfall_mm||0).toFixed(2) + ' mm\n' +
        'Mean Runoff:   ' + (v.runoff_mm||0).toFixed(2) + ' mm\n' +
        '---\n' +
        'Tip: Toggle "Runoff" layer in the\n' +
        'Layers panel (top-right of map)');
    } else {
      resultLabel.setValue('No GPM data available for ' + d);
    }
  });
}));

// ════════════════════════════════
//  RESULTS & STATISTICS
// ════════════════════════════════
mainPanel.add(sectionHeader('📊  RESULTS & POINT QUERY'));

var resultLabel = ui.Label('Click on the map or use tools above to see results.', {
  fontSize: '11px', color: '#333333', whiteSpace: 'pre-wrap',
  margin: '0', padding: '8px',
  backgroundColor: '#F8F9FA', border: '1px solid #DDDDDD'
});
mainPanel.add(resultLabel);

mainPanel.add(makeButton('Compute AOI Statistics', function() {
  resultLabel.setValue('Computing statistics for ' + activeAOIname + '...');
  cnAverage.clip(activeAOI).reduceRegion({
    reducer: ee.Reducer.mean()
      .combine(ee.Reducer.stdDev(),'',true)
      .combine(ee.Reducer.min(),'',true)
      .combine(ee.Reducer.max(),'',true),
    geometry: activeAOI, scale: 5000,
    maxPixels: 1e10, bestEffort: true
  }).evaluate(function(v) {
    if (v) resultLabel.setValue(
      '=== CN STATISTICS ===\n' +
      'AOI:       ' + activeAOIname + '\n' +
      'Mean:     ' + (v.CN_average_mean||0).toFixed(1) + '\n' +
      'Std Dev: ' + (v.CN_average_stdDev||0).toFixed(1) + '\n' +
      'Min:       ' + (v.CN_average_min||0).toFixed(0) + '\n' +
      'Max:       ' + (v.CN_average_max||0).toFixed(0) + '\n' +
      '---\n' +
      'Resolution: 250m | CRS: EPSG:4326');
  });
}));

// ════════════════════════════════
//  EXPORT
// ════════════════════════════════
mainPanel.add(sectionHeader('💾  EXPORT TO GOOGLE DRIVE'));

mainPanel.add(makeButton('Export All Products (5 GeoTIFFs)', function() {
  var region = activeAOI;
  var suffix = activeAOIname.replace(/[^a-zA-Z0-9]/g, '_');
  var items = [
    [cnAverage.clip(region),  'CN_Average_' + suffix],
    [cnDry.clip(region),      'CN_Dry_' + suffix],
    [cnWet.clip(region),      'CN_Wet_' + suffix],
    [cnSlopeAdj.clip(region), 'CN_SlopeAdj_' + suffix],
    [floodRisk.clip(region),  'Flood_Risk_' + suffix]
  ];
  items.forEach(function(e) {
    Export.image.toDrive({
      image: e[0].toFloat(), description: e[1],
      folder: 'Sudan_CN', region: region,
      scale: 250, maxPixels: 1e13, crs: 'EPSG:4326'
    });
  });
  resultLabel.setValue(
    '5 EXPORT TASKS SUBMITTED\n' +
    'AOI: ' + activeAOIname + '\n' +
    '---\n' +
    '1. CN_Average_' + suffix + '\n' +
    '2. CN_Dry_' + suffix + '\n' +
    '3. CN_Wet_' + suffix + '\n' +
    '4. CN_SlopeAdj_' + suffix + '\n' +
    '5. Flood_Risk_' + suffix + '\n' +
    '---\n' +
    'Go to TASKS tab (top-right)\n' +
    'Click RUN on each task\n' +
    'Files save to Google Drive > Sudan_CN');
}));

// ── FOOTER ──
mainPanel.add(divider());
mainPanel.add(ui.Label(
  'Data: WorldCover 2021 | SoilGrids | SRTM | MODIS NDVI\n' +
  'NASA GPM IMERG V07 | WorldPop | FAO GAUL 2015\n' +
  'Method: Jaafar et al. (2019) Sci Data 6:145',
  {fontSize: '9px', color: '#AAAAAA', margin: '4px 10px', whiteSpace: 'pre-wrap'}
));

// Insert panel
ui.root.insert(0, mainPanel);

// ╔═══════════════════════════════════╗
// ║  9. DRAWING TOOLS SETUP          ║
// ╚═══════════════════════════════════╝
var drawTools = Map.drawingTools();
drawTools.setShown(true);
drawTools.setLinked(false);
while (drawTools.layers().length() > 0) {
  drawTools.layers().remove(drawTools.layers().get(0));
}
var drawLayer = ui.Map.GeometryLayer({geometries: null, name: 'geometry', color: '23cba7'}); drawTools.layers().add(drawLayer);

// ╔═══════════════════════════════════╗
// ║  10. MAP CLICK HANDLER           ║
// ╚═══════════════════════════════════╝
Map.onClick(function(coords) {
  resultLabel.setValue('Querying ' + coords.lat.toFixed(4) + 'N, ' + coords.lon.toFixed(4) + 'E ...');
  var pt = ee.Geometry.Point([coords.lon, coords.lat]);

  var stack = cnAverage
    .addBands(cnDry).addBands(cnWet)
    .addBands(cnSlopeAdj).addBands(cnSeasonal)
    .addBands(hsg.clip(sudanGeom))
    .addBands(slopeImg.clip(sudanGeom).rename('slope'))
    .addBands(dem.clip(sudanGeom).rename('elev'))
    .addBands(ndvi.clip(sudanGeom).rename('NDVI'))
    .addBands(floodRisk)
    .addBands(clay.clip(sudanGeom).rename('clay'))
    .addBands(sand.clip(sudanGeom).rename('sand'))
    .addBands(worldcover.clip(sudanGeom).rename('LC'));

  var P = parseFloat(rainInput.getValue()) || 50;
  stack = stack.addBands(calculateRunoff(ee.Image.constant(P), cnAverage));

  stack.sample(pt, 250).first().toDictionary().evaluate(function(m) {
    if (!m) {
      resultLabel.setValue('No data at this location.\nClick inside Sudan boundary.');
      return;
    }

    var lc = {10:'Tree Cover',20:'Shrubland',30:'Grassland',40:'Cropland',
              50:'Built-up',60:'Bare/Sparse',80:'Water',90:'Wetland',
              95:'Mangroves',100:'Moss/Lichen'};
    var hs = {1:'A (Sandy)',2:'B (Loamy)',3:'C (Clay-Loam)',4:'D (Clay)'};

    // Get admin names for clicked point
    adminLevel1.filterBounds(pt).first().toDictionary().evaluate(function(a1) {
      adminLevel2.filterBounds(pt).first().toDictionary().evaluate(function(a2) {
        var sn = (a1 && a1.ADM1_NAME) ? a1.ADM1_NAME : '?';
        var ln = (a2 && a2.ADM2_NAME) ? a2.ADM2_NAME : '?';

        resultLabel.setValue(
          '=== POINT QUERY ===\n' +
          coords.lat.toFixed(4) + 'N, ' + coords.lon.toFixed(4) + 'E\n' +
          'State: ' + sn + '  |  Locality: ' + ln + '\n' +
          '---  INPUTS  ---\n' +
          'Land Cover:  ' + (lc[m.LC] || 'Unknown') + '\n' +
          'Soil Group:   ' + (hs[m.HSG] || '?') + '\n' +
          'Clay / Sand: ' + (m.clay||0) + '% / ' + (m.sand||0) + '%\n' +
          'Elevation:    ' + (m.elev||0).toFixed(0) + ' m\n' +
          'Slope:         ' + (m.slope||0).toFixed(1) + ' deg\n' +
          'NDVI:          ' + (m.NDVI||0).toFixed(3) + '\n' +
          '---  CURVE NUMBERS  ---\n' +
          'CN Average:  ' + (m.CN_average||0).toFixed(1) + '\n' +
          'CN Dry (I):    ' + (m.CN_dry||0).toFixed(1) + '\n' +
          'CN Wet (III): ' + (m.CN_wet||0).toFixed(1) + '\n' +
          'CN Slope:     ' + (m.CN_slope_adjusted||0).toFixed(1) + '\n' +
          'CN Seasonal: ' + (m.CN_seasonal||0).toFixed(1) + '\n' +
          '---  OUTPUTS  ---\n' +
          'Runoff (P=' + P + 'mm): ' + (m.runoff_mm||0).toFixed(2) + ' mm\n' +
          'Flood Risk:    ' + (m.flood_risk||0).toFixed(3)
        );
      });
    });
  });
});

// ╔═══════════════════════════════════╗
// ║  11. INITIAL DISPLAY             ║
// ╚═══════════════════════════════════╝
showLayer('CN Average (ARC II)');

print('======================================');
print('  SUDAN HYDROLOGIC CN APP - v4.2');
print('======================================');
print('  All datasets loaded successfully');
print('  Click map: query CN + State + Locality');
print('  AOI: State / Locality / Draw / Asset');
print('  12 layers + auto legend');
print('  Runoff + GPM + Statistics + Export');
print('======================================');
