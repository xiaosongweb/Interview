# Day04 - Promise 与异步控制

## 基础原理题
1. Promise/A+ 的三态与状态不可逆原则是什么？
答：
pending等待（初始状态，既未完成也未拒绝），fulfilled已成功（表示操作成功完成，必须有一个终值（value），且状态不能再发生任何变化）rejected已失败（表示操作失败，必须有一个拒因（reason），且状态不能再发生任何变化）
单向迁移：只能从 pending → fulfilled，或从 pending → rejected。一旦状态变为 fulfilled 或 rejected，就永久固定，不能再改变。这保证了异步结果的一致性和可预测性。
2. `async/await` 与 Promise 链在语义与错误传播上的关系是什么？
答：async/await 和 Promise 链在语义与错误传播上是等价的：await 遇到 reject 相当于在该处 throw，未捕获则让 async 返回的 Promise 变为 rejected；而 try/catch 对应 Promise 链的 catch/失败分支。

## 深度解析题
1. `Promise.all/allSettled/race/any` 的适用场景与坑点分别是什么？
2. 异步请求取消如何做？`AbortController` 在工程中的落地模式是什么？

## 拓展理解题
1. 在多服务聚合接口中，如何做并发控制、超时、重试与熔断？
答：
并发控制
限制同一时刻最多并发 N 个请求（常用 p-limit 思路或者队列）。不用 Promise.all 做“全有全无”，聚合场景更适合 Promise.allSettled：允许部分成功，部分失败走降级。
超时
每个下游调用用 AbortController 设 请求级超时。设置全局截止时间，聚合总耗时过了就停止继续等待/重试，直接走 fallback。超时后要确保能正确进入错误分支，不允许吞并错误。
重试
只对瞬态错误重试：网络错误、超时、5xx（以及明确可重试的 429）。
用 指数退避 + 抖动 jitter 降低重试风暴。
重试次数/重试耗时要受 global deadline 约束（剩余时间不够就不再重试）。
熔断
维护每个下游的状态：CLOSED(正常) -> OPEN(故障快速失败) -> HALF_OPEN(探测恢复)
OPEN 状态下：直接失败快速返回，不再发请求，立刻走降级
降级
返回部分结果：失败服务对应的数据置空/显示“暂不可用”
或返回缓存结果（localStorage/indexedDB）并标记“数据可能不是最新”
或统一展示聚合失败但保留可操作 UI


## 手写/场景题
1. 手写 `Promise.all`（含空数组、非 Promise 值、短路失败逻辑）。
答：
参考./myPromiseAll.js

## 完成状态
- [✅] 机制理解
- [✅] 手写通过
- [✅] 场景迁移
