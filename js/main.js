var Main = (function($){

  var mapModel = new MapModel(),
      mapView = new MapView( { model: mapModel } ),
      gameMode = 'MODE_MAP';

  var init = function() {
    console.log('init');
    mapView.on('EVENT_MAP_LOADED', Main.onLoaded);
    mapView.on('EVENT_MAP_REACHED_ENEMY', Main.onReachedEnemy);
  };

  var onLoaded = function() {
    console.log('on loaded');
    Main.ticker();
  };

  var onReachedEnemy = function() {
    alert('BAAAAAHTTLE MODE!');
    Main.gameMode = 'MODE_BATTLE';
  };

  var ticker = function() {
    createjs.Ticker.setFPS(40);
    createjs.Ticker.useRAF = true;
    createjs.Ticker.addListener(Main);  // look for "tick" function in Main
  };

  var tick = function(dt, paused) {
    switch(gameMode) {
      case 'MODE_MAP':
        if (mapModel.get('movePlayer') === true) {
          mapView.movePlayer(mapView);
        }
        break;
      case 'MODE_BATTLE':
        break;
    }
    mapView.stage.update();
  };

  return {
    gameMode : gameMode,
    init : init,
    onLoaded : onLoaded,
    onReachedEnemy : onReachedEnemy,
    ticker : ticker,
    tick : tick
  };

})(jQuery);
