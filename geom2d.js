var geom2d = function() {

function Vector(x, y) {
  this.x = Number(x);
  this.y = Number(y);
}
Vector.fromFlatArray = function(xy) {
  var points = [];
  for (var i = 0, n = xy.length; i < n; i += 2) {
    points.push(new Vector(xy[i], xy[i + 1]));
  }
  return points;
};
Vector.toFlatArray = function(vectors) {
  var xy = [];
  for (var i = 0, n = vectors.length; i < n; ++i) {
    var v = vectors[i];
    xy.push(v.x);
    xy.push(v.y);
  }
  return xy;
};
Vector.polynomial = function(t, constants) {
  var i = constants.length - 1, p = constants[i];
  while (--i >= 0)
    p = constants[i].add(p.scale(t));
  return p;
};
Vector.prototype = {
  length: function() {
    var x = this.x, y = this.y;
    return Math.sqrt(x * x + y * y);
  },
  add: function(p) {
    return new Vector(this.x + p.x, this.y + p.y);
  },
  subtract: function(p) {
    return new Vector(this.x - p.x, this.y - p.y);
  },
  scale: function(s) {
    return new Vector(s * this.x, s * this.y);
  },
  dotProduct: function(p) {
    return this.x * p.x + this.y * p.y;
  },
  crossProductZ: function(p) {
    return this.x * p.y - this.y * p.x;
  }
}

function Matrix(elements) {
  this.elements = elements;
  var m = this.rowSize = elements.length;
  var n = this.columnSize = elements[0].length;
  for (var i = 1; i < m; ++i) {
    if (elements[i].length !== n)
      throw new Error('Column size of all rows must be the same.');
  }
}
Matrix.prototype = {
  isSameSize: function(matrix) {
    return this.rowSize === matrix.rowSize &&
        this.columnSize === matrix.columnSize;
  },
  add: function(matrix) {
    if (!this.isSameSize(matrix))
      throw new Error('Cannot add a matrix of different size.');
    var m = this.rowSize,
        n = this.columnSize,
        a = this.elements,
        b = matrix.elements,
        c = [];
    for (var i = 0; i < m; ++i) {
      c[i] = [];
      for (var j = 0; j < n; ++j)
        c[i][j] = a[i][j] + b[i][j];
    }
    return new Matrix(c);
  },
  subtract: function(matrix) {
    if (!this.isSameSize(matrix))
      throw new Error('Cannot subtract a matrix of different size.');
    var m = this.rowSize,
        n = this.columnSize,
        a = this.elements,
        b = matrix.elements,
        c = [];
    for (var i = 0; i < m; ++i) {
      c[i] = [];
      for (var j = 0; j < n; ++j)
        c[i][j] = a[i][j] - b[i][j];
    }
    return new Matrix(c);
  },
  scale: function(s) {
      throw new Error('Cannot subtract a matrix of different size.');
    var m = this.rowSize,
        n = this.columnSize,
        a = this.elements
        c = [];
    for (var i = 0; i < m; ++i) {
      c[i] = [];
      for (var j = 0; j < n; ++j)
        c[i][j] = s * a[i][j];
    }
    return new Matrix(c);
  },
  multiply: function(matrix) {
    if (this.columnSize !== matrix.rowSize)
      throw new Error('Cannot multiply a matrix whose row size does not equal to this matrix\'s column size.');
    var m = this.rowSize,
        n = this.columnSize,
        p = matrix.columnSize,
        a = this.elements,
        b = matrix.elements,
        c = [],
        cij;
    for (var i = 0; i < m; ++i) {
      c[i] = [];
      for (var j = 0; j < p; ++j) {
        cij = 0;
        for (var r = 0; r < n; ++r)
          cij += a[i][r] * b[r][j];
        c[i][j] = cij;
      }
    }
    return new Matrix(c);
  }
}

function Bezier(points) {
  this.points = points;
}
Bezier.epsilon = 1e-6;
Bezier.prototype = {
  pointAtT: function(t) {
    return Vector.polynomial(t, this.coefficients());
  },
  coefficients: function() {
    if (!this._coefficients) {
      var p = this.points, n = p.length;
      switch (n) {
      case 2:
        var p0 = p[0], p1 = p[1];
        this._coefficients = [p0, p1.subtract(p0)];
        break;
      case 3:
        var p0 = p[0], p1 = p[1], p2 = p[2],
            p10 = p1.subtract(p0), p21 = p2.subtract(p1);
        this._coefficients = [p0, p10.scale(2), p21.subtract(p10)];
        break;
      case 4:
        var p0 = p[0], p1 = p[1], p2 = p[2], p3 = p[3],
            p10 = p1.subtract(p0), p21 = p2.subtract(p1), p32 = p3.subtract(p2),
            p21_10 = p21.subtract(p10), p32_21 = p32.subtract(p21);
        this._coefficients =
          [p0, p10.scale(3), p21_10.scale(3), p32_21.subtract(p21_10)];
        break;
      }
    }
    return this._coefficients;
  },
  derivativeAtT: function(t) {
    return Vector.polynomial(t, this.derivativeCoefficients());
  },
  derivativeCoefficients: function() {
    if (!this._derivativeCoefficients) {
      var c = this.coefficients(), n = c.length;
      switch (n) {
      case 2:
        this._derivativeCoefficients = [c[1]];
        break;
      case 3:
        this._derivativeCoefficients = [c[1], c[2].scale(2)];
        break;
      case 4:
        this._derivativeCoefficients = [c[1], c[2].scale(2), c[3].scale(3)];
        break;
      }
    }
    return this._derivativeCoefficients;
  },
  secondDerivativeAtT: function(t) {
    return Vector.polynomial(t, this.secondDerivativeCoefficients());
  },
  secondDerivativeCoefficients: function() {
    if (!this._secondDerivativeCoefficients) {
      var c = this.coefficients(), n = c.length;
      switch (n) {
      case 2:
        this._secondDerivativeCoefficients = [0];
        break;
      case 3:
        this._secondDerivativeCoefficients = [c[2].scale(2)];
        break;
      case 4:
        this._secondDerivativeCoefficients = [c[2].scale(2), c[3].scale(6)];
        break;
      }
    }
    return this._secondDerivativeCoefficients;
  },
  inflectionPointTs: function(includeEnds) {
    // http://www.caffeineowl.com/graphics/2d/vectorial/cubic-inflexion.html
    var coef = this.coefficients(), n = coef.length;
    switch (n) {
    case 2:
    case 3:
      return [];
    case 4:
      var oneThird = 1 / 3,
        a = coef[1].scale(oneThird), b = coef[2].scale(oneThird), c = coef[3];
        roots = realRootsOfQuadraticEquation(
          b.crossProductZ(c), a.crossProductZ(c), a.crossProductZ(b));
      var predicate = includeEnds ?
        function(t) { return 0 <= t && t <= 1; } :
        function(t) { return Bezier.epsilon <= t && t <= 1 - Bezier.epsilon; };
      return filterValues(roots, predicate);
    }
  },
  subdivideAtInfectionPoints: function() {
    var ts = this.inflectionPointTs(), n = ts.length;
    switch (n) {
    case 0:
      return [this];
    case 1:
      return this.subdivideAtT(ts[0]);
    case 2:
      var t1 = ts[1], segments = this.subdivideAtT(t1);
      return segments[0].subdivideAtT(ts[0] / t1).concat(segments[1]);
    }
  },
  intermediatePointsAtT: function(t) {
    var newPoints = [], points = this.points, n = points.length;
    for (var i = 0; i < n - 1; ++i)
      newPoints.push(new Bezier([points[i], points[i + 1]]).pointAtT(t));
    return newPoints;
  },
  subdivideAtT: function(t) {
    var p = this.points, n = p.length;
    switch (n) {
    case 2:
      var q = this.pointAtT(t);
      return [new Bezier([p[0], q]), new Bezier(q, p[1])];
    case 3:
      var q = this.intermediatePointsAtT(t),
          r = new Bezier(q).pointAtT(t);
      return [new Bezier([p[0], pp[0], r]), new Bezier([r, pp[1], p[2]])];
    case 4:
      var q = this.intermediatePointsAtT(t),
          r = new Bezier(q).intermediatePointsAtT(t),
          s = new Bezier(r).pointAtT(t);
      return [new Bezier([p[0], q[0], r[0], s]),
        new Bezier([s, r[1], q[2], p[3]])];
    }
  },
  calcCurveLength: function() {
//    if (this.inflectionPointTs().length > 0) {
//      var segments = this.subdivideAtInfectionPoints();
//      var length = 0;
//      for (var i = 0, n = segments.length; i < n; ++i)
//        length += segments[i].calcCurveLength();
//      return length;
//    }

    var segments = this.segments();
    return segments[segments.length - 1].accLen;
  },
  getTAtLength: function(length) {
    var segments = this.segments();
    var index = binarySearch(segments, 'accLen', length);
    if (index == -1)
      return undefined;
    var segment = segments[index];
    var accLen = segment.accLen;
    if (length == accLen || index == segments.length - 1)
      return segment.t;
    var nextSegment = segments[index + 1];
    return calcLinearInterpolation(length, accLen, nextSegment.accLen,
        segment.t, nextSegment.t);
  },
  segments: function() {
    if (!this._segments) {
      var segments = [];
      var self = this;
      var length = calcIntegrationBySimpson(function(t) {
        var deriv = self.derivativeAtT(t);
        var derivLen = deriv.length();
        segments.push({t: t, deriv: deriv, derivLen: derivLen});
        return derivLen;
      }, 0, 1, Bezier.epsilon);

      segments.sort(function(a, b) { return a.t - b.t; });

      var n = segments.length, h = 1 / (n - 1);
      var derivLen0 = segments[0].derivLen;
      var sumOdd = 0, sumEven = 0;
      var i = 0;
      segments[i].len = 0;
      while (++i < n) {
        var derivLen = segments[i].derivLen;
        segments[i].accLen =
          h / 3 * (derivLen0 + 4 * sumOdd + 2 * sumEven + derivLen);
        if (i % 2)
          sumOdd += derivLen;
        else
          sumEven += derivLen;
      }
      this._segments = segments;
    }
    return this._segments;
  }
};

// a * x^2 + b * x + c = 0
function realRootsOfQuadraticEquation(a, b, c) {
  // http://en.wikipedia.org/wiki/Quadratic_equation
  var dis = b * b - 4 * a * c;
  //console.log('realRootsOfQuadraticEquation a=' + a + ', b=' + b + ', c=' + c + ', dis=' + dis);
  if (dis > 0) {
    var sgn = b > 0 ? 1 : -1,
        t = -0.5 * (b + sgn * Math.sqrt(dis)),
        x1 = t / a,
        x2 = c / t;
    return x1 < x2 ? [x1, x2] : [x2, x1];
  }
  else if (dis == 0)
    return [-0.5 * b / a];
  else
    return [];
}

function calcIntegrationBySimpson(f, a, b, epsilon) {
  // http://en.wikipedia.org/wiki/Simpson%27s_rule
  var n = 2;
  var h = (b - a) / n;
  var sumEnds = f(a) + f(b);
  var sumOdd = f(a + h);
  var oldResult = h / 3 * (sumEnds + 4 * sumOdd);
  var sumEven = 0;
  while (true) {
    n = 2 * n;
    h = 0.5 * h;
    sumEven += sumOdd;
    sumOdd = 0;
    for (var i = 1; i < n; i += 2)
      sumOdd += f(a + h * i);
    newResult = h / 3 * (sumEnds + 4 * sumOdd + 2 * sumEven);
    if (Math.abs((newResult - oldResult) / oldResult) < epsilon)
      break;
    oldResult = newResult;
  }
//console.log('simpson n=' + n + ', Result=' + newResult);
  return newResult;
}

function filterValues(values, predicate) {
  if (values) {
    var ret = [], value;
    for (var i = 0, n = values.length; i < n; ++i) {
      value = values[i];
      if (predicate(value))
        ret.push(value);
    }
    return ret;
  }
  else
    return values;
}

function binarySearch(mappings, searchIndex, searchValue) {
  // http://en.wikipedia.org/wiki/Binary_search_algorithm
  var iMin = 0, iMax = mappings.length - 1, iMid, midValue;
  if (searchValue < mappings[iMin][searchIndex] ||
      searchValue > mappings[iMax][searchIndex])
    return -1;
  do {
    iMid = Math.floor((iMin + iMax) / 2);
    midValue = mappings[iMid][searchIndex];
    if (searchValue > midValue)
      iMin = iMid + 1;
    else
      iMax = iMid - 1;
  } while (midValue !== searchValue && iMin <= iMax);
  return iMid;
}

function calcLinearInterpolation(x, x0, x1, y0, y1) {
  // http://en.wikipedia.org/wiki/Linear_interpolation
  return y0 + (x - x0) * (y1 - y0) / (x1 - x0);
}

return {
  Vector: Vector,
  Matrix: Matrix,
  Bezier: Bezier,
  realRootsOfQuadraticEquation: realRootsOfQuadraticEquation,
  calcIntegrationBySimpson: calcIntegrationBySimpson,
  filterValues: filterValues
};
  
}();
