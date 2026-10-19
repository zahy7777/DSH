# DSH 多模态（读图）能力补丁

**适用场景**：在新机器上全新安装 DeepSeek Harness Desktop 后，模型走第三方中转
（或任何自定义 provider）时，`read_image` 工具报错、无法读图。

**修复耗时**：约 1 分钟。

---

## 1. 症状

在会话里让 agent 读一张图，工具直接失败：

```
cannot read "/path/to/image.png" as an image:
model "deepseek-v4.1-flash" does not declare image input;
switch to an image-capable model to read images
```

注意：**这不是中转站不支持多模态**。实测证明中转站支持，问题在本地配置。

## 2. 根因

profile 里的模型条目只写了 `id` 和 `name`，没有声明输入模态，
harness 便按纯文本模型处理，**在工具层就拒绝了图片**，请求根本不会发出去。

源码依据（`app.asar` 解包所得）：

| 包 | 位置 | 事实 |
|---|---|---|
| `@deepseek-ai/dsh-llm-pi-ai` | `lib/index.js:279` | `MODALITIES = ["text", "image"]` |
| `@deepseek-ai/dsh-llm-pi-ai` | `lib/index.js:1007` | `input: z.array(z.union(MODALITIES))` |
| `@deepseek-ai/dsh-llm-pi-ai` | `lib/index.js:1806` | `inputModalities: [...model.input]` |
| `@deepseek-ai/dsh-llm-deepseek` | `lib/index.js:494` | `inputModalities: model.inputModalities ?? ["text"]` |

最后一行是关键：**不声明，默认就是纯文本**。

## 3. 修复

编辑 `~/.dsh/profiles/desktop/cordis.patch.yml`，
在 provider 的 `models` 列表里，给需要读图的路由加一行 `input: [text, image]`。

缩进必须与同一项的 `name:` 对齐（在默认层级下是 **12 个空格**）：

```yaml
- id: llm-pi-ai
  name: "@deepseek-ai/dsh-llm-pi-ai"
  config:
    providers:
      moniker:
        displayName: moniker
        apiKeyEnv: MONIKER_API_KEY
        api: anthropic-messages
        baseURL: https://aimoniker.top
        models:
          - id: deepseek-v4.1-flash
            name: deepseek-v4.1-flash
            input: [text, image]        # ← 加这一行
          - id: deepseek-v4-flash
            name: deepseek-v4-flash
            input: [text, image]        # ← 加这一行
          - id: glm-5.3
            name: glm-5.3               # 实测拿不到图，不要加
```

改前先备份：

```sh
cp -p ~/.dsh/profiles/desktop/cordis.patch.yml \
      ~/.dsh/profiles/desktop/cordis.patch.yml.bak
```

### 生效方式：热生效，不用重启 app

实测确认 cordis loader 会监听该文件，改完**当前会话立即可用**，无需重启。

## 4. 验证（四步，可复制）

### 第 1 步：生成一张"不可猜测"的测试图

必须用随机码，否则无法区分"真看到"和"猜对了"。

```sh
/Users/haisong/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/python/bin/python3 - <<'PY'
from PIL import Image, ImageDraw, ImageFont
im = Image.new('RGB', (900, 460), 'white'); d = ImageDraw.Draw(im)
f = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 96)
d.text((50, 60), 'ZQ7K-4491', font=f, fill='black')
d.line([50, 195, 520, 195], fill='black', width=6)
d.ellipse([560, 220, 830, 440], fill='red')
im.save('mm_probe_A.png')
PY
```

### 第 2 步：直接打中转站 API，确认链路本身支持图片

```sh
python3 - <<'PY'
import base64, json, subprocess
KEY = [l.split(':',1)[1].strip() for l in open('/Users/haisong/.dsh/.credentials.yaml')
       if 'MONIKER_API_KEY' in l][0]
b64 = base64.b64encode(open('mm_probe_A.png','rb').read()).decode()
body = {"model":"deepseek-v4.1-flash","max_tokens":512,"messages":[{"role":"user","content":[
    {"type":"text","text":"Read the code and the shape colour. Answer: CODE=... COLOUR=..."},
    {"type":"image","source":{"type":"base64","media_type":"image/png","data":b64}}]}]}
open('/tmp/mm.json','w').write(json.dumps(body))
out = subprocess.run(["curl","-s","-X","POST","https://aimoniker.top/v1/messages",
    "-H","content-type: application/json","-H","anthropic-version: 2023-06-01",
    "-H","x-api-key: "+KEY,"--max-time","300","-d","@/tmp/mm.json"],
    capture_output=True,text=True,encoding="utf-8").stdout
d = json.loads(out)
print("".join(b.get("text","") for b in d.get("content",[]) if b.get("type")=="text"))
print("usage:", d.get("usage"))   # 注意同时看 cache_read_input_tokens
PY
```

