// Earthquake Challenge — live map of the past 7 days of earthquakes (USGS data).
//
// UPDATE (post-boot-camp): the original version used Mapbox base maps, which need a private
// API key stored in config.js. Because config.js is (correctly) kept out of GitHub, nobody else
// could run the map. The three base maps below now come from free providers that need no key,
// so the map can be published as a live demo on GitHub Pages. The original Mapbox version is
// preserved at the `bootcamp-submission` git tag.

// All three base maps come from Esri's free, key-free tile services.
// (OpenStreetMap's own tile servers were tried first, but their usage policy blocks requests
// that don't say which website they come from, so the map broke when index.html was opened
// directly from disk. Esri's servers work both locally and on GitHub Pages.)
const esri = 'https://server.arcgisonline.com/ArcGIS/rest/services/';
const esriAttribution = 'Tiles &copy; <a href="https://www.esri.com/">Esri</a>';

// Street map — Esri World Street Map.
let streets = L.tileLayer(esri + 'World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
  attribution: esriAttribution + ' &mdash; Source: Esri, HERE, Garmin, USGS, &copy; OpenStreetMap contributors, and the GIS User Community',
  maxZoom: 19
});

// Esri's satellite and dark maps come in two parts: the background image and a separate,
// transparent layer of place names and borders drawn on top. L.layerGroup combines the two so
// each still appears as a single choice in the layer control.

// Satellite imagery with place names (like the original Mapbox "satellite-streets") — Esri.
let satelliteStreets = L.layerGroup([
  L.tileLayer(esri + 'World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: esriAttribution + ' &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    maxZoom: 18
  }),
  L.tileLayer(esri + 'Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom: 18 })
]);

// Dark map with place names — Esri "Dark Gray Canvas".
// (CARTO's popular dark map was tried first, but it now requires an API key too.)
let dark = L.layerGroup([
  L.tileLayer(esri + 'Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    attribution: esriAttribution + ' &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
    maxZoom: 16
  }),
  L.tileLayer(esri + 'Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', { maxZoom: 16 })
]);

// Create the map object with center, zoom level and default layer.
let map = L.map('mapid', {
  center: [40.7, -94.5],
  zoom: 3,
  layers: [streets]
});

// Create a base layer that holds all three maps.
let baseMaps = {
  "Streets": streets,
  "Satellite": satelliteStreets,
  "Dark": dark
};

// 1. Add a layer group for each set of data.
let allEarthquakes = new L.LayerGroup();
let allTectonic = new L.LayerGroup();
let majorEq = new L.LayerGroup();

// 2. Add each group to the overlays object so it can be toggled on and off.
let overlays = {
  "Earthquakes": allEarthquakes,
  "Tectonic Plates": allTectonic,
  "Major Earthquakes": majorEq
};

// Add a control to the map that lets the user choose the base map and visible layers.
L.control.layers(baseMaps, overlays, {
  collapsed: false
}).addTo(map);

// This function determines the radius of the earthquake marker based on its magnitude.
// Earthquakes with a magnitude of 0 were being plotted with the wrong radius.
// UPDATE: defined once here and shared by both earthquake layers (it used to be copied twice).
function getRadius(magnitude) {
  if (magnitude === 0) {
    return 1;
  }
  return magnitude * 4;
}

// Colours for all earthquakes, from smallest to largest magnitude.
// UPDATE: the legend now reads from these same lists, so the map and legend can't disagree.
const allMagnitudes = [0, 1, 2, 3, 4, 5];
const allColors = ["#98ee00", "#d4ee00", "#eecc00", "#ee9c00", "#ea822c", "#ea2c2c"];

// This function determines the color of the marker based on the magnitude of the earthquake.
function getColor(magnitude) {
  if (magnitude > 5) {
    return "#ea2c2c";
  }
  if (magnitude > 4) {
    return "#ea822c";
  }
  if (magnitude > 3) {
    return "#ee9c00";
  }
  if (magnitude > 2) {
    return "#eecc00";
  }
  if (magnitude > 1) {
    return "#d4ee00";
  }
  return "#98ee00";
}

// 5. Three colours for the major earthquakes (magnitude 4.5 and above).
// BUG FIX: the original checks were "> 6", "> 5" and "< 5", so an earthquake of exactly
// magnitude 5.0 matched none of them and was drawn with no colour. The last case is now a
// catch-all, so every major earthquake gets a colour.
function getMajorColor(magnitude) {
  if (magnitude > 6) {
    return "#ff7b6a";
  }
  if (magnitude > 5) {
    return "#79ff5a";
  }
  return "#2d5eff";
}

