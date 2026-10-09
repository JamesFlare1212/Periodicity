# Full electron configuration 查看方案

## 推荐方案

首页增加 **Full configuration** 入口，点击后打开轻量弹层，保留周期表的位置和当前元素。元素详情页在现有 **Inside the atom** 面板内增加 **Short / Full / By shell** 三种视图，默认 Full。Compare 页后续增加整行统一的 Short / Full 切换。

第一版已接入首页和元素详情页，提供三种视图、复制、键盘弹层和可分享的详情页视图参数。Compare 页继续作为第二阶段。

交互原型：`../prototypes/electron-configuration.html`，保留为独立设计参考；应用使用共用 Svelte 查看器。

## 设计时的现状与依据

- `ElementPreview.svelte` 和元素详情页均显示 `element.electronConfiguration`，目前只有简写，没有完整查看入口。
- `ElectronConfiguration.svelte` 已经将占据数显示为上标，可继续复用。
- 首页预览占用周期表中部的固定空隙。长排布在这里直接展开会改变表格布局，因此使用弹层。
- 原始数据全部 118 条均有电子排布。简写来自 properties，壳层数来自 general；两套历史数据需要分别校验，不能假设始终一致。

## 信息结构与线框

```text
首页元素预览
Fe  Iron
[Ar] 3d⁶ 4s²    Electron configuration
[ Full configuration ]
          ↓ 点击；同时锁定当前预览元素
┌─────────────────────────────────────────────────┐
│ Fe · Iron                             [ Close ] │
│ Electron configuration                          │
│ [ Short ] [ Full ] [ By shell ]       [ Copy ]  │
│ 1s² 2s² 2p⁶ 3s² 3p⁶ 3d⁶ 4s²                    │
│ [Ar] represents 18 electrons.                    │
│ 26 electrons                                    │
│ [ Open element page ]                           │
└─────────────────────────────────────────────────┘

元素详情页：Inside the atom
┌─────────────────────────────────────────────────┐
│ Electron configuration                          │
│ [ Short ] [ Full ] [ By shell ]       [ Copy ]  │
│ 1s² 2s² 2p⁶ 3s² 3p⁶ 3d⁶ 4s²                    │
│ [Ar] represents 18 electrons.                    │
│ 26 electrons                                    │
└─────────────────────────────────────────────────┘
原有电负性、第一电离能等数值继续排列在面板下方。
```

**Short** 显示已有简写；**Full** 展开全部核心轨道；**By shell** 根据完整排布按主量子数 n 分组，显示该层轨道及电子总数。它不表示电子填充的先后顺序，也不将过渡金属末尾的轨道统称为价电子。

