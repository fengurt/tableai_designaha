/** 页眉/页脚 — 细规则线 + 左右两端石灰小字。 */
export interface PageChromeProps {
  /** 左端文字，如 "峰值永造局 · 种子轮" */
  left?: any;
  /** 右端文字，如 "机密 CONFIDENTIAL" 或页码 */
  right?: any;
  /** top = 页眉（线在下），bottom = 页脚（线在上） */
  position?: "top" | "bottom";
}
export declare function PageChrome(props: PageChromeProps): JSX.Element;
