var geom2d = function() {

function Vector(x, y) {
  this.x = +x;
  this.y = +y;
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
    p = constants[i].plus(p.scale(t));
  return p;
};
Vector.prototype = {
  length: function() {
    var x = this.x, y = this.y;
    return Math.sqrt(x * x + y * y);
  },
  plus: function(p) {
    return new Vector(this.x + p.x, this.y + p.y);
  },
  minus: function(p) {
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

function Bezier(points) {
  this.points = arguments.length == 1 ? points : arguments;
}
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
        this._coefficients = [p0, p1.minus(p0)];
        break;
      case 3:
        var p0 = p[0], p1 = p[1], p2 = p[2],
            p10 = p1.minus(p0), p21 = p2.minus(p1);
        this._coefficients = [p0, p10.scale(2), p21.minus(p10)];
        break;
      case 4:
        var p0 = p[0], p1 = p[1], p2 = p[2], p3 = p[3],
            p10 = p1.minus(p0), p21 = p2.minus(p1), p32 = p3.minus(p2),
            p21_10 = p21.minus(p10), p32_21 = p32.minus(p21);
        this._coefficients =
          [p0, p10.scale(3), p21_10.scale(3), p32_21.minus(p21_10)];
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
  inflectionPointTs: function() {
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
      return this._filterTs(roots);
    }
  },
  _filterTs: function(ts) {
    if (ts) {
      var ret = [], t;
      for (var i = 0, n = ts.length; i < n; ++i) {
        t = ts[i];
        if (0 <= t && t <= 1)
          ret.push(t);
      }
      return ret;
    }
    else
      return ts;
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
      newPoints.push(new Bezier(points[i], points[i + 1]).pointAtT(t));
    return newPoints;
  },
  subdivideAtT: function(t) {
    var p = this.points, n = p.length;
    switch (n) {
    case 2:
      var q = this.pointAtT(t);
      return [new Bezier(p[0], q), new Bezier(q, p[1])];
    case 3:
      var q = this.intermediatePointsAtT(t),
          r = new Bezier(q).pointAtT(t);
      return [new Bezier(p[0], pp[0], r), new Bezier(r, pp[1], p[2])];
    case 4:
      var q = this.intermediatePointsAtT(t),
          r = new Bezier(q).intermediatePointsAtT(t),
          s = new Bezier(r).pointAtT(t);
      return [new Bezier(p[0], q[0], r[0], s), new Bezier(s, r[1], q[2], p[3])];
    }
  },
  calcCurveLength: function() {
    var self = this;
    return calcIntegrationBySimpson(function(t) {
      return self.derivativeAtT(t).length();
    }, 0, 1, 1e-5);
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
    newResult = h / 3 * (sumEnds + 2 * sumEven + 4 * sumOdd);
    if (Math.abs((newResult - oldResult) / oldResult) < epsilon)
      break;
    oldResult = newResult;
  }
console.log('simpson n=' + n + ', Result=' + newResult);
  return newResult;
}

return {
  Vector: Vector,
  Bezier: Bezier,
  realRootsOfQuadraticEquation: realRootsOfQuadraticEquation,
  calcIntegrationBySimpson: calcIntegrationBySimpson
};
  
}();
