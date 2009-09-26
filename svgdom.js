/*
 * svgdom - A SVG DOM manipulator which is easy to use for common tasks.
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
    svgdomns = 'http://svgdom.googlecode.com/2009/svgdom',
    namespaces = {
      '': svgns,
      xlink: xlinkns,
      svgdom: svgdomns
    },
    userAgent = navigator.userAgent.toLowerCase(),
    isWebKit = userAgent.indexOf('webkit') != -1,
    isOpera = userAgent.indexOf('opera') != -1,
    isIE = userAgent.indexOf('msie') != -1 && !isOpera,
    _toString = Object.prototype.toString;

function mixin(dest /* , sources */) {
  for (var i = 1, n = arguments.length; i < n; ++i) {
    var src = arguments[i];
    for (var k in src)
      dest[k] = src[k];
  }
  return dest;
}

function reject(obj, callbackOrKeys) {
  var ret = mixin({}, obj);
  if (isArray(callbackOrKeys)) {
    for (var i = 0, n = callbackOrKeys.length; i < n; ++i)
      delete ret[callbackOrKeys[i]];
  }
  else {
    for (var k in ret) {
      if (callbackOrKeys(k, ret[k]))
        delete ret[k];
    }
  }
  return ret;
}

function isArray(object) {
  return _toString.call(object) == '[object Array]';
}

function slice(source, startIndex, endIndex) {
  var ary = [],
      len = source.length;
  if (startIndex === undefined)
    startIndex = 0;
  else if (startIndex < 0)
    startIndex += len;

  if (endIndex === undefined)
    endIndex = len;
  else if (endIndex < 0)
    endIndex += len;

  for (var i = startIndex; i < endIndex; ++i)
    ary.push(source[i]);
  return ary;
}

