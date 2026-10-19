# DSH 项目约定

DSH 的根仓库负责统一版本边界与项目索引；子目录分别维护上游工程、运行时实验和学习文档。跨目录改动先确认所属概念，再保持依赖方向简单。

- `deepseek-harness/`：上游工程源码；
- `tiny-dsh/`：运行时内核与插件实验；
- `ts-learning/`：TypeScript 学习文档；
- `补丁/`：补丁和设计记录；
- `.work/`：本地实验数据与凭据，禁止提交。

修改后检查 `git diff`、`git diff --cached` 和 `git status`，只提交当前任务相关文件。
