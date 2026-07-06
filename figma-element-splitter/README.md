# Element Splitter Figma Plugin

这是一个本地 Figma 插件原型：选中一张黑底素材图后，一键去掉左侧说明文字和横向分隔线，把每个装饰元素抠成透明 PNG，并重新插入 Figma。

## 功能

- 读取 Figma 画布中选中的图片图层
- 调用本地 Python 服务做图像处理
- 黑底转透明
- 自动过滤标题文字区域和分隔虚线
- 自动拆分装饰元素
- 支持按原图位置还原，或整理成右侧素材网格

## 启动后端

```bash
cd "figma-element-splitter/server"
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8787
```

看到 `Application startup complete` 后，保持这个终端开着。

## 加载 Figma 插件

1. 打开 Figma Desktop。
2. 进入 `Plugins` → `Development` → `Import plugin from manifest...`。
3. 选择 `figma-element-splitter/manifest.json`。
4. 在画布中放入一张素材图，并选中它。
5. 运行 `Element Splitter`。
6. 点击 `拆分选中图片`。

## 参数怎么调

- `背景阈值`：越大，越容易忽略暗色像素；如果淡紫色细节丢失，调小。
- `合并间距`：越大，越容易把珠链、散点合成一个元素；如果多个独立装饰粘在一起，调小。
- `最小面积`：过滤小噪点；如果小星星没了，调小。
- `透明边距`：每个 PNG 周围保留的空白。
- `左侧文字宽度`：左侧说明文字占的宽度；文字没删干净就调大。
- `标题高度`：每个分区顶部说明文字的高度；删到装饰就调小。

## 离线测试

不打开 Figma 也可以先拆图：

```bash
cd "figma-element-splitter/server"
source .venv/bin/activate
python split_cli.py "/path/to/image.png" --out output
```

输出会在 `server/output`，同时生成 `manifest.json` 记录每个元素的位置和尺寸。

## 当前限制

这个 MVP 主要针对“黑底 + 亮色装饰元素 + 左侧文字说明”的素材图。复杂背景、元素重叠严重、文字覆盖在装饰上时，建议后续接入 SAM / RMBG / OCR + inpainting 服务来增强。