// Build the style for a circle marker, given the colour function for that layer.
// UPDATE: replaces two copies of the same styleInfo function.
function styleFor(colorFunction) {
  return function(feature) {
    return {
      opacity: 1,
      fillOpacity: 1,
      fillColor: colorFunction(feature.properties.mag),
      color: "#000000",
      radius: getRadius(feature.properties.mag),
      stroke: true,
      weight: 0.5
    };
  };
}

// The major earthquakes get a pane just above Leaflet's default overlay pane (z-index 400),
// so they are always drawn on top of the all-earthquakes circles. In the original code the
// major feed was requested inside the first feed's callback, which guaranteed that order;
// the feeds now load independently (in parallel, which is faster), so the order is set here.
map.createPane("majorPane");
map.getPane("majorPane").style.zIndex = 410;

// Turn a GeoJSON earthquake feed into a layer of styled circles with popups.
function earthquakeLayer(data, colorFunction, pane) {
  return L.geoJson(data, {
    // We turn each feature into a circleMarker on the map.
    // BUG FIX: removed console.log(data) from here. It printed the entire dataset once for
    // every earthquake (thousands of times per page load), which slowed the map down.
    // The pane is set on each circle, because circles built here don't inherit it from L.geoJson.
    pointToLayer: function(feature, latlng) {
      return L.circleMarker(latlng, { pane: pane || "overlayPane" });
    },
    style: styleFor(colorFunction),
    // Popup with the magnitude and location of each earthquake.
    onEachFeature: function(feature, layer) {
      layer.bindPopup("Magnitude: " + feature.properties.mag + "<br>Location: " + feature.properties.place);
    }
  });
}

// Retrieve all earthquakes from the past 7 days.
d3.json("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson").then(function(data) {
  earthquakeLayer(data, getColor).addTo(allEarthquakes);
  allEarthquakes.addTo(map);
});

// 3. Retrieve the major earthquakes (magnitude 4.5+) from the past 7 days.
d3.json("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson").then(function(data) {
  // 7. Use the same circle style and popups, with the three major-earthquake colours.
  earthquakeLayer(data, getMajorColor, "majorPane").addTo(majorEq);
  // 8. Add the major earthquakes layer to the map.
  majorEq.addTo(map);
});

// 3. Retrieve the tectonic plate boundaries and draw them as orange lines.
// BUG FIX: the original line was
//     d3.json().then("https://...PB2002_boundaries.json").then(function(data) { ... })
// which called d3.json() with no URL and passed the URL to .then() instead. The request
// failed, so the "Tectonic Plates" layer was always empty. The URL now goes to d3.json().
//
// The plate lines get their own map "pane" that sits below the earthquake circles
// (Leaflet's default overlay pane is at z-index 400). Without this, whichever feed finished
// loading last would be drawn on top, and the lines could cover circles and block their popups.
map.createPane("tectonicPane");
map.getPane("tectonicPane").style.zIndex = 390;

d3.json("https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json").then(function(data) {
  L.geoJson(data, {
    pane: "tectonicPane",
    style: function() {
      return { color: "orange", weight: 2 };
    }
  }).addTo(allTectonic);
  allTectonic.addTo(map);
});

// Here we create a legend control object.
let legend = L.control({
  position: "bottomright"
});

// Add all the details for the legend.
// UPDATE: the legend now also explains the major-earthquake colours, which previously had
// no key (they use a different colour scheme from the main layer).
legend.onAdd = function() {
  let div = L.DomUtil.create("div", "info legend");

  div.innerHTML += "<strong>All earthquakes</strong><br>";
  // Looping through our intervals to generate a label with a colored square for each interval.
  for (let i = 0; i < allMagnitudes.length; i++) {
    div.innerHTML +=
      "<i style='background: " + allColors[i] + "'></i> " +
      allMagnitudes[i] + (allMagnitudes[i + 1] ? "&ndash;" + allMagnitudes[i + 1] + "<br>" : "+<br>");
  }

  div.innerHTML += "<strong class='legend-heading'>Major earthquakes</strong><br>";
  const majorBands = [["#2d5eff", "4.5&ndash;5"], ["#79ff5a", "5&ndash;6"], ["#ff7b6a", "6+"]];
  majorBands.forEach(function(band) {
    div.innerHTML += "<i style='background: " + band[0] + "'></i> " + band[1] + "<br>";
  });
  return div;
};

// Finally, we add our legend to the map.
legend.addTo(map);
