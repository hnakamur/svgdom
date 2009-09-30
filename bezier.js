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
  unit: function() {
    return this.scale(1 / this.length());
  }
}

function Bezier(controlPoints) {
  this.controlPoints = controlPoints;
  this.order = controlPoints.length - 1;
  this.coefficients = this.calcCoefficients(controlPoints);
}
Bezier.prototype = {
  epsilon: 1e-2,
  calcCoefficients: function(p) {
    switch (p.length - 1) {
    case 1:
      var p0 = p[0], p1 = p[1];
      return [p0, p1.minus(p0)];
    case 2:
      var p0 = p[0], p1 = p[1], p2 = p[2];
      var p10 = p1.minus(p0), p21 = p2.minus(p1);
      return [p0, p10.scale(2), p21.minus(p10)];
    case 3:
      var p0 = p[0], p1 = p[1], p2 = p[2], p3 = p[3];
      var p10 = p1.minus(p0), p21 = p2.minus(p1), p32 = p3.minus(p2);
      var p21_10 = p21.minus(p10), p32_21 = p32.minus(p21);
      return [p0, p10.scale(3), p21_10.scale(3), p32_21.minus(p21_10)];
    default:
      throw new Error("Number of control points must be 2, 3, or 4.");
    }
  },
  pointAtT: function(t) {
    var c = this.coefficients, n = this.order;
    var p = c[n];
    for (var i = n - 1; i >= 0; --i)
      p = c[i].plus(p.scale(t));
    return p;
  },
  divideToSegments: function() {
    if (this.segmentPoints) {
      for (var i = 0, n = this.segmentPoints.length; i < n; ++i) {
        var j = 2 * i + 1;
        var t = j / (2 * n);
        this.segmentPoints.splice(j, 0, this.pointAtT(t));
      }
    }
    else
      this.segmentPoints = [this.pointAtT(0), this.pointAtT(1)];

    this.segmentLengths = this.calcSegmentLengths(this.segmentPoints);
    var curveLength = this.sum(this.segmentLengths);
console.log('segmentCount=' + this.segmentLengths.length + ', curveLength=' + curveLength);
    var convergent = this.isConvergent(curveLength, this.curveLength);
    this.curveLength = curveLength;
    if (!convergent)
      this.divideToSegments();
  },
  isConvergent: function(value, prevValue) {
    return prevValue && Math.abs((value - prevValue) / prevValue) < this.epsilon;
  },
  calcSegmentLengths: function(points) {
    var l = this.segmentLengths = [];
    for (var i = 0, n = points.length - 1; i < n; ++i) {
      l.push(points[i + 1].minus(points[i]).length());
    }
    return l;
  },
  sum: function(values) {
    var ret = 0;
    for (var i = 0, n = values.length; i < n; ++i)
      ret += values[i];
    return ret;
  }
};
