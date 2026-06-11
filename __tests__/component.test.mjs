import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { SvgIconResolver } from '../src/vite/index.mjs'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const componentFile = path.resolve(currentDir, '../src/SvgIcon.vue')

test('resolver 只处理 SvgIcon', () => {
  const resolver = SvgIconResolver()
  assert.equal(resolver('SvgIcon'), 'vue-vite-svg-icon/component')
  assert.equal(resolver('ElButton'), undefined)
})

test('公共组件保留兼容属性和 currentColor', async () => {
  const source = await fs.readFile(componentFile, 'utf8')
  assert.match(source, /iconClass/)
  assert.match(source, /className/)
  assert.match(source, /color/)
  assert.match(source, /currentColor/)
  assert.match(source, /:href="iconName"/)
})
