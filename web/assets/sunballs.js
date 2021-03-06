
/*
UI
components:
  A. Dropdown/buttons for vars (
    clouds,
    precip,
    wind,
    tempF,
    vis
  )
  .on("change"): updateMap(var)
  B. Time/date
    - show as sun elevation arc?
    - or graph with shading & sunUp / sunDown symbols
    https://www.wunderground.com/q/zmw:94114.1.99999?sp=KCASANFR943
  C. Legend
  D. Animate: play/pause

colorGradient min/max based on...
- entire time period?
- snapshot?
- entire area?
- visible extent?

*/
var A = {};
A.IDX = 0;
var map;

A.forecast = [];
A.nowTime = Math.floor((new Date()).getTime() / 1000);
/*
A.nowTime = A.nowTime - 24*60*60*9; // Oct 23?
A.nowTime = 1477251130; // Oct 23?
1478028750 = Nov 1
1477251130 =

delete from forecasts where forecast_date > now() - interval '1 day';

insert into forecasts (forecast_date, forecast_json, epochseconds, lat, lon) (
  SELECT
    now(),
    forecast_json,
    epochseconds,
    lat,
    lon
  FROM
    forecasts
  WHERE
    forecast_date::date = '2016-10-23'
);
*/

A.selectItems = [
  {"varname": "clouds", "display": "% Clouds", "max": -Infinity, "min": Infinity, "allVals": [] },
  {"varname": "precip", "display": "Precipitation", "max": -Infinity, "min": Infinity, "allVals": [] },
  {"varname": "wind", "display": "Wind", "max": -Infinity, "min": Infinity, "allVals": [] },
  {"varname": "tempF", "display": "Temperature", "max": -Infinity, "min": Infinity, "allVals": [] },
  {"varname": "vis", "display": "Visibility", "max": -Infinity, "min": Infinity, "allVals": [] }
];

A.wvar = "clouds";

A.sw = [-122.3243053,37.5640288];
A.ne = [-122.2657,37.7975];
A.boundsData = [A.sw, A.ne];

var my_key = "key-2d5eacd8b924489c8ed5e8418bd883bc";
var my_mapquest_key = "dhADqDA6plsQVFuHfPvX2Xb3GrFiCjl5";
var my_mapzen_search_key = "search-Qih_r38";

var us = [ // reverse of NESW
    {lon: -124.85, lat: 24.40}, // west, south
    {lon: -66.88, lat: 49.38} // east, north
];
var home = [
    {lon: -130, lat: 20},
    {lon: -60, lat: 55}
];
var sfba = [
    {lon: -122.3243053, lat: 37.5640288},
    {lon: -122.2657, lat: 37.7975}
];

var colorGradient = d3.scale.cubehelix()
        .range([d3.hsl(270, .75, .35), d3.hsl(70, 1.5, .8)]);
colorGradient.domain([0, 1]);
A.ext_color_domain = [0, 0.2, 0.4, 0.6, 0.8, 1];

function updateLegend() {
  var width = 960,
  height = 500;

  d3.selectAll('.legend').remove();
  //var legend_labels = ["< 50", "50+", "150+", "350+", "750+", "> 1500"];
  var legend_labels = A.ext_color_domain;

  var legendContainer = d3.select('body')
    .append('div')
    .attr('id','legend')
    .attr('class','ui top left')
    //.attr('style','ui top left')
      .append('svg')
      .attr('id','legend-svg')
    ;


  //legend.selectAll("g.legend")
  var legend = d3.select('svg')
  //var legend = d3.select('#legend-svg')
  .selectAll("g.legend")
  .data(A.ext_color_domain)
  .enter()
  .append("g")
  .attr("class", "legend");

  var ls_w = 20, ls_h = 20;

  legend.append("rect")
  .attr("x", 20)
  .attr("y", function(d, i){ return height - (i*ls_h) - 2*ls_h;})
  .attr("width", ls_w)
  .attr("height", ls_h)
  .style("fill", function(d, i) { return colorGradient(d); })
  .style("opacity", 0.8);

  legend.append("text")
  .attr("class", "legend-text")
  .attr("x", 50)
  .attr("y", function(d, i){ return height - (i*ls_h) - ls_h - 4;})
  .text(function(d, i){ return legend_labels[i]; });

  legend.append("div")
    .append('label')
    //.attr('for',function(d,i){ return 'a'+i; })
    .text("Scale by visible data")
      .append("input")
      .attr("checked", true)
      .attr("type", "checkbox")
      .attr("id", function(d,i) { return 'a'+i; })
      .attr("onClick", "change(this)")
    ;


}

//A.forecast.push( {"lat":"38.00000000","lon":"-122.00000000","hourly":[{"time":1477119600,"clouds":0.05,"precip":0,"wind":3.21,"tempF":59.91,"vis":9.81}]});

// Convert data to geojson
A.gjRectangles = {
  "type": "FeatureCollection",
  "features": []
};

var gridX = 0.015625;
var gridY = 0.015625;
var hg = gridX / 2; // "half grid"


document.addEventListener("DOMContentLoaded", function(event) {
  init();
});

