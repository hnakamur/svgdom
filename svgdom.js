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

  function mixin(dest /* , sources */) {
    for (var i = 1, n = arguments.length; i < n; i++) {
      var src = arguments[i];
      for (var k in src)
        dest[k] = src[k];
    }
    return dest;
  }

  mixin(Manipulator.prototype, {
    mixin: mixin,
    byId: byId,
    Fragment: Fragment,
    Element: Element,
    TextNode: (isIE ? function TextNodeIE(text) {
      // On Internet Explorer, DOM text nodes created through
      // document.createTextNode with the second argument given as 'true':
      //
      // document.createTextNode('some text', true)
      //
      // will have a .style property on them as an artifact of how we support
      // various things internally. Changing this will have no affect.
      // Technically DOM text nodes should not have a .style property.
      return new Manipulator(document.createTextNode(text, true));
    } : function TextNode(text) {
      return new Manipulator(document.createTextNode(text));
    }),

    append: function append() {
      for (var i = 0, len = arguments.length; i < len; i++)
        this.node.appendChild(arguments[i].node);
      return this;
    },
    setAttr: function setAttr(attributes) {
      for (var k in attributes)
        this.node.setAttribute(k, attributes[k]);
      return this;
    },
    setAttrNS: function setAttrNS(ns, attributes) {
      for (var k in attributes)
        this.node.setAttributeNS(ns, k, attributes[k]);
      return this;
    },
    getAttr: function getAttr(names) {
      var ret = {};
      for (var i = 0, len = names.length; i < len; i++) {
        var name = names[i];
        ret[name] = this.node.getAttribute(name);
      }
      return ret;
    },
    getAttrNS: function getAttrNS(ns, names) {
      var ret = {};
      for (var i = 0, len = names.length; i < len; i++) {
        var name = names[i];
        ret[name] = this.node.getAttributeNS(ns, name);
      }
      return ret;
    },

    formatPath: function formatPath(commands) {
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
            s.push(command[j++] ? 1 : 0);
            s.push(" ");
            s.push(command[j++] ? 1 : 0);
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

    /*
     * Return point {x, y} of path
     * at parametricDistance (0 to 1).
     */
    getPointOnPathAt: function getPointOnPathAt(parametricDistance) {
      var node = this.node;
      return node.getPointAtLength(node.getTotalLength() * parametricDistance);
    },

    /*
     * Return tangent info {x, y, angle} to path
     * at parametricDistance (0 to 1).
     */
    getTangentToPathAt: function getTangentToPathAt(parametricDistance) {
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
    },
    tangentEpsilon: 1e-4,

    formatTransform: function formatTransform(transforms) {
      var s = [];
      for (var i = 0, n = transforms.length; i < n; i++) {
        var transform = transforms[i];
        s.push(transform[0].concat("(", transform.slice(1), ")"));
      }
      return s.join(" ");
    },

    rotateThenTranslateTransform: function rotateThenTranslateTransform(cx, cy, angle) {
      var t = [];
      t.push(["translate", this.toFixedCoord(cx), this.toFixedCoord(cy)]);
      if (angle)
        t.push(["rotate", this.toFixedAngle(angle)]);
      return this.formatTransform(t);
    },

    toFixed: toFixed,

    toFixedCoord: function toFixedCoord(value) {
      return toFixed(value, this.coordFloatDigits);
    },
    coordFloatDigits: 2,

    toFixedAngle: function toFixedAngle(value) {
      return toFixed(value, this.angleFloatDigits);
    },
    angleFloatDigits: 2,

    deg2rad: deg2rad,
    rad2deg: rad2deg,

    curry: curry,
    camelize: camelize,
    hyphenize: hyphenize
  });

  function byId(id) {
    var elem = document.getElementById(id);
    return elem && new Manipulator(elem);
  }
  function Fragment() {
    // To create a DocumentFragment for use with SVG, you should call
    // document.createDocumentFragment(true). Note the extra true parameter --
    // this is required by SVG Web to help us know that this DocumentFragment
    // will be used with SVG, possibly going into our fake Flash backend.
    return new Manipulator(document.createDocumentFragment(true));
  }
  function Element(type) {
    return new Manipulator(document.createElementNS(svgns, type));
  }

  Manipulator.prototype.SVG = curry(Element, "SVG");
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
    Manipulator.prototype[camelize(type, true)] = curry(Element, type);
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

  function deg2rad(degree) {
    return Math.PI / 180 * degree;
  }

  function rad2deg(radian) {
    return 180 / Math.PI * radian;
  }

  function curry(fn) {
    var _this = this, args = $A.call(arguments, 1);
    return function() {
      return fn.apply(_this, args.concat($A.call(arguments)));
    }
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

  return new Manipulator();
})();
