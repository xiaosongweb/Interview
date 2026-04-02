/**
 * Day03 手写 new / instanceof — 与原生行为对齐的最小实现（教学用）
 */

function myNew(Constructor, ...args) {
  if (typeof Constructor !== "function") {
    throw new TypeError("not a constructor");
  }
  const obj = Object.create(Constructor.prototype);
  const ret = Constructor.apply(obj, args);
  return ret !== null && (typeof ret === "object" || typeof ret === "function")
    ? ret
    : obj;
}


function myInstanceof(left, right) {
  if (
    right == null ||
    (typeof right !== "object" && typeof right !== "function")
  ) {
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

// --- 自检 ---
function Person(name) {
  this.name = name;
}
Person.prototype.say = function () {
  return this.name;
};

const p = myNew(Person, "test");
console.assert(p instanceof Person);
console.assert(myInstanceof(p, Person));
console.assert(p.say() === "test");

function ReturnObj() {
  return { x: 1 };
}
const r = myNew(ReturnObj);
console.assert(r.x === 1 && !("say" in r));

console.log("new-instanceof.js: assertions ok");