// SVG Element wrapper
function ElementWrapper(element) {
  this.element = element;
}
(function() {
  var wrappers = {},
      uid = 0;

  function byId(id) {
    var elem = document.getElementById(id);
    return elem && wrap(elem);
  }

  function createDocumentFragment() {
    // To create a DocumentFragment for use with SVG, you should call
    // document.createDocumentFragment(true). Note the extra true parameter --
    // this is required by SVG Web to help us know that this DocumentFragment
    // will be used with SVG, possibly going into our fake Flash backend.
    return document.createDocumentFragment(true);
  }

  function createElement(tagName) {
    return document.createElementNS(svgns, tagName);
  }

  var createTextNode = (isIE ? function createTextNode_IE(text) {
    // On Internet Explorer, DOM text nodes created through
    // document.createTextNode with the second argument given as 'true':
    //
    // document.createTextNode('some text', true)
    //
    // will have a .style property on them as an artifact of how we support
    // various things internally. Changing this will have no affect.
    // Technically DOM text nodes should not have a .style property.
    return document.createTextNode(text, true);
  } : function createTextNode(text) {
    return document.createTextNode(text);
  });

  function getRawNode(nodeOrWrapper) {
    return nodeOrWrapper instanceof ElementWrapper ?
        nodeOrWrapper.element : nodeOrWrapper;
  }

  function setUid(element) {
    if (!(element && element.setAttributeNS))
      return undefined;
    element.setAttributeNS(svgdomns, 'uid', ++uid);
    return uid;
  }

  function getUid(element) {
    if (!(element && element.getAttributeNS))
      return undefined;
    return element.getAttributeNS(svgdomns, 'uid');
  }

  function removeUid(element) {
    element.removeAttributeNS(svgdomns, 'uid');
    return uid;
  }

  function wrap(element) {
    if (!element)
      return null;

    var existingUid = getUid(element);
    if (existingUid)
      return ElementWrappers.wrappers[existingUid];
    
    var newUid = setUid(element);
    if (!newUid)
      return null;

    var wrapper = new ElementWrapper(element);
    wrappers[newUid] = wrapper;
    return wrapper;
  }

  function unwrap(uid) {
    var wrapper = wrappers[uid];
    if (wrapper) {
      removeUid(wrapper.element);
      delete wrappers[uid];
    }
  }

  function unwrapAll() {
    for (var wrapperUid in wrappers)
      unwrap(wrapperUid);
  }

  mixin(ElementWrapper, {
    byId: byId,
    createDocumentFragment: createDocumentFragment,
    createElement: createElement,
    createTextNode: createTextNode,
    getRawNode: getRawNode,
    wrap: wrap,
    unwrap: unwrap,
    unwrapAll: unwrapAll,
  });

  // ElementWrapper 'instance' methods.
  var proto = ElementWrapper.prototype;

  proto.uid = function() {
    return parseInt(this.getAttribute('svgdom:uid'));
  };

  proto.g = function(attributes) {
    return this.appendNewChildElement('g', attributes);
  };

  proto.path = function(commands, attributes) {
    return this.appendNewChildElement(
      'path',
      mixin({
        d: this.formatPath(commands),
      }, this.path.defaultAttributes, attributes)
    );
  };
  proto.path.defaultAttributes = {
    fill: 'none',
    stroke: '#000'
  }

  proto.rect = function(x, y, width, height, attributes) {
    return this.appendNewChildElement(
      'rect',
      mixin({
        x: this.formatDistance(x),
        y: this.formatDistance(y),
        width: this.formatDistance(width),
        height: this.formatDistance(height)
      }, this.rect.defaultAttributes, attributes)
    );
  };
  proto.rect.defaultAttributes = {
    fill: 'none',
    stroke: '#000'
  }

  proto.circle = function(cx, cy, r, attributes) {
    return this.appendNewChildElement(
      'circle',
      mixin({
        cx: this.formatDistance(cx),
        cy: this.formatDistance(cy),
        r: this.formatDistance(r)
      }, this.circle.defaultAttributes, attributes)
    );
  };
  proto.circle.defaultAttributes = {
    fill: 'none',
    stroke: '#000'
  }

  proto.ellipse = function(cx, cy, rx, ry, attributes) {
    return this.appendNewChildElement(
      'ellipse',
      mixin({
        cx: this.formatDistance(cx),
        cy: this.formatDistance(cy),
        rx: this.formatDistance(rx),
        ry: this.formatDistance(ry)
      }, this.ellipse.defaultAttributes, attributes)
    );
  };
  proto.ellipse.defaultAttributes = {
    fill: 'none',
    stroke: '#000'
  }

  proto.line = function(x1, y1, x2, y2, attributes) {
    return this.appendNewChildElement(
      'line',
      mixin({
        x1: this.formatDistance(x1),
        y1: this.formatDistance(y1),
        x2: this.formatDistance(x2),
        y2: this.formatDistance(y2)
      }, this.line.defaultAttributes, attributes)
    );
  };
  proto.line.defaultAttributes = {
    fill: 'none',
    stroke: '#000'
  }

  proto.polyline = function(points, attributes) {
    return this.appendNewChildElement(
      'polyline',
      mixin({
        points: this.formatPoints(points)
      }, this.polyline.defaultAttributes, attributes)
    );
  };
  proto.polyline.defaultAttributes = {
    fill: 'none',
    stroke: '#000'
  }

  proto.polygon = function(points, attributes) {
    return this.appendNewChildElement(
      'polygon',
      mixin({
        points: this.formatPoints(points)
      }, this.polygon.defaultAttributes, attributes)
    );
  };
  proto.polygon.defaultAttributes = {
    fill: 'none',
    stroke: '#000'
  }

  proto.plainText = function(x, y, characters, attributes, options) {
    options = mixin({}, this.plainText.defaultOptions, options);
    var textElem = this.appendNewChildElement(
      'text',
      mixin({
        x: this.formatDistance(x),
        y: this.formatDistance(y)
      }, attributes)
    );

    var lines = characters.split('\n'),
        lineCount = lines.length,
        lineHeight = options.lineHeight,
        startIndex = 0,
        tspans = [],
        maxWidth = 0;
    for (var i = 0; i < lineCount; ++i) {
      var line = lines[i];
      var attr = i == 0 ? undefined : {dx: 0, dy: lineHeight};
      var tspan = textElem.appendNewChildElement('tspan', attr);
      tspan.appendChild(createTextNode(line));
      tspans.push(tspan);
      tspan.width = textElem.getSubStringLength(startIndex, line.length);
      maxWidth = Math.max(maxWidth, tspan.width);
      startIndex += line.length;
    }

    // Align lines
    var textAlign = options.textAlign;
    var t = textAlign === 'left' ? 0 : textAlign === 'center' ? 0.5 : 1.0;
    var prevWidth;
    for (i = 0; i < lineCount; ++i) {
      var tspan = tspans[i];
      var dx = i == 0 ? (maxWidth - tspan.width) * t :
        prevWidth * (t - 1) - tspan.width * t;
      if (dx === 0)
        tspan.removeAttribute('dx');
      else
        tspan.setAttribute('dx', dx);
      if (isWebKit)
        textElem.appendChild(tspan);
      prevWidth = tspan.width;
    }
    return textElem;
  };
  proto.plainText.defaultOptions = {
    lineHeight: '1.2em',
    textAlign: 'left'
  };

  proto.appendNewChildElement = function(tagName, attributes) {
    var child = wrap(createElement(tagName)).setAttributes(attributes);
    this.appendChild(child);
    return child;
  };

  proto.appendChild = function(child) {
    this.element.appendChild(getRawNode(child));
    return this;
  };

  proto.insertBefore = function(newChild, refChild) {
    this.element.insertBefore(getRawNode(newChild), getRawNode(refChild));
    return newChild;
  };

  proto.replaceChild = function(newChild, oldChild) {
    this.element.insertBefore(getRawNode(newChild), getRawNode(oldChild));
    return newChild;
  };

  proto.removeChild = function(child) {
    this.element.removeChild(getRawNode(child));
    return child;
  };

  proto.parentWrapper = function() {
    var parentNode = this.element.parentNode;
    if (!parentNode || parentNode.namespaceURI != svgns)
      return null;
    return wrap(parentNode);
  };

  proto.firstChildWrapper = function() {
    
  };

  proto.childElementWrappers = function() {
  };

  proto.setAttributes = function(attributes) {
    for (var name in attributes)
      this.setAttribute(name, attributes[name]);
    return this;
  };

  proto.setAttribute = function(name, value) {
    if (value === undefined)
      return this.removeAttribute(name);
    if (name.indexOf(':') != -1) {
      var parts = name.split(':');
      this.element.setAttributeNS(namespaces[parts[0]], parts[1], value);
    }
    else
      this.element.setAttribute(name, value);
    return this;
  };

  proto.getAttributes = function(names) {
    var ret = {};
    for (var i = 0, n = names.length; i < n; i++)
      ret[name] = this.getAttribute(name);
    return ret;
  };

  proto.getAttribute = function(name) {
    var value;
    if (name.indexOf(':') != -1) {
      var parts = name.split(':');
      value = this.element.getAttributeNS(namespaces[parts[0]], parts[1]);
    }
    else
      value = this.element.getAttribute(name);

    if (this.getAttribute.lookParentPredicate(name, value)) {
      var parent = this.parentWrapper();
      if (parent)
        return parent.getAttribute(name);
    }
    return value;
  };
  proto.getAttribute.lookParentPredicate = function(name, value) {
    return value === null || value === '' || value === 'inherit';
  };

  proto.removeAttribute = function(name) {
    var value;
    if (name.indexOf(':') != -1) {
      var parts = name.split(':');
      this.element.removeAttributeNS(namespaces[parts[0]], parts[1]);
    }
    else
      this.element.removeAttribute(name);
    return this;
  };

  proto.formatPath = function(commands) {
    var s = [];
    for (var i = 0, n = commands.length; i < n; i++) {
      var command = commands[i],
          cmdChar = command[0],
          params = command.slice(1),
          paramCount = params.length;
      s.push(cmdChar);
      switch (cmdChar.toUpperCase()) {
      case 'M':
      case 'L':
      case 'T':
        if (paramCount == 0 || paramCount % 2) {
          throw new Error(
            'Parameter count must be 2 * n (n >= 1) for path command "'.concat(
              cmdChar, '" but was ', paramCount
            )
          );
        }
        s.push(this.formatPoints(params));
        break;
      case 'S':
      case 'Q':
        if (paramCount == 0 || paramCount % 4) {
          throw new Error(
            'Parameter count must be 4 * n (n >= 1) for path command "'.concat(
              cmdChar, '" but was ', paramCount
            )
          );
        }
        s.push(this.formatPoints(params));
        break;
      case 'C':
        if (paramCount == 0 || paramCount % 6) {
          throw new Error(
            'Parameter count must be 6 * n (n >= 1) for path command "'.concat(
              cmdChar, '" but was ', paramCount
            )
          );
        }
        s.push(this.formatPoints(params));
        break;
      case 'H':
      case 'V':
        if (paramCount == 0) {
          throw new Error(
            'Parameter count must be n (n >= 1) for path command "'.concat(
              cmdChar, '" but was ', paramCount
            )
          );
        }
        var s2 = [];
        for (var j = 0; j < paramCount; ++j)
          s2.push(this.formatDistance(params[j]));
        s.push(s2.join(' '));
        break;
      case 'Z':
        if (paramCount != 0) {
          throw new Error(
            'Parameter count must be 0 for path command "'.concat(
              cmdChar, '" but was ', paramCount
            )
          );
        }
        break;
      case 'A':
        if (paramCount == 0 || paramCount % 8) {
          throw new Error(
            'Parameter count must be 8 * n (n >= 1) for path command "'.concat(
              cmdChar, '" but was ', paramCount
            )
          );
        }
        var s2 = [];
        for (var j = 0; j < paramCount; j += 8) {
          s.push(this.formatPoint(params[j], params[j + 1]));
          s.push(this.formatAngle(params[j + 2]));
          s.push(this.bool2flag(command[j + 3]));
          s.push(this.bool2flag(command[j + 4]));
          s.push(this.bool2flag(command[j + 5]));
          s.push(this.formatPoint(params[j + 6], params[j + 7]));
        }
        s.push(s2.join(' '));
        break;
      default:
        throw new Error('Unsupported path command. command=' + cmdChar);
      }
    }
    return s.join(' ');
  };

  /**
   * @param points flat array [x1, y1, x2, y2, ...]
   */
  proto.formatPoints = function(points) {
    var terms = [];
    for (var i = 0, n = points.length; i < n; i += 2)
      terms.push(this.formatPoint(points[i], points[i + 1]));
    return terms.join(' ');
  };

  proto.formatPoint = function(x, y) {
    return this.formatDistance(x) + ',' + this.formatDistance(y);
  };

  proto.formatDistance = function(value) {
    return isNaN(value) ? value :
        this.formatNumber(value, this.formatDistance.fractionDigitCount);
  };
  proto.formatDistance.fractionDigitCount = 1;

  proto.formatAngle = function(value) {
    return isNaN(value) ? value :
        this.formatNumber(value, this.formatAngle.fractionDigitCount);
  };
  proto.formatAngle.fractionDigitCount = 1;

  proto.formatNumber = function(value, fractionalDigitCount) {
    var s = value.toFixed(fractionalDigitCount),
        dotPos = s.indexOf('.');
    if (dotPos == -1)
      return s;
    var i = s.length - 1;
    while (i >= dotPos && '0.'.indexOf(s.charAt(i)) != -1)
      --i;
    return s.substr(0, i + 1);
  };

  proto.bool2flag = function(value) {
    return value ? 1 : 0;
  };

  proto.rotateThenTranslateTransform = function(cx, cy, angle) {
    var t = [];
    t.push(['translate', this.formatDistance(cx), this.formatDistance(cy)]);
    if (angle)
      t.push(['rotate', this.formatAngle(angle)]);
    return this.formatTransform(t);
  };

  proto.formatTransform = function(transforms) {
    var s = [];
    for (var i = 0, n = transforms.length; i < n; i++) {
      var transform = transforms[i];
      s.push(transform[0].concat('(', transform.slice(1), ')'));
    }
    return s.join(' ');
  };

  proto.getSubStringLength = (isWebKit ? function(startIndex, charCount) {
    return this.getTextBBox(startIndex, charCount).width;
  } : function(startIndex, charCount) {
    return this.element.getSubStringLength(startIndex, charCount);
  });

  proto.getTextBBox = function(startIndex, charCount) {
    var element = this.element,
        i = startIndex || 0,
        n = element.getNumberOfChars(),
        endIndex = charCount === undefined ? n : i + charCount,
        unionRect = geom.unionRect,
        rect = element.getExtentOfChar(i);
    for (++i; i < endIndex; ++i)
      rect = unionRect(element.getExtentOfChar(i), rect);
    return rect;
  };

})();

// geom module functions.
var geom = (function() {
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

  function cloneRect(rect) {
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height
    };
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

    cloneRect: cloneRect,
    unionRect: unionRect,
    insetRect: insetRect
  }
}());

return {
  ElementWrapper: ElementWrapper,
  mixin: mixin,
  reject: reject,
  isArray: isArray,
  slice: slice,
  geom: geom
};

})();
