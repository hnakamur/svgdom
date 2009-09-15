/*
 * svgdom - A SVG DOM manipulator for a minimalist.
 * It is aimed at using with svgweb (http://svgweb.googlecode.com/).
 *
 * The MIT License
 * 
 * Copyright (c) 2009 Hiroaki Nakamura <hnakamur@gmail.com>
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the 'Software'), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var svgdom = (function() {

var svgns = 'http://www.w3.org/2000/svg',
    xlinkns = 'http://www.w3.org/1999/xlink',
    namespaces = {
      '': svgns,
      xlink: xlinkns
    },
    userAgent = navigator.userAgent.toLowerCase(),
    isIE = userAgent.indexOf('msie') >= 0 && userAgent.indexOf('opera') == -1,
    M = Manipulator;

// SVG DOM Manipulator
function Manipulator(node) {
  this.node = node;
}

function create(node) { return new Manipulator(node); }

function byId(id) {
  var elem = document.getElementById(id);
  return elem && create(elem);
}

function fragment() {
  // To create a DocumentFragment for use with SVG, you should call
  // document.createDocumentFragment(true). Note the extra true parameter --
  // this is required by SVG Web to help us know that this DocumentFragment
  // will be used with SVG, possibly going into our fake Flash backend.
  return create(document.createDocumentFragment(true));
}

function element(type, attributes) {
  return create(document.createElementNS(svgns, type)).setAttr(attributes);
}

var textNode = (isIE ? function textNodeIE(text) {
  // On Internet Explorer, DOM text nodes created through
  // document.createTextNode with the second argument given as 'true':
  //
  // document.createTextNode('some text', true)
  //
  // will have a .style property on them as an artifact of how we support
  // various things internally. Changing this will have no affect.
  // Technically DOM text nodes should not have a .style property.
  return create(document.createTextNode(text, true));
} : function textNode(text) {
  return create(document.createTextNode(text));
});

var coordSeparator = ',';

function formatPath(commands) {
  var s = [];
  for (var i = 0, n = commands.length; i < n; i++) {
    var command = commands[i],
        cmdChar = command[0],
        m = command.length,
        j = 1,
        paramCount = m - j;
    s.push(cmdChar);
    switch (cmdChar.toUpperCase()) {
    case 'M':
    case 'L':
    case 'T':
      if (paramCount == 0 || paramCount % 2)
        throw new Error('Parameter count should be 2 * n (n >= 1) for command '.concat(cmdChar, ' but was ', paramCount));
      while (j < m) {
        if (j > 1) s.push(' ');
        s.push(toFixedCoord(command[j++]));
        s.push(coordSeparator);
        s.push(toFixedCoord(command[j++]));
      }
      break;
    case 'S':
    case 'Q':
      if (paramCount == 0 || paramCount % 4)
        throw new Error('Parameter count should be 4 * n (n >= 1) for command '.concat(cmdChar, ' but was ', paramCount));
      while (j < m) {
        if (j > 1) s.push(' ');
        s.push(toFixedCoord(command[j++]));
        s.push(coordSeparator);
        s.push(toFixedCoord(command[j++]));
        s.push(' ');
        s.push(toFixedCoord(command[j++]));
        s.push(coordSeparator);
        s.push(toFixedCoord(command[j++]));
      }
      break;
    case 'C':
      if (paramCount == 0 || paramCount % 6)
        throw new Error('Parameter count should be 6 * n (n >= 1) for command '.concat(cmdChar, ' but was ', paramCount));
      while (j < m) {
        if (j > 1) s.push(' ');
        s.push(toFixedCoord(command[j++]));
        s.push(coordSeparator);
        s.push(toFixedCoord(command[j++]));
        s.push(' ');
        s.push(toFixedCoord(command[j++]));
        s.push(coordSeparator);
        s.push(toFixedCoord(command[j++]));
        s.push(' ');
        s.push(toFixedCoord(command[j++]));
        s.push(coordSeparator);
        s.push(toFixedCoord(command[j++]));
      }
      break;
    case 'H':
    case 'V':
      if (paramCount == 0)
        throw new Error('Parameter needed 0 for command '.concat(cmdChar));
      while (j < m) {
        if (j > 1) s.push(' ');
        s.push(toFixedCoord(command[j++]));
      }
      break;
    case 'Z':
      if (paramCount != 0)
        throw new Error('Parameter count should be 0 for command '.concat(
            cmdChar, ' but was ', paramCount));
      break;
    case 'A':
      while (j < m) {
        if (j > 1) s.push(' ');
        s.push(toFixedCoord(command[j++]));
        s.push(coordSeparator);
        s.push(toFixedCoord(command[j++]));
        s.push(' ');
        s.push(toFixedAngle(command[j++]));
        s.push(' ');
        s.push(bool2flag(command[j++]));
        s.push(' ');
        s.push(bool2flag(command[j++]));
        s.push(' ');
        s.push(toFixedCoord(command[j++]));
        s.push(coordSeparator);
        s.push(toFixedCoord(command[j++]));
      }
      break;
    default:
      throw new Error('Unsupported path command. command=' + cmdChar);
    }
  }
  return s.join('');
}

function formatTransform(transforms) {
  var s = [];
  for (var i = 0, n = transforms.length; i < n; i++) {
    var transform = transforms[i];
    s.push(transform[0].concat('(', transform.slice(1), ')'));
  }
  return s.join(' ');
}

function rotateThenTranslateTransform(cx, cy, angle) {
  var t = [];
  t.push(['translate', toFixedCoord(cx), toFixedCoord(cy)]);
  if (angle)
    t.push(['rotate', toFixedAngle(angle)]);
  return formatTransform(t);
}

function toFixed(value, floatDigits) {
  var s = value.toFixed(floatDigits),
      dotPos = s.indexOf('.');
  if (dotPos == -1) return s;
  for (var i = s.length - 1; i >= dotPos; i--) {
    var c = s.charAt(i);
    if (c != '0' && c != '.') break;
  }
  return s.substr(0, i + 1);
}

var coordFloatDigits = 2;

function toFixedCoord(value) {
  return isNaN(value) ? value : toFixed(value, coordFloatDigits);
}

var angleFloatDigits = 2;

function toFixedAngle(value) {
  return isNaN(value) ? value : toFixed(value, angleFloatDigits);
}

function bool2flag(value) {
  return value ? 1 : 0;
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
    else if (c === '-') {
      upperNext = true;
      continue;
    }
    chars.push(c);
  }
  return chars.join('');
}

function hyphenize(name) {
  var chars = [];
  for (var i = 0, len = name.length; i < len; i++) {
    var c = name.charAt(i);
    if (c === c.toUpperCase()) {
      chars.push('-');
      chars.push(c.toLowerCase());
    }
    else
      chars.push(c);
  }
  return chars.join('');
}

function curry(fn) {
  var _this = this, args = Array.prototype.slice.call(arguments, 1);
  return function() {
    return fn.apply(_this, args.concat(Array.prototype.slice.call(arguments)));
  }
}

function mixin(dest /* , sources */) {
  for (var i = 1, n = arguments.length; i < n; i++) {
    var src = arguments[i];
    for (var k in src)
      dest[k] = src[k];
  }
  return dest;
}

