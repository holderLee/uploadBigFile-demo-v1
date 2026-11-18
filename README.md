# 大文件分片上传（Vue3 + Node.js）

基于 **文件切片 + MD5 校验 + 断点续传 + 秒传** 的大文件上传项目。

| 目录 | 说明 | 状态 |
|------|------|------|
| `front-vue3/` | Vue 3 + Element Plus 前端 | **当前维护** |
| `server/` | Express 上传服务端 | **当前维护** |

---

## 功能特性

- **分片上传**：按用户设定的切片大小（默认 1MB）切分文件并并发上传
- **文件指纹**：使用 SparkMD5 计算整文件 hash，作为唯一标识
- **秒传**：服务端已存在相同 hash 的完整文件时，直接提示成功，无需再传
- **断点续传**：校验接口返回已上传切片列表，前端跳过已存在切片
- **合并落盘**：全部切片上传完成后，服务端按序合并为完整文件

---

## 技术栈

### 前端 `front-vue3`

| 技术 | 用途 |
|------|------|
| Vue 3 | Composition API（`setup`） |
| Vue Router 4 | Hash 路由 |
| Vuex 4 | 状态管理（当前页面未深度使用） |
| Element Plus | 上传组件、表单、消息提示 |
| Axios | HTTP 请求 |
| SparkMD5 | 基于切片内容生成文件 MD5 |
| Vue CLI 4 | 工程化构建 |

### 服务端 `server`

| 技术 | 用途 |
|------|------|
| Express | HTTP 服务（默认端口 `3001`） |
| multiparty | 解析 multipart 切片表单 |
| fs-extra | 目录创建、文件移动、读写流 |
| CORS | 全局允许跨域，便于本地联调 |

---

## 项目结构

```text
upload-big-file/
├── front-vue3/                 # Vue3 前端（维护中）
│   ├── public/
│   ├── src/
│   │   ├── api/index.js        # upload / merge / verify 接口封装
│   │   ├── utils/
│   │   │   ├── hash.js         # SparkMD5 计算文件 hash
│   │   │   └── request.js      # Axios 实例（baseURL → localhost:3001）
│   │   ├── views/index/        # 大文件上传主页面
│   │   ├── views/demo/         # Element Plus 示例页（与上传无关）
│   │   ├── router/
│   │   ├── store/
│   │   └── main.js
│   └── package.json
├── server/                     # Node 上传服务（维护中）
│   ├── index.js                # 入口、CORS、挂载 /api
│   ├── router.js               # 路由：upload / merge / verify
│   ├── controller.js           # 切片接收、合并、校验逻辑
│   ├── target/                 # 切片临时目录 + 合并后的完整文件
│   └── package.json
```

---

## 环境要求

- **Node.js**：建议 `14.x` / `16.x`（前端依赖 `node-sass@4`，过高版本 Node 可能安装失败）
- **npm**：随 Node 自带即可
- 浏览器：需支持 `File.slice`、`FileReader`、`FormData`

---

## 快速开始

请开两个终端，分别启动服务端与前端。

### 1. 启动服务端

```bash
cd server
npm install
node index.js
```

启动成功后控制台输出：

```text
server listen in 3001
```

合并后的文件与临时切片目录位于：

```text
server/target/
```

- 切片临时目录：`server/target/{fileHash}/`
- 合并后完整文件：`server/target/{fileHash}{扩展名}`  
  例如：`server/target/7b409756e00e85a352969bd6a335b6a3.jpeg`

### 2. 启动前端

```bash
cd front-vue3
npm install
npm run serve
# 或
npm run dev
```

默认开发地址一般为：

```text
http://localhost:8080
```

打开后进入首页即可使用「大文件上传服务器」页面。

### 3. 页面操作步骤

1. （可选）在「切片大小」输入框填写切片大小，单位为 **MB**，默认 `1`（即 1MB）
2. 点击「选取文件」选择本地大文件
3. 点击「上传到服务器」
4. 等待：
   - 前端按切片计算 MD5（文件越大耗时越长）
   - 调用校验接口判断秒传 / 断点续传
   - 并发上传未完成的切片
   - 调用合并接口生成完整文件
5. 成功后页面提示「上传成功」或「文件已经上传成功」（秒传）

---

## 上传流程说明

整体时序如下：

```text
选择文件
   │
   ▼
按 SIZE 切分 File.slice → fileChunkList
   │
   ▼
SparkMD5 逐片读取 ArrayBuffer → 得到 fileHash
   │
   ▼
POST /api/verify  { filename, fileHash }
   │
   ├─ shouldUpload === false  → 秒传成功，结束
   │
   └─ shouldUpload === true
         │  uploadedList = 已上传切片名列表
         ▼
      过滤已上传切片，其余并发 POST /api/upload（FormData）
         │
         ▼
      全部完成后 POST /api/merge  { fileHash, filename, size }
         │
         ▼
      服务端按索引排序合并 → target/{fileHash}{ext}
```

### 前端核心逻辑（`front-vue3/src/views/index/index.vue`）

