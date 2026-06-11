import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createSvgIconPlugin } from '../src/vite/index.mjs'

test('生产模式虚拟模块只包含使用清单', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'svg-icon-plugin-'))
  const iconDir = path.join(root, 'icons')
  const sourceDir = path.join(root, 'src')
  await fs.mkdir(iconDir)
  await fs.mkdir(sourceDir)
  await fs.writeFile(
    path.join(iconDir, 'chart.svg'),
    '<svg viewBox="0 0 10 10"><path d="M0 0h10v10z"/></svg>'
  )
  await fs.writeFile(
    path.join(iconDir, 'unused.svg'),
    '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="5"/></svg>'
  )
  await fs.writeFile(
    path.join(sourceDir, 'Demo.vue'),
    '<template><svg-icon icon-class="chart" /></template>'
  )
  const plugin = createSvgIconPlugin({ iconDirs: [iconDir], sourceDirs: [sourceDir] })
  plugin.configResolved({ command: 'build' })
  await plugin.buildStart()
  const register = await plugin.load('\0virtual:svg-icons-register')
  const names = await plugin.load('\0virtual:svg-icons-names')
  assert.match(register, /icon-chart/)
  assert.doesNotMatch(register, /icon-unused/)
  assert.match(names, /\["chart"\]/)
})

test('显式动态图标配置覆盖运行时表达式时不输出开发警告', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'svg-icon-plugin-'))
  const iconDir = path.join(root, 'icons')
  const sourceDir = path.join(root, 'src')
  await fs.mkdir(iconDir)
  await fs.mkdir(sourceDir)
  await fs.writeFile(
    path.join(iconDir, 'chart.svg'),
    '<svg viewBox="0 0 10 10"><path d="M0 0h10v10z"/></svg>'
  )
  await fs.writeFile(
    path.join(sourceDir, 'Demo.vue'),
    '<template><svg-icon :icon-class="runtimeIcon" /></template>'
  )
  const plugin = createSvgIconPlugin({
    iconDirs: [iconDir],
    sourceDirs: [sourceDir],
    dynamicIcons: ['chart'],
  })
  plugin.configResolved({ command: 'serve' })
  const warnings = []
  const originalWarn = console.warn
  console.warn = message => warnings.push(message)
  try {
    await plugin.buildStart()
  } finally {
    console.warn = originalWarn
  }
  assert.deepEqual(warnings, [])
})

test('递归分析 sourceDirs 实际引用的本地组件依赖', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'svg-icon-plugin-'))
  const iconDir = path.join(root, 'icons')
  const sourceDir = path.join(root, 'src')
  const commonDir = path.join(root, 'common')
  await fs.mkdir(iconDir)
  await fs.mkdir(sourceDir)
  await fs.mkdir(commonDir)
  for (const name of ['entry-icon', 'shared-icon', 'unused-icon']) {
    await fs.writeFile(
      path.join(iconDir, `${name}.svg`),
      '<svg viewBox="0 0 10 10"><path d="M0 0h10v10z"/></svg>'
    )
  }
  await fs.writeFile(
    path.join(sourceDir, 'App.vue'),
    `<template><svg-icon icon-class="entry-icon" /><SharedDemo /></template>
     <script setup>import SharedDemo from '@common/SharedDemo.vue'</script>`
  )
  await fs.writeFile(
    path.join(commonDir, 'SharedDemo.vue'),
    '<template><svg-icon icon-class="shared-icon" /></template>'
  )
  await fs.writeFile(
    path.join(commonDir, 'UnusedDemo.vue'),
    '<template><svg-icon icon-class="unused-icon" /></template>'
  )
  const plugin = createSvgIconPlugin({ iconDirs: [iconDir], sourceDirs: [sourceDir] })
  plugin.configResolved({
    command: 'build',
    resolve: { alias: [{ find: '@common', replacement: commonDir }] },
  })
  await plugin.buildStart()
  const names = await plugin.load('\0virtual:svg-icons-names')
  assert.match(names, /\["entry-icon","shared-icon"\]/)
  assert.doesNotMatch(names, /unused-icon/)
})
