import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { collectModuleSpecifiers, resolveLocalDependency } from '../src/vite/dependencies.mjs'

test('提取静态导入、转出和字面量动态导入', () => {
  const dependencies = collectModuleSpecifiers(`
    import Demo from './Demo.vue'
    export { value } from './value'
    const LazyDemo = () => import('@common/LazyDemo.vue')
    const ignored = () => import(runtimePath)
  `)
  assert.deepEqual(dependencies, ['./Demo.vue', './value', '@common/LazyDemo.vue'])
})

test('解析 alias、扩展名补全和目录 index 文件', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'svg-icon-dependency-'))
  const sourceDir = path.join(root, 'src')
  const commonDir = path.join(root, 'common')
  const importer = path.join(sourceDir, 'App.vue')
  await fs.mkdir(path.join(sourceDir, 'local'), { recursive: true })
  await fs.mkdir(commonDir)
  await fs.writeFile(importer, '')
  await fs.writeFile(path.join(sourceDir, 'local', 'index.vue'), '<template />')
  await fs.writeFile(path.join(commonDir, 'Shared.ts'), 'export default {}')

  const aliases = [{ find: '@common', replacement: commonDir }]
  assert.equal(
    await resolveLocalDependency('./local', importer, aliases),
    path.join(sourceDir, 'local', 'index.vue')
  )
  assert.equal(
    await resolveLocalDependency('@common/Shared', importer, aliases),
    path.join(commonDir, 'Shared.ts')
  )
  assert.equal(await resolveLocalDependency('vue', importer, aliases), undefined)
})