1. **`createFileChunk`**：按 `chunkSize * 1024 * 1024` 字节切分
2. **`calculateHash` / `createdHash`**：对每个切片用 `FileReader.readAsArrayBuffer` + SparkMD5 累积，得到整文件 hash
3. **`verifyUpload`**：询问服务端是否需要上传，以及已上传切片列表
4. **`uploadChunks`**：跳过 `uploadedList` 中已有的 `{fileHash}-{index}`，其余切片并发上传
5. **`fileMerge`**：通知服务端按切片大小 `size` 合并

切片命名规则：

```text
hash（切片标识）= `{fileHash}-{index}`
例如：a1b2c3d4...-0 、 a1b2c3d4...-1
```

### 服务端核心逻辑（`server/controller.js`）

| 方法 | 作用 |
|------|------|
| `handleFormData` | 解析 multipart，将切片移到 `target/{fileHash}/{hash}` |
| `handleVerify` | 若完整文件已存在 → `shouldUpload: false`；否则返回已上传切片列表 |
| `handleMerge` | 按 `-index` 排序切片，用可读流 `pipe` 写入目标文件指定偏移，最后删除切片目录 |

---

## 接口文档

基础地址：`http://localhost:3001`

统一响应结构：

```json
{
  "code": 200,
  "data": {},
  "msg": "success"
}
```

### 1. 校验文件（秒传 / 断点续传）

- **URL**：`POST /api/verify`
- **Content-Type**：`application/json`
- **Body**：

```json
{
  "filename": "demo.mp4",
  "fileHash": "文件MD5"
}
```

- **返回 `data`**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `shouldUpload` | boolean | `false` 表示服务端已有完整文件（秒传） |
| `uploadedList` | string[] | 需要续传时返回已上传切片文件名，如 `["hash-0","hash-1"]` |

### 2. 上传切片

- **URL**：`POST /api/upload`
- **Content-Type**：`multipart/form-data`
- **字段**：

| 字段 | 说明 |
|------|------|
| `chunk` | 切片二进制（Blob） |
| `hash` | 切片名，格式 `{fileHash}-{index}` |
| `filename` | 原始文件名 |
| `fileHash` | 整文件 MD5 |

### 3. 合并切片

- **URL**：`POST /api/merge`
- **Content-Type**：`application/json`
- **Body**：

```json
{
  "filename": "demo.mp4",
  "fileHash": "文件MD5",
  "size": 1048576
}
```

> `size` 必须与前端切片大小一致（字节），服务端按 `index * size` 写入偏移。

- **返回**：`data.message` 一般为 `"合并成功"`

---

## 配置说明

### 前端请求地址

`front-vue3/src/utils/request.js`：

```js
baseURL: 'http://localhost:3001'
```

若服务端端口或域名变更，请同步修改此处。

### 服务端端口与存储目录

`server/index.js`：

```js
const port = 3001
```

`server/controller.js`：

```js
const UPLOAD_DIR = path.resolve(__dirname, "target")
```

---

## 常用脚本

### 前端 `front-vue3`

```bash
npm run serve   # 开发热更新
npm run dev     # 等同于 serve
npm run build   # 生产构建
npm run lint    # ESLint 检查
```

### 服务端 `server`

```bash
npm install
node index.js
```

---

## 验证建议

1. **普通上传**：选一个几 MB～几十 MB 的文件，上传后在 `server/target/` 查看合并结果
2. **秒传**：同一文件再传一次，应直接提示「文件已经上传成功」
3. **断点续传**：上传过程中刷新/中断后重传同一文件，应跳过已存在切片（可观察 Network 中 `/api/upload` 请求数量减少）
4. **改切片大小**：将切片改为 `2`（2MB）再传，确认合并后文件可正常打开

---

## 注意事项

1. **先启服务端再启前端**，否则请求会失败（`localhost:3001` 无响应）
2. 切片大小建议 **≥ 1MB**；过小会增加请求次数，过大则断点续传粒度变粗
3. 超大文件算 hash 会占用主线程一段时间，当前实现未使用 Web Worker（`form.worker` 预留字段未启用）
4. 当前上传为 **全量并发**（`Promise.all`），切片很多时可能压满浏览器连接数；生产环境建议加并发池（如限制同时 3～6 个）
5. `server/target/` 为上传产物目录，体积会增大，可按需清理；已加入服务端业务逻辑，勿随意改名除非同步改代码
6. 旧目录 `front/`（Vue2）与本 README 描述的实现可能不一致，**请以 `front-vue3` 为准**
7. 本项目侧重学习演示，未做登录鉴权、文件类型白名单、上传大小限额、病毒扫描等生产安全能力

---

## 安全与运维提示

- 接口已开启宽松 CORS（`*`），仅适合本地学习；上线需限制来源域名
- 上传目录应限制磁盘配额，并避免将 `target/` 直接暴露为可执行静态资源
- 合并接口未校验切片完整性 / 数量，恶意请求可能导致异常文件；生产需增加 hash 复验与权限校验
- 建议为服务增加进程守护（如 `pm2`）与日志落盘，便于排查合并失败问题

---

## 相关页面路由

| 路径 | 说明 |
|------|------|
| `/#/` | 大文件上传主页面 |
| `/#/demo` | Element Plus 分页等示例页（与上传无关） |

---

## License

练习项目，仅供学习交流使用。
