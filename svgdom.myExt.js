svgdom.extendPrototype((function() {
  function newGenericLine(pathElements, options) {
    var config = this.mixin({}, newGenericLine.defaults, options);
    var arrowsOptions = config && config.arrows;
        arrowAtStart = arrowsOptions && arrowsOptions.start,
        arrowAtEnd = arrowsOptions && arrowsOptions.end,
        ret = path = this.newPath().setAttr({
          "class": "genericLine",
          d: this.formatPath(pathElements),
          id: "line1",
          stroke: "black",
          fill: "none"
        });

    if (arrowAtStart || arrowAtEnd) {
      ret = this.newG();
      ret.append(path);
      if (arrowAtStart) {
        var t0 = path.getTangentToPathAt(0);
        ret.append(this.newArrow(t0.x, t0.y, t0.angle + 180, arrowAtStart));
      }

      if (arrowAtEnd) {
        var t1 = path.getTangentToPathAt(1);
        ret.append(this.newArrow(t1.x, t1.y, t1.angle, arrowAtEnd));
      }
    }
    return ret;
  }
  newGenericLine.defaults = {};

  function newArrow(x, y, angle, options) {
    var config = this.mixin({}, newArrow.defaults, options);
    var w = config.arrowLength;
    var h = w * Math.tan(this.deg2rad(config.arrowAngle / 2));
    return this.newPath().setAttr({
      "class": "arrow",
      d: this.formatPath([
        ["M", 0, 0],
        ["l", -w, h, 0, -h * 2],
        ["z"]
      ]),
      transform: this.rotateThenTranslateTransform(x, y, angle)
    });
  }
  newArrow.defaults = {
    arrowAngle: 45,
    arrowLength: 10
  };

  return {
    newGenericLine: newGenericLine,
    newArrow: newArrow
  };
})());
