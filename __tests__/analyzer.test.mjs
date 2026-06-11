import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeSource } from '../src/vite/analyzer.mjs'

function analyze(template, script = '') {
  return analyzeSource(
    '/demo/Test.vue',
    `<template>${template}</template><script setup lang="ts">${script}</script>`
  )
}

test('提取静态属性和绑定字符串', () => {
  const result = analyze(`
    <svg-icon icon-class="chart" />
    <SvgIcon :icon-class="'checkbox'" />
  `)
  assert.deepEqual(result.names.sort(), ['chart', 'checkbox'])
  assert.equal(result.diagnostics.length, 0)
})

test('提取条件、回退和静态对象', () => {
  const result = analyze(
    `
      <svg-icon :icon-class="active ? 'bar' : 'line'" />
      <svg-icon :icon-class="runtimeIcon || 'chart'" />
      <svg-icon :icon-class="config.icon" />
    `,
    `const config = { icon: 'map' }`
  )
  assert.deepEqual(result.names.sort(), ['bar', 'chart', 'line', 'map'])
  assert.equal(result.diagnostics.length, 1)
})

test('提取静态数组 v-for 和 as const', () => {
  const result = analyze(
    `
      <div v-for="item in items" :key="item.id">
        <svg-icon :icon-class="item.icon" />
      </div>
    `,
    `
      const items = [
        { id: 1, icon: 'bar' },
        { id: 2, icon: 'line' },
      ] as const
    `
  )
  assert.deepEqual(result.names.sort(), ['bar', 'line'])
  assert.equal(result.diagnostics.length, 0)
})

test('不臆测运行时数组', () => {
  const result = analyze(`
    <div v-for="item in items">
      <svg-icon :icon-class="item.icon" />
    </div>
  `)
  assert.deepEqual(result.names, [])
  assert.equal(result.diagnostics[0].expression, 'item.icon')
})

test('提取 defineSvgIcons 声明', () => {
  const result = analyze(
    '<svg-icon :icon-class="runtimeIcon" />',
    `defineSvgIcons(['plugin', 'pie'] as const)`
  )
  assert.deepEqual(result.names.sort(), ['pie', 'plugin'])
  assert.equal(result.diagnostics.length, 0)
})
