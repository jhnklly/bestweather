<?php

require('../vendor/autoload.php');

$app = new Silex\Application();
$app['debug'] = true;

/*
JMK from https://devcenter.heroku.com/articles/getting-started-with-php#provision-a-database

heroku pg:psql
create table test_table (id integer, name text);
CREATE TABLE forecasts (
  --id INTEGER AUTO_INCREMENT PRIMARY KEY,
  id SERIAL,
  forecast_date TIMESTAMP,
  forecast_json TEXT
)
;

*/

$dbopts = parse_url(getenv('DATABASE_URL'));
$app->register(new Herrera\Pdo\PdoServiceProvider(),
               array(
                   'pdo.dsn' => 'pgsql:dbname='.ltrim($dbopts["path"],'/').';host='.$dbopts["host"] . ';port=' . $dbopts["port"],
                   'pdo.username' => $dbopts["user"],
                   'pdo.password' => $dbopts["pass"]
               )
);

// Register the monolog logging service
$app->register(new Silex\Provider\MonologServiceProvider(), array(
  'monolog.logfile' => 'php://stderr',
));

// Register view rendering
$app->register(new Silex\Provider\TwigServiceProvider(), array(
    'twig.path' => __DIR__.'/views',
));

// Our web handlers

$app->get('/', function() use($app) {
  $app['monolog']->addDebug('logging output.');
  return $app['twig']->render('index.twig');
});


// JMK
/*
$app->get('/db/', function() use($app) {
  $st = $app['pdo']->prepare('SELECT name FROM test_table');
  $st->execute();

  $names = array();
  while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
    $app['monolog']->addDebug('Row ' . $row['name']);
    $names[] = $row;
  }

  return $app['twig']->render('database.twig', array(
    'names' => $names
  ));
});
*/