function init() {
  initBaseMap();
  initOverlayMap("clouds","hourly");
  initUI();
}

function findMaxMin() {
  // Go thr all location, all hours, for each varname
  A.forecast.forEach(function(loc){
    loc.hourly.forEach(function(hr){
      A.selectItems.forEach(function(v){
        v.allVals.push(hr[v.varname]);
      });
    });
  });

  A.selectItems.forEach(function(v){
    v.max = _.max(v.allVals);
    v.min = _.min(v.allVals);
    console.log(v.varname, v.min, v.max);
  });

}

function initUI() {

  findMaxMin();

  d3.select('body')
    .append('div')
    .attr('class','ui top right')
      .append('select')
      .attr('id','selectItems')
      //.attr('class','top right')
      .append('optgroup')
      .selectAll('option')
      .data(A.selectItems)
      .enter()
      .append('option')
        .attr('value', function(d) {
          return d.varname;
        })
        .html(function(d) {
          return d.display;
        });


  d3.select('#selectItems')
      .on('change', function(v){
        //formatHash();
        var min, max;
        //A.wvar = d3.select(this).property('value');
        A.wvar = d3.select('#selectItems').property('value');
        A.selectItems.forEach(function(v){
          if (v.varname === A.wvar) {
            min = v.min;
            max = v.max;
          }
        });

        A.ext_color_domain = [];
        var minMaxRange = max - min;
        for (var i = 0; i < 6; i++) {
          A.ext_color_domain.push(d3.round(min + i * minMaxRange/6, 1));
        }

        colorGradient.domain([min, max]);
        refreshMap(A.wvar,"hourly");
        updateLegend();
      });

  d3.select('body')
    .append('div')
    .attr('class','ui top left')
      .append('button')
      .attr('id','animate')
      .text("Play")
      .on('click', animate)
      ;

  d3.select('body')
    .append('div')
    .attr('class','ui bottom left')
      .append('div')
      .attr('id','date')
      .text("Date")
      ;


}


function initBaseMap() {
  //A.gjPoints = data;
  //A.gjRectangles = pointGridToRectangles(data);
  //console.log(A.gjPoints.features);

  A.labelData = [];

  var intr = mapsense.interact();
  var arro = mapsense.arrow();


  map = mapsense.map('#myMap') // init the map
    .extent(sfba) // zoom to bounds, regardless of window size
    .tileSize({x:256,y:256})
    /*.add(
        mapsense.basemap().apiKey(my_key).style("parchment")
    )*/
    ;

  map.add(mapsense.hash());

  d3.select('.mapsense-attribution').html("");

  map.interact(false);
  map.add(mapsense.drag());
  map.add(mapsense.wheel());
  map.add(mapsense.dblclick());
  map.add(mapsense.touch());
  mapsense.compass().map(map); //enable shift zoom

  var max_extents = [
      {lon: 180, lat: 90}, // opposites, because we'll expand out
      {lon: -180, lat: -90}
  ];

  satellite_url = "http://{S}.mqcdn.com/tiles/1.0.0/sat/{Z}/{X}/{Y}.jpg"; // Credit http://developer.mapquest.com/web/products/open/map

  var basemap_url = "http://{S}.basemaps.cartocdn.com/light_all/{Z}/{X}/{Y}.png";
  var basemap_url = "http://{S}.basemaps.cartocdn.com/light_nolabels/{Z}/{X}/{Y}.png";

  imagery_layer = mapsense.image()
      .url(mapsense.url(basemap_url)
      .hosts(["a", "b", "c", "d"]));

  labels_url = "http://stamen-tiles-{S}.a.ssl.fastly.net/toner-labels/{Z}/{X}/{Y}.png";
  labels_url = "http://{S}.basemaps.cartocdn.com/light_only_labels/{Z}/{X}/{Y}.png";

  labels_layer = mapsense.image()
      .url(mapsense.url(labels_url)
      .hosts(["a", "b", "c", "d"]))
      ;

  map.add(imagery_layer.visible(true).id("imagery_layer"));
  map.add(labels_layer.visible(true).id("labels_layer"));
  d3.select("#labels_layer").attr("style","opacity: 0.5;");

}

function initOverlayMap(wvar, tvar) {
  updateLegend();

  // Todo - make gj on server
  A.forecast.forEach(function(v){
    //console.log(v);
    if (v.hourly && v.hourly[0] && v.hourly[0].clouds) {
      var props = v;
      props.sun = 1 - v.hourly[0].clouds;
      A.gjRectangles.features.push( returnGJRectangle(+v.lon - hg, +v.lat - hg, +v.lon + hg, +v.lat + hg, props) );
    }
  });

  A.gjLayer = mapsense.geoJson()
      .features(A.gjRectangles.features)
      .selection(function(d){
          d.attr("class", "point_highlight")
          .attr("id", function(d,i){
            var txt_data = {
              "id": "id-" + i,
              "data": d
            };
            A.labelData.push(txt_data);
            return "id-" + i;
          })
          //.attr("r", "7")
          .attr("opacity", 0.5)
          .attr("fill", function(d){
            console.log(d.properties[wvar], d.properties.hourly[0][wvar]);
            return colorGradient(d.properties.hourly[0][wvar]);
          });
      })
      //.on("load", load)
      ;
  map.add(A.gjLayer);

}

