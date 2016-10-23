/*e.g.
var myGeoJSON = returnGrid('-177 51 -130 72', 0.03125); // HI
var myGeoJSON = returnGrid('-177 51 -130 72', 1); // AK
var myGeoJSON = returnPointGrid('-122.5 37.5 -122.0 38.0', 1/32); // SFBA

document.querySelector('body').innerHTML = JSON.stringify(myGeoJSON);

var boundsString = '-179 18 -154 29';
var gridSize = 1;
*/

var GJ_FC_template = {
  "type": "FeatureCollection",
  "features": []
};

function returnGrid(boundsString, gridX, gridY) {
  gridX = parseFloat(gridX);
  gridY = parseFloat(gridY) || gridX;

  var bounds = boundsString.split(' ').map(function(item, index) {
    return parseFloat(item);
  });

  var polygonGrid = {
    "type": "FeatureCollection",
    "features": []
  };

  var swLon, swLat;

  for (swLon = bounds[0]; swLon <= bounds[2]; swLon += gridX) {
    for (swLat = bounds[1]; swLat <= bounds[3]; swLat += gridY) {
      polygonGrid.features.push(returnGJRectangle(swLon, swLat, swLon + gridX, swLat + gridY));
    }
  }

  return polygonGrid;
}

function returnPointGrid(boundsString, gridX, gridY) {
  gridX = parseFloat(gridX);
  gridY = parseFloat(gridY) || gridX;

  var bounds = boundsString.split(' ').map(function(item, index) {
    return parseFloat(item);
  });

  var grid = {
    "type": "FeatureCollection",
    "features": []
  };

  var swLon, swLat;

  for (swLon = bounds[0]; swLon <= bounds[2]; swLon += gridX) {
    for (swLat = bounds[1]; swLat <= bounds[3]; swLat += gridY) {
      grid.features.push(returnGJPoint(swLon, swLat));
    }
  }

  return grid;
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

function pointGridToRectangles(gjPtCollection) {
  //gjPtCollection = A.gjPoints;
  var gjRectangleCollection = copyJSON(GJ_FC_template);

  var xDist = Math.abs(gjPtCollection.features[0].geometry.coordinates[0] - gjPtCollection.features[1].geometry.coordinates[0]);
  var yDist = Math.abs(gjPtCollection.features[0].geometry.coordinates[1] - gjPtCollection.features[1].geometry.coordinates[1]);
  var gridDist = xDist || yDist;
  gridDist = gridDist / 2;

  var centerLat, centerLon, west, south, east, north, props;

  gjPtCollection.features.forEach(function(v,i){
    centerLat = v.geometry.coordinates[1];
    centerLon = v.geometry.coordinates[0];
    west = centerLon - gridDist;
    east = centerLon + gridDist;
    south = centerLat - gridDist;
    north = centerLat + gridDist;
    props = v.properties;
    v = returnGJRectangle(west, south, east, north, props);
    //console.log(v.geometry);
    gjRectangleCollection.features.push(v);
  });

  return gjRectangleCollection;
}

function rectangleGridToPoints(gjRectangleCollection) {

}


























