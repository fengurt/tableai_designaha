/** 界格徽记 — 品牌符号。
 * @startingPoint section="Brand" subtitle="四界格徽记，右上鎏金" viewport="700x210"
 */
export interface JiegeMarkProps {
  /** 边长 px，默认 32，最小 12 */
  size?: number;
  /** 反白版（墨黑底上使用） */
  reversed?: boolean;
  /** 单色墨版（金格改为实心墨） */
  mono?: boolean;
}
export declare function JiegeMark(props: JiegeMarkProps): JSX.Element;
