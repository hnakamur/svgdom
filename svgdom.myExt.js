svgdom.myExt = (function(M) {

  function GenericLine(pathElements, options) {
    var config = M.mixin({}, GenericLine.defaults, options);
    var arrowsOptions = config && config.arrows;
        arrowAtStart = arrowsOptions && arrowsOptions.start,
        arrowAtEnd = arrowsOptions && arrowsOptions.end,
        ret = path = M.Path().setAttr({
          "class": "genericLine",
          d: M.formatPath(pathElements),
          id: "line1",
          stroke: "black",
          fill: "none"
        });

    if (arrowAtStart || arrowAtEnd) {
      ret = M.G();
      ret.append(path);
      if (arrowAtStart) {
        var t0 = path.getTangentToPathAt(0);
        ret.append(Arrow(t0.x, t0.y, t0.angle + 180, arrowAtStart));
      }

      if (arrowAtEnd) {
        var t1 = path.getTangentToPathAt(1);
        ret.append(Arrow(t1.x, t1.y, t1.angle, arrowAtEnd));
      }
    }
    return ret;
  }
  GenericLine.defaults = {
    tangentLenRatio: 1e-4
  };

  function Arrow(x, y, angle, options) {
    var config = M.mixin({}, Arrow.defaults, options);
    var w = config.arrowLength;
    var h = w * Math.tan(M.deg2rad(config.arrowAngle / 2));
    return M.Path().setAttr({
      "class": "arrow",
      d: M.formatPath([
        ["M", 0, 0],
        ["l", -w, h, 0, -h * 2],
        ["z"]
      ]),
      transform: M.rotateThenTranslateTransform(x, y, angle)
    });
  }
  Arrow.defaults = {
    arrowAngle: 45,
    arrowLength: 10
  };

  return {
    GenericLine: GenericLine,
    Arrow: Arrow
  };
})(svgdom);
