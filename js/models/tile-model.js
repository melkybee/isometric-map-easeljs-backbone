var TileModel = Backbone.Model.extend({
  defaults: {
    column : 0,
    row : 0,
    x : 0,
    y : 0,
    walkable : true,
    spriteSheet : null
  }
});