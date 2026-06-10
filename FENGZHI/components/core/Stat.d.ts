/** 大数字陈列 — Helvetica Light 大数字 + 黑体注释 + 石灰出处。 */
export interface StatProps {
  /** 数字本身，如 "2→6"、"164 万亿" */
  value: string;
  /** 一行注释 */
  label: string;
  /** 出处（机构 · 年份）——品牌纪律：每个数字标注出处 */
  source?: string;
  /** 数字字号 px，默认 54 */
  size?: number;
}
export declare function Stat(props: StatProps): JSX.Element;
