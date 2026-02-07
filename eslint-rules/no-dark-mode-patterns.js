/**
 * ESLint rule: no-dark-mode-patterns
 *
 * Prevents dark mode patterns that were removed during the sage theme migration:
 * - isDark ternaries (isDark ? ... : ...)
 * - dark: Tailwind prefixes in className strings
 *
 * These should be zero after the color-redesign milestone.
 */

/* eslint-env node */
/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow dark mode patterns (isDark ternaries, dark: prefixes)',
    },
    messages: {
      noIsDarkTernary:
        'Remove isDark ternary — the app uses a single light theme. Use useAppTheme() for colors.',
      noDarkPrefix:
        'Remove "dark:" Tailwind prefix — the app uses a single light theme. Use semantic classes like text-content-primary instead.',
    },
    schema: [],
  },
  create(context) {
    return {
      // Catch: isDark ? x : y
      ConditionalExpression(node) {
        if (
          node.test.type === 'Identifier' &&
          node.test.name === 'isDark'
        ) {
          context.report({ node: node.test, messageId: 'noIsDarkTernary' })
        }
      },

      // Catch: className="... dark:bg-gray-800 ..."
      Literal(node) {
        if (typeof node.value === 'string' && /\bdark:/.test(node.value)) {
          context.report({ node, messageId: 'noDarkPrefix' })
        }
      },
      TemplateLiteral(node) {
        for (const quasi of node.quasis) {
          if (/\bdark:/.test(quasi.value.raw)) {
            context.report({ node, messageId: 'noDarkPrefix' })
            break
          }
        }
      },
    }
  },
}
