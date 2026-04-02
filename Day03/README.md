# Day03 - 原型链与对象系统

## 基础原理题
1. 原型链查找规则是什么？`__proto__`、`prototype`、`constructor` 分别是什么？
答：
当访问obj.xxx时，先查obj自身是否有自定义属性，如果没有，就沿着obj.[[prototype]]向上查，一直查到null为止。
__proto__ 是访问器,用来读写对象内部的 [[Prototype]]
prototype 是函数上的原型属性对象
constructor 是prototype对象上有个constructor指回“创建它的构造函数”
2. `Object.create`、`class extends`、组合继承的差异与场景是什么？
答：
Object.create是直接创建一个新对象，并把它的原型设置为proto,不会自动调用任何"父类构造函数"，场景常用于继承行为（原型方法）或想精确控制原型链。
class extends本质仍然依赖原型链：子类实例的 [[Prototype]] 指向父类原型对象，constructor里通常要super()来完成父类的初始化，场景适用于ES 语法获得更清晰的“类继承”，并确保 super / 静态继承等规则正确。

## 深度解析题
1. 为什么说“继承的是行为而不是数据”？请结合引用类型陷阱说明。
答：
继承通常是放原型或class的方法，这个本质是共享一份函数引用。如果放在原型上的数据会被多个实例共享，导致数据串扰。
如果你把 items = [] 这种数组/对象直接写在 Parent.prototype.items = [] 上
那么所有 new Child() 得到的实例，访问到的同一个 items（同一个原型上的对象）
结果：A 改了数组，B 也“看见”变化

2. `Proxy` 与 `defineProperty` 在能力、性能、兼容性上的差异是什么？
答：
Object.defineProperty：更多是针对单个属性做 getter/setter 或固定描述符（enumerable/writable/configurable）
Proxy：是对整个对象的“操作拦截器”。可以拦截 get / set / has / ownKeys / deleteProperty / apply / construct ... 等多种“语言级操作”
defineProperty 通常更轻量，能让引擎对特定属性做优化，ES5，兼容面更老更广。
Proxy 运行时拦截更通用，通常开销更高；大量高频访问时要谨慎，ES6，现代浏览器基本都支持；但如果要兼容非常老环境，需要替代方案。

## 拓展理解题
1. 如何用原型与组合模式设计可扩展 SDK（插件机制）？
答：
核心 SDK 负责：
管理插件注册：sdk.use(plugin)
维护一套“可插拔的 hooks”（事件/阶段，比如 onInit、onRequest、onResponse）
在关键流程按顺序执行 hooks
插件只负责：
暴露 apply(sdk) 或挂载 hooks
行为上：
SDK 的公共能力放在原型/类方法（共享行为）
数据上：
插件的配置或运行时状态放实例上（避免共享引用类型）

## 手写/场景题
1. 手写 `new` 运算符与 `instanceof`，并说明跨 iframe 的边界问题。

答：

**手写 `new`（语义等价）**

1. 以构造函数的 `prototype` 为原型创建新对象（`Object.create(Constructor.prototype)`）。
2. 把新对象作为 `this` 调用构造函数：`Constructor.apply(obj, args)`。
3. 若构造函数返回对象或函数，则以该返回值为准；否则返回步骤 1 创建的对象。

```js
function myNew(Constructor, ...args) {
  if (typeof Constructor !== "function") {
    throw new TypeError("not a constructor");
  }
  const obj = Object.create(Constructor.prototype);
  const ret = Constructor.apply(obj, args);
  return ret !== null &&
    (typeof ret === "object" || typeof ret === "function")
    ? ret
    : obj;
}
```

**手写 `instanceof`（语义等价）**

沿 `left` 的原型链向上找，看是否存在某一环等于 `right.prototype`；找到则 `true`，到 `null` 则 `false`。

```js
function myInstanceof(left, right) {
  if (right == null || (typeof right !== "object" && typeof right !== "function")) {
    throw new TypeError("invalid right-hand side in instanceof");
  }
  const target = right.prototype;
  if (typeof target !== "object" && typeof target !== "function") {
    throw new TypeError("prototype is not an object");
  }
  let p = Object.getPrototypeOf(left);
  while (p !== null) {
    if (p === target) return true;
    p = Object.getPrototypeOf(p);
  }
  return false;
}
```

**跨 iframe 的边界问题**

- 每个 iframe 有独立的 **JavaScript 领域（realm）**：各自的 `Object`、`Array`、`Function` 等内置构造函数不是同一个对象。
- **`instanceof` 依赖原型链上的 `===` 比较**：父页面里的 `Array` 与 iframe 里创建的数组，其 `[[Prototype]]` 指向的是 **iframe 内的 `Array.prototype`**，因此在父页面执行 `arr instanceof Array`（父页面的 `Array`）常为 **`false`**，出现“明明是数组却 instanceof 失败”的现象。
- **`constructor` 比较同样跨域**：`arr.constructor === Array` 在跨 realm 时不可靠。
- **更稳妥的做法**：用不依赖“同一构造函数引用”的判定，例如 `Array.isArray(x)`（查内部 `[[IsArray]]`）、或 `Object.prototype.toString.call(x)` 得到 `"[object Array]"` 等；若必须 `instanceof`，应在 **同一 realm** 内使用 **该窗口** 上的构造函数，例如 `childWindow.Array`、`iframe.contentWindow.Array`。

（可运行验证见 `new-instanceof.js`。）

## 完成状态
- [✅] 原理讲解
- [✅] 手写验证
- [✅] 边界补充
