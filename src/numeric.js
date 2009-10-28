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

// sum(c[i] * t^i) (i=0..n)
function Polynominal(coefficients) {
  this.coefficients = coefficients;
}
Polynominal.resultant = function(f, g) {
  var degree = Math.max(f.degree(), g.degree()),
      a = f.expandDegree(degree).coefficients,
      b = g.expandDegree(degree).coefficients;
  function ab(i, j) {
    return a[i] * b[j] - a[j] * b[i];
  }

  switch (degree) {
  case 1:
    return ab(1, 0);
  case 2:
    var a2b1 = ab(2, 1), a2b0 = ab(2, 0),
        a1b0 = ab(1, 0);
    return Matrix.det2by2(a2b1, a2b0, a2b0, a1b0);
  case 3:
    var a3b2 = ab(3, 2), a3b1 = ab(3, 1), a3b0 = ab(3, 0),
        a2b1 = ab(2, 1), a2b0 = ab(2, 0),
        a1b0 = ab(1, 0);
    return Matrix.det3by3(
      a3b2, a3b1, a3b0,
      a3b1, a3b0 + a2b1, a2b0,
      a3b0, a2b0, a1b0
    );
  default:
    throw new Error('Only polynominals of 3 or lower degree are supported.');
  }
}
var proto = Polynominal.prototype;
proto.degree = function() {
  return this.coefficients.length - 1;
};
proto.expandDegree = function(degree) {
  var c = this.coefficients.concat();
  for (var n = degree - this.degree(); n >= 0; --n)
    c.push(0);
  return new Polynominal(c);
};
proto.coefficient = function(degree) {
  return this.coefficients[degree] || 0;
};
proto.valueAt = function(t) {
  var terms = [], degree = this.degree(), c = this.coefficients,
      i = 0, ti = 1;
  while (true) {
    terms.push(c[i] * ti);
    if (++i > degree)
      break;
    ti *= t;
  }
  return sum(terms);
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

function sum(values, addAlgorithm) {
  return (addAlgorithm || sum.defaultAddAlgorithm)(values);
}
sum.addWithKahanAlgorithm = function(values) {
  // OK: Firefox 3.5.3
  // NG: Safari 4.0.3 (6531.9), Chrome 4.0.221.8
  var n = values.length;
  if (n === 0)
    return 0;
  var s = values[0],
      c = 0,
      y, t;
  for (var j = 1; j < n; ++j) {
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

  var n = values.length;
  switch (n) {
  case 0:
    return 0;
  case 1:
    return values[0];
  case 2:
    return values[0] + values[1];
  default:
    values = values.concat().sort(sum.compareFunc);

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
  }
};
sum.compareFunc = function(a, b) { return a - b; };
sum.addWithNaiveAlgorithm = function(values) {
  var total = 0;
  for (var i = 0, n = values.length; i < n; ++i)
    total += values[i];
  return total;
};
sum.defaultAddAlgorithm = sum.addWithSortAndAddAlgorithm;
//sum.defaultAddAlgorithm = sum.addWithKahanAlgorithm;

//function filter(values, func) {
//  var ret = [];
//  for (var i = 0, n = values.length; i < n; ++i) {
//    var value = values[i];
//    if (func(value))
//      ret.push(value);
//  }
//}

function integral(f, a, b, relativeEps, algorithm) {
  (algorithm || integral.defaultAlgorithm)(f, a, b, relativeEps);
}
integral.simpsonAlgorithm = function(f, a, b, relativeEps) {
  // http://en.wikipedia.org/wiki/Simpson%27s_rule
  var n = 2;
  var h = (b - a) / n;
  var endValues = [f(a), f(b)];
  var oddValuesTimes4 = [4 * f(a + h)];
  var oldResult = h / 3 * sum(endValues.concat(oddValuesTimes4));
  var evenValuesTimes2 = [];
  while (true) {
    n *= 2;
    h /= 2;
    for (var i = 0, m = oddValuesTimes4.length; i < m; ++i)
      evenValuesTimes2.push(oddValuesTimes4[i] / 2);
    oddValuesTimes4 = [];
    for (var i = 1; i < n; i += 2)
      oddValuesTimes4.push(4 * f(a + h * i));
    newResult = h / 3 * sum(
      endValues.concat(oddValuesTimes4, evenValuesTimes2));
    if (Math.abs((newResult - oldResult) / oldResult) < relativeEps)
      break;
    oldResult = newResult;
  }
//console.log('simpson n=' + n + ', Result=' + newResult);
  return newResult;
};
integral.defaultAlgorithm = integral.simpsonAlgorithm;

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
 * - components: a vector whose dimension >= 2
 * - x, y      : a vector whose dimension = 2
 * - x, y, z   : a vector whose dimension = 3
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

function Matrix() {
  var rowSize, columnSize, elements;
  if (isArray(arguments[0])) {
    elements = arguments[0];
    rowSize = elements.length;
    columnSize = elements[0].length;
  }
  else {
    rowSize = arguments[0];
    columnSize = elements[1] || rowSize;
  }

  var m = this.rowSize = rowSize,
      n = this.columnSize = columnSize,
      a = this.elements = [];
  for (var i = 0; i < m; ++i) {
    a[i] = [];
    for (var j = 0; j < n; ++j)
      a[i][j] = elements ? elements[i][j] : 0;
  }
}
Matrix.identity = function(dimension) {
  var A = new Matrix(dimension, dimension),
      a = A.elements;
  for (var i = 0; i < dimension; ++i)
    a[i][i] = 1;
  return A;
};
Matrix.det2by2 = function(a, b, c, d) {
  return a * d - b * c;
};
Matrix.det3by3 = function(a, b, c, d, e, f, g, h, i) {
  return sum(
    [a * e * i, -a * f * h, b * f * g, -b * d * i, c * d * h, -c * e * g]);
};
var proto = Matrix.prototype;
proto.isSameSize = function(matrix) {
  return this.rowSize === matrix.rowSize &&
      this.columnSize === matrix.columnSize;
};
proto.isSquare = function() {
  return this.rowSize === this.columnSize;
};
proto.clone = function() {
  return new Matrix(this.elements);
};
proto.forEach = function(callback) {
  var m = this.rowSize,
      n = this.columnSize,
      a = this.elements;
  for (var i = 0; i < m; ++i) {
    for (var j = 0; j < n; ++j)
      callback(a[i][j], i, j, a);
  }
};
proto.add = function(matrix) {
  if (!this.isSameSize(matrix))
    throw new Error('Cannot add a matrix of different size.');
  var A = this.clone(),
      b = matrix.elements;
  A.forEach(function(aij, i, j, a) {
    a[i][j] += b[i][j];
  });
  return A;
};
proto.subtract = function(matrix) {
  if (!this.isSameSize(matrix))
    throw new Error('Cannot subtract a matrix of different size.');
  var A = this.clone(),
      b = matrix.elements;
  A.forEach(function(aij, i, j, a) {
    a[i][j] -= b[i][j];
  });
  return A;
};
proto.scaleMult = function(factor) {
  if (!this.isSameSize(matrix))
    throw new Error('Cannot subtract a matrix of different size.');
  var A = this.clone(),
      b = matrix.elements;
  A.forEach(function(aij, i, j, a) {
    a[i][j] *= factor;
  });
  return A;
};
proto.scaleDiv = function(factor) {
  if (!this.isSameSize(matrix))
    throw new Error('Cannot subtract a matrix of different size.');
  var A = this.clone(),
      b = matrix.elements;
  A.forEach(function(aij, i, j, a) {
    a[i][j] /= factor;
  });
  return A;
};
proto.transpose = function() {
  var m = this.rowSize,
      n = this.columnSize,
      B = new Matrix(n, m),
      b = B.elements;
  this.forEach(function(aij, i, j, a) {
    b[j][i] = aij;
  });
  return B;
};
proto.multiply = function(matrix) {
  if (this.columnSize !== matrix.rowSize)
    throw new Error('Cannot multiply a matrix whose row size does not equal to this matrix\'s column size.');
  var m = this.rowSize,
      n = this.columnSize,
      p = matrix.columnSize,
      a = this.elements,
      b = matrix.elements,
      C = new Matrix(m, p),
      c = C.elements;
  for (var i = 0; i < m; ++i) {
    for (var j = 0; j < p; ++j) {
      for (var r = 0; r < n; ++r)
        c[i][j] += a[i][r] * b[r][j];
    }
  }
  return C;
};
proto.toString = function() {
  var m = this.rowSize,
      n = this.columnSize,
      a = this.elements,
      rows = [],
      columns;
  for (var i = 0; i < m; ++i) {
    columns = [];
    for (var j = 0; j < n; ++j) {
      columns.push(String(a[i][j]));
    }
    rows.push('[' + columns.join(' ') + ']');
  }
  return rows.join('\n');
};
proto.toReducedRowEchelonForm = function() {
  var lead = 0,
      m = this.rowSize,
      n = this.columnSize,
      a = this.elements,
      r, i, k;
  for (r = 0; r < m; ++r) {
    if (m <= lead)
      return this;

    i = r;
    while (a[i][lead] === 0) {
      ++i;
      if (m === i) {
        i = r;
        ++lead;
        if (m === lead)
          return this;
      }
    }
    if (i !== r)
      this.swapRows(i, r);

    // Divide row r by a[r][k]
    for (k = 0; k < n; ++k)
      a[r][k] /= a[r][lead];

    for (i = 0; i < m; ++i) {
      if (i !== r) {
        // Subtract a[i][lead] multiplied by row r from row i
        for (k = 0; k < n; ++k)
          a[i][k] -= a[i][lead] * a[r][k];
      }
    }
    ++lead;
  }
  return this;
};
proto.swapRows = function(i1, i2) {
  var a = this.elements,
      tmp = a[i2];
  a[i2] = a[i1];
  a[i1] = tmp;
};
proto.swapColumns = function(j1, j2) {
  var a = this.elements,
      n = this.rowCount,
      i, tmp;
  for (i = 0; i < n; ++i) {
    tmp = a[i][j1];
    a[i][j1] = a[i][j2];
    a[i][j2] = tmp;
  }
};
proto.computeLUDecompositionWithPartialPivoting = function() {
  function computeLUDecompositionWithPartialPivoting() {
    if (!this.isSquare())
      throw new Error('A non square matrix is not supported.');
    var n = this.rowSize,
        nm1 = n - 1,
//          A = this.clone(),
//          a = A.elements,
        a = this.elements,
        L = new Matrix(n),
        l = L.elements,
        U = Matrix.identity(n),
        u = U.elements,
        order = [],
        i, j, k, diag, sum;

    for (k = 0; k < n; ++k)
      order[k] = k;

    pivot(this, order, 0);
    diag = 1 / a[0][0];
    for (j = 1; j < n; ++j)
      a[0][j] *= diag;

    for (j = 1; j < nm1; ++j) {
      for (i = j; i < n; ++i) {
        sum = 0;
        for (k = 0; k < j; ++k)
          sum += a[i][k] * a[k][j];
        a[i][j] -= sum;
      }

      pivot(this, order, j);
      diag = 1 / a[j][j];
      for (k = j + 1; k < n; ++k) {
        sum = 0;
        for (i = 0; i < j; ++i)
          sum += a[j][i] * a[i][k];
        a[j][k] = (a[j][k] - sum) * diag;
      }
    }

    sum = 0;
    for (k = 0; k < nm1; ++k)
      sum += a[nm1][k] * a[k][nm1];
    a[nm1][nm1] -= sum;

    for (i = 0; i < n; ++i) {
      for (j = 0; j < n; ++j) {
        if (i < j)
          u[i][j] = a[i][j];
        else
          l[i][j] = a[i][j];
      }
    }
    return {L: L, U: U, order: order};
  }

  function pivot(self, order, k) {
    var r = findPivotRow(self, k);
    if (r !== k) {
      self.swapRows(r, k);
      order[k] = r;
    }
  }

  function findPivotRow(self, j) {
    var a = self.elements,
        m = self.rowSize,
        row = j,
        max = Math.abs(a[row][j]),
        i, absAij;
    for (i = row + 1; i < m; ++i) {
      absAij = Math.abs(a[i][j]);
      if (max < absAij) {
        row = i;
        max = absAij;
      }
    }
    return row;
  };

  computeLUDecompositionWithPartialPivoting.pivot = pivot;
  computeLUDecompositionWithPartialPivoting.findPivotRow = findPivotRow;
  return computeLUDecompositionWithPartialPivoting;
}();

return {
  MACHINE_EPSILON: MACHINE_EPSILON,
  bind: bind,
  numberEquals: numberEquals,
  sum: sum,
  integral: integral,
  sortBy: sortBy,
  QuadraticEquation: QuadraticEquation,
  Polynominal: Polynominal,
  Vector: Vector,
  Matrix: Matrix
};

}();
