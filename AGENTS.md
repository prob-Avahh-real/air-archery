# air-archery

空气射箭 Air Archery 用空中手势射箭：智能戒指瞄准，智能手杖拉弓放箭。Capacitor 打包为手机 App，并适配手表小屏。 功能 - **靶距**：近靶 / 中靶 / 远靶（落差与风力不同） - **物理**：拉弓蓄力 · 重力落差 · 侧风偏移 · 环靶计分 - **Web Audio**：拉弦嗡鸣、放箭破空、中靶脆响 - **可穿戴输入** - 戒指：绝对倾角瞄准 · 甩动取消拉弓 - 手杖：挥动拉弓蓄力 · 敲击放箭

## 用途与 Target 判定

空中射箭：戒指瞄准、手杖拉弓放箭

- 移动端：需要
- 智能硬件：需要

## 目标平台

| 平台 | 方式 | 产出 |
|------|------|------|
| 🤖 Android | Capacitor → Gradle | APK |
| 🍎 iOS | Capacitor（若已加 ios/） | IPA |
| ⌚ 手表 | 窄屏 `@media (max-width:280px)` 等 | 同 App |
| 💍 智能戒指 | DeviceOrientation | 见实现 |
| 🦯 智能手杖 | DeviceMotion | 见实现 |

## 技术栈信号

- 检测到：capacitor, mobile/

## 命令

```bash
# 见 README
```

## 同步说明

原生工程变更后按各栈惯例同步（`cap sync` / `flutter build` / Gradle）。

## 智能硬件约定

- 戒指：DeviceOrientation（倾斜/摇动），注意 iOS 权限需在用户手势内请求
- 手杖：DeviceMotion（加速度尖峰=轻点，摆动=方向）
- 手表：`@media (max-width: 280px), (max-height: 300px)`
- 优先复用兄弟项目的 `wearable-input.js` / `air-shared`，避免再复制漂移

## 助手约束

- Loop：先定可验证 Done 与停止条件；每切片过验证环；失败回灌；详见 docs/LOOP_ENGINEERING.md
- Harness：遵循根 AGENTS「Harness Engineering」；Guide=本文件，Sensor=测试/CI；同类失误二次须沉淀规则或测试（棘轮）。详见 docs/HARNESS_ENGINEERING.md
- 遵循仓库根 `AGENTS.md`：通用性/扩展性、分阶段里程碑、默认双 Target（**仅当用途适合**）
- 可选 Target 未做时可搁置；不要为不适用形态硬加 APK/穿戴
- 改动保持聚焦；公共逻辑抽到 shared/`tools/`，禁止静默失败
