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


// JMK2
$app->get('/dbupdate/', function() use($app) {

  date_default_timezone_set('America/Los_Angeles');
  $date = date('Y-m-d', time());
  $APIKEY = "86f515c3f0103714bc87cfc7910bcdc5";
  $latLonTime = [38,-121,1476985813];

  //$url = "proxy.php?url=" . encodeURIComponent( "https://api.forecast.io/forecast/" . $APIKEY . "/" . $latLonTime.join(",") );
  $url = encodeURIComponent("https://api.forecast.io/forecast/86f515c3f0103714bc87cfc7910bcdc5/38,-121,1476985813");
  /*
    nowTime = Math.floor((new Date()).getTime() / 1000); // 1476985813
    https://api.forecast.io/forecast/86f515c3f0103714bc87cfc7910bcdc5/38,-121,1476985813
  */

  error_log("test");
  error_log($url);

  $ch = curl_init();
  curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_URL, $url);
  $result = curl_exec($ch);
  curl_close($ch);

  $forecast_json = json_decode($result);
  error_log("$forecast_json");

  //echo $result->access_token;
/*
  Only do this if doesn't yet exist for today:
*/
  $st = $app['pdo']->prepare('INSERT INTO forecasts(forecast_date, forecast_json) VALUES(?, ?)');
  $st->execute(array($date, $forecast_json));
  //$st = $app['pdo']->prepare('SELECT name FROM test_table');
  //$st->execute();

  $st = $app['pdo']->prepare('SELECT forecast_json FROM forecasts');
  $st->execute();
/*
  $names = array();
  while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
    $app['monolog']->addDebug('Row ' . $row['name']);
    $names[] = $row;
  }
*/

  $names = array();
  while ($row = $st->fetch(PDO::FETCH_ASSOC)) {
    $app['monolog']->addDebug('Row ' . $row['forecast_json'] . ' | ' );
    $names[] = $row;
  }

  return $app['twig']->render('database.twig', array(
    'names' => $names
  ));
});

$app->run();


function encodeURIComponent($str) {
    $revert = array('%21'=>'!', '%2A'=>'*', '%27'=>"'", '%28'=>'(', '%29'=>')');
    return strtr(rawurlencode($str), $revert);
}

