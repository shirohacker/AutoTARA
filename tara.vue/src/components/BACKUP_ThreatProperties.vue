<template>
  <div class="card shadow-sm">
    <div class="card-header bg-white fw-bold d-flex justify-content-between align-items-center border-bottom-0 py-3">
      <span><i class="fa-solid fa-shield-virus me-2"></i>Threats</span>
      <button class="btn btn-sm btn-outline-primary" @click="handleAddClick">
        <i class="fa-solid fa-plus"></i>
      </button>
    </div>

    <div class="card-body p-0 small">
      <div v-if="!cellRef" class="text-center text-muted p-4 small">
        <i class="fa-regular fa-hand-pointer mb-2"></i><br/>
        Select an element in the diagram<br/>to view its properties.
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

        <div class="list-group list-group-flush overflow-auto" style="max-height: 400px;">
          <div
              v-for="t in filteredThreats"
              :key="t.id"
              class="list-group-item list-group-item-action py-3"
          >
            <div
                class="fw-bold mb-2 text-break threat-title"
                @click="handleEditClick(t)"
            >
              {{ t.title }}
            </div>

            <div class="d-flex justify-content-between align-items-center small text-muted">
              <div class="d-flex align-items-center">
                <span class="me-1">Risk:</span>
                <span class="badge rounded-pill" :class="getBadgeClass(t.status)">
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
import { ref, computed } from 'vue'

const cellRef = ref(true) // 그래프 선택 여부 Mock
const activeTab = ref('open')

// Mock Data
const threats = ref([
  { id: 1, title: "Scheduled Task/Job: Container Orchestration Jobs", ttc: "1", status: "danger", riskScore: 5 },
  { id: 2, title: "Valid Accounts: Default Accounts", ttc: "∞", status: "mitigated", riskScore: 2 },
  { id: 3, title: "Account Manipulation: Additional Container Cluster Roles", ttc: "1", status: "warning", riskScore: 4 },
  { id: 4, title: "Container Administration Command", ttc: "1", status: "caution", riskScore: 3 }
])

// Computed Properties
const filteredThreats = computed(() => {
  return threats.value.filter(t => activeTab.value === 'open'
      ? t.status !== 'mitigated'
      : t.status === 'mitigated')
})

const openCount = computed(() => threats.value.filter(t => t.status !== 'mitigated').length)
const mitigatedCount = computed(() => threats.value.filter(t => t.status === 'mitigated').length)

// Emits 정의
const emit = defineEmits(['open-threat-edit-modal'])

// Methods
const getBadgeClass = (status) => {
  switch (status) {
    case 'danger': return 'bg-danger'
    case 'warning': return 'bg-warning text-dark'
    case 'caution': return 'bg-success'
    case 'mitigated': return 'bg-secondary'
    default: return 'bg-light text-dark'
  }
}

// "새 추가" 버튼 클릭
const handleAddClick = () => {
  // 데이터 없이 이벤트 발생 -> 신규 생성 모드
  emit('open-threat-edit-modal', null)
}

// "타이틀" 클릭 (수정)
const handleEditClick = (threat) => {
  // 선택된 위협 데이터를 담아서 이벤트 발생
  emit('open-threat-edit-modal', threat)
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