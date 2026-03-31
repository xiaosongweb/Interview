# Day01 - JS 执行机制与事件循环

## 基础原理题
1. JS 单线程模型为何成立？调用栈、任务队列、事件循环如何协作？
问：你这里的“单线程”具体指的是什么层面？是 JS 引擎执行线程单一，还是整个进程只有一个线程？宿主环境（浏览器 Web API / Node libuv 线程池）在做什么？
答：JS 单线程模型核心初衷是为了操作DOM,如果多个线程都同时修改同一个DOM,浏览器将无法判断以谁为准，会引发竞态条件和死锁问题。所以设计了单线程+异步非阻塞的模型。
问：如果同步代码一直阻塞不清空调用栈，会发生怎样的现象？（比如任务队列里的回调是否会被执行、页面是否会卡住）
答：会造成UI渲染的阻塞，导致页面迟迟没有任何响应，影响用户长时间的等待，所以JS中的长任务会阻塞UI渲染。
问：给一个最小时序/伪代码（至少包含 `setTimeout` 和 `Promise.then`），你会如何用“调用栈空闲点 + 队列/事件循环”讲清楚输出顺序？
```js
console.log('script start')
setTimeout(()=>{
    console.log('setTimeout1')
    new Promise(()=>{
        console.log('Promise1')
    }).then(()=>{
        console.log('Promise4')
    })
},0)
function cb(){
    console.log('cb')
}
await cb()
console.log('script end')
// 执行结果：script start => cb => script end => setTimeout1 => Promise1 => Promise4
```
2. 微任务与宏任务的执行顺序是什么？浏览器与 Node.js 有何差异？
答：事件循环本质是为了解决调用栈同步代码、微任务、宏任务之间的顺序执行问题，浏览器中流程是：从宏任务队列中取一个最旧的任务开始执行，接着期间产生的所有微任务都依次执行完毕直至清空微任务队列，浏览器还会根据是否存在空闲时间去执行UI渲染的操作,最后进入到下一轮循环。
Node中流程是分为以下几个阶段：timers阶段（执行即将setTimeout,setInterval） => pending callbacks阶段（执行上一轮遗留的IO回调）=>idle阶段（通常是系统内部使用） => poll轮询阶段（检索IO事件并执行IO回调） => check检查阶段（执行setImmediate）=> close callbacks关闭回调阶段（如ws、fs相关的关闭回调）
问：你上面描述了 Node 的阶段划分，但这题的核心还包括“微任务队列（Promise / nextTick）在哪些时点跑”。`process.nextTick` 相对 `Promise.then` 的优先级是什么？
答：timers、pending callbacks、idel、check、close callbacks 会在当前阶段结束清空nextTick任务队列，然后清空Promise.then微任务队列，最终进入到下一个阶段。
poll轮询阶段，判断 存在IO回调会清空微任务队列或者执行达到任务上限，判断定时器没到期且没有setImmediate则可能会阻塞在此阶段等待新的事件，判断定时器有到期则计算出剩余时间并阻塞相应时间。
process.nextTick优先级时最高的。

问：能否再补一句“宏任务内部再生成微任务时”的规则？（比如：当前宏任务结束后是否会先清空所有微任务，再进入下一轮宏任务）
答：同步地取出微任务队列中的所有微任务，并依次执行，直到微任务队列彻底为空。在这个清空过程中，新产生的微任务会被添加到当前队列的尾部，并在本轮清空中继续执行。
问：给出你认为最能验证“插队”的样例代码，并写出预期输出顺序。
```js
console.log('script start')
setTimeout(()=>{
    console.log('setTimeout1')
    process.nextTick(()=>{
        console.log('nextTick1')
    })
    new Promise((resolve)=>{
        console.log('Promise1')
        new Promise((resolve,reject)=>{
            console.log('Promise2')
            resolve()
        }).then(()=>{
            console.log('Promise3')
        })
        resolve()
    }).then(()=>{
        console.log('Promise4')
    })
},0)
console.log('script end')

// 执行结果 script start => script end => setTimeout1 => nextTick1 => Promise1 =>Promise2 => Promise3 => Promise4
```

