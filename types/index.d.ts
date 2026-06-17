import type { DefineComponent } from 'vue'

export interface SvgIconProps {
  iconName?: string
  /**
   * @deprecated Use iconName instead.
   */
  iconClass?: string
  className?: string
  color?: string
  size?: string | number
}

export const SvgIcon: DefineComponent<SvgIconProps>
export default SvgIcon

export function defineSvgIcons<const T extends readonly string[]>(icons: T): T
