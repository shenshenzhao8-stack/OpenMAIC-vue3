<!--
  文件头：课堂播放路由包装页（薄包装）

  对应原项目：app/classroom/[id]/page.tsx
  对应本项目改造：MONOREPO-INTEGRATION-REFACTOR-PLAN.md Phase 1（最小课堂组件化）

  功能（改造后）：
    - 只负责从路由读取 id，并把它作为 classroomId 传给课堂核心组件
      OpenMaicClassroom；
    - 不再包含课堂加载、播放、聊天、场景渲染等任何业务逻辑
      （全部迁移到 src/components/classroom/index.vue）；
    - 独立应用的 /classroom/:id 路由行为保持不变。
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import OpenMaicClassroom from '#/components/classroom/index.vue'

const route = useRoute()

/** 路由参数 id → classroomId prop（保持独立路由可用） */
const classroomId = computed(() => String(route.params.id))
</script>

<template>
  <OpenMaicClassroom :classroom-id="classroomId" />
</template>
