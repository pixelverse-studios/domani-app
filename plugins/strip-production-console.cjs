/* global module */
// Remove log arguments as well as calls so private values never enter release logs.
module.exports = function ({ types: t }) {
  return {
    visitor: {
      CallExpression(path) {
        const callee = path.node.callee
        if (
          t.isMemberExpression(callee) &&
          t.isIdentifier(callee.object, { name: 'console' }) &&
          !path.scope.hasBinding('console')
        ) {
          path.replaceWith(t.unaryExpression('void', t.numericLiteral(0)))
        }
      },
    },
  }
}
