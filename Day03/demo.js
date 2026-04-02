const a = {
  name: "xiaosong",
};
console.log("a.__proto__ >>>", a.__proto__);
function Foo() {}
console.log("Foo.prototype >>>", Foo.prototype, Foo.__proto__);
class Foo1 {}
console.log("Foo.prototype >>>", Foo1.prototype, Foo1.__proto__);

// 案例Object.create
function Parent(name) {
  this.name = name; // 这是构造函数做的“实例初始化”
}
Parent.prototype.say = function () {
  return this.name; // 这是原型上的“行为”
};

// 手动调用父类构造函数，通过Parent.call
const objCreate1 = Object.create(Parent.prototype);
Parent.call(objCreate1, "张三");
console.log("objCreate1.say() >>>", objCreate1.say(), objCreate1.name);
// 默认不会调用父类的构造函数
const objCreate2 = Object.create(Parent.prototype);
console.log("objCreate2.say() >>>", objCreate2.say(), objCreate2.name);

//案例class extends
class Parent2 {
  constructor(name) {
    this.name = name; // 父类构造初始化“数据”
  }
  say() {
    return this.name; // 父类原型上的“行为”
  }
}
class Child extends Parent2 {
  // 不写 constructor：默认会自动 super(...args)，父类构造会执行
  //   constructor(params) {
  //     super(params)
  //   }
}
const c = new Child("张三");
console.log(c.say()); // "张三"

// 继承的是行为而不是数据”
function D() {}
D.prototype.names = ["xiaosong", "qingfengbuguike"];
const dd1 = Object.create(D.prototype);
const dd2 = Object.create(D.prototype);
dd1.names.push("apple");
console.log("dd1 >>>", dd1.names);
console.log("dd2 >>>", dd2.names);

function E() {}
function F() {}
// 关键点：把数组直接放在原型上（共享）
E.prototype.items = ["apple1", "apple2"];
F.prototype = Object.create(E.prototype);
F.prototype.constructor = F;
const A = new F();
const B = new F();
console.log(A.items === B.items); // true：同一个数组引用
A.items.push("apple");
console.log("A:", A.items); // A: ['apple']
console.log("B:", B.items); // B: ['apple'] 也变了

function A1() {
  this.items = []; // 每个实例一份
}

const A11 = new A1();
const B11 = new A1();

A11.items.push("apple");

console.log("A11:", A11.items); // ['apple']
console.log("B11:", B11.items); // []