## 深度解析题
1. 为什么 `Promise.then` 能“插队”到 `setTimeout` 前？请从规范角度解释。
答：Promise.then属于微任务，会在当前宏任务结束后、进入下一轮宏任务之前”执行。而setTimeout是一个宏任务，如果两个同时处于同一层调用栈层级时，Promise.then会比setTimeout先执行。
```js
// 案例1
setTimeout(()=>{
    console.log('setTimeout1')
},0)
Promise.resolve().then(()=>{
    console.log('Promise1')
})
// 执行结果:Promise1 => setTimeout1

```
问：你这句“如果两个同时处于同一层调用栈层级时”表述有点口语化。能否换成更规范的讲法：`当前任务（task）结束后会做一次 microtask checkpoint，先清空 microtask job queue，再进入下一轮 task`？
答：当前 task（同步代码）结束后，立即执行了 microtask checkpoint，将所有微任务（包括微任务中产生的微任务）全部清空，然后才进入下一个 task（setTimeout 回调）。
问：如果把 `Promise.then` 放到 `setTimeout` 的回调内部（同样在一次 task 里创建），输出顺序会怎么变？你会怎么解释这个变化？
答：微任务的执行始终是在当前宏任务执行完毕之后，无论这个宏任务是全局脚本、setTimeout 回调还是其他宏任务。Promise.then 放在哪个宏任务中，其回调就在那个宏任务结束后执行。
问：在浏览器里，`Promise.then` 与 `queueMicrotask` 是否等价？它们分别属于哪类队列（microtask）？
答：在浏览器环境中，Promise.then 与 queueMicrotask 在功能上是等价的，它们会将回调函数放入同一个微任务队列，并遵循完全相同的执行规则。同属于微任务队列
2. 大量微任务会造成什么问题？如何避免 UI 饥饿和交互卡顿？
答：由于JS引擎是单线程，非异步阻塞模型。在事件循环中会依次清空所有的微任务队列，而大量的微任务会长期占据线程时间，导致阻塞UI的渲染。通过requestAnimationFrame/setTimeout拆分微任务。
问：请你补一句“具体后果”：输入事件（click/keydown）和渲染为什么会被延后？是因为一直没机会进入下一轮宏任务/渲染时机吗？
答：输入事件（click/keydown）和渲染之所以会被延后，正是因为事件循环一直没能“轮到”它们所在的队列或渲染步骤。主线程被当前宏任务及其微任务长时间占用，导致事件循环无法及时切换到下一个宏任务（输入事件），也无法在恰当的时机插入渲染步骤。
问：如果你在 AI 流式渲染中不断 `queueMicrotask`/`Promise.then` 更新 DOM，会出现什么典型症状？你会优先怎么定位（性能面板/长任务/帧率）？
答：会产生页面抖动、异常错位。通过浏览器devtools工具，先观察网络/资源加载请求情况是否存在长耗请求，接着观察是否存在黄色的长耗时无空闲循环的task任务,最后在查看渲染画布中DOM渲染是否存在大量的紫色重绘重排步骤。
问：给出一个可执行的缓解策略：例如“把每 N 个 token 的 DOM 更新合并，并在 `requestAnimationFrame` 或 `setTimeout` 中批量提交”，你会怎么描述 N 如何取值、以及何时 yield？
答：N 是一个批处理大小，需要平衡两个目标：太小（例如 1）：yield 次数过多，总耗时变长，频繁调度开销大。太大（例如 1000）：单次阻塞时间过长，可能超过 16ms 帧预算，导致明显卡顿。
基于时间的动态调整（最稳健）设定一个目标单次阻塞时间，例如 8ms（留一半时间给渲染和交互）。在每一批处理时记录开始时间，每处理一个 token 检查是否超时。一旦超时，即使本批未达到固定数量，也立即 yield。

