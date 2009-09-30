function determinant(m) {
  var order = m.length;
  if (order === 2)
    return m[0][0] * m[1][1] - m[0][1] * m[1][0];

  var sum = 0;
  var sign = 1;
  for (var i = 0; i < order; ++i) {
    var mi0 = m[i][0];
    if (mi0 !== 0)
      sum += sign * mi0 * determinant(minorMatrix(m, i, 0));
    sign *= -1;
  }
  return sum;
}

function minorMatrix(m, i, j) {
  var order = m.length;
  var b = [];
  for (var k = 0; k < order; ++k) {
    if (k !== i) {
      var row = [];
      for (var l = 0; l < order; ++l) {
        if (l !== j)
          row.push(m[k][l]);
      }
      b.push(row);
    }
  }
  return b;
}
// http://en.wikipedia.org/wiki/Cofactor_expansion
