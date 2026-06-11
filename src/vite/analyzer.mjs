import { baseParse } from '@vue/compiler-dom'
import { parse as parseSfc } from '@vue/compiler-sfc'
import {
  UNKNOWN,
  buildEnvironment,
  collectDefinitions,
  collectStrings,
  evaluate,
  parseExpression,
} from './evaluator.mjs'

function parseFor(expression, env, aliases) {
  const match = expression.match(/^\s*(?:\(([^,)]+).*\)|([^,\s]+))\s+(?:in|of)\s+(.+)$/)
  if (!match) return
  const alias = (match[1] || match[2]).trim()
  const source = parseExpression(match[3])
  aliases.set(alias, evaluate(source, env, aliases).flat(Infinity))
}

function analyzeTemplate(template, env, file) {
  const references = []
  const diagnostics = []
  const ast = baseParse(template)
  function addNames(values, line) {
    for (const name of collectStrings(values)) references.push({ name, file, line })
  }
  function visit(node, inheritedAliases) {
    if (node.type !== 1 && node.type !== 0) return
    const aliases = new Map(inheritedAliases)
    if (node.type === 1) {
      const forDirective = node.props.find(prop => prop.type === 7 && prop.name === 'for')
      if (forDirective?.exp?.content) parseFor(forDirective.exp.content, env, aliases)
      if (['svg-icon', 'SvgIcon'].includes(node.tag)) {
        const prop = node.props.find(item => {
          if (item.type === 6) return ['icon-class', 'iconClass'].includes(item.name)
          return (
            item.type === 7 &&
            item.name === 'bind' &&
            ['icon-class', 'iconClass'].includes(item.arg?.content)
          )
        })
        if (prop?.type === 6 && prop.value?.content) {
          addNames([prop.value.content], prop.loc.start.line)
        }
        if (prop?.type === 7 && prop.exp?.content) {
          const values = evaluate(parseExpression(prop.exp.content), env, aliases)
          addNames(values, prop.loc.start.line)
          if (values.flat(Infinity).includes(UNKNOWN)) {
            diagnostics.push({
              file,
              line: prop.loc.start.line,
              expression: prop.exp.content,
            })
          }
        }
      }
    }
    for (const child of node.children || []) visit(child, aliases)
  }
  visit(ast, new Map())
  return { references, diagnostics }
}

export function analyzeSource(file, source) {
  if (!file.endsWith('.vue')) {
    const { env, sourceFile } = buildEnvironment(source)
    const references = collectDefinitions(sourceFile, env, file)
    return { names: references.map(item => item.name), references, diagnostics: [] }
  }
  const { descriptor } = parseSfc(source, { filename: file })
  const script = [descriptor.script?.content, descriptor.scriptSetup?.content]
    .filter(Boolean)
    .join('\n')
  const { env, sourceFile } = buildEnvironment(script)
  const result = analyzeTemplate(descriptor.template?.content || '', env, file)
  const definitions = collectDefinitions(sourceFile, env, file)
  result.references.push(...definitions)
  if (definitions.length) result.diagnostics = []
  result.names = [...new Set(result.references.map(item => item.name))]
  return result
}
