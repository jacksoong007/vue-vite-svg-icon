# vue-vite-svg-icon

面向 Vue 3 和 Vite 的 SVG 图标组件与构建插件。支持组件自动导入、依赖图扫描、
多层目录、动态图标声明，以及按需生成 SVG Sprite。

## 环境要求

- Node.js >= 18
- Vue >= 3.3
- Vite 5

## 安装

```bash
pnpm add vue-vite-svg-icon
```

## 快速开始

在 `vite.config.ts` 中注册插件：

```ts
import path from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { createSvgIconPlugin } from 'vue-vite-svg-icon/vite'

export default defineConfig({
  plugins: [
    vue(),
    createSvgIconPlugin({
      iconDirs: [path.resolve('src/assets/icons/svg')],
      sourceDirs: [path.resolve('src')],
    }),
  ],
})
```

在应用入口加载样式和生成的 Sprite：

```ts
/// <reference types="vue-vite-svg-icon/client" />

import 'vue-vite-svg-icon/style.css'
import 'virtual:svg-icons-register'
```

使用组件：

```vue
<script setup lang="ts">
import { SvgIcon } from 'vue-vite-svg-icon'
</script>

<template>
  <SvgIcon icon-class="charts/chart" color="#409eff" :size="20" />
</template>
```

组件属性：

| 属性 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `iconClass` | `string` | 是 | 图标名称 |
| `className` | `string` | 否 | 附加 CSS 类名 |
| `color` | `string` | 否 | 图标颜色 |
| `size` | `string \| number` | 否 | 图标尺寸，数字按 px 处理 |

## 自动导入

配合 `unplugin-vue-components` 使用：

```ts
import path from 'node:path'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import { createSvgIconPlugin, SvgIconResolver } from 'vue-vite-svg-icon/vite'

export default defineConfig({
  plugins: [
    vue(),
    Components({
      resolvers: [SvgIconResolver()],
    }),
    createSvgIconPlugin({
      iconDirs: [path.resolve('src/assets/icons/svg')],
      sourceDirs: [path.resolve('src')],
      dynamicIcons: ['runtime-icon'],
      dynamicPatterns: ['status-*'],
    }),
  ],
})
```

即使使用自动导入，应用入口仍需加载：

```ts
import 'vue-vite-svg-icon/style.css'
import 'virtual:svg-icons-register'
```

## 目录约定

SVG 图标可以放在应用自定义目录，例如：

```text
src/assets/icons/svg/
```

目录名和文件名必须使用小写 kebab-case。图标名为相对图标根目录的路径，不包含
`.svg` 扩展名：

```text
bar.svg                    -> bar
charts/chart.svg           -> charts/chart
charts/line/line.svg       -> charts/line/line
```

多个 `iconDirs` 中相同的相对路径会被判定为图标名重复。页面应使用完整图标名：

```vue
<SvgIcon icon-class="charts/chart" />
```

## 插件选项

| 选项 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `iconDirs` | `string[]` | 是 | SVG 图标目录 |
| `sourceDirs` | `string[]` | 是 | 应用源码扫描入口目录 |
| `dynamicIcons` | `string[]` | 否 | 显式保留的动态图标 |
| `dynamicPatterns` | `string[]` | 否 | 动态图标匹配规则 |

`sourceDirs` 中的文件是依赖图入口。插件会递归分析本地依赖，包括静态 `import`、
`export ... from` 和字面量形式的 `import('...')`，并复用 Vite 配置中的 alias。
依赖图只跟踪 `.vue`、`.ts`、`.tsx`、`.js`、`.jsx` 文件，不进入
`node_modules`，也不推导 `import(runtimePath)` 这类运行时路径。

图标列表可以从虚拟模块获取：

```ts
import svgIconNames from 'virtual:svg-icons-names'
```

## 动态图标

插件可以静态分析：

- `icon-class="chart"`
- `:icon-class="'chart'"`
- `:icon-class="active ? 'bar' : 'line'"`
- 当前 SFC 中的字符串常量、静态对象属性和静态对象数组
- `v-for="item in items"` 与 `as const`
- `defineSvgIcons(['chart', 'line'])`

API 返回值、用户输入和运行时函数结果无法可靠静态推导。此时可以在源码中声明：

```ts
import { defineSvgIcons } from 'vue-vite-svg-icon'

const allowedIcons = defineSvgIcons(['chart', 'line'] as const)
```

跨页面场景也可以使用 `dynamicIcons`。`dynamicPatterns` 必须包含明确前缀或后缀，
例如 `status-*`；禁止使用 `*` 全量匹配。

## 故障排查

- `非法图标文件名`：将目录名和文件名改为小写 kebab-case。
- `图标名称重复`：合并重复资源或使用不同业务名称。
- `找不到图标`：检查图标目录以及名称是否与 `icon-class` 一致。
- `未声明的动态表达式`：使用 `defineSvgIcons`、`dynamicIcons` 或受限的
  `dynamicPatterns`。
- 开发环境 `[SvgIcon] 未找到图标`：检查虚拟清单和 Symbol ID
  `icon-<name>`。

## 开发与发布检查

```bash
pnpm install
pnpm test
pnpm build
pnpm pack:check
```

正式发布前请确认 npm 账号已启用 2FA，然后执行：

```bash
npm login --registry=https://registry.npmjs.org
npm publish
```

## License

[MIT](./LICENSE)