function filterOut(obj /* , excludes */) {
  var ret = {},
      excludeMap = identityMap(Array.prototype.slice.call(arguments, 1));
  for (var k in obj) {
    if (!(k in excludeMap))
      ret[k] = obj[k];
  }
  return ret;
}

function identityMap(keys) {
  var ret = {};
  for (var i = 0, n = keys.length; i < n; i++) {
    var key = keys[i];
    ret[key] = key;
  }
  return ret;
}

mixin(Manipulator, {
  create: create,
  byId: byId,
  fragment: fragment,
  element: element,
  textNode: textNode,
  coordSeparator: coordSeparator,
  formatPath: formatPath,
  formatTransform: formatTransform,
  rotateThenTranslateTransform: rotateThenTranslateTransform,
  toFixed: toFixed,
  coordFloatDigits: coordFloatDigits,
  toFixedCoord: toFixedCoord,
  angleFloatDigits: angleFloatDigits,
  toFixedAngle: toFixedAngle,
  bool2flag: bool2flag,
  mixin: mixin,
  filterOut: filterOut,
  curry: curry,
  camelize: camelize,
  hyphenize: hyphenize
});

var elementTypes = [
  'svg', 'g', 'defs', 'desc', 'title', 'metadata', 'symbol',
  'use', 'switch', 'image', 'style',
  'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
  'text', 'tspan', 'tref', 'textPath',
  'marker', 'color-profile', 'clipPath', 'filter', 'cursor',
  'a', 'view', 'script',
  'animate', 'set', 'animateMotion', 'animateColor', 'animateTransform',
  'font', 'glyph', 'missing-glyph', 'hkern', 'vkern', 'font-face',
  'metadata'
];
for (var i = 0, len = elementTypes.length; i < len; i++) {
  var type = elementTypes[i];
  Manipulator[camelize(type)] = curry(element, type);
}

