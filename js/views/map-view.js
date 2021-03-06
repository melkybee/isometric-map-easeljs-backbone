var MapView = Backbone.View.extend({

  el : $('#main'),
  stage : null,
  player : null,
  playerModel : null,
  mapData : null,
  gameCanvas : null,
  tileMap : null,
  grid : null,
  finder : null,
  path : null,
  enemy : null,
  enemyModel : null,

  initialize : function(){
    this.render();

    this.grid = new PF.Grid(7,7);
    this.grid.setWalkableAt(2,3,false);
    this.grid.setWalkableAt(4,2,false);
    this.grid.setWalkableAt(4,3,false);
    this.finder = new PF.AStarFinder();
  },

  /**
   * Render
   */
  render : function() {
    this.gameCanvas = document.getElementById('gameCanvas');
    this.loadSpriteSheet();
  },

  /**
   * Load sprite sheet
   */
  loadSpriteSheet : function() {
    var img = new Image(),
        context = this;

    this.stage = new createjs.Stage(context.gameCanvas);
    img.src = 'img/tiles.png';
    $(img).load(function() {
      context.loadMapData(context, img);
    });
  },

  /**
   * Load map data
   */
  loadMapData : function(context, img) {
    $.getJSON('data/map.json', function(data) {
      context.mapData = data['main'];
      context.createSpriteSheet(context, img, context.mapData);
    });
  },

  /**
   * Create sprite sheet
   */
  createSpriteSheet : function(context, img, data) {
    // create spritesheet and assign the associated data.
    var spriteSheet = new createjs.SpriteSheet({
        //image to use
        images: [img],
        //width, height & registration point of each sprite
        frames: { width: 130, height: 130, regX: 65, regY: 32.5 }
    });
    this.createTileMap(context, spriteSheet, 65, 32.5, 65, 32.5, data);
  },

  /**
   * Create tile map
   */
  createTileMap : function(context, spriteSheet, x, y, regX, regY, data) {
    var tile,
        sprite,
        i,
        j;

    context.tileMap = [];
    //console.log('createTileMap');
    for (i = 0; i < 7; i++) {
      context.tileMap[i] = [];
      for (j = 0; j < 7; j++) {
        sprite = new createjs.Sprite(spriteSheet);
        sprite.x = (j-i) * x + 540;  // ~ gridWidth/2
        sprite.y = (i+j) * y + 220;  // ~ gridHeight/2
        sprite.regX = regX;
        sprite.regY = regY;
        sprite.row = i;  // add row property
        sprite.column = j;  // add column property
        sprite.gotoAndStop(data[i][j]);

        //console.log('currentFrame = ' + sprite.currentFrame);
        //console.log('x = ' + sprite.x + ' , y = ' + sprite.y + ' , regX = ' + regX + ' , regY = ' + regY);

        tile = new TileModel({column:i, row:j, x:sprite.x, y:sprite.y, spriteSheet:sprite});
        context.tileMap[i][j] = tile;

        context.stage.addChild(sprite);

        sprite.on('click', function(event) {
          if (Main.gameMode === 'MODE_MAP') {
            //console.log('new = ' + event.target.row + ' , ' + event.target.column);
            //console.log(context.playerModel.get('row') + ' , ' + context.playerModel.get('column'));
            context.path = context.createPath(context, context.playerModel.get('row'), context.playerModel.get('column'), event.target.row, event.target.column, context.grid);
          }
        });
      }
    }
    //console.log('tileMap = ' + context.tileMap);
    context.loadPlayer(context);
  },

  createPath : function(context, playerRow, playerColumn, destinationRow, destinationColumn, grid) {
    //console.log('createPath: ' + playerRow + ' , ' + playerColumn + ' / ' + destinationRow + ' , ' + destinationColumn + ' / ' + grid);
    //console.log('finder = ' + context.finder);
    var gridClone = grid.clone(),
        path = context.finder.findPath(playerRow, playerColumn, destinationRow, destinationColumn, gridClone);
    //console.log('path = ' + path);
    //console.log('path[0] = ' + path[0]);
    context.movePlayerToTile(context, path[0]);

    return path;
  },

  movePlayerToTile : function(context, array) {
    var row, column;

    if (!array) { return; }

    row = array[0];
    column = array[1];
    //console.log('array = ' + array);
    //console.log(context.tileMap[row][column]);
    context.playerModel.set('destRow', row);
    context.playerModel.set('destColumn', column);
    context.playerModel.set('destX', context.tileMap[row][column].get('x'));
    context.playerModel.set('destY', context.tileMap[row][column].get('y'));

    //console.log('dest x,y = ' + context.playerModel.get('destX') + ' , ' + context.playerModel.get('destY'));
    //console.log('x,y = ' + context.playerModel.get('x') + ' , ' + context.playerModel.get('y'));
    //console.log('row , column        = ' + context.playerModel.get('row') + ' , ' + context.playerModel.get('column'));
    //console.log('dest - row , column = ' + context.playerModel.get('destRow') + ' , ' + context.playerModel.get('destColumn'));

    context.model.set('movePlayer', true);
  },

  /**
   * Load player
   */
  loadPlayer : function(context) {
    var img = new Image(),
        originTile = context.tileMap[0][0];

    img.src = 'img/player.png';
    $(img).load(function() {
      // create spritesheet and assign the associated data.
      var spriteSheet = new createjs.SpriteSheet({
          //image to use
          images: [img],
          //width, height & registration point of each sprite
          frames: { width: 102, height: 195, regX: 32.5, regY: 16.25 }
      });

      context.player = new createjs.Sprite(spriteSheet);
      context.player.x = originTile.get('x');
      context.player.y = originTile.get('y');

      context.playerModel = new PlayerModel({x:context.player.x, y:context.player.y, row: originTile.get('row'), column: originTile.get('column') });
      context.player.regX = 75;
      context.player.regY = 200;
      context.player.gotoAndStop(0);
      context.stage.addChild(context.player);

      context.stage.update();

      context.loadEnemy(context);
    });
  },

  /**
   * Move player
   */
  movePlayer : function(context) {
    //console.log('move player');
    var playerX = context.player.x,
        playerY = context.player.y,
        destX = context.playerModel.get('destX'),
        destY = context.playerModel.get('destY'),
        row = context.playerModel.get('row'),
        column = context.playerModel.get('column'),
        destRow = context.playerModel.get('destRow'),
        destColumn = context.playerModel.get('destColumn'),
        removedElement;

    //console.log('player x = ' + playerX + ' , player y = ' + playerY + ' , dest y = ' + destX + ' , dest y = ' + destY);

    if (playerX < destX) {
      context.player.x += 5;
    } else if (playerX > destX) {
      context.player.x -= 5;
    } else {
      context.player.x = destX;
    }
    if (playerY < destY) {
      context.player.y += 2.5;
    } else if (playerY > destY) {
      context.player.y -= 2.5;
    } else {
      context.player.y = destY;
    }

    if ( row < destRow && column === destColumn ) {
      context.player.gotoAndStop(0);
    } else if ( row > destRow && column === destColumn ) {
      context.player.gotoAndStop(2);
    } else if ( row === destRow && column < destColumn ) {
      context.player.gotoAndStop(3);
    } else if ( row === destRow && column > destColumn ) {
      context.player.gotoAndStop(1);
    }

    if ( (playerX === destX) && (playerY === destY) ) {
      //console.log('splice');
      context.model.set('movePlayer', false);
      context.playerModel.set('row', destRow);
      context.playerModel.set('column', destColumn);
      context.playerModel.set('x', destX);
      context.playerModel.set('y', destY);
      if (context.path.length > 0) {
        context.path.splice(0,1);
        //console.log('after removal = ' + context.path);
        if (context.path.length > 0) {
          // depth sorting
          if (context.player.y > context.enemy.y) {
            if (context.stage.getChildIndex(context.player) < context.stage.getChildIndex(context.enemy)) {
              context.stage.swapChildren(context.player, context.enemy);
            }
          } else if (context.player.y < context.enemy.y) {
            if (context.stage.getChildIndex(context.player) > context.stage.getChildIndex(context.enemy)) {
              context.stage.swapChildren(context.player, context.enemy);
            }
          }
          // move player to tile
          context.movePlayerToTile(context, context.path[0]);
        } else {
          context.model.set('movePlayer', false);

          if ( (context.playerModel.get('destRow') === context.enemyModel.get('row')) && (context.playerModel.get('destColumn') === context.enemyModel.get('column')) ) {
            context.trigger('EVENT_MAP_REACHED_ENEMY');
          }
        }
      } else {
        context.model.set('movePlayer', false);

        if ( (context.playerModel.get('destRow') === context.enemyModel.get('row')) && (context.playerModel.get('destColumn') === context.enemyModel.get('column')) ) {
          context.trigger('EVENT_MAP_REACHED_ENEMY');
        }
      }
    }

    context.stage.update();
  },

  /**
   * Load enemy
   */
  loadEnemy : function(context) {
    var img = new Image(),
        originTile = context.tileMap[3][3];

    img.src = 'img/enemy.png';
    $(img).load(function() {
      // create spritesheet and assign the associated data.
      var spriteSheet = new createjs.SpriteSheet({
          //image to use
          images: [img],
          //width, height & registration point of each sprite
          frames: { width: 133, height: 89, regX: 66, regY: 45 }
      });

      context.enemy = new createjs.Sprite(spriteSheet);
      context.enemy.x = originTile.get('x');
      context.enemy.y = originTile.get('y');

      context.enemyModel = new EnemyModel({x:context.enemy.x, y:context.enemy.y, row: originTile.get('row'), column: originTile.get('column') });
      context.enemy.regX = 45;
      context.enemy.regY = 45;
      context.enemy.currentFrame = 0;
      context.stage.addChild(context.enemy);

      context.stage.update();

      Main.init();
      context.trigger('EVENT_MAP_LOADED');
    });
  }

});
