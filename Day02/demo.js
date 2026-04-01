'use strict';


(function () {
    const getGlobal = () => globalThis;

    Function.prototype.selfCall = function selfCall(context, ...args) {
        if (typeof this !== 'function') {
            throw new TypeError('selfCall 必须由函数调用')
        }
        const receiver = context == null ? getGlobal() : Object(context);
        const uniqKey = Symbol('fn');
        receiver[uniqKey] = this;
        return receiver[uniqKey](...args)
    }
    Function.prototype.selfApply = function selfApply(context, args) {
        if (typeof this !== 'function') {
            throw new TypeError('selfApply 必须由函数调用')
        }
        if (!(args === undefined || args === null || Array.isArray(args))) {
            throw new TypeError('selfApply 的第二个参数只能是null/undefined/Array')
        }
        const receiver = context == null ? getGlobal() : Object(context);
        const uniqKey = Symbol('fn');
        receiver[uniqKey] = this;
        return args == null || args === undefined ? receiver[uniqKey]() : receiver[uniqKey](...args)
    }
    Function.prototype.selfBind = function selfBind(context, ...args) {
        if (typeof this !== 'function') {
            throw new TypeError('selfBind 必须由函数调用')
        }
        const targetFn = this;
        function boundFn(...laterArgs) {
            const isNew = this instanceof boundFn;
            const receiver = isNew ? this : context == null ? getGlobal() : Object(context);
            return targetFn.apply(receiver, [...args, ...laterArgs])
        }

        if (targetFn.prototype) {
            boundFn.prototype = Object.create(targetFn.prototype)
            Object.defineProperty(boundFn.prototype, 'constructor', {
                value: boundFn,
                writable: true,
                configurable: true
            })
        }

        return boundFn
    }
})()

function callDemo(age) {
    console.log(`我叫${this.name},年龄${age}`)
}
const person1 = { name: "bob" }
callDemo.selfCall(person1, 19)


function applyDemo(args) {
    console.log(`我叫${this.name},年龄${args[0]},性别 ${args[1]}`)
}
const person2 = { name: "bob" }
applyDemo.selfCall(person2, [18, '男'])



function bindDemo(age) {
    console.log(`bindDemo 我叫${this.name},今年${age}岁`);
}

const bindPerson = { name: "bob" };
const boundBind = bindDemo.selfBind(bindPerson, 18);
boundBind(20);


function BindDemo(name) {
    this.name = name;
}
BindDemo.prototype.getName = function () {
    return this.name;
};
const obj = { name: "外部对象" };
const Bound = BindDemo.selfBind(obj, "张三");
const ins = new Bound(); // 关键：new 调用
console.log(ins.name); // 张三
console.log(ins.getName()); // 张三
console.log(ins instanceof BindDemo); // true
console.log(ins instanceof Bound); // true