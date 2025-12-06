<template>
  <div>
    <div class="row h-100">
      <div class="col-md-5">
        <div class="card h-100 shadow-sm">
          <div class="card-header fw-bold bg-light">
            Countermeasure Catalog
            <span class="badge bg-secondary float-end">{{ filteredCMs.length }}</span>
          </div>
          <div class="card-body d-flex flex-column">
            <div class="input-group mb-3">
              <span class="input-group-text bg-white"><i class="fas fa-search"></i></span>
              <input type="text" class="form-control" v-model.trim="cmSearch" placeholder="Search firewall, encryption..." />
              <button class="btn btn-outline-secondary" type="button" @click="cmSearch = ''" v-if="cmSearch">X</button>
            </div>

            <div class="list-group overflow-auto border-top" style="flex: 1; max-height: 600px;">
              <div
                  v-for="cm in filteredCMs"
                  :key="cm.id"
                  class="list-group-item list-group-item-action d-flex justify-content-between align-items-start py-3"
              >
                <div class="me-2">
                  <div class="fw-bold text-dark">
                    <span class="badge bg-light text-dark border me-1">{{ cm.id }}</span>
                    {{ cm.name }}
                  </div>
                  <small class="text-muted d-block mt-1" style="font-size: 0.85rem; display:block; max-height: 100px; overflow-y: auto;">
                    {{ cm.description }}
                  </small>
                </div>
                <button class="btn btn-sm btn-success mt-1" @click="addCM(cm)" :disabled="isCMSelected(cm.id)">
                  <i class="fas" :class="isCMSelected(cm.id) ? 'fa-check' : 'fa-plus'"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-md-7">
        <div class="card h-100 shadow-sm">
          <div class="card-header fw-bold bg-light">Selected Countermeasures</div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-striped table-hover mb-0 align-middle small">
                <thead class="table-light">
                <tr>
                  <th>Name</th>
                  <th style="width: 120px;">Type</th>
                  <th style="width: 120px;">Effect</th>
                  <th style="width: 120px;">Cost</th>
                  <th style="width: 60px;">U/C</th>
                  <th style="width: 40px;"></th>
                </tr>
                </thead>
                <tbody>
                <tr v-if="selectedCMs.length === 0">
                  <td colspan="10" class="text-center text-muted py-5">
                    <i class="fas fa-shield-alt fa-3x mb-3 text-secondary opacity-25"></i>
                    <div>No countermeasures selected.</div>
                    <div class="small">Select from the catalog to mitigate this threat.</div>
                  </td>
                </tr>
                <tr v-for="(item, index) in selectedCMs" :key="item.id">
                  <td>
                    <div class="fw-bold">{{ item.name }}</div>
                    <div class="text-muted text-xs">{{ item.id }}</div>
                  </td>
                  <td>
                    <select class="form-select form-select-sm" v-model="item.mitigationTypes">
                      <option value="prevent">Prevent</option>
                      <option value="detect">Detect</option>
                      <option value="respond">Respond</option>
                    </select>
                  </td>
                  <td>
                    <select class="form-select form-select-sm" v-model="item.effectiveness">
                      <option :value="1">Low</option>
                      <option :value="2">Medium</option>
                      <option :value="3">High</option>
                    </select>
                  </td>
                  <td>
                    <select class="form-select form-select-sm" v-model="item.cost">
                      <option :value="1">Low</option>
                      <option :value="2">Medium</option>
                      <option :value="3">High</option>
                    </select>
                  </td>
                  <td class="text-center">
                    <span class="badge bg-dark">{{ calcUC(item).toFixed(1) }}</span>
                  </td>
                  <td class="text-center">
                    <button class="btn btn-sm btn-link text-danger p-0" @click="deleteCM(item.id)">
                      <i class="fas fa-trash-alt"></i>
                    </button>
                  </td>
                </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="card-footer d-flex justify-content-end align-items-center bg-white">
            <button class="btn btn-sm btn-outline-secondary" @click="sortCMs" :disabled="selectedCMs.length < 2">
              <i class="fas fa-sort-amount-down me-1"></i> Sort by Efficiency (U/C)
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {computed, onMounted, reactive, ref, watch} from "vue"
import axios from "axios"
import {useThreatEditStore} from "@/stores/threatEditStore.js";
import {useThreatModelStore} from "@/stores/threatModelStore.js";
import {storeToRefs} from "pinia";

const editStore = useThreatEditStore();
const tmStore = useThreatModelStore();

const { threatData } = storeToRefs(editStore);

const selectedCMs = reactive([]);

const cmSearch = ref('');
const isCMSelected = (id) => selectedCMs.some(c => c.id === id);
const calcUC = (item) => (item.effectiveness * 10) / item.cost;
const sortCMs = () => { selectedCMs.sort((a, b) => calcUC(b) - calcUC(a)); };

const addCM = (cm) => {
  if (!isCMSelected(cm.id)) {
    // 기본값으로 예방, 효과, 비용 설정 (DB에 데이터가 없음)
    selectedCMs.push({
      ...cm,
      mitigationTypes: 'prevent',
      effectiveness: 2, // Medium default
      cost: 2 // Medium default
    });
  }
  tmStore.setModified()
};

const deleteCM = (cmId) => {
  const index = selectedCMs.findIndex(c => c.id === cmId);
  if (index !== -1) {
    selectedCMs.splice(index, 1);
  }
  tmStore.setModified()
};

// selectedCm 을 watch 하고 있다가 변경사항이 있으면 editStore.threatData.selectedCMs 에도 반영
watch(selectedCMs, (newVal) => {
  editStore.threatData.selectedCMs = JSON.parse(JSON.stringify(newVal));
}, { deep: true });

const allCMs = ref([
  /**
   * Example Data Structure:
   * { id: 'M1036', name: 'Account Use Policies', description: 'Configure features related to account use like login attempt lockouts, specific login times, etc.' },
   */
]);

const filteredCMs = computed(() => {
  if (!cmSearch.value) return allCMs.value;

  const k = cmSearch.value.toLowerCase();

  return allCMs.value.filter(cm =>
      (cm.name && cm.name.toLowerCase().includes(k)) ||
      (cm.id && cm.id.toLowerCase().includes(k)) ||
      (cm.description && cm.description.toLowerCase().includes(k))
  );
});

const init = () => {
  // [Fix] 초기 로드시 store에 저장된 selectedCMs가 있다면 가져오기
  if (threatData.value && threatData.value.selectedCMs && Array.isArray(threatData.value.selectedCMs)) {
    selectedCMs.splice(0, selectedCMs.length, ...JSON.parse(JSON.stringify(threatData.value.selectedCMs)));
  }

  let mitreId = threatData.value.mitre_id || null;
  if (mitreId && mitreId !== '') {
    getMitreCMsByThreatId(mitreId)
  } else {
    getAllMitreCMs()
  }
}

const getMitreCMsByThreatId = async (mitreId) => {
  try {
    const res = await axios.get(`/api/v1/mitre/countermeasures/${mitreId}`)
    allCMs.value = res.data;
  } catch (error) {
    console.error('Error get MITRE countermeasures by threat ID:', error);
  }
};

const getAllMitreCMs = async () => {
  try {
    const res = await axios.get('/api/v1/mitre/countermeasures')
    allCMs.value = res.data
  } catch (error) {
    console.error('Error get MITRE countermeasures:', error);
  }
};

onMounted(() => {
  init()
})
</script>