// JMK2
$app->get('/db/', function() use($app) {

  date_default_timezone_set('America/Los_Angeles');
  $date = date('Y-m-d', time());
  $epochSeconds = time();
  $APIKEY = "86f515c3f0103714bc87cfc7910bcdc5";
  $latLonTime = [38,-121,1476985813];

  //$url = "proxy.php?url=" . encodeURIComponent( "https://api.forecast.io/forecast/" . $APIKEY . "/" . $latLonTime.join(",") );
  $url = "https://api.forecast.io/forecast/86f515c3f0103714bc87cfc7910bcdc5/38,-121,$epochSeconds";
  /*
    nowTime = Math.floor((new Date()).getTime() / 1000); // 1476985813
    https://api.forecast.io/forecast/86f515c3f0103714bc87cfc7910bcdc5/38,-121,1476985813
  */


  $st = $app['pdo']->prepare('SELECT forecast_json FROM forecasts WHERE forecast_date = ?');
  $st->execute(array($date));
  $row = $st->fetch(PDO::FETCH_ASSOC);

  if (! $row  && 1==2) {
      // Get all the points of interest
      //$json_string = file_get_contents("data/sfba_land_pts_64.geojson");

      $url = "https://raw.githubusercontent.com/jhnklly/bestweather/master/web/data/sfba_land_pts_64.geojson";
      $ch = curl_init($url);
      $pageurl=strtok($url,'?');
      error_log("pageurl: $pageurl"); // https://api.forecast.io/forecast/86f515c3f0103714bc87cfc7910bcdc5/38,-121,1476985813
      $querystring=strtok('?');
      error_log("querystring: $querystring"); // null
      $ch_encoded=curl_escape($ch, $querystring);
      curl_setopt($ch, CURLOPT_URL, $pageurl.'?'.$ch_encoded);
      curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
      $json_string = curl_exec($ch);

      /*
      How to create arrays:
      $myArr = array("key1" => 20, "otherKey" => 10);
      $myArr['key1'] = "one";
      $myArr['otherKey'] = "two";
      $myArr['forecast_json'] = "cast";
      */

      $rowe = array();
      //$rowe[] = array('forecast_json' => $json_string);

      $names = array();
      $names[] = $rowe;

      $json_obj = json_decode($json_string, true);
      //var_dump($json_obj);
      $features = $json_obj["features"];
      //var_dump($features[0]);


      //$names = array();
      foreach ($features as $i => $item) {
          // For every point, get the forecast
          usleep(0.1 * 1000 * 1000); // microseconds; 923 points = 92 seconds

          //$rowe[] = array('forecast_json' => $item['geometry']['coordinates'][0]);
          $lat = $item['geometry']['coordinates'][1];
          $lon = $item['geometry']['coordinates'][0];
          /*
          return $app['twig']->render('database.twig', array(
            'names' => $rowe
          ));*/

          $url = "https://api.forecast.io/forecast/86f515c3f0103714bc87cfc7910bcdc5/$lat,$lon,$epochSeconds";

          $ch = curl_init($url);
          $pageurl=strtok($url,'?');
          error_log("pageurl: $pageurl"); // https://api.forecast.io/forecast/86f515c3f0103714bc87cfc7910bcdc5/38,-121,1476985813
          $querystring=strtok('?');
          error_log("querystring: $querystring"); // null
          $ch_encoded=curl_escape($ch, $querystring);
          curl_setopt($ch, CURLOPT_URL, $pageurl.'?'.$ch_encoded);
          curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
          $result = curl_exec($ch);

          $forecast_json = $result;
          error_log("result: $i"); // {"latitude":38,"longitude":-121,"timezone":"America/Los_Angeles","offset":-7,"currently":{"time":1476985813,"summary":"Clear","icon":"clear-day","precipIntensity":0,"precipProbabil...
        /*
          // Don't convert json to object; leave json as string for db insert.
          $forecast_json = json_decode($result);
          error_log("forecast_json...");
          error_log($forecast_json);
        */
          //echo $result->access_token;
        /*
          Only do this if doesn't yet exist for today:
        */
          $st = $app['pdo']->prepare('INSERT INTO forecasts(forecast_date, epochseconds, lat, lon, forecast_json) VALUES(?, ?, ?, ?, ?)');
          $st->execute(array($date, $epochSeconds, $lat, $lon, $forecast_json));
          //$st = $app['pdo']->prepare('SELECT name FROM test_table');
          //$st->execute();
      }
      // return;
  }
  // End db inserts

  $st = $app['pdo']->prepare('SELECT lat, lon, forecast_date, forecast_json FROM forecasts WHERE forecast_date = ? LIMIT 1');
  $st->execute(array($date));

  /*
    $names = array();
    while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
      $app['monolog']->addDebug('Row ' . $row['name']);
      $names[] = $row;
    }
  */


  $rows = array();
  while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
    // One row for each lat-lon
    // $app['monolog']->addDebug('Row ' . $row['forecast_json'] . ' | ' );
    $fcast = json_decode($row['forecast_json'], true);
    $lat = $row['lat'];
    $lon = $row['lon'];

    //$app['monolog']->addDebug('Row ' . $fcast . ' | ' );

    $hourlyData = $fcast["hourly"]["data"];
    $hrDat = [];

    foreach ($hourlyData as $i => $dat) {
      $hrDat[] = array(
        "time" => $dat["time"],
        "clouds" => $dat["cloudCover"],
        "precip" => $dat["precipProbability"],
        "wind" => $dat["windSpeed"],
        "tempF" => $dat["temperature"],
        "vis" => $dat["visibility"]
      );
    }

    //echo "\n hrdat: ";
    //var_dump($hrDat);
    //$app['monolog']->addDebug('Row ' . $hrDat . ' | ' );

    $forecastObj = array(
      "lat" => $row['lat'],
      "lon" => $row['lon'],
      "hourly" => $hrDat
    );

    //$forecastString = json_encode($forecastObj, JSON_HEX_QUOT) ;
    //$forecastString = htmlspecialchars_decode(json_encode($forecastObj, JSON_HEX_QUOT)) ;
    $forecastString = json_encode($forecastObj, JSON_HEX_QUOT);

    $js = $forecastString;
    //$js = $forecastObj;
    //echo $js;
    // A.forecast.push( {{ n.js }} );


    $rows[] = array("js" => $js);
    //$rows[] = $row;
  }

  /*
  Pass all the data ()
  to the view
  */
  return $app['twig']->render('database.twig', array(
    'rows' => $rows
  ));
});

$app->run();


function encodeURIComponent($str) {
    $revert = array('%21'=>'!', '%2A'=>'*', '%27'=>"'", '%28'=>'(', '%29'=>')');
    return strtr(rawurlencode($str), $revert);
}

