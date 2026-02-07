/**
 * ESLint rule: no-hardcoded-colors
 *
 * Prevents hardcoded hex color values in component files.
 * Use theme tokens via useAppTheme() instead.
 *
 * Allowed exceptions:
 * - '#ffffff' / '#fff' (white — common for icon colors on branded backgrounds)
 * - '#000000' / '#000' (black — common for icon colors)
 * - Theme definition files (src/theme/*)
 * - tailwind.config.* files
 */

/* eslint-env node */
/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow hardcoded hex color values in component files',
    },
    messages: {
      noHardcodedColor:
        'Avoid hardcoded color "{{color}}". Use theme tokens via useAppTheme() instead — e.g. theme.colors.brand.primary, theme.colors.text.primary, etc.',
    },
    schema: [],
  },
  create(context) {
    const filename = context.getFilename()

    // Skip theme definition files and config files
    if (
      filename.includes('/theme/') ||
      filename.includes('tailwind.config')
    ) {
      return {}
    }

    const HEX_PATTERN = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g
    const ALLOWED = new Set(['#fff', '#ffffff', '#000', '#000000'])

    function checkString(node, value) {
      if (typeof value !== 'string') return

      let match
      HEX_PATTERN.lastIndex = 0
      while ((match = HEX_PATTERN.exec(value)) !== null) {
        const color = match[0].toLowerCase()
        if (ALLOWED.has(color)) continue

        context.report({
          node,
          messageId: 'noHardcodedColor',
          data: { color: match[0] },
        })
      }
    }

    return {
      Literal(node) {
        checkString(node, node.value)
      },
      TemplateLiteral(node) {
        for (const quasi of node.quasis) {
          checkString(node, quasi.value.raw)
        }
      },
    }
  },
}