function refreshMap(wvar, tvar) {
  d3.selectAll('.point_highlight')
    .attr("fill", function(d){
      if (d.properties.hourly[A.IDX]) {
        return colorGradient(d.properties.hourly[A.IDX][A.wvar]);
      }
    });
}

function formatTime(epoch) {
  var date = A.formatDate(A.mapEpoch*1000);
  var day = A.formatDay(A.mapEpoch*1000);
  var hr = parseInt(A.formatHour(A.mapEpoch*1000), 10);
  var ampm = A.formatAMPM(A.mapEpoch*1000);
  var timeText = [day,date,hr,ampm].join(" ");
  return timeText;
}

function animate() {
  var text = d3.select('#animate').text();
  if (text === "Stop") {
    clearInterval(A.si);
    d3.select('#animate').text("Play");
  } else {
    d3.select('#animate').text("Stop");

    A.si = window.setInterval(function() {
      // for each feature, update the mapped value
      // must've bound all hourly data to the svg element onload,
      // then just change the fill to the new function

      d3.selectAll('.point_highlight')
        .attr("fill", function(d){
          console.log(A.IDX, d.properties);
          if (d.properties.hourly[A.IDX]) {
            A.mapEpoch = d.properties.hourly[A.IDX].time;
            var timeText = formatTime(A.mapEpoch);
            d3.select('#date').text( timeText );
            return colorGradient(d.properties.hourly[A.IDX][A.wvar]);
          }
        });
      //A.IDX++;

      //A.forecast.push( {"lat":"38.00000000","lon":"-122.00000000","hourly":[{"time":1477119600,"clouds":0.05,"precip":0,"wind":3.21,"tempF":59.91,"vis":9.81}]});

      //A.gjRectangles.features[0].properties.hourly[0];

      /*A.gjRectangles.features.forEach(function(v,i){
        console.log(A.IDX, v.properties.sun, v.properties.hourly[A.IDX].clouds);

        v.properties.sun = v.properties.hourly[A.IDX].clouds;
      });*/


      A.IDX = (A.IDX >= A.gjRectangles.features[0].properties.hourly.length - 1) ? 0 : A.IDX + 1;
    }, 1000);
  }
}


function processData(gj) {

  gj.features.forEach(function(v,i){

    //console.log(v.properties.name);
    console.log(v.geometry.coordinates);
    var latLonTime = [v.geometry.coordinates[1], v.geometry.coordinates[0], A.nowTime];

    var url = "assets/proxy.php?url=" + encodeURIComponent( "https://api.forecast.io/forecast/" + APIKEY + "/" + latLonTime.join(",") );
    d3.json(url, function(err, data){
      console.log(err);
      console.log(data.currently.cloudCover);
      gj.features[i].properties.data = data.currently.cloudCover;
    });

    sun = 1 - gj.features[i].properties.data;
    sun = Math.round(sun * 100) / 100
    gj.features[i].properties.data = sun;
    gj.features[i].properties["color"] = colorGradient(sun);
  });

}


function zoomBounds(e) {
    /*map.extent(bounds(e.features)).zoomBy(-.1);*/
    map.extent(bounds(e.features)).zoom(14);
}

function ll2json(lat,lon,name){
    var gj = {type: "FeatureCollection", features: []}; //init a geojson object

    var feature = {
        type: "Feature",
        geometry: {type: "Point", "coordinates": [ +lon, +lat ]},
        properties: {
            name: name
        }
    };

    gj.features.push(feature);

    return gj;
}

function llll2km(lat1,lon1,lat2,lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);  // deg2rad below
  var dLon = deg2rad(lon2-lon1);
  var a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ;
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  var d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

function copyJSON(json) {
  return JSON.parse(JSON.stringify(json));
}

function returnGJRectangle(west, south, east, north, props) {
  var properties = props || {};

  var polygonFeature = {
    "type": "Feature",
    "properties": properties,
    "geometry": {
      "type": "Polygon",
      "coordinates": [
          []
      ]
    }
  };

  var coordArr = polygonFeature.geometry.coordinates[0];
  coordArr.push([west, south]);
  coordArr.push([west, north]);
  coordArr.push([east, north]);
  coordArr.push([east, south]);
  coordArr.push([west, south]);

  return polygonFeature;
}

function returnGJPoint(lon, lat, props) {
  var properties = props || {};

  var feature = {
    "type": "Feature",
    "properties": properties,
    "geometry": {
      "type": "Point",
      "coordinates": [lon, lat]
    }
  };

  return feature;
}


A.formatTime = d3.timeFormat("%B %d, %Y ");
A.formatTime = d3.timeFormat("%x %X");
A.formatDate = d3.timeFormat("%x");
A.formatDay = d3.timeFormat("%a");
A.formatHour = d3.timeFormat("%I");
A.formatAMPM = d3.timeFormat("%p");
//formatTime(new Date); // "June 30, 2015"
