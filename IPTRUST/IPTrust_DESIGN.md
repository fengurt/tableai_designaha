---
name: 岁知社 IPTrust Design System
colors:
  surface: '#F5F2EA'
  surface-container: '#ECE8DE'
  paper: '#FFFFFF'
  on-surface: '#17202A'
  on-surface-variant: '#5C6570'
  outline: '#7A828A'
  outline-variant: '#C7CCD1'
  primary: '#10263D'
  on-primary: '#FFFFFF'
  primary-container: '#E8EDF1'
  secondary: '#B99B5B'
  on-secondary: '#17202A'
  error: '#B42318'
typography:
  headline-xl:
    fontFamily: Noto Sans SC
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg:
    fontFamily: Noto Sans SC
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Noto Sans SC
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Noto Sans SC
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.7'
  body-md:
    fontFamily: Noto Sans SC
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.7'
  label-sm:
    fontFamily: Noto Sans SC
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.4'
rounded:
  sm: 2px
  DEFAULT: 4px
  md: 6px
  full: 9999px
spacing:
  unit: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  xxl: 80px
  container-max: 1200px
---

# 岁知社 IPTrust 设计规范

> 高楼宾客似曾识，日光底下无新事。

本规范将已发布的品牌主题用于数字产品、品牌资料与 Agent 协作界面。品牌目录/API 是身份与色值来源；本文件提供应用规则，不替代尚未发布的官方设计指南。

## 1. 品牌定位

岁知社 IPTrust 面向 IP 资产可信管理、信任索引、品牌源文件治理与 Agent 可读协作。体验应表达可信、可考证、易检索与长期维护；清楚展示资产身份、来源、权限与状态。

## 2. 色彩

品牌 API 的精确主题色：

| 角色 | 色值 | 用途 |
| --- | --- | --- |
| 藏青 | `#10263D` | 品牌结构、标题、导航、重要边界 |
| 暗金 | `#B99B5B` | 少量强调、当前项与重点数据 |
| 铂灰 | `#C7CCD1` | 分割线、次级边界与中性状态 |
| 暖纸 | `#F5F2EA` | 页面底色与大面积画布 |
| 白 | `#FFFFFF` | 卡片、输入面与反白区域 |
| 墨色 | `#17202A` | 正文与高可读文字 |
| 灰色 | `#5C6570` | 辅助文字、说明与元数据 |

- 暖纸与白作为主要表面，形成温和、清晰的资产阅览空间。
- 藏青承载信息层级和可信结构；暗金只用于需要注意的少量元素。
- 铂灰用于边界和非活动状态，不用来承载小字号正文。
- 文字与背景保持清晰对比；不要仅靠颜色表达资产权限、校验结果或风险。
- 品牌主题没有定义的状态色仅作产品语义使用，不作为品牌主色。

## 3. 字体与排版

- 中文优先使用系统可用的 Noto Sans SC；回退到系统无衬线字体。不要因品牌规范引入外部字体依赖。
- 使用清晰的标题、正文、标签层级；长说明正文行高取 1.6–1.7。
- 将名称、来源、版本、权限和更新时间等记录元数据保持为易扫描的短行。
- 中英混排保留原品牌名及资产 ID；不强行翻译文件名、校验值或来源标识。

## 4. 布局与组件

- 使用 8px 间距基准；信息密集的目录与索引可以紧凑，但分组之间保留明显层次。
- 优先用对齐、细分隔线和留白组织内容。圆角克制（2–6px），避免把治理界面做成装饰性卡片墙。
- 资产卡片至少清楚呈现名称和类型；有数据时展示来源、可见性、版本或校验状态。
- 链接、按钮和选中项有明确的悬停、焦点与激活状态；键盘焦点必须可见。
- 空状态、加载状态与失败状态应说明发生了什么以及可执行的下一步。

## 5. 可信资产与 Agent 协作

- 对原始资产保留来源、路径和校验信息；编辑版与原件清晰区分。
- 只展示调用者有权访问的资料。私有素材不能复制到公开仓库或页面。
- Agent 输出应区分已验证事实、来源记录和推断；缺失字段明确标示未知，不补造元数据。
- 操作反馈说明结果，并在重要变更中给出资产身份与版本，方便审阅和追溯。

## 6. 来源与维护

- 已发布色值、品牌名称、定位与分类取自 [岁知社品牌记录](https://apuch.art/brand?brand=iptrust) 与 [品牌 API](https://apuch.art/api/brands.json) 中的 `iptrust` 记录。
- `tokens/iptrust.tokens.json` 是可复用的设计令牌；本指南里的布局、交互和字体建议是基于当前品牌资料整理的应用规则，不代表另有一份已发布指南。
- 更新品牌身份、官方主题色或标识时，以品牌目录/API 最新公开记录为准，并同步更新令牌与示例。
