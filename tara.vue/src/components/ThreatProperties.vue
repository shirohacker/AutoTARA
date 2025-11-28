<template>
  <div class="card shadow-sm">
    <div class="card-header bg-white fw-bold d-flex justify-content-between align-items-center border-bottom-0 py-3">
      <span><i class="fa-solid fa-shield-virus me-2"></i>Threats</span>
      <button class="btn btn-sm btn-outline-primary" @click="handleAddNewThreat" :disabled="!cellRef">
        <i class="fa-solid fa-plus"></i>
      </button>
    </div>

    <div class="card-body">
      <div v-if="!cellRef" class="h-100 d-flex flex-column align-items-center justify-content-center text-muted opacity-75">
        <p class="small text-center mb-0">
          Select an element in the diagram<br/>to view its properties.
        </p>
      </div>

      <div v-else>
        <ul class="nav nav-tabs nav-fill small" style="margin-bottom: -1px;">
          <li class="nav-item">
            <button class="nav-link rounded-0 border-top-0 border-start-0" :class="{ active: activeTab === 'open' }" @click="activeTab = 'open'">
              Open <span class="badge bg-secondary rounded-pill ms-1" style="font-size: 0.65rem">{{ openCount }}</span>
            </button>
          </li>
          <li class="nav-item">
            <button class="nav-link rounded-0 border-top-0 border-end-0" :class="{ active: activeTab === 'mitigated' }" @click="activeTab = 'mitigated'">
              Mitigated <span class="badge bg-light text-dark border rounded-pill ms-1" style="font-size: 0.65rem">{{ mitigatedCount }}</span>
            </button>
          </li>
        </ul>

        <div class="list-group list-group-flush overflow-auto small" style="max-height: 400px;">
          <div
              v-for="t in filteredThreats"
              :key="t.id"
              class="list-group-item list-group-item-action py-3"
          >
            <div
                class="fw-bold mb-2 text-break threat-title"
                @click="handleEditClick(t.id)"
            >
              {{ t.technique }}
            </div>

            <div class="d-flex justify-content-between align-items-center small text-muted">
              <div class="d-flex align-items-center">
                <span class="me-1">Risk:</span>
                <span class="badge rounded-pill" :class="getBadgeClass(t.riskScore)">
                  <i class="fa-solid fa-triangle-exclamation me-1" v-if="t.status !== 'mitigated'"></i>
                  <i class="fa-solid fa-check me-1" v-else></i>
                  {{ t.riskScore }}
                </span>
              </div>

              <div class="d-flex align-items-center" title="Time To Compromise">
                <i class="fa-solid fa-stopwatch me-1"></i>
                <span>{{ t.ttc }} hrs</span>
              </div>
            </div>
          </div>

          <div v-if="filteredThreats.length === 0" class="text-center py-4 text-muted small">
            No {{ activeTab }} threats found.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import { computed, ref } from 'vue'
import { createNewThreat } from '@/service/threat/index.js';
import { useCellStore } from "@/stores/cellStore.js"
import { useThreatModelStore } from "@/stores/threatModelStore.js";
import dataChanged from '@/service/x6/graph/data-changed.js';

const cellStore = useCellStore();
const tmStore = useThreatModelStore()
const { ref: cellRef, threats } = storeToRefs(cellStore);

const activeTab = ref('open')

const emit = defineEmits(['open-threat-edit-modal'])

const openCount = computed(() => threats.value.filter(t => t.status !== 'mitigated').length)
const mitigatedCount = computed(() => threats.value.filter(t => t.status === 'mitigated').length)

const handleAddNewThreat = () => {
  const newThreat = createNewThreat(tmStore.data.threatCounter + 1) // 새로운 위협 객체 생성
  cellRef.value.data.threats.push(newThreat) // 그래프 셀의 threats 배열에 추가
  cellRef.value.data.hasOpenThreats = cellRef.value.data.threats.length > 0

  tmStore.increaseThreatCounter()
  tmStore.setModified() // Graph Modified 상태로 설정
  cellStore.updateData(cellRef.value.data) // 스토어에 셀 데이터 업데이트

  dataChanged.updateStyleAttrs(cellRef.value) // 현재 stencil을 위협이 설정된 모양으로 변경

  emit('open-threat-edit-modal', newThreat.id, 'new')
}

const handleEditClick = (threatId) => {
  emit('open-threat-edit-modal', threatId, 'exist')
}

const filteredThreats = computed(() => {
  return threats.value.filter(t => activeTab.value === 'open'
      ? t.status !== 'mitigated'
      : t.status === 'mitigated')
})

const getBadgeClass = (riskScore) => {
  if (riskScore < 2) return 'bg-success';
  if (riskScore < 3) return 'bg-info text-dark';
  if (riskScore < 4) return 'bg-warning text-dark';
  return 'bg-danger';
}
</script>

<style scoped>
/* 커스텀 탭 스타일 */
.nav-tabs .nav-link {
  color: #6c757d;
  font-weight: 500;
  background-color: #f8f9fa;
}
.nav-tabs .nav-link.active {
  color: #0d6efd;
  background-color: #fff;
  border-bottom-color: transparent;
  font-weight: 600;
}

/* 타이틀 호버 효과: 클릭 가능하다는 느낌 주기 */
.threat-title {
  cursor: pointer;
  transition: color 0.2s;
}
.threat-title:hover {
  color: #0d6efd; /* Bootstrap Primary Color */
  text-decoration: underline;
}

/* 스크롤바 이쁘게 (Chrome/Safari) */
.list-group::-webkit-scrollbar {
  width: 4px;
}
.list-group::-webkit-scrollbar-thumb {
  background-color: #dee2e6;
  border-radius: 4px;
}
</style>