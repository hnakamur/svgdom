svgdom.extendPrototype((function() {
  function newGenericLine(pathElements, options) {
    var config = this.mixin({}, newGenericLine.defaults, options);
    var arrowsOptions = config && config.arrows;
        arrowAtStart = arrowsOptions && arrowsOptions.start,
        arrowAtEnd = arrowsOptions && arrowsOptions.end,
        ret = path = this.newPath().setAttr(this.mixin({
          "class": "genericLine",
          d: this.formatPath(pathElements),
          fill: "none"
        }, config));

    if (arrowAtStart || arrowAtEnd) {
      ret = this.newG();
      ret.append(path);
      if (path.getTangentToPathAt) {
        if (arrowAtStart) {
          var t0 = path.getTangentToPathAt(0);
          ret.append(this.newArrow(t0.x, t0.y, t0.angle + 180, arrowAtStart));
        }

        if (arrowAtEnd) {
          var t1 = path.getTangentToPathAt(1);
          ret.append(this.newArrow(t1.x, t1.y, t1.angle, arrowAtEnd));
        }
      }
      else {
        // This is temporary lousy implementation (especially for arc pathSeg)
        // and should be deleted when SVGPathElement.getTotalLength() and
        // SVGPathElement.getPointAtLength() are implemented in svgweb.
        function getControlPointsAbs(commands) {
          var pts = [],
              pt = {x: 0, y: 0};

          function nextPoint(relative, x, y) {
            if (relative) {
              pt.x += x;
              pt.y += y;
            }
            else {
              pt.x = x;
              pt.y = y;
            }
            pts.push({x: pt.x, y: pt.y});
          }

          for (var i = 0, n = commands.length; i < n; i++) {
            var command = commands[i],
                cmdChar = command[0],
                relative = (cmdChar === cmdChar.toLowerCase()),
                m = command.length,
                j = 1,
                paramCount = m - j,
                x, y;
            switch (cmdChar.toUpperCase()) {
            case "M":
            case "L":
            case "T":
              while (j < m) {
                x = command[j++];
                y = command[j++];
                nextPoint(relative, x, y);
              }
              break;
            case "S":
            case "Q":
              while (j < m) {
                x = command[j++];
                y = command[j++];
                nextPoint(relative, x, y);
                x = command[j++];
                y = command[j++];
                nextPoint(relative, x, y);
              }
              break;
            case "C":
              while (j < m) {
                x = command[j++];
                y = command[j++];
                nextPoint(relative, x, y);
                x = command[j++];
                y = command[j++];
                nextPoint(relative, x, y);
                x = command[j++];
                y = command[j++];
                nextPoint(relative, x, y);
              }
              break;
            case "H":
              while (j < m) {
                x = command[j++];
                nextPoint(relative, x, 0);
              }
              break;
            case "V":
              while (j < m) {
                y = command[j++];
                nextPoint(relative, 0, y);
              }
              break;
            case "Z":
              break;
            case "A":
              while (j < m) {
                j += 5;
                x = command[j++];
                y = command[j++];
                nextPoint(relative, x, y);
              }
              break;
            default:
              throw new Error("Unsupported path command. command=" + cmdChar);
            }
          }
          return pts;
        }

        var pts = getControlPointsAbs(pathElements);
        if (arrowAtStart) {
          var p0 = pts[0],
              p1 = pts[1],
              angle = this.rad2deg(Math.atan2(p0.y - p1.y, p0.x - p1.x));
          ret.append(this.newArrow(p0.x, p0.y, angle, arrowAtStart));
        }

        if (arrowAtEnd) {
          var n = pts.length,
              p0 = pts[n - 2],
              p1 = pts[n - 1],
              angle = this.rad2deg(Math.atan2(p1.y - p0.y, p1.x - p0.x));
          ret.append(this.newArrow(p1.x, p1.y, angle, arrowAtEnd));
        }
      }
    }
    return ret;
  }
  newGenericLine.defaults = {};

  function newArrow(x, y, angle, options) {
    var config = this.mixin({}, newArrow.defaults, options);
    var w = config.arrowLength;
    var h = w * Math.tan(this.deg2rad(config.arrowAngle / 2));
    return this.newPath().setAttr(this.mixin({
      "class": "arrow",
      d: this.formatPath([
        ["M", 0, 0],
        ["l", -w, h, 0, -h * 2],
        ["z"]
      ]),
      transform: this.rotateThenTranslateTransform(x, y, angle)
    }, config));
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
