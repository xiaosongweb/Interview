/**
 * Hook 阶段约定：onInit / onRequest / onResponse / onError
 * 每个 hook 都可以读取/修改 ctx。
 */

class SDK {
  constructor({ baseUrl, defaultHeaders } = {}) {
    // 数据：都放在“实例”上，避免共享引用类型
    this.baseUrl = baseUrl ?? "";
    this.defaultHeaders = { ...(defaultHeaders || {}) };

    this._plugins = []; // 已注册插件（数组放实例上）
    this._state = new Map(); // 插件运行时状态（实例级）
    this._hooks = new Map(); // stage -> hookList（实例级）
  }

  // ====== 原型/共享方法：注册插件 ======
  use(plugin) {
    if (!plugin || typeof plugin.apply !== "function") {
      throw new TypeError("plugin 必须提供 apply(sdk) 方法");
    }

    plugin.apply(this); // 插件只做“挂载 hooks”
    this._plugins.push(plugin);
    return this;
  }

  // ====== 原型/共享方法：注册 hook ======
  hook(stage, handler, { priority = 0 } = {}) {
    if (typeof handler !== "function") {
      throw new TypeError("handler 必须是函数");
    }

    const list = this._hooks.get(stage) || [];
    list.push({ handler, priority });

    // 按 priority 从大到小执行（你也可以改成从小到大）
    list.sort((a, b) => b.priority - a.priority);

    this._hooks.set(stage, list);

    // 返回取消注册函数（可选）
    return () => {
      const cur = this._hooks.get(stage);
      if (!cur) return;
      this._hooks.set(
        stage,
        cur.filter((x) => x.handler !== handler),
      );
    };
  }

  // ====== 原型/共享方法：获取插件状态（实例级） ======
  getState(key, initValue) {
    if (!this._state.has(key)) {
      const v = typeof initValue === "function" ? initValue() : initValue;
      this._state.set(key, v);
    }
    return this._state.get(key);
  }

  // ====== 原型/共享方法：关键流程中按顺序执行 hooks ======
  async request(path, { method = "GET", headers = {}, body } = {}) {
    const ctx = {
      sdk: this,
      request: {
        url: this.baseUrl + path,
        method,
        headers: { ...this.defaultHeaders, ...headers },
        body,
      },
      response: null,
      error: null,
    };

    await this._runHooks("onInit", ctx);
    await this._runHooks("onRequest", ctx);

    try {
      ctx.response = await this._doRequest(ctx); // 核心请求行为（共享实现）
      await this._runHooks("onResponse", ctx);
      return ctx.response;
    } catch (err) {
      ctx.error = err;
      await this._runHooks("onError", ctx);
      throw err;
    }
  }

  // ====== 原型/共享方法：真正执行请求（这里用模拟） ======
  async _doRequest(ctx) {
    // 你可以替换成 fetch/axios
    // 这里为了让案例更直观，用“模拟响应”
    await new Promise((r) => setTimeout(r, 10));

    return {
      status: 200,
      headers: { "content-type": "application/json" },
      data: {
        echoUrl: ctx.request.url,
        echoMethod: ctx.request.method,
        echoHeaders: ctx.request.headers,
        echoBody: ctx.request.body ?? null,
      },
    };
  }

  // ====== 原型/共享方法：执行某个 stage 的全部 hooks ======
  async _runHooks(stage, ctx) {
    const list = this._hooks.get(stage);
    if (!list || list.length === 0) return;

    // 顺序执行：await 保证串行，便于“改 ctx 再传给下一个”
    for (const { handler } of list) {
      await handler(ctx);
    }
  }
}

/* =========================
     插件：只关心 apply(sdk)
     - 不要把可变数据放在插件对象的“共享引用上”
     - 插件每次 apply 时创建/写入“实例状态”（sdk.getState 或局部变量）
     ========================= */

// 1) 日志插件：打印关键阶段（priority 默认 0）
const loggerPlugin = {
  apply(sdk) {
    sdk.hook("onInit", async (ctx) => {
      console.log("[init]", ctx.request.method, ctx.request.url);
    });

    sdk.hook("onRequest", async (ctx) => {
      console.log("[request headers]", ctx.request.headers);
    });

    sdk.hook("onResponse", async (ctx) => {
      console.log("[response status]", ctx.response.status);
    });

    sdk.hook("onError", async (ctx) => {
      console.log("[error]", ctx.error?.message || ctx.error);
    });
  },
};

// 2) 鉴权插件：在 onRequest 阶段注入 Authorization（priority 提高，确保更早执行）
function createAuthPlugin({ token }) {
  return {
    apply(sdk) {
      // 插件运行时状态：放在 sdk 实例的 state map 上，避免共享引用类型
      const st = sdk.getState("auth", () => ({ token }));

      sdk.hook(
        "onRequest",
        async (ctx) => {
          ctx.request.headers.Authorization = `Bearer ${st.token}`;
        },
        { priority: 10 },
      );
    },
  };
}

// 3) 响应处理插件：onResponse 后对 data 做变换（priority 低一些）
const responseTransformPlugin = {
  apply(sdk) {
    sdk.hook(
      "onResponse",
      async (ctx) => {
        // 示例：在返回 data 上加一个字段
        ctx.response.data.transformed = true;
      },
      { priority: -1 },
    );
  },
};

// =========================
// 用法
// =========================
async function main() {
  const sdk = new SDK({
    baseUrl: "https://api.example.com",
    defaultHeaders: { "x-app": "demo" },
  });

  sdk
    .use(loggerPlugin)
    .use(createAuthPlugin({ token: "abc123" }))
    .use(responseTransformPlugin);

  const res = await sdk.request("/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "xiaosong" }),
  });

  console.log("final data:", res.data);
}

main().catch(console.error);