期望输出 `CODE=ZQ7K-4491 ... COLOUR=red`。

> **必须用 curl**：该中转站有 Cloudflare 校验，python-urllib 会被拒。

### 第 3 步：在会话里让 agent 读同一张图

能正常描述内容即修复完成。

### 第 4 步：无图对照（区分"真看到"和"在编"）

把**同一提示词去掉图片**再发一次。模型应当明确表示看不到图，而不是报出一个码。

本次实测：它耗尽思考预算后写下 `without image, impossible`，**没有编造任何随机码** ——
正因如此，带图时那张 3/3 全对才有意义。

反过来，如果你的模型在**无图时仍然自信地报出一个码**，说明它在编；
那么它带图时给出的"正确答案"同样不可信。

## 5. 已验证的模型（2026-10-14 实测）

判定标准：两张图各带不可猜测的随机码 + 形状 + 颜色，三行全对才算通过。

| 路由 | 中转站是否真的传图 | 结论 |
|---|---|---|
| `deepseek-v4.1-flash` | **是**，3/3 全对 | 可加 `input: [text, image]` |
| `deepseek-v4-flash` | **是**，3/3 全对 | 可加 |
| `deepseek-v4-pro` | **是**，3/3 全对 | 可加（但有规格冲突，见风险） |
| `glm-5.3` | **否**，明说 "no image content came through" | 不要加 |
| `kimi-k3` | 否，编出错误码 `Z97K-4491`（真值 `ZQ7K-4491`） | 不要加 |
| `deepseek-v4-pro-0813` | 否，未给出结构化回答 | 不要加 |
| `deepseek-v4-flash-0731` / `glm-5.3-flash` / `minimax-m3` | 未测 | 先测再加 |

## 6. 三个坑

### 坑 1：不要只看 `input_tokens` 判断图片有没有发出去

该中转站启用了 prompt caching。重复同一请求时 `input_tokens` 会异常偏低：

| 路由 | 请求 | input_tokens | cache_read | 合计 |
|---|---|---|---|---|
| flash | 首次 | 330 | 0 | 330 |
| flash | 重复同 prompt | 202 | 128 | 330 |
| pro | 首次 | 619 | 0 | 619 |
| pro | 重复同 prompt | 43 | 576 | 619 |

看到"43 个 token 却答对了"不要以为泄漏，是缓存命中计费。**必须把
`cache_read_input_tokens` 一起看。**

### 坑 2：静默丢弃 —— 最危险的失败模式

某路由拿不到图片时，**模型不报错**，而是给一个看起来合理的错答案。
`kimi-k3` 的实测样本：形状和颜色都"蒙对"（圆形+红色是最常见的猜测），
只有不可猜的随机码露馅（`Z97K-4491` vs `ZQ7K-4491`）。

所以给某个路由加 `input: [text, image]` 之前，**必须用随机码实测**，
不能因为"官方文档说它支持视觉"就想当然。

### 坑 3：`deepseek-v4-pro` 的规格冲突

官方[定价页](https://api-docs.deepseek.com/quick_start/pricing)标注 V4-Pro
`Vision: Not supported`，但中转站的 `deepseek-v4-pro` 稳定 3/3 答对。

可能解释：官方自 2026-09-14 起把 `deepseek-v4-pro` 请求路由到 V4.1-Flash
（[发布说明](https://api-docs.deepseek.com/news/news260910)），中转站镜像了上游行为。

**推论**：不能用这个中转站做 Flash vs Pro 的**能力对比**，标签与真实后端的关系无法保证。
benchmark 对比只能用官方模型卡数据。

**回退**：若 pro 读图开始出错，删掉它的 `input: [text, image]` 即可。

## 7. 相关文件

本补丁**自身已自包含**，照第 3 节改完即修复，不需要其他文件。

以下仅在需要复核或回归时才有用，未随行携带也不影响修复：

| 文件 | 说明 |
|---|---|
| `../.work/probe_multimodal.py` | 可重跑的端到端回归脚本 |
| `../.work/multimodal_probe_findings.md` | 原始实测记录（判据、数字、无图对照原文） |
| `~/.dsh/profiles/desktop/cordis.patch.yml.bak` | 改前备份（sha256 `53fc7a46…`） |
