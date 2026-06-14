---
name: Table AI Design System
colors:
  surface: '#fbf9fa'
  surface-dim: '#dcd9db'
  surface-bright: '#fbf9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f4'
  surface-container: '#f0edef'
  surface-container-high: '#eae7e9'
  surface-container-highest: '#e4e2e3'
  on-surface: '#1b1b1d'
  on-surface-variant: '#44474c'
  inverse-surface: '#303032'
  inverse-on-surface: '#f3f0f1'
  outline: '#75777d'
  outline-variant: '#c5c6cd'
  surface-tint: '#545f72'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#101c2c'
  on-primary-container: '#798499'
  inverse-primary: '#bbc7dd'
  secondary: '#745b27'
  on-secondary: '#ffffff'
  secondary-container: '#fedb9b'
  on-secondary-container: '#785f2a'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#2a1705'
  on-tertiary-container: '#9d7e64'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d7e3fa'
  primary-fixed-dim: '#bbc7dd'
  on-primary-fixed: '#101c2c'
  on-primary-fixed-variant: '#3c4759'
  secondary-fixed: '#ffdea2'
  secondary-fixed-dim: '#e3c284'
  on-secondary-fixed: '#261900'
  on-secondary-fixed-variant: '#5a4311'
  tertiary-fixed: '#ffdcc1'
  tertiary-fixed-dim: '#e4c0a3'
  on-tertiary-fixed: '#2a1705'
  on-tertiary-fixed-variant: '#5b422c'
  background: '#fbf9fa'
  on-background: '#1b1b1d'
  surface-variant: '#e4e2e3'
  universe-deep-blue: '#0A1626'
  sundial-dark-gold: '#A88B52'
  pure-white: '#FFFFFF'
  subtle-gold-mist: rgba(168, 139, 82, 0.08)
typography:
  headline-xl:
    fontFamily: Manrope
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.25'
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
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

# 设计规范文件 (design.md)

## 1. 核心设计哲学
本项目采用极简且富有启发性的视觉语言。设计应体现以下四个维度：
- **利他 (Altruistic)**：界面直观，优先考虑用户价值与操作效率。
- **真实 (Authentic)**：拒绝过度装饰，展现材质与结构的自然美感。
- **艺术 (Artistic)**：强调比例、对齐与留白的艺术性平衡。
- **优雅 (Elegant)**：通过色彩与细节传递专业且高端的质感。

## 2. 色彩系统 (Color Palette)
严禁使用预设的基础色，必须严格执行以下色值：
- **底色 (Base)**: `White (#FFFFFF)`
  - 用途：背景、大面积留白、轻盈感来源。
- **主色 (Primary)**: **寰宇深蓝 (Universe Deep Blue)** `#0A1626`
  - 用途：主要文字、结构线条、重要功能区块、品牌标识。
- **点缀色 (Accent)**: **日晷暗金 (Sundial Dark Gold)** `#A88B52`
  - 用途：行动导向按钮 (CTA)、交互状态反馈、核心关键数据、精细装饰元素。

## 3. 视觉与布局准则 (Layout & Aesthetics)
- **风格偏好**：斯堪的纳维亚极简主义，强调功能性。
- **间距系统**：基于 8px 的网格系统，确保空间比例严谨。
- **留白策略**：增加负空间比例，营造呼吸感与启发感。
- **圆角处理**：微圆角 (2px - 4px) 或直角，保持稳重感与投资级（Investor-grade）的严谨。

## 4. 组件状态 (Component States)
- **常规 (Default)**：深蓝边框或文字，背景保持纯白。
- **悬停 (Hover)**：文字或边框色深度微调，或出现极细的暗金装饰线。
- **激活 (Active)**：边框切换为日晷暗金，或背景出现浅金色微光（Opacity 5-10%）。
- **加载/空状态 (Loading)**：采用极简的深蓝骨架屏，避免复杂的动画。

## 5. 针对各工具的实施指令

### Figma
- 将上述色值存为 Local Styles (Global Colors)。
- 建立以功能命名的组件库，确保所有组件符合利他原则。

### Stitch (数据与逻辑层)
- 遵循 Result-as-a-Service (RaaS) 理念，数据返回必须清晰直接。
- 确保所有交互逻辑优先反馈成功或结果，减少不必要的中间步骤。

### Cursor (代码执行层)
- **CSS 指令**：优先使用 Tailwind CSS。强制使用自定义配置文件中的颜色映射。
- **布局指令**：使用 Flexbox 和 Grid 维护严谨的对称性或有目的性的非对称布局。
- **Prompt 示例**：请参考此 design.md 文件，使用寰宇深蓝作为主文字色，仅在关键转化按钮上使用日晷暗金，背景必须保持纯白。
