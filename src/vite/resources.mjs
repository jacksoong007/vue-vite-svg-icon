import fs from 'node:fs/promises'
import path from 'node:path'
import fg from 'fast-glob'
import { optimize } from 'svgo'

const ICON_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/

function getIconName(iconDir, file) {
  return path.relative(iconDir, file).slice(0, -path.extname(file).length).split(path.sep).join('/')
}

export async function buildIconIndex(iconDirs) {
  const index = new Map()
  const invalid = []
  const duplicates = new Map()
  for (const iconDir of iconDirs) {
    const files = await fg('**/*.svg', { cwd: iconDir, absolute: true })
    for (const file of files.sort()) {
      const name = getIconName(iconDir, file)
      if (!ICON_NAME_PATTERN.test(name)) invalid.push(file)
      if (index.has(name)) {
        duplicates.set(name, [...(duplicates.get(name) || [index.get(name)]), file])
      } else {
        index.set(name, file)
      }
    }
  }
  if (invalid.length) {
    throw new Error(`[svg-icon] 非法图标文件名:\n${invalid.map(file => `- ${file}`).join('\n')}`)
  }
  if (duplicates.size) {
    const detail = [...duplicates]
      .map(([name, files]) => `${name}:\n${files.map(file => `- ${file}`).join('\n')}`)
      .join('\n')
    throw new Error(`[svg-icon] 图标名称重复:\n${detail}`)
  }
  return index
}

function patternToRegExp(pattern) {
  const literal = pattern.replace(/\*/g, '')
  if (!literal) throw new Error('[svg-icon] dynamicPatterns 禁止使用全量匹配规则 "*"')
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
  return new RegExp(`^${escaped}$`)
}

export function resolveIconNames(index, analysis, options = {}) {
  const names = new Set([...analysis.names, ...(options.dynamicIcons || [])])
  for (const pattern of options.dynamicPatterns || []) {
    const matcher = patternToRegExp(pattern)
    for (const name of index.keys()) {
      if (matcher.test(name)) names.add(name)
    }
  }
  const missing = [...names].filter(name => !index.has(name))
  if (missing.length) {
    const detail = missing
      .map(name => {
        const references = (analysis.references || [])
          .filter(item => item.name === name)
          .map(item => `${item.file}:${item.line}`)
        return `- ${name}: ${references.join(', ') || 'dynamicIcons 配置'}`
      })
      .join('\n')
    throw new Error(`[svg-icon] 找不到图标:\n${detail}`)
  }
  const hasDynamicCoverage =
    (options.dynamicIcons?.length || 0) > 0 || (options.dynamicPatterns?.length || 0) > 0
  if (options.isBuild && analysis.diagnostics.length && !hasDynamicCoverage) {
    const detail = analysis.diagnostics
      .map(item => `- ${item.file}:${item.line} icon-class="${item.expression}"`)
      .join('\n')
    throw new Error(`[svg-icon] 存在未声明的动态表达式:\n${detail}`)
  }
  return [...names].sort()
}

export async function compileSymbol(name, file) {
  const source = await fs.readFile(file, 'utf8')
  const { data } = optimize(source, {
    path: file,
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            removeViewBox: false,
            cleanupIds: false,
          },
        },
      },
      'removeDimensions',
      {
        name: 'prefixIds',
        params: { prefix: `${name.replaceAll('/', '--')}-` },
      },
    ],
  })
  return data.replace(/<svg\b/, `<symbol id="icon-${name}"`).replace(/<\/svg>\s*$/, '</symbol>')
}

export async function createSprite(index, names) {
  const symbols = await Promise.all(names.map(name => compileSymbol(name, index.get(name))))
  return symbols.join('')
}
