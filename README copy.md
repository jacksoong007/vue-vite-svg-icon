# @dsj/svg-icon

Vue 3 SVG 图标组件和按需生成 Sprite 的 Vite 插件。

## 安装

```bash
pnpm add @dsj/svg-icon
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

不同目录可以存在同名 SVG；多个 `iconDirs` 中相同的相对路径仍会判定为图标名重复。
页面使用完整图标名：

```vue
<svg-icon icon-class="charts/chart" />
```

`@element-plus/icons-vue`、Iconfont 和普通图片不属于本图标库。

## 应用接入

在应用 `vite.config.ts` 中配置公共插件与组件 resolver：

```ts
import path from 'node:path'
import Components from 'unplugin-vue-components/vite'
import { createSvgIconPlugin, SvgIconResolver } from '@dsj/svg-icon/vite'

Components({
  resolvers: [SvgIconResolver()],
})

createSvgIconPlugin({
  iconDirs: [path.resolve(__dirname, 'src/assets/icons/svg')],
  sourceDirs: [path.resolve(__dirname, 'src')],
  dynamicIcons: ['runtime-icon'],
  dynamicPatterns: ['status-*'],
})
```

`sourceDirs` 中的源码文件作为依赖图入口集合。插件会递归分析这些文件的本地依赖，
包括静态 `import`、`export ... from` 和字面量形式的 `import('...')`，并复用 Vite
配置中的 alias。因此应用实际引用的 `@common` 组件会进入图标扫描，未引用的公共组件
不会被扫描。

依赖图只跟踪 `.vue`、`.ts`、`.tsx`、`.js`、`.jsx` 本地文件，不进入
`node_modules`，也不推导 `import(runtimePath)` 这类运行时模块路径。

应用入口保留一次注册模块导入：

```ts
/// <reference types="@dsj/svg-icon/client" />

import 'virtual:svg-icons-register'
```

图标列表可以从虚拟模块获取：

```ts
import svgIconNames from 'virtual:svg-icons-names'
```

## 自动分析范围

支持：

- `icon-class="chart"`
- `:icon-class="'chart'"`
- `:icon-class="active ? 'bar' : 'line'"`
- 当前 SFC 中的字符串常量和静态对象属性
- 当前 SFC 中的静态对象数组及 `v-for="item in items"`
- `as const`
- `defineSvgIcons(['chart', 'line'])`

不推导：

- API 返回值
- 用户输入
- 运行时函数结果
- 任意跨模块数据流

无法静态确定时，使用显式声明：

```ts
import { defineSvgIcons } from '@dsj/svg-icon'

const allowedIcons = defineSvgIcons(['chart', 'line'] as const)
```

跨页面场景在 Vite 配置中使用 `dynamicIcons`。`dynamicPatterns` 必须包含明确前缀或后缀，禁止使用 `*` 全量匹配。

## 故障排查

- `非法图标文件名`：将目录名和文件名改为小写 kebab-case。
- `图标名称重复`：合并重复资源或使用不同业务名称。
- `找不到图标`：检查文件是否位于公共目录，以及名称是否与 `icon-class` 一致。
- `未声明的动态表达式`：使用 `defineSvgIcons`、`dynamicIcons` 或受限 `dynamicPatterns`。
- 开发环境 `[SvgIcon] 未找到图标`：检查虚拟清单和 Symbol ID `icon-<name>`。

运行公共测试：

```bash
pnpm --filter @dsj/svg-icon test
```

构建和检查发布包：

```bash
pnpm --filter @dsj/svg-icon build
pnpm --filter @dsj/svg-icon pack:check
```

也可以手动导入组件：

```ts
import { SvgIcon } from '@dsj/svg-icon'
```

确认 tarball 后发布到 `publishConfig` 指定的公司 npm 仓库：

```bash
pnpm --filter @dsj/svg-icon publish --no-git-checks
```
