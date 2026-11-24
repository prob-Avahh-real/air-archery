# 空气射箭 Air Archery

用空中手势射箭：智能戒指瞄准，智能手杖拉弓放箭。Capacitor 打包为手机 App，并适配手表小屏。

## 功能

- **靶距**：近靶 / 中靶 / 远靶（落差与风力不同）
- **物理**：拉弓蓄力 · 重力落差 · 侧风偏移 · 环靶计分
- **Web Audio**：拉弦嗡鸣、放箭破空、中靶脆响
- **可穿戴输入**
  - 戒指：绝对倾角瞄准 · 甩动取消拉弓
  - 手杖：挥动拉弓蓄力 · 敲击放箭
- **触控兜底**：拖动画布瞄准 · 拉弓/放箭按钮
- **手表适配**：`max-width: 280px` 或 `max-height: 300px` 紧凑布局

## 项目结构

```
air-archery/
├── protocol/air-archery.json   # 手势与靶场协议
└── mobile/
    ├── index.html
    ├── capacitor.config.json
    ├── package.json
    ├── scripts/build-web.js
    ├── src/
    │   ├── app.js              # UI 与手势路由
    │   ├── audio-engine.js     # 拉弓 / 放箭 / 中靶音
    │   ├── targets.js          # 靶距与计分环
    │   ├── physics.js          # 瞄准 / 蓄力 / 箭矢飞行
    │   └── wearable-input.js   # 戒指 / 手杖
    └── test/
```

## 快速开始

```bash
cd mobile
npm install
npm run build          # → www/
npm test
```

浏览器预览：

```bash
npx serve www
```

## 打包 Android / iOS

```bash
cd mobile
npm install
npx cap add android    # 或 ios
npm run mobile:android
# 或 npm run mobile:ios
```

日常：改 `src/` 或 `index.html` → `npm run build` → `npx cap sync android` → 真机运行。

## 手势对照

| 设备 | 动作 | 效果 |
|------|------|------|
| 戒指 | 倾角（绝对） | 瞄准准星 |
| 戒指 | 甩动 > 20° | 取消拉弓 |
| 手杖 | 挥动 > 3 | 拉弓蓄力 |
| 手杖 | 加速度尖峰 > 8 | 放箭 |

桌面调试：鼠标移动瞄准，按住空格拉弓、松开放箭，`1`/`2`/`3` 换靶距，`M` 静音，`R` 新一轮。
