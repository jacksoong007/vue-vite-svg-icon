import fs from 'node:fs/promises'
import path from 'node:path'
import fg from 'fast-glob'
import { analyzeSource } from './analyzer.mjs'
import { collectModuleSpecifiers, resolveLocalDependency } from './dependencies.mjs'
import { buildIconIndex, createSprite, resolveIconNames } from './resources.mjs'

const REGISTER_ID = 'virtual:svg-icons-register'
const NAMES_ID = 'virtual:svg-icons-names'
const RESOLVED_REGISTER_ID = `\0${REGISTER_ID}`
const RESOLVED_NAMES_ID = `\0${NAMES_ID}`
const DOM_ID = '__svg__icons__dom__'

function registerModule(sprite) {
  return `
const sprite = ${JSON.stringify(sprite)}
function loadSvgSprite() {
  if (typeof document === 'undefined') return
  let svg = document.getElementById('${DOM_ID}')
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.id = '${DOM_ID}'
    svg.setAttribute('aria-hidden', 'true')
    svg.style.position = 'absolute'
    svg.style.width = '0'
    svg.style.height = '0'
    svg.style.overflow = 'hidden'
    document.body.insertBefore(svg, document.body.firstChild)
  }
  svg.innerHTML = sprite
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadSvgSprite, { once: true })
} else {
  loadSvgSprite()
}
export default {}
`
}

function hasDynamicCoverage(options) {
  return (options.dynamicIcons?.length || 0) > 0 || (options.dynamicPatterns?.length || 0) > 0
}

export function createSvgIconPlugin(options) {
  const iconDirs = options.iconDirs.map(dir => path.resolve(dir))
  const sourceDirs = options.sourceDirs.map(dir => path.resolve(dir))
  let isBuild = false
  let server
  let aliases = []
  let dependencyFiles = new Set()
  let state = { names: [], sprite: '', diagnostics: [] }

  async function collectApplicationFiles() {
    const roots = []
    for (const sourceDir of sourceDirs) {
      roots.push(
        ...(await fg('**/*.{vue,ts,tsx,js,jsx}', {
          cwd: sourceDir,
          absolute: true,
          ignore: ['**/*.d.ts', '**/node_modules/**', '**/dist/**'],
        }))
      )
    }
    const files = new Set()
    const pending = [...roots.sort()]
    while (pending.length) {
      const file = path.resolve(pending.shift())
      if (files.has(file)) continue
      files.add(file)
      const source = await fs.readFile(file, 'utf8')
      for (const specifier of collectModuleSpecifiers(source)) {
        const dependency = await resolveLocalDependency(specifier, file, aliases)
        if (dependency && !files.has(dependency)) pending.push(dependency)
      }
    }
    dependencyFiles = files
    return [...files].sort()
  }

  async function analyzeApplication() {
    const files = await collectApplicationFiles()
    const names = []
    const diagnostics = []
    const references = []
    for (const file of files.sort()) {
      const source = await fs.readFile(file, 'utf8')
      const result = analyzeSource(file, source)
      names.push(...result.names)
      diagnostics.push(...result.diagnostics)
      references.push(...result.references)
    }
    return { names: [...new Set(names)], diagnostics, references }
  }

  async function refresh() {
    const index = await buildIconIndex(iconDirs)
    const analysis = await analyzeApplication()
    const names = resolveIconNames(index, analysis, {
      dynamicIcons: options.dynamicIcons,
      dynamicPatterns: options.dynamicPatterns,
      isBuild,
    })
    state = {
      names,
      diagnostics: analysis.diagnostics,
      sprite: await createSprite(index, names),
    }
    if (server) server.watcher.add([...dependencyFiles])
    if (!isBuild && analysis.diagnostics.length && !hasDynamicCoverage(options)) {
      for (const item of analysis.diagnostics) {
        console.warn(
          `[svg-icon] 无法静态分析 ${item.file}:${item.line} icon-class="${item.expression}"`
        )
      }
    }
  }

  async function invalidate() {
    await refresh()
    if (!server) return
    for (const id of [RESOLVED_REGISTER_ID, RESOLVED_NAMES_ID]) {
      const module = server.moduleGraph.getModuleById(id)
      if (module) server.moduleGraph.invalidateModule(module)
    }
    server.ws.send({ type: 'full-reload' })
  }

  function isManagedFile(file) {
    const absolute = path.resolve(file)
    return (
      dependencyFiles.has(absolute) ||
      [...iconDirs, ...sourceDirs].some(dir => absolute.startsWith(`${dir}${path.sep}`))
    )
  }

  return {
    name: 'dsj:svg-icon-library',
    configResolved(config) {
      isBuild = config.command === 'build'
      const configAliases = config.resolve?.alias || []
      aliases = Array.isArray(configAliases)
        ? configAliases
        : Object.entries(configAliases).map(([find, replacement]) => ({ find, replacement }))
    },
    async buildStart() {
      await refresh()
    },
    resolveId(id) {
      if (id === REGISTER_ID) return RESOLVED_REGISTER_ID
      if (id === NAMES_ID) return RESOLVED_NAMES_ID
    },
    async load(id) {
      if (!state.sprite) await refresh()
      if (id === RESOLVED_REGISTER_ID) return registerModule(state.sprite)
      if (id === RESOLVED_NAMES_ID) return `export default ${JSON.stringify(state.names)}`
    },
    configureServer(devServer) {
      server = devServer
      devServer.watcher.add([...iconDirs, ...dependencyFiles])
      const handleFile = file => {
        if (isManagedFile(file)) invalidate().catch(error => devServer.config.logger.error(error))
      }
      devServer.watcher.on('add', handleFile)
      devServer.watcher.on('change', handleFile)
      devServer.watcher.on('unlink', handleFile)
    },
  }
}

export function SvgIconResolver() {
  return name => {
    if (name === 'SvgIcon') {
      return '@dsj/svg-icon/component'
    }
  }
}
