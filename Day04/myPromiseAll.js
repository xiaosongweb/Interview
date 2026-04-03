const PENDING = "pending";
const FULFILLED = "fulfilled";
const REJECTED = "rejected";

const runMicrotask =
  typeof queueMicrotask === "function"
    ? queueMicrotask
    : (fn) => setTimeout(fn, 0);

class MyPromise {
  constructor(executor) {
    this.state = PENDING;
    this.value = undefined;
    this.reason = undefined;
    this.onFulfilledCallbacks = [];
    this.onRejectedCallbacks = [];

    const resolve = (value) => {
      this.#resolvePromise(value, this.#fulfill, this.#reject);
    };

    const reject = (reason) => {
      this.#reject(reason);
    };

    try {
      executor(resolve, reject);
    } catch (error) {
      reject(error);
    }
  }

  #fulfill = (value) => {
    if (this.state !== PENDING) return;
    this.state = FULFILLED;
    this.value = value;
    this.onFulfilledCallbacks.forEach((fn) => fn());
    this.onFulfilledCallbacks = [];
    this.onRejectedCallbacks = [];
  };

  #reject = (reason) => {
    if (this.state !== PENDING) return;
    this.state = REJECTED;
    this.reason = reason;
    this.onRejectedCallbacks.forEach((fn) => fn());
    this.onFulfilledCallbacks = [];
    this.onRejectedCallbacks = [];
  };

  #resolvePromise = (x, resolve, reject) => {
    if (x === this) {
      return reject(new TypeError("Chaining cycle detected for promise"));
    }

    if (x instanceof MyPromise) {
      x.then(resolve, reject);
      return;
    }

    if ((typeof x === "object" && x !== null) || typeof x === "function") {
      let called = false;
      try {
        const then = x.then;
        if (typeof then === "function") {
          then.call(
            x,
            (y) => {
              if (called) return;
              called = true;
              this.#resolvePromise(y, resolve, reject);
            },
            (r) => {
              if (called) return;
              called = true;
              reject(r);
            },
          );
        } else {
          resolve(x);
        }
      } catch (error) {
        if (called) return;
        called = true;
        reject(error);
      }
      return;
    }

    resolve(x);
  };

  then(onFulfilled, onRejected) {
    const realOnFulfilled =
      typeof onFulfilled === "function" ? onFulfilled : (value) => value;
    const realOnRejected =
      typeof onRejected === "function"
        ? onRejected
        : (reason) => {
            throw reason;
          };

    const promise2 = new MyPromise((resolve, reject) => {
      const processFulfilled = () => {
        runMicrotask(() => {
          try {
            const x = realOnFulfilled(this.value);
            promise2.#resolvePromise(x, resolve, reject);
          } catch (error) {
            reject(error);
          }
        });
      };

      const processRejected = () => {
        runMicrotask(() => {
          try {
            const x = realOnRejected(this.reason);
            promise2.#resolvePromise(x, resolve, reject);
          } catch (error) {
            reject(error);
          }
        });
      };

      if (this.state === FULFILLED) {
        processFulfilled();
      } else if (this.state === REJECTED) {
        processRejected();
      } else {
        this.onFulfilledCallbacks.push(processFulfilled);
        this.onRejectedCallbacks.push(processRejected);
      }
    });

    return promise2;
  }

  catch(onRejected) {
    return this.then(undefined, onRejected);
  }

  finally(onFinally) {
    const cb = typeof onFinally === "function" ? onFinally : () => undefined;
    return this.then(
      (value) => MyPromise.resolve(cb()).then(() => value),
      (reason) =>
        MyPromise.resolve(cb()).then(() => {
          throw reason;
        }),
    );
  }

  static resolve(value) {
    if (value instanceof MyPromise) return value;
    return new MyPromise((resolve) => resolve(value));
  }

  static reject(reason) {
    return new MyPromise((_, reject) => reject(reason));
  }

  static all(iterable) {
    return new MyPromise((resolve, reject) => {
      if (iterable == null || typeof iterable[Symbol.iterator] !== "function") {
        reject(new TypeError("Argument is not iterable"));
        return;
      }

      const results = [];
      let count = 0;
      let index = 0;

      for (const item of iterable) {
        const currentIndex = index;
        index += 1;
        count += 1;

        MyPromise.resolve(item).then(
          (value) => {
            results[currentIndex] = value;
            count -= 1;
            if (count === 0) resolve(results);
          },
          (reason) => reject(reason),
        );
      }

      if (index === 0) resolve([]);
    });
  }

  static race(iterable) {
    return new MyPromise((resolve, reject) => {
      if (iterable == null || typeof iterable[Symbol.iterator] !== "function") {
        reject(new TypeError("Argument is not iterable"));
        return;
      }

      for (const item of iterable) {
        MyPromise.resolve(item).then(resolve, reject);
      }
    });
  }

  static allSettled(iterable) {
    return new MyPromise((resolve, reject) => {
      if (iterable == null || typeof iterable[Symbol.iterator] !== "function") {
        reject(new TypeError("Argument is not iterable"));
        return;
      }

      const results = [];
      let count = 0;
      let index = 0;

      for (const item of iterable) {
        const currentIndex = index;
        index += 1;
        count += 1;

        MyPromise.resolve(item).then(
          (value) => {
            results[currentIndex] = { status: "fulfilled", value };
            count -= 1;
            if (count === 0) resolve(results);
          },
          (reason) => {
            results[currentIndex] = { status: "rejected", reason };
            count -= 1;
            if (count === 0) resolve(results);
          },
        );
      }

      if (index === 0) resolve([]);
    });
  }

  static any(iterable) {
    return new MyPromise((resolve, reject) => {
      if (iterable == null || typeof iterable[Symbol.iterator] !== "function") {
        reject(new TypeError("Argument is not iterable"));
        return;
      }

      const errors = [];
      let rejectCount = 0;
      let index = 0;

      for (const item of iterable) {
        const currentIndex = index;
        index += 1;
        MyPromise.resolve(item).then(resolve, (reason) => {
          errors[currentIndex] = reason;
          rejectCount += 1;
          if (rejectCount === index) {
            reject(new AggregateError(errors, "All promises were rejected"));
          }
        });
      }

      if (index === 0) {
        reject(new AggregateError([], "All promises were rejected"));
      }
    });
  }
}

// ===== 最小示例 =====
MyPromise.all([1, MyPromise.resolve("A"), "B"]).then((res) =>
  console.log("all:", res),
);

MyPromise.race([
  new MyPromise((resolve) => setTimeout(() => resolve("fast"), 10)),
  new MyPromise((resolve) => setTimeout(() => resolve("slow"), 50)),
]).then((res) => console.log("race:", res));

MyPromise.allSettled([
  MyPromise.resolve("ok"),
  MyPromise.reject("fail"),
]).then((res) => console.log("allSettled:", res));

MyPromise.any([
  MyPromise.reject("e1"),
//   new MyPromise((resolve) => setTimeout(() => resolve("win"), 20)),
MyPromise.reject("e2"),

]).then((res) => console.log("any:", res)).catch(error=>console.log('any error:',error));