var numeric = function() {

// References:
// [1] What Every Computer Scientist Should Know About Floating-Point Arithmetic
//     http://docs.sun.com/source/806-3568/ncg_goldberg.html

var MACHINE_EPSILON = 2.220446049250313e-16;

// a * x^2 + b * x + c = 0
function QuadraticEquation(a, b, c) {
  this.a = a;
  this.b = b;
  this.c = c;
}
var proto = QuadraticEquation.prototype;
proto.valueAt = function(x) {
//console.log('x = ' + x);
//console.log('a * x = ' + this.a * x);
//console.log('b = ' + this.b);
//console.log('a * x + b = ' + (this.a * x + this.b));
//console.log('(a * x + b) * x = ' + (this.a * x + this.b) * x);
//console.log('c = ' + this.c);
//console.log('(a * x + b) * x + c = ' + ((this.a * x + this.b) * x + this.c));
//  return (this.a * x + this.b) * x + this.c; // instable for roots when a * c << b^2

//console.log('x = ' + x);
//console.log('c = ' + this.c);
//console.log('a * x * x = ' + this.a * x * x);
//console.log('a * x * x + c = ' + (this.a * x * x + this.c));
//console.log('b * x = ' + (this.b * x));
//console.log('a * x * x + c + b * x= ' + (this.a * x * x + this.c + this.b * x));
//  return (this.a * x * x + this.c + this.b * x);

//  return this.a * x * x + this.b * x + this.c;
  return sum([this.a * x * x, this.b * x, this.c]);
};
proto.derivAt = function(x) {
  return 2 * this.a * x + this.b;
};
proto.realRoots = function() {
  // http://en.wikipedia.org/wiki/Quadratic_equation
  var dis = this.discriminant();
//console.log('a=' + this.a + ', b=' + this.b + ', c=' + this.c + ', dis=' + dis);
  if (dis > 0) {
    var a = this.a, b = this.b, c = this.c,
        sgn = b > 0 ? 1 : -1,
        t = -0.5 * (b + sgn * Math.sqrt(dis)),
        x1 = t / a,
        x2 = c / t;
        y1 = this.valueAt(x1),
        y2 = this.valueAt(x2);

//    if (y1 || y2) {
//      var m = new NewtonRaphsonMethod(
//        bind(this.valueAt, this),
//        bind(this.derivAt, this));
//      var eps = 1e-12;
//      if (y1)
//        x1 = m.findOneRoot(x1, eps);
//      if (y2)
//        x2 = m.findOneRoot(x2, eps);
//    }
    //x1 = -0.5 * (b + Math.sqrt(dis));
    //x2 = -0.5 * (b - Math.sqrt(dis));
    return x1 < x2 ? [x1, x2] : [x2, x1];
  }
  else if (dis === 0)
    return [-0.5 * this.b / this.a];
  else
    return [];
};
proto.discriminant = function() {
  return this.b * this.b - 4 * this.a * this.c;
};

function NewtonRaphsonMethod(func, derivFunc) {
  this.func = func;
  this.derivFunc = derivFunc;
}
var proto = NewtonRaphsonMethod.prototype;
proto.findOneRoot = function(guess, epsilon) {
  console.log('findOneRoot initial guess=' + guess);
  var f = this.func, df = this.derivFunc, i = -1;
  while (++i < proto.findOneRoot.MaxIteration) {
    var nextGuess = guess - f(guess) / df(guess);
    console.log('guess=' + guess + ' next=' + nextGuess);
    if (numberEquals(nextGuess, guess, epsilon))
      return nextGuess;
    guess = nextGuess;
  }
  throw new Error('Iteration count reached the limit.');
}
proto.findOneRoot.MaxIteration = 1000;

function numberEquals(x, y, epsilon) {
  return epsilon ? Math.abs(x - y) <= epsilon : x === y;
}

function sum(values) {
  var n = values.length;
  switch (n) {
  case 0:
    return 0;
  case 1:
    return values[0];
  case 2:
    return values[0] + values[1];
  default:
    return sum.addAlgorithm(values);
  }
}
sum.addWithKahanAlgorithm = function(values) {
  // OK: Firefox 3.5.3
  // NG: Safari 4.0.3 (6531.9), Chrome 4.0.221.8
  var s = values[0],
      c = 0,
      y, t;
  for (var j = 1, n = values.length; j < n; ++j) {
    y = values[j] - c;
    t = s + y;
    c = (t - s) - y;
    s = t;
  }
  return s;
}
sum.addWithSortAndAddAlgorithm = function(values) {
  // When we add floating point numbers, we should avoid undesireable effects
  // which cause loss of significant bits:
  // - Round-off error
  //   - Caused by additions of two values whose exponents are very different.
  //     The bits of the value with smaller exponent are lost.
  // - Cancellation
  //   - Caused by subtractions of nearly equal values or additions of 
  //     values with different signs and near absolutes.
  //
  // The algorithm implemented here:
  // - Calculate the sum of negative values and positive values separately
  //   in order to avoid cancellations.
  // - When adding the values of same sign, first sort them by the absolute
  //   values in ascending order.
  //
  // http://en.wikipedia.org/wiki/Floating_point
  // http://en.wikipedia.org/wiki/Numerical_stability
  // http://en.wikipedia.org/wiki/Loss_of_significance

  values = values.concat().sort(sum.compareFunc);
  var n = values.length;

  var positiveStart = 0;
  while (positiveStart < n && values[positiveStart] < 0)
    ++positiveStart;

  var negativeSum = 0;
  for (var i = positiveStart - 1; i >= 0; --i)
    negativeSum += values[i];

  var positiveSum = 0;
  for (i = positiveStart; i < n; ++i)
    positiveSum += values[i];

  return positiveSum + negativeSum;
};
sum.compareFunc = function(a, b) { return a - b; };
sum.addWithNaiveAlgorithm = function(values) {
  var total = 0;
  for (var i = 0, n = values.length; i < n; ++i)
    total += values[i];
  return total;
};
sum.addAlgorithm = sum.addWithSortAndAddAlgorithm;
//sum.addAlgorithm = sum.addWithKahanAlgorithm;

//function filter(values, func) {
//  var ret = [];
//  for (var i = 0, n = values.length; i < n; ++i) {
//    var value = values[i];
//    if (func(value))
//      ret.push(value);
//  }
//}

function sortBy(values, func) {
  var n = values.length;
  if (n <= 1)
    return values;

  var buf = [];
  for (var i = 0; i < n; ++i) {
    var value = values[i];
    buf[i] = {v: value, c: func(value)};
  }
  buf.sort(isArray(buf[0].c) ? sortBy.compareArray : sortBy.compareValue);

  var result = [];
  for (var i = 0; i < n; ++i)
    result[i] = buf[i].v;
  return result;
}
sortBy.compareValue = function(a, b) {
  var ac = a.c, bc = b.c;
  return ac < bc ? -1 : ac > bc ? 1 : 0;
}
sortBy.compareArray = function(a, b) {
  var n = a.length;
  for (var i = 0; i < n; ++i) {
    var d = sortBy.compareValue(a[i], b[i]);
    if (d)
      return d;
  }
  return 0;
}

var toString = Object.prototype.toString;
function isArray(obj) {
  return toString.call(obj) === '[object Array]';
}

function bind(func, obj) {
  return function() {
    return func.apply(obj, arguments);
  }
}

/*
 * Multi-dimensional (2, 3, ...) immutable vector.
 * - elements: a vector whose dimension >= 2
 * - x, y    : a vector whose dimension = 2
 * - x, y, z : a vector whose dimension = 3
 */
function Vector(x, y, z) {
  switch (arguments.length) {
  case 1:
    if (!isArray(x) || x.length < 2)
      throw new Error('An component array with 2 or greater dimension is expected.');
    this.components = x;
    break;
  case 2:
    this.components = [x, y];
    break;
  case 3:
    this.components = [x, y, z];
    break;
  }
}
Vector.sum = function(vectors) {
  var vecCount = vectors.length, comps = [];
  for (var i = 0, dim = this.dimension(); i < dim; ++i) {
    var ithComps = [];
    for (var j = 0; j < vecCount; ++j) {
      ithComps.push(vectors[j].component(i));
    }
    comps.push(sum(ithComps));
  }
  return new Vector(comps);
};
var proto = Vector.prototype;
proto.dimension = function() {
  return this.components.length;
}
proto.component = function(i) {
  return this.components[i];
}
proto.x = function() {
  return this.components[0];
};
proto.y = function() {
  return this.components[1];
};
proto.z = function() {
  return this.components[2];
};
proto.equals = function(vec, componentEqualsFunc) {
  var dim = this.dimension();
  if (vec.dimension() !== dim)
    return false;
  if (!componentEqualsFunc)
    componentEqualsFunc = numberEquals;
  for (var i = 0; i < dim; ++i) {
    if (!componentEqualsFunc(this.component(i), vec.component(i)))
      return false;
  }
  return true;
};
proto.length = function() {
  return Math.sqrt(this.dotProduct(this));
};
proto.add = function(vectorB) {
  var dim = this.dimension();
  if (vectorB.dimension() !== dim)
    throw new Error('Vector dimension unmatch.');
  var comps = [];
  for (var i = 0; i < dim; ++i)
    comps.push(this.component(i) + vectorB.component(i));
  return new Vector(comps);
};
proto.subtract = function(vectorB) {
  var dim = this.dimension();
  if (vectorB.dimension() !== dim)
    throw new Error('Vector dimension unmatch.');
  var comps = [];
  for (var i = 0; i < dim; ++i)
    comps.push(this.component(i) - vectorB.component(i));
  return new Vector(comps);
};
proto.scalarMult = function(factor) {
  var dim = this.dimension();
  var comps = [];
  for (var i = 0; i < dim; ++i)
    comps.push(this.component(i) * factor);
  return new Vector(comps);
};
proto.scalarDiv = function(factor) {
  var dim = this.dimension();
  var comps = [];
  for (var i = 0; i < dim; ++i)
    comps.push(this.component(i) / factor);
  return new Vector(comps);
};
proto.dotProduct = function(vectorB) {
  var dim = this.dimension();
  if (vectorB.dimension() !== dim)
    throw new Error('Vector dimension unmatch.');
  var terms = [];
  for (var i = 0; i < dim; ++i)
    terms.push(this.component(i) * vectorB.component(i));
  return sum(terms);
};
proto.crossProduct = function(vectorB) {
  // Calculate cross product of this vector and vectorB.
  // Two dimensional vectors is treated as three dimensional vectors with
  // z-component = 0.
  //
  // http://en.wikipedia.org/wiki/Cross_product
  // http://en.wikipedia.org/wiki/Seven-dimensional_cross_product
  var dim = this.dimension(),
      bDim = vectorB.dimension();
  if ((dim === 2 || dim === 3) && (bDim === 2 || bDim === 3)) {
    var ax = this.x(), ay = this.y(), az = this.z() || 0,
        bx = vectorB.x(), by = vectorB.y(), bz = vectorB.z() || 0;
    return new Vector(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx);
  }
  else if (dim === 7 && bDim === 7) {
    var a1 = this.component(0), a2 = this.component(1),
        a3 = this.component(2), a4 = this.component(3),
        a5 = this.component(4), a6 = this.component(5),
        a7 = this.component(6),
        b1 = vectorB.component(0), b2 = vectorB.component(1),
        b3 = vectorB.component(2), b4 = vectorB.component(3),
        b5 = vectorB.component(4), b6 = vectorB.component(5),
        b7 = vectorB.component(6);
    return new Vector([
      sum([x2 * y4, -x4 * y2, x3 * y7, -x7 * y3, x5 * y6, -x6 * y5]),
      sum([x3 * y5, -x5 * y3, x4 * y1, -x1 * y4, x6 * y7, -x7 * y6]),
      sum([x4 * y6, -x6 * y4, x5 * y2, -x2 * y5, x7 * y1, -x1 * y7]),
      sum([x5 * y7, -x7 * y5, x6 * y3, -x3 * y6, x1 * y2, -x2 * y1]),
      sum([x6 * y1, -x1 * y6, x7 * y4, -x4 * y7, x2 * y3, -x3 * y2]),
      sum([x7 * y2, -x2 * y7, x1 * y5, -x5 * y1, x3 * y4, -x4 * y3]),
      sum([x1 * y3, -x3 * y8, x2 * y6, -x6 * y2, x4 * y5, -x5 * y4])
    ]);
  }
  else
    throw new Error('Cross product is supported for 2, 3 or 7 dimensional vectors only.');
};

return {
  MACHINE_EPSILON: MACHINE_EPSILON,
  bind: bind,
  numberEquals: numberEquals,
  sum: sum,
  sortBy: sortBy,
  QuadraticEquation: QuadraticEquation,
  Vector: Vector
};

}();