## 拓展理解题
1. 在 AI 流式输出场景中，事件循环如何影响 token 渲染延迟与用户体验？
答：当 SSE 消息到达时，浏览器会创建一个新的宏任务（message 事件）并放入任务队列。事件循环的流程是：
取出这个宏任务执行（回调中更新 DOM）。宏任务执行完毕后，立即执行 microtask checkpoint（清空微任务队列）。然后浏览器有机会进行渲染（如果 DOM 有变化且满足渲染时机）。渲染并不一定会发生在每个宏任务之后。浏览器会合并多个 DOM 变更，通常以 60fps（约 16.6ms）为周期进行渲染。如果 token 到达间隔非常短（例如每 1ms 一个），那么多个宏任务会在同一个渲染帧内执行完毕，但用户只能看到最后一次渲染的结果，中间 token 会“丢失”视觉上的逐字效果
问：你这里的“丢失”更严谨的说法应该是“渲染被节流/合并”，token 数据并不会真正丢，只是 paint/渲染只能反映到帧边界上。你能用一句话修正这个结论吗？
答：token 数据本身并未丢失，只是 DOM 更新后的渲染被节流到帧边界（通常约 16.6ms 一次），多个 token 在同一帧内的变更会被合并呈现，导致视觉上“跳跃”而非逐字出现。
问：如果你想保证“逐字可见”的同时避免掉帧，你会怎么设计“缓冲 + 批量提交”的策略？具体用 `requestAnimationFrame` 还是 `setTimeout`，以及为什么？
答：为了在保证“逐字可见”（每个 token 都能独立被用户看到）的同时避免掉帧，我会选择 setTimeout 作为核心调度器，而非 requestAnimationFrame。原因在于：requestAnimationFrame 与屏幕刷新率（通常 60fps，约 16.6ms 一帧）绑定，如果 token 到达间隔小于帧间隔（例如每 5ms 一个），多个 token 的 DOM 更新会在同一帧内合并渲染，导致视觉跳跃，无法实现逐字出现；而 setTimeout 可以人为设置一个大于帧间隔的最小显示间隔（例如 30ms），确保每个 token 独占一次独立的渲染机会，从而让用户清晰感知到逐字效果。
问：当你在流式回调里频繁触发 `Promise.then/setTimeout` 做 DOM 更新时，microtask 与宏任务分别会如何改变你看到的节奏？你会怎么在 Demo 里验证？
答：多个 token 到达产生的微任务会堆积在同一个宏任务结束后，一次性全部执行，然后只渲染一次 → 视觉跳跃，失去逐字感。每个 token 产生一个独立的宏任务，每个宏任务结束后都有一次渲染机会 → 渲染更稀疏（因为宏任务调度有最小延迟 4ms），但能保证每个 token 单独渲染。
微任务会导致批量合并渲染，适合最终一致性，不适合逐字动画。宏任务能强制独立渲染，但延迟较高，可能造成“卡顿感”。
## 手写/场景题
1. 手写简化版调度器：支持 `queueMicrotask` 与 `setTimeout` 两级队列并输出执行日志。
答：严格遵循 每个宏任务执行后立即清空所有微任务的规则。调度器使用真实的 setTimeout 驱动宏任务处理，不会阻塞主线程。
参考./调度器.js
```txt
预期顺序
--- 初始宏任务开始 ---
--- 初始宏任务结束 ---
  微任务 A
  微任务 B
    微任务 A1（由微任务 A 产生）
--- 第三个宏任务（外部添加）---
--- 第二个宏任务（由第一个宏任务产生）---
  微任务 C（在第二个宏任务中产生）
```

## 完成状态
- [✅] 口述原理（3-5 分钟）
- [✅] 手写代码（30 分钟）
- [✅] 复盘记录（10 分钟）
答：
概念上：我已经能比较系统地讲清楚 JS 单线程模型、调用栈、宏任务 / 微任务队列，以及事件循环的一次完整 tick 流程，并能用具体例子解释 Promise.then 为何常常“插队”在 setTimeout 前。
细节上：对浏览器与 Node.js 的差异有了更细粒度的认知，尤其是 Node 的各阶段、process.nextTick 与 Promise 微任务的优先级，以及“宏任务结束后清空全部微任务”的关键规则。
场景上：结合 AI 流式输出，我能把事件循环与“token 渲染延迟 / UI 饥饿 / 掉帧”联系起来，并思考用批处理 + setTimeout/requestAnimationFrame 等手段在“逐字可见”和“流畅度”之间做权衡。
实现上：通过手写两级队列调度器（宏任务用 setTimeout 驱动、微任务在每个宏任务后完整清空），把规范里的事件循环机制落到了可观察的日志上，便于之后在面试中边跑代码边讲解执行顺序。