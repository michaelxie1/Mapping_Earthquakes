// We create the tile layer that will be the background of our map.
let streets = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token={accessToken}', {
attribution: 'Map data © <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery (c) <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    accessToken: API_KEY
});

let satelliteStreets = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v11/tiles/{z}/{x}/{y}?access_token={accessToken}', {
  attribution: 'Map data © <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery (c) <a href="https://www.mapbox.com/">Mapbox</a>',
      maxZoom: 18,
      accessToken: API_KEY
  });

  //Create a base layer that holds both maps
let baseMaps = {
  "Streets": streets,
  "Satellite Streets": satelliteStreets
};
let map = L.map("mapid",{
  center: [43.7, -79.3],
  zoom: 11,
  layers: [streets]  
});
//Pass map layers into layer control
L.control.layers(baseMaps).addTo(map);


// Accessing the Toronto neighborhoods GeoJSON URL.
let torontoHoods = "https://raw.githubusercontent.com/michaelxie1/Mapping_Earthquakes/main/torontoNeighborhoods.json";
d3.json(torontoHoods).then(function(data){
  console.log(data);
  //Creating a GeoJSON layer with retrieved data
  L.geoJSON(data,{
    color: "blue",
    fillColor: "yellow"
  }
    ).addTo(map);
});
