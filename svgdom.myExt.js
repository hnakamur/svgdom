svgdom.mixin(svgdom.ElementWrapper.prototype, (function() {
  var mixin = svgdom.mixin,
      geom = svgdom.geom,
      rad2deg = geom.rad2deg,
      deg2rad = geom.deg2rad;

  function curve(pathCommands, attributes, options) {
    attributes = mixin({}, curve.defaultAttributes, attributes);
    options = mixin({}, curve.defaultOptions, options);
    var arrowsOptions = options.arrows;
        arrowAtStart = arrowsOptions && arrowsOptions.start,
        arrowAtEnd = arrowsOptions && arrowsOptions.end,
        parentElem = arrowAtStart || arrowAtEnd ?
            this.g({'class': attributes['class']}) : this,
        path = parentElem.path(pathCommands, attributes);

    if (arrowAtStart || arrowAtEnd) {
      var pts = this.curve.getControlPointsAbs(pathCommands);
      if (arrowAtStart) {
        var p0 = pts[0],
            p1 = pts[1],
            angle = rad2deg(Math.atan2(p0.y - p1.y, p0.x - p1.x));
        parentElem.arrow(p0.x, p0.y, angle, arrowAtStart);
      }

      if (arrowAtEnd) {
        var n = pts.length,
            p0 = pts[n - 2],
            p1 = pts[n - 1],
            angle = rad2deg(Math.atan2(p1.y - p0.y, p1.x - p0.x));
        parentElem.arrow(p1.x, p1.y, angle, arrowAtEnd);
      }

      return parentElem;
    }
    else
      return path;
  }
  // This is temporary lousy implementation (especially for arc pathSeg)
  // and should be deleted when SVGPathElement.getTotalLength() and
  // SVGPathElement.getPointAtLength() are implemented in svgweb.
  curve.getControlPointsAbs = function(commands) {
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
      case 'M':
      case 'L':
      case 'T':
        while (j < m) {
          x = command[j++];
          y = command[j++];
          nextPoint(relative, x, y);
        }
        break;
      case 'S':
      case 'Q':
        while (j < m) {
          x = command[j++];
          y = command[j++];
          nextPoint(relative, x, y);
          x = command[j++];
          y = command[j++];
          nextPoint(relative, x, y);
        }
        break;
      case 'C':
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
      case 'H':
        while (j < m) {
          x = command[j++];
          nextPoint(relative, x, 0);
        }
        break;
      case 'V':
        while (j < m) {
          y = command[j++];
          nextPoint(relative, 0, y);
        }
        break;
      case 'Z':
        break;
      case 'A':
        while (j < m) {
          j += 5;
          x = command[j++];
          y = command[j++];
          nextPoint(relative, x, y);
        }
        break;
      default:
        throw new Error('Unsupported path command. command=' + cmdChar);
      }
    }
    return pts;
  };
  curve.defaultAttributes = {
    'class': 'curve',
    stroke: '#000',
    fill: 'none'
  };
  curve.defaultOptions = {
  };

  function arrow(x, y, angle, attributes, options) {
    attributes = mixin({}, arrow.defaultAttributes, attributes);
    options = mixin({}, arrow.defaultOptions, options);
    var w = options.arrowLength;
    var h = w * Math.tan(deg2rad(options.arrowAngle / 2));
    return this.path(
      [
        ['M', 0, 0],
        ['l', -w, h, 0, -h * 2],
        ['z']
      ],
      attributes,
      {transform: [['translate', x, y], ['rotate', angle]]}
    );
  }
  arrow.defaultAttributes = {
    'class': 'arrow',
    stroke: 'none',
    fill: '#000'
  };
  arrow.defaultOptions = {
    arrowAngle: 45,
    arrowLength: 10
  };

  return {
    curve: curve,
    arrow: arrow
  };
})());
