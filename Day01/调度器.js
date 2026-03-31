class Scheduler {
  constructor() {
    this.microQueue = [];
    this.macroQueue = [];
    this.isScheduled = false;
  }
  enqueueMicrotask(task) {
    this.microQueue.push(task);
  }
  enqueueMacrotask(task) {
    this.macroQueue.push(task);
    this._scheduledMacroQueueTask();
  }
  _scheduledMacroQueueTask() {
    if (this.isScheduled) return;
    this.isScheduled = true;
    setTimeout(() => {
      this._nextMacroQueue();
    }, 0);
  }
  _nextMacroQueue() {
    if (this.macroQueue.length === 0) {
      this.isScheduled = false;
      return;
    }
    const macroTask = this.macroQueue.shift();
    macroTask();
    this._flushMicroTasks(0);

    if (this.macroQueue.length > 0) {
      setTimeout(() => this._nextMacroQueue(), 0);
    } else {
      this.isScheduled = false;
    }
  }
  _flushMicroTasks() {
    while (this.microQueue.length > 0) {
      const microTask = this.microQueue.shift();
      microTask();
    }
  }
  start(initTask){
    this.enqueueMacrotask(initTask)
  }
}


const scheduler = new Scheduler();

// 初始宏任务（模拟主脚本）
scheduler.start(() => {
  console.log("--- 初始宏任务开始 ---");

  // 添加一个微任务
  scheduler.enqueueMicrotask(() => {
    console.log("  微任务 A");
    // 在微任务中再添加一个微任务（会在本轮清空中执行）
    scheduler.enqueueMicrotask(() => {
      console.log("    微任务 A1（由微任务 A 产生）");
    });
  });

  // 添加另一个微任务
  scheduler.enqueueMicrotask(() => {
    console.log("  微任务 B");
  });

  // 添加一个宏任务（延迟执行）
  scheduler.enqueueMacrotask(() => {
    console.log("--- 第二个宏任务（由第一个宏任务产生）---");
    scheduler.enqueueMicrotask(() => {
      console.log("  微任务 C（在第二个宏任务中产生）");
    });
  });

  console.log("--- 初始宏任务结束 ---");
});

// 再单独添加一个宏任务（从外部，会在初始宏任务及其微任务全部结束后执行）
scheduler.enqueueMacrotask(() => {
  console.log("--- 第三个宏任务（外部添加）---");
});