"use strict";

/**
 * 手写 call / apply / bind，兼容 new 场景
 */
(function polyfillCallApplyBind() {
  const getGlobal = () => globalThis;

  Function.prototype.myCall = function myCall(context, ...args) {
    if (typeof this !== "function") {
      throw new TypeError("myCall 必须由函数调用");
    }
    const receiver = context == null ? getGlobal() : Object(context);
    const fnKey = Symbol("fn");
    receiver[fnKey] = this;
    try {
      return receiver[fnKey](...args);
    } finally {
      delete receiver[fnKey];
    }
  };

  Function.prototype.myApply = function myApply(context, argsArray) {
    if (typeof this !== "function") {
      throw new TypeError("myApply 必须由函数调用");
    }
    if (argsArray != null && !Array.isArray(argsArray)) {
      throw new TypeError("myApply 的第二个参数必须是数组或 undefined/null");
    }
    const receiver = context == null ? getGlobal() : Object(context);
    const fnKey = Symbol("fn");
    receiver[fnKey] = this;
    try {
      return argsArray == null ? receiver[fnKey]() : receiver[fnKey](...argsArray);
    } finally {
      delete receiver[fnKey];
    }
  };

  Function.prototype.myBind = function myBind(context, ...presetArgs) {
    if (typeof this !== "function") {
      throw new TypeError("myBind 必须由函数调用");
    }

    const targetFn = this;

    function boundFn(...laterArgs) {
      const isNew = this instanceof boundFn;
      const receiver = isNew ? this : context == null ? getGlobal() : Object(context);
      return targetFn.apply(receiver, [...presetArgs, ...laterArgs]);
    }

    // new 场景下保持原型链：new boundFn() instanceof targetFn === true
    if (targetFn.prototype) {
      boundFn.prototype = Object.create(targetFn.prototype);
      Object.defineProperty(boundFn.prototype, "constructor", {
        value: boundFn,
        writable: true,
        configurable: true,
      });
    }

    return boundFn;
  };
})();

/**
 * 边界测试
 */
function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`[失败] ${label}：期望 ${expected}，实际 ${actual}`);
  }
  console.log(`[通过] ${label}`);
}

function assert(condition, label) {
  if (!condition) {
    throw new Error(`[失败] ${label}`);
  }
  console.log(`[通过] ${label}`);
}

function greet(greeting, punctuation) {
  return `${greeting}, ${this.name}${punctuation}`;
}

const person = { name: "Alice" };

// 1) 基本 this 绑定
assertEqual(greet.myCall(person, "Hi", "!"), "Hi, Alice!", "myCall 绑定 this");
assertEqual(
  greet.myApply(person, ["Hello", "."]),
  "Hello, Alice.",
  "myApply 通过参数数组绑定 this"
);

// 2) null/undefined context -> globalThis
globalThis.name = "GlobalName";

assertEqual(
  greet.myCall(null, "Yo", "!"),
  "Yo, GlobalName!",
  "myCall 在 null 上下文回退到 globalThis"
);

// 3) 原始值装箱
function getTypeTag() {
  return Object.prototype.toString.call(this);
}
assertEqual(getTypeTag.myCall("x"), "[object String]", "原始值上下文会被装箱");

// 4) bind 预置参数
const greetAlice = greet.myBind(person, "Hey");
assertEqual(greetAlice("?"), "Hey, Alice?", "myBind 支持参数预置");

// 5) bind + new：new 优先，忽略绑定的 this
function Person(name) {
  this.name = name;
}
Person.prototype.say = function say() {
  return this.name;
};

const BoundPerson = Person.myBind({ name: "IgnoreMe" }, "Bob");
const p = new BoundPerson();
assert(p instanceof Person, "new 调用 boundFn 仍保持原型链");
assertEqual(p.say(), "Bob", "new 调用 boundFn 时 this 指向新实例");

// 6) 构造函数返回对象的语义保持一致
function Factory(name) {
  this.name = name;
  return { overridden: name };
}
const BoundFactory = Factory.myBind({}, "Jack");
const f = new BoundFactory();
assertEqual(f.overridden, "Jack", "构造函数显式返回对象时返回值优先");

console.log("全部测试通过。");
