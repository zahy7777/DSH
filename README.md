# DSH

DSH 是一个统一 Git 仓库，收纳三个相互协作但职责独立的概念：

- `deepseek-harness/`：上游 DeepSeek Harness 源码与相关工程；
- `tiny-dsh/`：面向运行时内核与插件机制的实验实现；
- `ts-learning/`：TypeScript 运行时与语言心智模型学习文档；
- `补丁/`：针对 DSH 的补丁和设计记录。

`.work/` 仅用于本机实验、探针输出和运行时凭据，已由根级 `.gitignore` 排除。

本仓库从统一根提交开始维护；各子目录不再作为独立 Git 仓库。
