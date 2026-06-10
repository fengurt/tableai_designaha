/** 字标组合 — 徽记 + 峰值永造局 + 英文小字。 */
export interface WordmarkProps {
  /** stacked = 主组合（封面）；horizontal = 横排（页眉、小尺寸） */
  variant?: "stacked" | "horizontal";
  /** 整体缩放倍数，默认 1 */
  scale?: number;
}
export declare function Wordmark(props: WordmarkProps): JSX.Element;
