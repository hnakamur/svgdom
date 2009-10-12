function testNumeric() {

  module('numeric');

  test('machine epsilon', function() {
    equals(numeric.MACHINE_EPSILON,
      function calcMachineEpsilon() {
        // http://en.wikipedia.org/wiki/Machine_epsilon
        // 1. Search the smallest exactly representable number greater than one.
        // 2. Return the difference between 1 and the value as the machine
        //    epsilon.
        var one = 1,
            num = one + 1e-15;
        while (true) {
          var num2 = (one + num) / 2;
          if (num2 === one)
            return num - one;
          num = num2;
        }
      }(),
      'machine epsilon: x - 1 for min(x) where x > 1');

    // By the way, the unit round off is the same value as the machine epsilon.
    equals(numeric.MACHINE_EPSILON,
      function calcUnitRoundoff() {
        // http://en.wikipedia.org/wiki/Machine_epsilon
        // Calculate the unit round off: the smallest positive number which,
        // when added to 1, yields a result other than one.
        var machEps = 1;
        do {
          machEps /= 2;
        } while (1 + machEps / 2 !== 1);
        return machEps;
      }(),
      'unit roundoff: min(x) where 1 + x > 1');
  });

  test('sortBy', function() {
    var actual = numeric.sortBy([1, -3, -2], function(x) {
      return -Math.abs(x);
    });
    equals(actual.join(', '), '-3, -2, 1', 'ordered by abs(x) desc');
  });

  test('quadratic equation (no real root)', function() {
    var eqn = new numeric.QuadraticEquation(1, 0, 1);
    var roots = eqn.realRoots();
    equals(roots.length, 0, 'count of real roots');
  });

  test('quadratic equation (one real root)', function() {
    var eqn = new numeric.QuadraticEquation(1, 2, 1);
    var roots = eqn.realRoots();
    equals(roots.length, 1, 'count of real roots');
    equals(roots[0], -1, 'root value');
    equals(eqn.valueAt(roots[0]), 0, 'equation value at root');
  });

  test('quadratic equation (two real roots)', function() {
    var eqn = new numeric.QuadraticEquation(1, -3, 2);
    var roots = eqn.realRoots();
    equals(roots.length, 2, 'count of real roots');
    equals(roots[0], 1, 'root value #1');
    equals(roots[1], 2, 'root value #2');
    equals(eqn.valueAt(roots[0]), 0, 'equation value at root #1');
    equals(eqn.valueAt(roots[1]), 0, 'equation value at root #2');
  });

  test('quadratic equation (very close two real roots)', function() {
    var eqn = new numeric.QuadraticEquation(
      1, 2 * (1 + numeric.MACHINE_EPSILON), 1);
    var roots = eqn.realRoots();
    equals(roots.length, 2, 'count of real roots');
console.log('roots[0]=' + roots[0]);
console.log('roots[1]=' + roots[1]);
    equals(eqn.valueAt(roots[0]), 0, 'equation value at root #1');
    equals(eqn.valueAt(roots[1]), 0, 'equation value at root #2');
  });

  test('quadratic equation (for case ac << b^2)', function() {
    var eqn = new numeric.QuadraticEquation(1, -(1e8 + 1), 1);
    var roots = eqn.realRoots();
    equals(roots.length, 2, 'count of real roots');
console.log('roots[0]=' + roots[0]);
console.log('roots[1]=' + roots[1]);
    equals(eqn.valueAt(roots[0]), 0, 'equation value at root #1');
    equals(eqn.valueAt(roots[1]), 0, 'equation value at root #2');
  });
}
