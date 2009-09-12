/*
 * svgdom - A SVG DOM manipulator for a minimalist.
 * It is aimed at using with svgweb (http://svgweb.googlecode.com/).
 *
 * The MIT License
 * 
 * Copyright (c) 2009 Hiroaki Nakamura <hnakamur@gmail.com>
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var svgdom = (function() {
  var svgns = window.svgns,
      xlinkns = window.xlinkns,
      isOpera = navigator.userAgent.indexOf("Opera") >= 0 &&
          parseFloat(navigator.appVersion),
      isIE = (document.all && !isOpera) &&
          parseFloat(navigator.appVersion.split('MSIE ')[1]) || undefined,
      $A = Array.prototype.slice;

  // SVG DOM Manipulator
  function Manipulator(node) {
    this.node = node;
  }

  var theManipulator = new Manipulator(),
      proto = Manipulator.prototype;

  function mixin(dest /* , sources */) {
    for (var i = 1, n = arguments.length; i < n; i++) {
      var src = arguments[i];
      for (var k in src)
        dest[k] = src[k];
    }
    return dest;
  }

  mixin(proto, {
    mixin: mixin,
    extendPrototype: function(extensions) {
      return this.mixin(proto, extensions);
    },
    createManipulator: function(node) { return new Manipulator(node); },
    byId: function(id) {
      var elem = document.getElementById(id);
      return elem && this.createManipulator(elem);
    },
    newFragment: function() {
      // To create a DocumentFragment for use with SVG, you should call
      // document.createDocumentFragment(true). Note the extra true parameter --
      // this is required by SVG Web to help us know that this DocumentFragment
      // will be used with SVG, possibly going into our fake Flash backend.
      return this.createManipulator(document.createDocumentFragment(true));
    },
    newElement: function(type) {
      return this.createManipulator(document.createElementNS(svgns, type));
    },
    newTextNode: (isIE ? function(text) {
      // On Internet Explorer, DOM text nodes created through
      // document.createTextNode with the second argument given as 'true':
      //
      // document.createTextNode('some text', true)
      //
      // will have a .style property on them as an artifact of how we support
      // various things internally. Changing this will have no affect.
      // Technically DOM text nodes should not have a .style property.
      return this.createManipulator(document.createTextNode(text, true));
    } : function(text) {
      return this.createManipulator(document.createTextNode(text));
    }),

    append: function() {
      for (var i = 0, len = arguments.length; i < len; i++)
        this.node.appendChild(arguments[i].node);
      return this;
    },
    setAttr: function(attributes) {
      for (var k in attributes)
        this.node.setAttribute(k, attributes[k]);
      return this;
    },
    setAttrNS: function(ns, attributes) {
      for (var k in attributes)
        this.node.setAttributeNS(ns, k, attributes[k]);
      return this;
    },
    getAttr: function(names) {
      var ret = {};
      for (var i = 0, len = names.length; i < len; i++) {
        var name = names[i];
        ret[name] = this.node.getAttribute(name);
      }
      return ret;
    },
    getAttrNS: function(ns, names) {
      var ret = {};
      for (var i = 0, len = names.length; i < len; i++) {
        var name = names[i];
        ret[name] = this.node.getAttributeNS(ns, name);
      }
      return ret;
    },

    formatPath: function(commands) {
      var coordSeparator = this.coordSeparator,
          s = [];
      for (var i = 0, n = commands.length; i < n; i++) {
        var command = commands[i],
            cmdChar = command[0],
            m = command.length,
            j = 1,
            paramCount = m - j;
        s.push(cmdChar);
        switch (cmdChar.toUpperCase()) {
        case "M":
        case "L":
        case "T":
          if (paramCount == 0 || paramCount % 2)
            throw new Error("Parameter count should be 2 * n (n >= 1) for command ".concat(cmdChar, " but was ", paramCount));
          while (j < m) {
            if (j > 1) s.push(" ");
            s.push(this.toFixedCoord(command[j++]));
            s.push(coordSeparator);
            s.push(this.toFixedCoord(command[j++]));
          }
          break;
        case "S":
        case "Q":
          if (paramCount == 0 || paramCount % 4)
            throw new Error("Parameter count should be 4 * n (n >= 1) for command ".concat(cmdChar, " but was ", paramCount));
          while (j < m) {
            if (j > 1) s.push(" ");
            s.push(this.toFixedCoord(command[j++]));
            s.push(coordSeparator);
            s.push(this.toFixedCoord(command[j++]));
            s.push(" ");
            s.push(this.toFixedCoord(command[j++]));
            s.push(coordSeparator);
            s.push(this.toFixedCoord(command[j++]));
          }
          break;
        case "C":
          if (paramCount == 0 || paramCount % 6)
            throw new Error("Parameter count should be 6 * n (n >= 1) for command ".concat(cmdChar, " but was ", paramCount));
          while (j < m) {
            if (j > 1) s.push(" ");
            s.push(this.toFixedCoord(command[j++]));
            s.push(coordSeparator);
            s.push(this.toFixedCoord(command[j++]));
            s.push(" ");
            s.push(this.toFixedCoord(command[j++]));
            s.push(coordSeparator);
            s.push(this.toFixedCoord(command[j++]));
            s.push(" ");
            s.push(this.toFixedCoord(command[j++]));
            s.push(coordSeparator);
            s.push(this.toFixedCoord(command[j++]));
          }
          break;
        case "H":
        case "V":
          if (paramCount == 0)
            throw new Error("Parameter needed 0 for command ".concat(cmdChar));
          while (j < m) {
            if (j > 1) s.push(" ");
            s.push(this.toFixedCoord(command[j++]));
          }
          break;
        case "Z":
          if (paramCount != 0)
            throw new Error("Parameter count should be 0 for command ".concat(
                cmdChar, " but was ", paramCount));
          break;
        case "A":
          while (j < m) {
            if (j > 1) s.push(" ");
            s.push(this.toFixedCoord(command[j++]));
            s.push(coordSeparator);
            s.push(this.toFixedCoord(command[j++]));
            s.push(" ");
            s.push(this.toFixedAngle(command[j++]));
            s.push(" ");
            s.push(this.bool2flag(command[j++]));
            s.push(" ");
            s.push(this.bool2flag(command[j++]));
            s.push(" ");
            s.push(this.toFixedCoord(command[j++]));
            s.push(coordSeparator);
            s.push(this.toFixedCoord(command[j++]));
          }
          break;
        default:
          throw new Error("Unsupported path command. command=" + cmdChar);
        }
      }
      return s.join("");
    },
    coordSeparator: ",",

    getPointOnStraightLine: getPointOnStraightLine,
    getPointOnQuadraticBezierCurve: getPointOnQuadraticBezierCurve,
    getPointOnCubicBezierCurve: getPointOnCubicBezierCurve,

    /*
     * Return point {x, y} of path
     * at parametricDistance (0 to 1).
     */
    getPointOnPathAt: (isIE ? undefined : function(parametricDistance) {
      var node = this.node;
      return node.getPointAtLength(node.getTotalLength() * parametricDistance);
    }),

    /*
     * Return tangent info {x, y, angle} to path
     * at parametricDistance (0 to 1).
     */
    getTangentToPathAt: (isIE ? undefined : function(parametricDistance) {
      var node = this.node,
          d = node.getTotalLength(),
          p0 = node.getPointAtLength(d * parametricDistance),
          epsilon = this.tangentEpsilon,
          t = parametricDistance + epsilon,
          p1,
          angle;
      if (t <= 1) {
        p1 = node.getPointAtLength(d * t);
        angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      }
      else {
        p1 = node.getPointAtLength(d * (parametricDistance - epsilon));
        angle = Math.atan2(p0.y - p1.y, p0.x - p1.x);
      }
      return {
        x: p0.x,
        y: p0.y,
        angle: rad2deg(angle)
      };
    }),
    tangentEpsilon: 1e-4,

    formatTransform: function(transforms) {
      var s = [];
      for (var i = 0, n = transforms.length; i < n; i++) {
        var transform = transforms[i];
        s.push(transform[0].concat("(", transform.slice(1), ")"));
      }
      return s.join(" ");
    },

    rotateThenTranslateTransform: function(cx, cy, angle) {
      var t = [];
      t.push(["translate", this.toFixedCoord(cx), this.toFixedCoord(cy)]);
      if (angle)
        t.push(["rotate", this.toFixedAngle(angle)]);
      return this.formatTransform(t);
    },

    toFixed: toFixed,

    toFixedCoord: function(value) {
      return toFixed(value, this.coordFloatDigits);
    },
    coordFloatDigits: 2,

    toFixedAngle: function(value) {
      return toFixed(value, this.angleFloatDigits);
    },
    angleFloatDigits: 2,

    curry: function(fn) {
      var _this = this, args = $A.call(arguments, 1);
      return function() {
        return fn.apply(_this, args.concat($A.call(arguments)));
      }
    },

    normalizeDegree: normalizeDegree,
    deg2rad: deg2rad,
    rad2deg: rad2deg,

    bool2flag: bool2flag,

    camelize: camelize,
    hyphenize: hyphenize
  });

  proto.newSVG = proto.curry(proto.newElement, "SVG");
  var types = [
    "g", "defs", "desc", "title", "metadata", "symbol",
    "use", "switch", "image", "style",
    "path", "rect", "circle", "ellipse", "line", "polyline", "polygon",
    "text", "tspan", "tref", "textPath",
    "marker", "color-profile", "clipPath", "filter", "cursor",
    "a", "view", "script",
    "animate", "set", "animateMotion", "animateColor", "animateTransform",
    "font", "glyph", "missing-glyph", "hkern", "vkern", "font-face",
    "metadata"
  ];
  for (var i = 0, len = types.length; i < len; i++) {
    var type = types[i];
    proto["new" + camelize(type, true)] = proto.curry(proto.newElement, type);
  }

  function toFixed(value, floatDigits) {
    var s = value.toFixed(floatDigits),
        dotPos = s.indexOf(".");
    if (dotPos == -1) return s;
    for (var i = s.length - 1; i >= dotPos; i--) {
      var c = s.charAt(i);
      if (c != "0" && c != ".") break;
    }
    return s.substr(0, i + 1);
  }

  function camelize(name, firstCapital) {
    var chars = [],
        upperNext = firstCapital;
    for (var i = 0, len = name.length; i < len; i++) {
      var c = name.charAt(i);
      if (upperNext) {
        c = c.toUpperCase();
        upperNext = false;
      }
      else if (c === "-") {
        upperNext = true;
        continue;
      }
      chars.push(c);
    }
    return chars.join("");
  }

  function hyphenize(name) {
    var chars = [];
    for (var i = 0, len = name.length; i < len; i++) {
      var c = name.charAt(i);
      if (c === c.toUpperCase()) {
        chars.push("-");
        chars.push(c.toLowerCase());
      }
      else
        chars.push(c);
    }
    return chars.join("");
  }

  function getPointOnStraightLine(t, p0, p1) {
    var t1 = 1 - t;
    return {
      x: t1 * p0.x + t * p1.x,
      y: t1 * p0.y + t * p1.y
    };
  }

  function getPointOnQuadraticBezierCurve(t, p0, p1, p2) {
    var t1 = 1 - t,
        a = t1 * t1,
        b = 2 * t1 * t,
        c = t * t;
    return {
      x: a * p0.x + b * p1.x + c * p2.x,
      y: a * p0.y + b * p1.y + c * p2.y
    };
  }

  function getPointOnCubicBezierCurve(t, p0, p1, p2, p3) {
    var t1 = 1 - t,
        a = t1 * t1 * t1,
        b = 3 * t1 * t1 * t,
        c = 3 * t1 * t * t,
        d = t * t * t;
    return {
      x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
      y: a * p0.y + b * p1.y + c * p2.y + d * p3.y
    };
  }

  function getPointOnEllipticalArc(center, rx, ry, xAxisAngle, angle) {
    var rad = deg2rad(angle);
        p = {
          x: rx * Math.cos(rad),
          y: ry * Math.sin(rad)
        };
    return rotateAroundOriginThenTranslate(p, xAxisAngle, center.x, center.y);
  }

  function rotateAroundOriginThenTranslate(p, angle, dx, dy) {
    var rad = deg2rad(angle),
        cos = Math.cos(rad),
        sin = Math.sin(sin);
    return {
      x: cos * x - sin * y + dx,
      y: sin * x + cos * y + dy
    };
  }

  function convertArcCenterToEndpoint(center, rx, ry, xAxisAngle, startAngle,
      deltaAngle) {
    return {
      p1: getPointOnEllipticalArc(center, rx, ry, xAxisAngle, startAngle),
      p2: getPointOnEllipticalArc(center, rx, ry, xAxisAngle,
          startAngle + deltaAngle),
      fa: bool2flag(Math.abs(deltaAngle) > 180),
      fs: bool2flag(deltaAngle > 0)
    }
  }

  function convertArcEndPointToCenter(p1, p2, rx, ry, xAxisAngle, fa, fs) {
    var xarRad = deg2rad(xAxisRotation),
        cosXar = Math.cos(xarRad),
        sinXar = Math.sin(xarRad),
        x1mx2d2 = (p1.x - p2.x) / 2,
        y1my2d2 = (p1.y - p2.y) / 2,
        x1p = cosXar * x1mx2d2 + sinXar * y1my2d2,
        y1p = -sinXar * x1mx2d2 + cosXar * y1my2d2,
        x1p2 = x1p * x1p,
        y1p2 = y1p * y1p,
        sign = fa != fs ? 1 : -1,
        rx2 = rx * rx,
        ry2 = ry * ry,
        k = Math.sqrt((rx2 * ry2 - rx2 * y1p2 - ry2 * x1p2) /
              (rx2 * y1p2 + ry2 + x1p2)),
        cxp = sign * k * (rx * y1p / ry),
        cxp = sign * k * (-ry * x1p / rx),
        center = {
          x: cosXar * cxp - sinXar * cyp + (p1.x + p2.x) / 2,
          y: sinXar * cxp + cosXar * cyp + (p1.y + p2.y) / 2
        }
        xs = (x1p - cxp) / rx,
        ys = (y1p - cyp) / ry,
        startAngle = calcAngleBetweenVectors({x: 1, y: 0}, {x: xs, y: ys}),
        deltaAngle = calcAngleBetweenVectors({x: xs, y: ys},
          {x: (-x1p - cxp) / rx, y: (-y1p - cy) / ry}) - (fs ? 0 : 360);
    return {
      center: center,
      startAngle: startAngle,
      deltaAngle: deltaAngle
    };
  }

  function calcAngleBetweenVectors(u, v) {
    var sign = u.x * v.y - u.y * v.x >= 0 ? 1 : -1,
        dp = calcDotProduct(u, v),
        lu = calcVectorLength(u),
        lv = calcVectorLength(v);
    return normalizeDegree(rad2deg(sign * Math.acos(dp / (lu * lv))));
  }

  function calcDotProduct(u, v) {
    return u.x * v.x + u.y * v.y;
  }

  function calcVectorLength(v) {
    var x = v.x,
        y = v.y;
    return Math.sqrt(x * x + y * y);
  }

  function normalizeDegree(degree) {
    return ((angle % 360) + 360) % 360;
  }

  function deg2rad(degree) {
    return Math.PI / 180 * degree;
  }

  function rad2deg(radian) {
    return 180 / Math.PI * radian;
  }

  function bool2flag(value) {
    return value ? 1 : 0;
  }

  return new Manipulator();
})();
}
