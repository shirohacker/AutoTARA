<template>
  <Graph />
</template>

<script setup>
import Graph from '@/components/Graph.vue';

import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useThreatModelStore } from '@/stores/threatModelStore'
import { useCellStore } from "@/stores/cellStore.js";

const tmStore = useThreatModelStore()
const cellStore = useCellStore()
const { modelChanged } = storeToRefs(tmStore) // getters.modelChanged 사용

// 공통 확인 함수
const confirmLeave = () => {
  // 변경 없으면 그냥 통과
  if (!modelChanged.value) {
    tmStore.clear()
    cellStore.unselect()
    return true
  }

  const ok = window.confirm(
      'There are unsaved changes in the diagram.\n' +
      'If you leave now, your current work will be reset.\n' +
      'Do you want to continue?'
  )

  if (!ok) return false

  tmStore.clear()   // 전체 ThreatModel 초기화 (selectedDiagram 포함)
  cellStore.unselect()
  // 혹은 다이어그램만 정리하고 싶다면 tmStore.closeDiagram() 등으로 변경 가능

  return true
}

// 1) /edit-diagram/:title 에서 다른 라우트(MainPage 등)로 나갈 때
onBeforeRouteLeave((to, from) => {
  // false를 리턴하면 내비게이션 취소
  if (!confirmLeave()) return false
})

// 2) /edit-diagram/AAA -> /edit-diagram/BBB 처럼 title만 바뀔 때
onBeforeRouteUpdate((to, from) => {
  if (to.params.title !== from.params.title) {
    if (!confirmLeave()) return false
  }
})
</script>