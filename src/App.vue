<!--
  文件头：应用根组件
  对应原项目：app/layout.tsx（根布局）
  功能：作为路由出口，渲染当前路由对应的页面（HomePage / GeneratePage / ClassroomPage）。
-->

<template>
  <router-view />
</template>
<script setup lang="ts">
// 根组件仅承担路由出口职责，具体逻辑在各页面组件中实现
</script>
