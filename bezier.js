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
  epsilon: 1e-6,
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
    var points = [this.pointAtT(0), this.pointAtT(1)];
    var segments = [
      {endT: 1, len: this.lengthBetweenPoints(points[0], points[1])}
    ];
    var accLen = segments[0].len;
    var newAccLen;
    while (true) {
      var i = this.findMaxLengthSegmentIndex(segments);
      var t = ((i === 0 ? 0 : segments[i - 1].endT) + segments[i].endT) / 2;
      var newPoint = this.pointAtT(t);
      var newSegment1 = {
        endT: t,
        len: this.lengthBetweenPoints(points[i], newPoint)
      };
      var newSegment2 = {
        endT: segments[i].endT,
        len: this.lengthBetweenPoints(newPoint, points[i + 1])
      };

      points.splice(i + 1, 0, newPoint);
      segments.splice(i, 1, newSegment1, newSegment2);
      newAccLen = this.updateSegmentsAccLen(segments);
console.log('segmentCount=' + segments.length + ', curveLen=' + newAccLen);
      if (Math.abs(newAccLen - accLen) / accLen < this.epsilon)
        break;

      accLen = newAccLen;
    }

    this.points = points;
    this.segments = segments;
    this.curveLength = accLen;
  },
  isConvergent: function(value, prevValue) {
    return Math.abs((value - prevValue) / prevValue) < this.epsilon;
  },
  lengthBetweenPoints: function(p0, p1) {
    return p1.minus(p0).length();
  },
  findMaxLengthSegmentIndex: function(segments) {
    var i = iMax = 0;
    var lenMax = segments[i].len;
    for (++i, n = segments.length; i < n; ++i) {
      var len = segments[i].len;
      if (len > lenMax) {
        lenMax = len;
        iMax = i;
      }
    }
    return iMax;
  },
  updateSegmentsAccLen: function(segments) {
    var accLen = 0;
    for (var i = 0, n = segments.length; i < n; ++i) {
      var segment = segments[i];
      accLen += segment.len;
      segment.accLen = accLen;
    }
    return accLen;
  }
};
