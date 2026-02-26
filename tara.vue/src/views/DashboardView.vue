<template>
  <div class="container-fluid py-4">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h2 class="fw-bold">TARA Assessment Dashboard</h2>
      <div class="d-flex gap-2">
        <router-link to="/" class="btn btn-outline-secondary">
          <i class="fa-solid fa-home"></i> Home
        </router-link>
        <button
          class="btn btn-primary"
          @click="generateFromSimulation"
          :disabled="!hasSimulationResult || store.isLoading"
        >
          <span v-if="store.isLoading" class="spinner-border spinner-border-sm me-1" role="status"></span>
          <i v-else class="fa-solid fa-wand-magic-sparkles me-1"></i>
          Generate from Simulation
        </button>
      </div>
    </div>

    <!-- 에러 메시지 -->
    <div v-if="store.error" class="alert alert-danger alert-dismissible fade show" role="alert">
      {{ store.error }}
      <button type="button" class="btn-close" @click="store.error = null"></button>
    </div>

    <!-- 시뮬레이션 결과 없음 안내 -->
    <div v-if="!hasSimulationResult" class="alert alert-info">
      <i class="fa-solid fa-info-circle me-1"></i>
      No Simulation Result. Please run the attack simulation in the Diagram Editor first.
    </div>

    <!-- 로딩 -->
    <div v-if="store.isLoading && store.assessments.length === 0" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-2 text-muted">LLM Analysis...</p>
    </div>

    <!-- 테이블 -->
    <div v-if="store.assessments.length > 0" class="table-responsive">
      <table class="table table-bordered table-hover align-middle">
        <thead class="table-dark">
          <tr>
            <th style="width: 40px">#</th>
            <!-- <th>Entry Asset</th> -->
            <th>Target Asset</th>
            <th>CIA</th>
            <th>Damage Scenario</th>
            <th>Impact</th>
            <th>Threat Scenario</th>
            <th>Attack Path</th>
            <th>Attack Feasibility</th>
            <th>Impact Rating</th>
            <th>Risk Treatment</th>
            <th>CAL</th>
            <th style="width: 60px">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, idx) in store.assessments" :key="item.id">
            <td>{{ idx + 1 }}</td>
            <!-- <td>{{ item.entry_asset }}</td> -->
            <td>{{ item.target_asset }}</td>
            <td>
              <span class="badge" :class="ciaBadgeClass(item.cia_attribute)">
                {{ item.cia_attribute }}
              </span>
            </td>
            <td style="max-width: 200px" :title="item.damage_scenario">
              {{ item.damage_scenario }}
            </td>
            <td>
              <span class="badge bg-secondary">{{ item.impact_category }}</span>
            </td>
            <td style="max-width: 200px" :title="item.threat_scenario">
              {{ item.threat_scenario }}
            </td>
            <td class="text-center">
              <button class="btn btn-sm btn-outline-info" @click="showAttackPath(item)">
                <i class="fa-solid fa-route"></i> View
              </button>
            </td>
            <!-- 사용자 입력 필드 -->
            <td>
              <EditableDropdown
                :modelValue="item.attack_feasibility || ''"
                :options="feasibilityOptions"
                @update:modelValue="onFieldUpdate(item, 'attack_feasibility', $event)"
              />
              <!-- Todo: Attack Feasibility Rating Modal -->
              <!-- Elapsed Time, Specialist expertise, Knowledge of item/component, Window of opportunity, Equipment -->
              <button class="btn btn-sm btn-primary" @click="">
                Details
              </button>
            </td>
            <td>
              <EditableDropdown
                :modelValue="item.impact_rating || ''"
                :options="impactRatingOptions"
                @update:modelValue="onFieldUpdate(item, 'impact_rating', $event)"
              />
            </td>
            <td>
              <EditableDropdown
                :modelValue="item.risk_treatment || ''"
                :options="riskTreatmentOptions"
                @update:modelValue="onFieldUpdate(item, 'risk_treatment', $event)"
              />
            </td>
            <td>
              <EditableDropdown
                :modelValue="item.cal_rating || ''"
                :options="calOptions"
                @update:modelValue="onFieldUpdate(item, 'cal_rating', $event)"
              />
            </td>
            <td class="text-center">
              <button class="btn btn-sm btn-outline-danger" @click="confirmDelete(item.id)">
                <i class="fa-solid fa-trash"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 데이터 없음 -->
    <div
      v-if="!store.isLoading && store.assessments.length === 0"
      class="text-center py-5 text-muted"
    >
      <i class="fa-solid fa-clipboard-list fa-3x mb-3"></i>
      <p>No Assessment Results.</p>
      <!-- Todo: 시뮬레이션이 끝나면 자동으로 추가되도록 만들어야 함 -->
      <p>Run the attack simulation and click the "Generate from Simulation" button.</p>
    </div>

    <!-- Attack Path Modal -->
    <AttackPathModal ref="attackPathModal" :attackPath="selectedAttackPath" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useTaraAssessmentStore } from '@/stores/taraAssessmentStore.js';
import { useThreatModelStore } from '@/stores/threatModelStore.js';
import EditableDropdown from '@/components/tara/EditableDropdown.vue';
import AttackPathModal from '@/components/tara/AttackPathModal.vue';

const store = useTaraAssessmentStore();
const tmStore = useThreatModelStore();

const attackPathModal = ref(null);
const selectedAttackPath = ref([]);

// 시뮬레이션 결과 존재 여부
const hasSimulationResult = computed(() => {
  return tmStore.malsimResult !== null;
});

// 드롭다운 옵션
const feasibilityOptions = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];
const impactRatingOptions = ['Negligible', 'Moderate', 'Major', 'Severe'];
const riskTreatmentOptions = ['Avoid', 'Reduce', 'Share', 'Retain'];
const calOptions = ['CAL 1', 'CAL 2', 'CAL 3', 'CAL 4'];

onMounted(() => {
  store.loadAllAssessments();
});

function ciaBadgeClass(cia) {
  switch (cia) {
    case 'Confidentiality': return 'bg-info text-dark';
    case 'Integrity': return 'bg-warning text-dark';
    case 'Availability': return 'bg-danger';
    default: return 'bg-secondary';
  }
}

async function generateFromSimulation() {
  if (!tmStore.malsimResult) {
    alert('No Simulation Result.');
    return;
  }

  const sessionId = tmStore.malsimResult.sessionId || `session-${Date.now()}`;

  try {
    await store.analyzeFromSimulation(sessionId, tmStore.malsimResult);
  } catch (err) {
    alert(`Analysis failed: ${err.message}`);
  }
}

function showAttackPath(item) {
  const path = typeof item.attack_path === 'string'
    ? JSON.parse(item.attack_path)
    : item.attack_path;
  selectedAttackPath.value = path || [];
  attackPathModal.value?.show();
}

async function onFieldUpdate(item, field, value) {
  try {
    await store.updateAssessment(item.id, { [field]: value });
  } catch (err) {
    alert(`Update failed: ${err.message}`);
  }
}

async function confirmDelete(id) {
  if (!confirm('Are you sure you want to delete this assessment?')) return;
  try {
    await store.deleteAssessment(id);
  } catch (err) {
    alert(`삭제 실패: ${err.message}`);
  }
}
</script>

<style scoped>
.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
