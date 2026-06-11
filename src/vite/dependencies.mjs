import fs from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'

const SOURCE_EXTENSIONS = ['.vue', '.ts', '.tsx', '.js', '.jsx']

export function collectModuleSpecifiers(source) {
  return ts
    .preProcessFile(source, true, true)
    .importedFiles.map(item => item.fileName)
    .filter(Boolean)
}

function applyAlias(specifier, aliases) {
  for (const alias of aliases) {
    if (typeof alias.find === 'string') {
      if (specifier !== alias.find && !specifier.startsWith(`${alias.find}/`)) continue
      return `${alias.replacement}${specifier.slice(alias.find.length)}`
    }
    if (alias.find instanceof RegExp && alias.find.test(specifier)) {
      return specifier.replace(alias.find, alias.replacement)
    }
  }
  return specifier
}

async function isFile(file) {
  try {
    return (await fs.stat(file)).isFile()
  } catch {
    return false
  }
}

export async function resolveLocalDependency(specifier, importer, aliases = []) {
  const cleanSpecifier = specifier.replace(/[?#].*$/, '')
  const aliased = applyAlias(cleanSpecifier, aliases)
  let candidate
  if (aliased.startsWith('.')) {
    candidate = path.resolve(path.dirname(importer), aliased)
  } else if (path.isAbsolute(aliased)) {
    candidate = aliased
  } else {
    return
  }

  const extension = path.extname(candidate)
  const candidates = extension
    ? [candidate]
    : [
        ...SOURCE_EXTENSIONS.map(item => `${candidate}${item}`),
        ...SOURCE_EXTENSIONS.map(item => path.join(candidate, `index${item}`)),
      ]
  for (const file of candidates) {
    if (SOURCE_EXTENSIONS.includes(path.extname(file)) && (await isFile(file))) {
      return path.resolve(file)
    }
  }
}
