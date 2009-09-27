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

function log(title, object) {
  console.log(title);
  console.log(object);
}

function extend(dest /* , sources */) {
  for (var i = 1, n = arguments.length; i < n; ++i) {
    var src = arguments[i];
    for (var k in src)
      dest[k] = src[k];
  }
  return dest;
}

function filter(obj, keys) {
  var ret = {};
  if (isString(keys))
    keys = ensureArray(keys);
  if (isArray(keys)) {
    for (var i = 0, n = keys.length; i < n; ++i) {
      var key = keys[i];
      if (key in obj)
        ret[key] = obj[key];
    }
  }
  else {
    for (var key in obj) {
      if (key in keys)
        ret[key] = obj[key];
    }
  }
  return ret;
}

function toMap(keys, values) {
  if (values === undefined)
    values = keys;
  var ret = {};
  for (var i = 0, n = keys.length; i < n; ++i)
    ret[keys[i]] = values[i];
  return ret;
}

function isString(object) {
  return _toString.call(object) == '[object String]';
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

function ensureArray(object) {
  return isArray(object) ? object : [object];
}

// SVG Element wrapper
function ElementWrapper(element) {
  this.element = element;
}
(function() {
  var wrappers = {},
      uid = 0,
      supportedAttributeNames = toMap([
        'class', 'cx', 'cy',
        'd', 'dx', 'dy',
        'fill',
        'height',
        'id',
        'points',
        'r', 'rx', 'ry',
        'stroke', 'svgdom:uid',
        'transform',
        'width',
        'x', 'x1', 'x2',
        'y', 'y1', 'y2'
      ]);

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
      return wrappers[existingUid];
    
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

  extend(ElementWrapper, {
    supportedAttributeNames: supportedAttributeNames,
    byId: byId,
    createDocumentFragment: createDocumentFragment,
    createElement: createElement,
    createTextNode: createTextNode,
    getRawNode: getRawNode,
    wrap: wrap,
    unwrap: unwrap,
    unwrapAll: unwrapAll
  });

  // ElementWrapper 'instance' methods.
  var proto = ElementWrapper.prototype;

  proto.uid = function() {
    return parseInt(this.getAttribute('svgdom:uid'));
  };

  proto.g = function(options) {
    return this.appendNewChildElement('g', options);
  };

  proto.path = function(commands, options) {
    return this.appendNewChildElement(
      'path',
      extend({d: commands}, this.path.defaults, options)
    );
  };
  proto.path.defaults = {
    fill: 'none',
    stroke: '#000'
  }

  proto.rect = function(x, y, width, height, options) {
    return this.appendNewChildElement(
      'rect',
      extend(
        {x: x, y: y, width: width, height: height},
        this.rect.defaults,
        options
      )
    );
  };
  proto.rect.defaults = {
    fill: 'none',
    stroke: '#000'
  }

  proto.circle = function(cx, cy, r, options) {
    return this.appendNewChildElement(
      'circle',
      extend({cx: cx, cy: cy, r: r}, this.circle.defaults, options)
    );
  };
  proto.circle.defaults = {
    fill: 'none',
    stroke: '#000'
  }

  proto.ellipse = function(cx, cy, rx, ry, options) {
    return this.appendNewChildElement(
      'ellipse',
      extend({cx: cx, cy: cy, rx: rx, ry: ry}, this.ellipse.defaults, options)
    );
  };
  proto.ellipse.defaults = {
    fill: 'none',
    stroke: '#000'
  }

  proto.line = function(x1, y1, x2, y2, options) {
    return this.appendNewChildElement(
      'line',
      extend({x1: x1, y1: y1, x2: x2, y2: y2}, this.line.defaults, options)
    );
  };
  proto.line.defaults = {
    fill: 'none',
    stroke: '#000'
  }

  proto.polyline = function(points, options) {
    return this.appendNewChildElement(
      'polyline',
      extend({points: points}, this.polyline.defaults, options)
    );
  };
  proto.polyline.defaults = {
    fill: 'none',
    stroke: '#000'
  }

  proto.polygon = function(points, options) {
    return this.appendNewChildElement(
      'polygon',
      extend({points: points}, this.polygon.defaults, options)
    );
  };
  proto.polygon.defaults = {
    fill: 'none',
    stroke: '#000'
  }

  proto.plainText = function(x, y, characters, options) {
    var config = extend({}, this.plainText.defaults, options);
    var textElem = this.appendNewChildElement(
      'text',
      extend({x: x, y: y}, config)
    );

    var lines = characters.split('\n'),
        lineCount = lines.length,
        lineHeight = config.lineHeight,
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
    var textAlign = config.textAlign;
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
  proto.plainText.defaults = {
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

  proto.parent = function() {
    var parentNode = this.element.parentNode;
    if (!parentNode || parentNode.namespaceURI != svgns)
      return null;
    return wrap(parentNode);
  };

  proto.firstChildElement = function() {
    var elem = this.element.firstChild;
    while (elem && !(elem instanceof Element))
      elem = elem.nextSibling;
    return wrap(elem);
  };

  proto.lastChildElement = function() {
    var elem = this.element.lastChild;
    while (elem && !(elem instanceof Element))
      elem = elem.previousSibling;
    return wrap(elem);
  };

  proto.nextSiblingElement = function() {
    var elem = this.element.nextSibling;
    while (elem && !(elem instanceof Element))
      elem = elem.nextSibling;
    return wrap(elem);
  };

  proto.previousSiblingElement = function() {
    var elem = this.element.previousSibling;
    while (elem && !(elem instanceof Element))
      elem = elem.previousSibling;
    return wrap(elem);
  };

  proto.setAttributes = function(attributes) {
    attributes = filter(attributes, supportedAttributeNames);
    for (var name in attributes)
      this.setAttribute(name, attributes[name]);
    return this;
  };

  proto.setAttribute = function(name, value) {
    if (value === undefined)
      return this.removeAttribute(name);
    value = this.formatAttributeValue(name, value);
    if (name.indexOf(':') != -1) {
      var parts = name.split(':');
      this.element.setAttributeNS(namespaces[parts[0]], parts[1], value);
    }
    else
      this.element.setAttribute(name, value);
    return this;
  };

  proto.formatAttributeValue = function(name, value) {
    if (isString(value))
      return value;

    switch (name) {
    case 'cx':
    case 'cy':
    case 'dx':
    case 'dy':
    case 'height':
    case 'r':
    case 'rx':
    case 'ry':
    case 'width':
    case 'x':
    case 'x1':
    case 'x2':
    case 'y':
    case 'y1':
    case 'y2':
      return this.formatLength(value);
    case 'd':
      return this.formatPath(value);
    case 'points':
      return this.formatPoints(value);
    case 'transform':
      return this.formatTransform(value);
    default:
      return '' + value;
    }
  };

  proto.increaseLengthAttribute = function(name, diffValue) {
    if (!diffValue)
      return this;
    var oldStrVal = this.getAttribute(name);
    var oldVal = oldStrVal ? parseFloat(oldStrVal) : 0;
    var newVal = oldVal + diffValue;
    return this.setAttribute(name, this.formatLength(newVal));
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
      var parent = this.parent();
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
          s2.push(this.formatLength(params[j]));
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
        if (paramCount == 0 || paramCount % 7) {
          throw new Error(
            'Parameter count must be 7 * n (n >= 1) for path command "'.concat(
              cmdChar, '" but was ', paramCount
            )
          );
        }
        var s2 = [];
        for (var j = 0; j < paramCount; j += 7) {
          s.push(this.formatLength(params[j]));
          s.push(this.formatLength(params[j + 1]));
          s.push(this.formatAngle(params[j + 2]));
          s.push(this.bool2flag(params[j + 3]));
          s.push(this.bool2flag(params[j + 4]));
          s.push(this.formatPoint(params[j + 5], params[j + 6]));
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
    return this.formatLength(x) + ',' + this.formatLength(y);
  };

  proto.formatLength = function(value) {
    return isNaN(value) ? value :
        this.formatNumber(value, this.formatLength.fractionDigitCount);
  };
  proto.formatLength.fractionDigitCount = 1;

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

  proto.formatTransform = function(transforms) {
    if (!(isArray(transforms) && transforms.length > 0))
      return undefined;
    var s = [];
    if (isArray(transforms[0])) {
      for (var i = 0, n = transforms.length; i < n; i++) {
        var transform = transforms[i];
        if (this.formatTransform.isIdentityTransform(transform))
          continue;
        s.push(this.formatOneTransform(transform));
      }
      return s.join(' ');
    }
    else {
      if (this.formatTransform.isIdentityTransform(transforms))
        return '';
      return this.formatOneTransform(transforms);
    }
  };
  proto.formatTransform.isIdentityTransform = function(transform) {
    var type = transform[0];
    var p = transform.slice(1);
    switch (type) {
    case 'matrix':
      switch (p.length) {
      case 6:
        return p[0] === 1 && p[1] === 0 && p[2] === 0 && p[3] === 1 &&
            p[4] === 0 && p[5] === 0;
      default:
        throw new Error(
            'Invalid transform. Should be matrix(a, b, c, d, e, f)');
      }
      break;
    case 'translate':
      switch (p.length) {
      case 1:
        return p[0] === 0;
      case 2:
        return p[0] === 0 && p[1] === 0;
      default:
        throw new Error('Invalid transform. Should be translate(tx, [ty])');
      }
      break;
    case 'scale':
      switch (p.length) {
      case 1:
        return p[0] === 1;
      case 2:
        return p[0] === 1 && p[1] === 1;
      default:
        throw new Error('Invalid transform. Should be scale(sx, [sy])');
      }
      break;
    case 'rotate':
      switch (p.length) {
      case 1:
      case 3:
        return geom.normalizeDegree(p[0]) === 0;
      default:
        throw new Error('Invalid transform. Should be rotate(angle, [cx, cy])');
      }
      break;
    case 'skewX':
      switch (p.length) {
      case 1:
        return geom.normalizeDegree(p[0]) === 0;
      default:
        throw new Error('Invalid transform. Should be skewX(angle)');
      }
      break;
    case 'skewY':
      switch (p.length) {
      case 1:
        return geom.normalizeDegree(p[0]) === 0;
      default:
        throw new Error('Invalid transform. Should be skewY(angle)');
      }
      break;
    }
  };
  proto.formatOneTransform = function(transform) {
    var type = transform[0];
    var p = transform.slice(1);
    var s = [];
    switch (type) {
    case 'matrix':
    case 'translate':
    case 'scale':
      for (var i = 0, n = p.length; i < n; ++i)
        s.push(this.formatLength(p[i]));
      break;
    case 'rotate':
      switch (p.length) {
      case 1:
        s.push(this.formatAngle(geom.normalizeDegree(p[0])));
        break;
      case 3:
        s.push(this.formatAngle(geom.normalizeDegree(p[0])));
        s.push(this.formatLength(p[1]));
        s.push(this.formatLength(p[2]));
        break;
      }
      break;
    case 'skewX':
    case 'skewY':
      s.push(this.formatAngle(geom.normalizeDegree(p[0])));
      break;
    }
    return type + '(' + s.join(',') + ')';
  };

  proto.createPoint = function(x, y) {
    var p = this.element.ownerSVGElement.createSVGPoint();
    p.x = x;
    p.y = y;
    return p;
  };

  proto.getTransformToElement = function(element) {
    return this.element.getTransformToElement(element.element);
  };

  proto.alignElements = function(targets, hAlign, vAlign) {
    var tx;
    switch (hAlign) {
    case 'left': tx = 0; break;
    case 'center': tx = 0.5; break;
    case 'right': tx = 1; break;
    }

    var ty;
    switch (vAlign) {
    case 'top': ty = 0; break;
    case 'middle': ty = 0.5; break;
    case 'bottom': ty = 1; break;
    }

    var baseBox = this.getBBox();
    var basePoint = this.createPoint(
      baseBox.x + baseBox.width * (tx || 0),
      baseBox.y + baseBox.height * (ty || 0)
    );
    targets = ensureArray(targets);
    for (var i = 0, n = targets.length; i < n; ++i) {
      var target = targets[i];
      var targetBox = geom.cloneRect(target.getBBox());
      var transform = this.getTransformToElement(target);
      var basePoint2 = basePoint.matrixTransform(transform);

      var params = {};
      if (tx !== undefined)
        params.x = basePoint2.x - targetBox.width * tx;
      if (ty !== undefined)
        params.y = basePoint2.y - targetBox.height * ty;
      target.moveElement(params);
    }
  };

  proto.moveElement = function(params) {
    if (arguments.length == 2)
      params = { x: arguments[0], y: arguments[1] };

    var box = this.getBBox(),
        dx = 0,
        dy = 0;

    if (params.x)
      dx = params.x - box.x;
    else if (params.dx)
      dx = params.dx;

    if (params.y)
      dy = params.y - box.y;
    else if (params.dy)
      dy = params.dy;

    if (dx === 0 && dy === 0)
      return;

    switch (this.element.localName) {
    case 'rect':
    case 'text':
      this.increaseLengthAttribute('x', dx);
      this.increaseLengthAttribute('y', dy);
      break;
    case 'circle':
    case 'ellipse':
      this.increaseLengthAttribute('cx', dx);
      this.increaseLengthAttribute('cy', dy);
      break;
    case 'line':
      this.increaseLengthAttribute('x1', dx);
      this.increaseLengthAttribute('y1', dy);
      this.increaseLengthAttribute('x2', dx);
      this.increaseLengthAttribute('y2', dy);
      break;
    default:
      var transform = this.getAttribute('transform');
      var moveTransform = this.formatOneTransform(['translate', dx, dy]);
      if (transform)
        transform = moveTransform + ' ' + transform;
      else
        transform = moveTransform;
      this.setAttribute('transform', transform);
      break;
    }
  }

  proto.getBBox = function() {
    return this.element.getBBox();
  };

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

  proto.getSubStringLength = (isWebKit ? function(startIndex, charCount) {
    return this.getTextBBox(startIndex, charCount).width;
  } : function(startIndex, charCount) {
    return this.element.getSubStringLength(startIndex, charCount);
  });

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
    return ((degree % 360) + 360) % 360;
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
  extend: extend,
  filter: filter,
  toMap: toMap,
  isString: isString,
  isArray: isArray,
  ensureArray: ensureArray,
  slice: slice,
  geom: geom
};

})();
