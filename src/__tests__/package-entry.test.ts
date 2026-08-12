/**
 * 文件头：包公开入口测试（MONOREPO Phase 2）
 *
 * 功能：
 *   - 验证「最小测试入口仅导入 src/index.ts 即可获取组件定义」；
 *   - 导入包入口不会执行 createApp / app.mount（组件渲染才执行副作用，
 *     此处仅 import + 断言导出存在，若入口误导入 main.ts 会直接抛错）。
 */
import { describe, it, expect } from 'vitest'
import { OpenMaicClassroom } from '#/index'

describe('包公开入口（@ailearning/openmaic 雏形）', () => {
  it('导出 OpenMaicClassroom 组件定义', () => {
    expect(OpenMaicClassroom).toBeTruthy()
  })

  it('导入包入口不挂载 #app（组件渲染前无 DOM 副作用，node 环境可 import）', () => {
    // 若入口误导入 main.ts（内部执行 createApp().mount('#app')），
    // 上面 import 阶段即抛错，因此能走到这里即证明入口安全。
    expect(true).toBe(true)
  })
})