Full 视图保持源数据的轨道顺序。以 Fe 为例，显示 `1s² 2s² 2p⁶ 3s² 3p⁶ 3d⁶ 4s²`，而不是暗示这是按能量排列的填充过程。[NIST 的铁原子数据](https://physics.nist.gov/PhysRefData/Handbook/Tables/irontable1.htm)给出了同样的基态占据。

## 交互细则

| 场景       | 行为                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| 首页打开   | 将当前预览元素锁定后打开弹层，避免指针离开元素块时内容变回默认元素；不推挤周期表                           |
| 弹层关闭   | Close、Escape 或点击遮罩关闭；焦点回到 Full configuration 按钮；恢复滚动                                   |
| 弹层与详情 | 同一个排布查看组件；弹层默认 Full，详情默认 Full                                                           |
| 视图切换   | 使用一组原生按钮和 aria-pressed；焦点留在所按按钮；切换无网络等待                                          |
| 切换元素   | 当前视图保留，复制反馈重置；弹层内元素在关闭前保持不变                                                     |
| 复制       | Short / Full 复制当前视图的 ASCII 文本，例如 `1s2 2s2 …`；By shell 复制带 `n=1:` 前缀的多行文本            |
| 复制反馈   | 成功显示 Copied 并播报；失败显示 Copy unavailable. Select the configuration and copy it.；文本始终允许选中 |
| H、He      | Short 与 Full 相同，也保留一致的切换入口，不产生“按钮失效”的困惑                                           |
| 缺失/无效  | 保留能展示的原始简写；Full / By shell 不可用并显示原因；不生成猜测的完整排布                               |

详情页可用 `/element/26/?configuration=full#electronic-heading` 分享当前视图。首页弹层是临时查看状态，第一版不需要独立 URL。Compare 页若实现，应使用统一视图控制，并加入现有 URL 参数。

## 视觉与响应式

复用 `MASTER.md` 与 `src/app.css`：暗色背景 #10151e、面板 #171e29、排布区域 #202a36、正文 #e9edf3、辅助文字 #a1adbd、操作色 #9de1c6。亮色使用已有独立主题配对。标题、元素符号与轨道使用 Space Grotesk；说明与操作使用 DM Sans。颜色继续表示元素家族，不为 s/p/d/f 另造容易混淆的图例。

完整排布作为主要视觉内容，桌面 24–28px，移动端 20–22px；单个 `3d¹⁰` 不拆分，在轨道之间自然换行，绝不省略尾部。控制区与排布正文左对齐。只有当前简写中显式列出的轨道使用元素家族色；展开的核心轨道使用正文色，并配文字解释，信息不只依赖颜色。

桌面弹层最大宽度约 640px；移动端宽度随视口，高度不超过 85dvh，内容可纵向滚动。长排布不横向滚动。By shell 每行显示 `n = 3`、轨道列表、`14 e⁻`，窄屏时电子数随行换到下方。按钮目标至少 44px，保留明显焦点框与 reduced-motion 支持。native dialog 负责焦点约束与 Escape；正文提供可读的逐轨道辅助文本，例如 “3d, 6 electrons”。

## 数据与组件设计

新增纯函数模块 `src/lib/chemistry/electron-configuration.ts`，只负责解析、递归核心展开和校验。它解析 `[He] / [Ne] / [Ar] / [Kr] / [Xe] / [Rn]` 并通过现有元素记录递归展开，保留尾部的真实占据数与顺序。加入循环检测、未知核心拒绝、完整字符串匹配、重复轨道检测、每个轨道容量检查以及总电子数等于原子序数的检查。不得只用正则抽取“能识别的片段”而忽略剩余内容。

建议返回结构：

```ts
type ConfigurationResult =
	| {
			status: 'available';
			short: string;
			full: string;
			orbitals: Array<{
				n: number;
				subshell: 's' | 'p' | 'd' | 'f';
				electrons: number;
				core: boolean;
			}>;
			shells: Array<{ n: number; electrons: number; orbitals: string[] }>;
			totalElectrons: number;
			coreSymbol: string | null;
	  }
	| { status: 'unavailable'; short: string; reason: string };
```

新增 `ElectronConfigurationViewer.svelte` 管理视图选择和复制；保留 `ElectronConfiguration.svelte` 为无交互上标渲染器。`ElementPreview.svelte` 增加入口，首页路由负责元素锁定与弹层，详情页将旧排布区域替换为查看器。

By shell 的数值从同一组展开后的轨道计算，保证展示内部一致。与现有 `element.shells` 不一致时，记录数据差异以供维护者复核，不静默修改原始参考数据，也不声称它们已经过科学更新。第一版不增加离子、激发态或轨道箱图。

本次原型核查发现两处历史数据差异：Ds 的排布推导壳层数为 `2, 8, 18, 32, 32, 17, 1`，既有壳层数据为 `2, 8, 18, 32, 32, 16, 2`；Rg 分别为 `2, 8, 18, 32, 32, 18, 1` 与 `2, 8, 18, 32, 32, 17, 2`。这说明两种来源的占据记录有差异，不代表本次设计已经裁定哪一套更准确。

## 验收标准与实现顺序

第一版实现首页入口与弹层、详情页查看器、递归展开、三种视图和复制。第二版再将完整排布加入 Compare 页。

- 验证全部 118 条电子总数、各轨道容量；核对派生壳层和已有壳层的差异。
- 覆盖 H/He、嵌套核心、Cr/Cu、Au/U/Og、空值、未知核心、循环、非法片段与重复轨道。
- Fe 完整排布保持 `3d6 4s2`；Cr 保持 `3d5 4s1`；Cu 保持 `3d10 4s1`，不重新用通用填充算法分配。Cr/Cu 参考 [NIST 周期表](https://www.nist.gov/system/files/documents/2019/07/10/nist_periodictable_june_2019-crop.pdf)。
- 375px、桌面、两种主题下，Og 的完整排布无截断和页面横向溢出。
- 纯键盘能打开、切换、复制、关闭，关闭后恢复焦点；复制失败仍能手动复制。
- 完成应用实现时运行 `bun run check`、`bun test`、`bun run build`。原型阶段只验证原型，不将其视作应用功能已上线。

## 本次原型验证

在共享浏览器中验证了 118 条排布的解析、容量及电子总数，全部通过；壳层对照发现上述 Ds/Rg 两项差异。Fe 的壳层分组为 `2, 8, 14, 2`。空字符串、未知核心、非法片段、超容量、重复轨道、非法壳层与递归循环均能拒绝。

1280px 桌面和 375px 手机的完整排布无页面横向溢出；手机上的 Og 弹层完整显示 19 项轨道，亮色与暗色均可使用。验证了 Escape 关闭、焦点返回入口及页面滚动恢复。复制成功和权限失败路径通过浏览器内的临时 clipboard 替身验证，没有改写用户剪贴板。方案和 HTML 均通过 Prettier 检查。
