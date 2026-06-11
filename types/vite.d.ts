import type { Plugin } from 'vite'

export interface SvgIconPluginOptions {
  iconDirs: string[]
  sourceDirs: string[]
  dynamicIcons?: string[]
  dynamicPatterns?: string[]
}

export function createSvgIconPlugin(options: SvgIconPluginOptions): Plugin
export function SvgIconResolver(): (name: string) => string | undefined
