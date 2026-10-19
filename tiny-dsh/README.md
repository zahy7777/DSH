# tiny-dsh
- 给 DSH 造一个基座框架
- DSH 是万物皆插件（331 个包），这个项目给它搓一块基座
- 做两件事，按顺序
	- 搓基座框架
		- 让一堆互不相识的插件在一个进程里共存
		- 互相使用能力
		- 能独立装卸
	- 在它上面搓 DSH 极简模式
		- 能真的连上 DeepSeek API、能用工具、能从命令行跑起来
- 参考材料是 `../deepseek-harness/` 里的 Cordis 和 DSH 源码
	- 它们帮我们推演概念：这个概念为什么必须存在、别人怎么解的、有什么坑、有没有被真用过
	- 但权威是推演本身
- 服务于：优雅、极简、Linus 工程美感、概念
- 这是作者自己的东西
- 这个文件放参考和记录。指令在 [AGENTS.md](AGENTS.md)

# 目录
- 结构如下
	```text
	src/               只有源码
	  kernel/          kernel：不能是插件的那部分
	  dsh/             DSH 的插件（还没开始）
	tmp/               只有测试和演示，绝不混进 src/
	  fixture/         素材：被测试和被演示依赖的固定物
	  test/            脚本：把 fixture 跑起来、打印结果
	  tsconfig.json    检查 fixture/ 和 test/
	tsconfig.json      检查 src/
	```
- fixture 是名词，固定的靶子
- test 是动词，跑起来看结果

# 怎么跑
- 命令如下
	```sh
	npm install
	
	npm run c1           # C1 的演示
	npm run c2           # C2 的演示
	
	npm run check        # 类型检查 src/，必须零输出
	npm run tmp:check    # 类型检查 tmp/，必须零输出
	```

# 工具链
- 跑用 `tsx`，查用 `tsc`
- 仓库现在零代码，所以 `npm run check` 和 `npm run tmp:check` 会报 TS18003
	- 那是「没有输入」的意思，不是错
	- 写出第一个 `.ts` 文件就恢复

## 为什么不用 node 原生
- node 从 22.6 起能直接跑 `.ts`，但它用纯擦除模式，明确拒绝两类语法
- 而这两类 Cordis 里到处都在用
	- 构造函数参数属性，`constructor(private x: T)`
	- `enum` 和 `const enum`，`FiberState` 就是
- DSH 官方用的也是 tsx，所以我们也一样

# 概念词汇表
- 编码只准用这里的词
- 推演每定一个名字就补一行

## kernel
- 是什么：不能是插件的那部分
- 为什么是这个词：微内核架构，核心只提供最小机制，功能全在插件

## plugin
- 是什么：DSH 的一切都抽象成它
- 为什么是这个词：行业词，VS Code 插件、Webpack plugin

## Context
- 是什么：宿主交给插件的那一个接口，插件通过它取能力、放能力、发事件、管生命周期
- 每个插件一个，不是全局一个
- 为什么是这个词：同一件事在五个框架里都以 Context 收尾
	- Spring 叫 `ApplicationContext`
	- OSGi 叫 `BundleContext`
	- VS Code 叫 `ExtensionContext`
	- Rollup 叫 `PluginContext`
	- Cordis 叫 `Context`
- 候选与坑
	- `BundleContext` 最精确，但 Bundle 是 OSGi 的词，我们没有 bundle
	- `IServiceProvider` 只覆盖取，不覆盖放和事件
	- `ApplicationContext` 最完整，但长，且强 Spring 联想
	- `Container` 强调装东西，而它不装东西，只是入口
	- `Facade` 太泛
	- `Registry` 只覆盖查
	- 撞名的三个：Go 的 `context.Context` 是取消和超时，React 的 Context 是跨层传值，Android 的 Context 是应用环境，但方向都是"某某的上下文"

# 已否决的形状
- 现在空着
- 重推时撞上同类问题，把否决结论和证据记在这里

# 已经栽过的坑
- 上面那些规则不是空想的，每一条都是真栽了才立的
- `mount`：我发明词去指官方的 `plugin`，读者读源码时多做一次映射
- `name`：一个词两个层次（服务名和插件名），每出现一次切一次上下文
- `Impl.name`：照抄真实源码的字段，没懂它为什么在
- `PendingPlugin`：名字说"待办的插件"，实际承载的是"一次待办的加载"
- 推演里一直叫"名字"：泛词，导致"它到底是什么"被拖了四轮才问出来
- C3 擅自加接口
	- 推演里没有 `StuckPlugin` 和 `Context.stuck`
	- 编码时顺手加了
	- 整个 C3 撤销重做

# 进度
- 前面的一切作废，从零重推
- kernel 的推演进度记在这里

## 已定
- 推演 0，kernel 的边界。已定
- 推演 1，Plugin Definition、Context、Fiber、Effect、Disposer、Registry、Isolate、Service Name、Impl 的最小闭环。已定

## 待推
- 依赖如何声明与等待
- 多个实现如何在 Context 装配时选择
- 异步 Effect 与错误语义

# 参考坐标
- 用来对照和避坑，不是权威
- 推演结论和它不同时，以推演为准
- kernel 的对照物是 `vendor/cordis/src/`
- DSH 的真实插件在 `packages/`