// Manipulator 'instance' methods.
mixin(Manipulator.prototype, {
  append: function() {
    var node = this.node;
    for (var i = 0, len = arguments.length; i < len; i++)
      node.appendChild(arguments[i].node);
    return this;
  },
  setAttr: function(attributes) {
    var node = this.node;
    for (var k in attributes) {
      if (k.indexOf(':') >= 0) {
        var parts = k.split(':');
        node.setAttributeNS(namespaces[parts[0]], parts[1], attributes[k]);
      }
      else {
        node.setAttribute(k, attributes[k]);
      }
    }
    return this;
  },
  attr: function(/* names */) {
    var ret = {};
    for (var i = 0, len = arguments.length; i < len; i++) {
      var name = arguments[i];
      if (name.indexOf(':') >= 0) {
        var parts = name.split(':');
        ret[name] = node.getAttributeNS(argumentspaces[parts[0]], parts[1]);
      }
      else {
        ret[name] = node.getAttribute(name);
      }
    }
    return ret;
  },
  getTextBBox: function() {
    var node = this.node,
        n = node.getNumberOfChars(),
        unionRect = M.geom.unionRect,
        rect;
    for (var i = 0; i < n; i++) {
      if (i == 0)
        rect = node.getExtentOfChar(i)
      else
        rect = unionRect(node.getExtentOfChar(i), rect);
    }
    return rect;
  }
});

// geom module functions.
Manipulator.geom = (function() {
  var tangentEpsilon = 1e-4;

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
        startAngle = angleBetweenVectors({x: 1, y: 0}, {x: xs, y: ys}),
        deltaAngle = angleBetweenVectors({x: xs, y: ys},
          {x: (-x1p - cxp) / rx, y: (-y1p - cy) / ry}) - (fs ? 0 : 360);
    return {
      center: center,
      startAngle: startAngle,
      deltaAngle: deltaAngle
    };
  }

  function angleBetweenVectors(u, v) {
    var sign = u.x * v.y - u.y * v.x >= 0 ? 1 : -1,
        dp = vectorInnerProduct(u, v),
        lu = vectorLength(u),
        lv = vectorLength(v);
    return normalizeDegree(rad2deg(sign * Math.acos(dp / (lu * lv))));
  }

  function vectorInnerProduct(u, v) {
    return u.x * v.x + u.y * v.y;
  }

  function vectorLength(v) {
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

  function unionRect(rect1, rect2) {
    var x1 = Math.min(rect1.x, rect2.x),
        y1 = Math.min(rect1.y, rect2.y);
        x2 = Math.max(rect1.x + rect1.width, rect2.x + rect2.width),
        y2 = Math.max(rect1.y + rect1.height, rect2.y + rect2.height);
    return {
      x: x1,
      y: y1,
      width: x2 - x1,
      height: y2 - y1
    };
  }

  function insetRect(rect, xOffset, yOffset) {
    if (yOffset === undefined)
      yOffset = xOffset;
    return {
      x: rect.x + xOffset,
      y: rect.y + yOffset,
      width: rect.width - 2 * xOffset,
      height: rect.height - 2 * yOffset
    };
  }

  return {
    getPointOnStraightLine: getPointOnStraightLine,
    getPointOnQuadraticBezierCurve: getPointOnQuadraticBezierCurve,
    getPointOnCubicBezierCurve: getPointOnCubicBezierCurve,

    getPointOnEllipticalArc: getPointOnEllipticalArc,
    rotateAroundOriginThenTranslate: rotateAroundOriginThenTranslate,
    convertArcCenterToEndpoint: convertArcCenterToEndpoint,
    convertArcEndPointToCenter: convertArcEndPointToCenter,
    angleBetweenVectors: angleBetweenVectors,
    vectorInnerProduct: vectorInnerProduct,
    vectorLength: vectorLength,
    tangentEpsilon: tangentEpsilon,

    normalizeDegree: normalizeDegree,
    deg2rad: deg2rad,
    rad2deg: rad2deg,

    unionRect: unionRect,
    insetRect: insetRect
  }
}());

return Manipulator;

})();
