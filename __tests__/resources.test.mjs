import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  buildIconIndex,
  compileSymbol,
  createSprite,
  resolveIconNames,
} from '../src/vite/resources.mjs'

const SVG =
  '<svg viewBox="0 0 10 10"><defs><linearGradient id="a"/></defs><path fill="url(#a)"/></svg>'

async function fixture(files) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'svg-icon-test-'))
  for (const [name, content] of Object.entries(files)) {
    const file = path.join(root, name)
    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(file, content)
  }
  return root
}

test('校验非法文件名', async () => {
  const root = await fixture({ 'Bad Icon.svg': SVG })
  await assert.rejects(() => buildIconIndex([root]), /非法图标文件名/)
})

test('使用相对路径作为多层目录图标名', async () => {
  const root = await fixture({ 'a/chart.svg': SVG, 'b/chart.svg': SVG })
  const index = await buildIconIndex([root])
  assert.deepEqual([...index.keys()], ['a/chart', 'b/chart'])
})

test('校验多个图标目录中的重复相对路径', async () => {
  const firstRoot = await fixture({ 'charts/chart.svg': SVG })
  const secondRoot = await fixture({ 'charts/chart.svg': SVG })
  await assert.rejects(
    () => buildIconIndex([firstRoot, secondRoot]),
    /图标名称重复:[\s\S]*charts\/chart/
  )
})

test('校验缺失图标和全量规则', async () => {
  const root = await fixture({ 'chart.svg': SVG })
  const index = await buildIconIndex([root])
  assert.throws(
    () =>
      resolveIconNames(index, {
        names: ['missing'],
        diagnostics: [],
        references: [{ name: 'missing', file: 'Demo.vue', line: 8 }],
      }),
    /Demo.vue:8/
  )
  assert.throws(
    () => resolveIconNames(index, { names: [], diagnostics: [] }, { dynamicPatterns: ['*'] }),
    /禁止使用全量匹配/
  )
})

test('未声明动态表达式使生产构建失败', async () => {
  const root = await fixture({ 'chart.svg': SVG })
  const index = await buildIconIndex([root])
  assert.throws(
    () =>
      resolveIconNames(
        index,
        {
          names: [],
          diagnostics: [{ file: 'Demo.vue', line: 2, expression: 'item.icon' }],
        },
        { isBuild: true }
      ),
    /Demo.vue:2/
  )
})

test('只生成命中图标并保留 viewBox 和渐变', async () => {
  const files = { 'chart.svg': SVG }
  for (let index = 0; index < 100; index++) files[`unused-${index}.svg`] = SVG
  const root = await fixture(files)
  const iconIndex = await buildIconIndex([root])
  const names = resolveIconNames(iconIndex, { names: ['chart'], diagnostics: [] })
  const sprite = await createSprite(iconIndex, names)
  assert.deepEqual(names, ['chart'])
  assert.match(sprite, /id="icon-chart"/)
  assert.match(sprite, /viewBox="0 0 10 10"/)
  assert.match(sprite, /linearGradient/)
  assert.doesNotMatch(sprite, /unused-0/)
})

test('多层目录图标生成包含路径的 Symbol ID', async () => {
  const root = await fixture({ 'charts/line/line.svg': SVG })
  const iconIndex = await buildIconIndex([root])
  const names = resolveIconNames(iconIndex, {
    names: ['charts/line/line'],
    diagnostics: [],
  })
  const sprite = await createSprite(iconIndex, names)
  assert.deepEqual(names, ['charts/line/line'])
  assert.match(sprite, /id="icon-charts\/line\/line"/)
  assert.match(sprite, /id="charts--line--line-__a"/)
  assert.doesNotMatch(sprite, /id="charts\/line\/line-__a"/)
})

test('纯色图标根据原始尺寸生成 viewBox 并移除固定尺寸', async () => {
  const root = await fixture({
    'chart.svg': '<svg width="128" height="64"><path d="M0 0h128v64H0z"/></svg>',
  })
  const symbol = await compileSymbol('chart', path.join(root, 'chart.svg'))
  assert.match(symbol, /viewBox="0 0 128 64"/)
  assert.doesNotMatch(symbol, /\swidth=/)
  assert.doesNotMatch(symbol, /\sheight=/)
})

test('已有 viewBox 的纯色图标同样移除固定尺寸', async () => {
  const root = await fixture({
    'checkbox.svg':
      '<svg viewBox="0 0 1024 1024" width="200" height="200"><path d="M0 0h1024v1024H0z"/></svg>',
  })
  const symbol = await compileSymbol('checkbox', path.join(root, 'checkbox.svg'))
  assert.match(symbol, /viewBox="0 0 1024 1024"/)
  assert.doesNotMatch(symbol, /\swidth=/)
  assert.doesNotMatch(symbol, /\sheight=/)
})
