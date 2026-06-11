import ts from 'typescript'

export const UNKNOWN = Symbol('unknown')

function unwrap(node) {
  while (
    node &&
    (ts.isParenthesizedExpression(node) ||
      ts.isAsExpression(node) ||
      ts.isTypeAssertionExpression(node) ||
      ts.isSatisfiesExpression(node) ||
      ts.isNonNullExpression(node))
  ) {
    node = node.expression
  }
  return node
}

function propertyName(node) {
  if (!node) return ''
  if (ts.isIdentifier(node) || ts.isStringLiteral(node)) return node.text
  return ''
}

export function evaluate(node, env, aliases = new Map()) {
  node = unwrap(node)
  if (!node) return [UNKNOWN]
  if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node.text]
  if (ts.isArrayLiteralExpression(node)) {
    return [node.elements.flatMap(item => evaluate(item, env, aliases))]
  }
  if (ts.isObjectLiteralExpression(node)) {
    const value = {}
    for (const prop of node.properties) {
      if (!ts.isPropertyAssignment(prop) && !ts.isShorthandPropertyAssignment(prop)) continue
      const key = propertyName(prop.name)
      if (!key) continue
      value[key] = ts.isShorthandPropertyAssignment(prop)
        ? env.get(prop.name.text) || [UNKNOWN]
        : evaluate(prop.initializer, env, aliases)
    }
    return [value]
  }
  if (ts.isIdentifier(node)) return aliases.get(node.text) || env.get(node.text) || [UNKNOWN]
  if (ts.isPropertyAccessExpression(node)) {
    const result = []
    for (const owner of evaluate(node.expression, env, aliases).flat(Infinity)) {
      if (owner && owner !== UNKNOWN && typeof owner === 'object') {
        result.push(...(owner[node.name.text] || [UNKNOWN]))
      } else {
        result.push(UNKNOWN)
      }
    }
    return result
  }
  if (ts.isConditionalExpression(node)) {
    return [...evaluate(node.whenTrue, env, aliases), ...evaluate(node.whenFalse, env, aliases)]
  }
  if (
    ts.isBinaryExpression(node) &&
    [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(
      node.operatorToken.kind
    )
  ) {
    return [...evaluate(node.left, env, aliases), ...evaluate(node.right, env, aliases)]
  }
  if (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'defineSvgIcons'
  ) {
    return evaluate(node.arguments[0], env, aliases)
  }
  return [UNKNOWN]
}

export function parseExpression(expression) {
  const file = ts.createSourceFile(
    'svg-icon-expression.ts',
    `const __value = (${expression})`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  )
  return file.statements[0]?.declarationList?.declarations?.[0]?.initializer
}

export function buildEnvironment(script) {
  const env = new Map()
  if (!script) return { env, sourceFile: undefined }
  const sourceFile = ts.createSourceFile(
    'component.ts',
    script,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.initializer) {
        env.set(declaration.name.text, evaluate(declaration.initializer, env))
      }
    }
  }
  return { env, sourceFile }
}

export function collectStrings(values) {
  return [...new Set(values.flat(Infinity).filter(value => typeof value === 'string'))]
}

export function collectDefinitions(sourceFile, env, file) {
  const references = []
  if (!sourceFile) return references
  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'defineSvgIcons'
    ) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
      for (const name of collectStrings(evaluate(node.arguments[0], env))) {
        references.push({ name, file, line })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return references
}
