<template>
  <div class="row">
    <div class="col-md-6">
      <div class="card mb-3 shadow-sm">
        <div class="card-header bg-light fw-bold">Threat Basics</div>
        <div class="card-body">

          <div class="mb-3">
            <label class="form-label small text-muted fw-bold">ASSET NAME</label>
            <input type="text" class="form-control" v-model.trim="assetName" disabled />
          </div>

          <div class="mb-3">
            <label class="form-label small text-muted fw-bold">MITRE ATT&CK ID</label>
            <input type="text" class="form-control" v-model="threatData.mitre_id" disabled />
          </div>

          <div class="mb-3">
            <label class="form-label small text-muted fw-bold">TECHNIQUE</label>
            <div class="position-relative">
              <div class="input-group">
                <input
                    type="text"
                    class="form-control"
                    v-model="keyword"
                    placeholder="Enter ID or Name (e.g. T1068)"
                    @input="onTechniqueInput"
                    @focus="onTechniqueFocus"
                    @blur="onTechniqueBlur"
                    maxlength="50"
                />
                <button
                    class="btn btn-outline-primary"
                    type="button"
                    @click="fetchMitreData(threatData.mitre_id)"
                >
                  <i class="fas fa-sync-alt me-1"></i> Fetch
                </button>
              </div>

              <div
                  v-if="showDropdown"
                  class="position-absolute w-100 bg-white border rounded shadow-lg mt-1"
                  style="z-index: 1050; max-height: 250px; overflow-y: auto; cursor: pointer;"
              >
                <ul class="list-group list-group-flush" v-if="suggestions.length > 0">
                  <li
                      v-for="item in suggestions"
                      :key="item.id"
                      class="list-group-item list-group-item-action"
                      @mousedown.prevent="selectTechnique(item)"
                  >
                    <span class="fw-bold text-primary small me-2">{{ item.id }}</span>
                    <span>{{ item.name }}</span>
                  </li>
                </ul>
                <div v-else-if="keyword.trim().length > 0" class="p-3 text-center bg-light">
                  <div class="mb-2 text-muted small">No matching technique found.</div>
                  <button class="btn btn-sm btn-success" @mousedown.prevent="addNewTechniqueFromInput">
                    <i class="fas fa-plus me-1"></i> Add "{{ keyword.trim() }}"
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="row">
            <div class="col-md-6 mb-3">
              <label class="form-label small text-muted fw-bold">TTC (Time To Compromise)</label>
              <input type="number" class="form-control" v-model="threatData.ttc" />
            </div>
            <div class="col-md-6 mb-3">
              <label class="form-label small text-muted fw-bold">RISK LEVEL</label>
              <input type="text" class="form-control bg-light" :value="riskLevel" disabled />
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label small text-muted fw-bold">RELATED CVES</label>
            <div class="form-control d-flex flex-wrap gap-2 align-items-center" style="min-height: 38px;">
                            <span v-for="(cve, idx) in threatData.cve" :key="idx" class="badge bg-info text-dark">
                                {{ cve }} <i class="fas fa-times ms-1" style="cursor:pointer" @click="threatData.cve.splice(idx, 1)"></i>
                            </span>
              <input
                  type="text"
                  class="border-0 p-0"
                  style="outline:none; width: 100px;"
                  placeholder="+ Add CVE"
                  @keydown.enter.prevent="addCve($event)"
              />
            </div>
            <div class="form-text text-xs">Press Enter to add CVE.</div>
          </div>

          <div class="mb-3">
            <label class="form-label small text-muted fw-bold">DESCRIPTION</label>
            <textarea class="form-control" v-model="threatData.description" rows="3"></textarea>
          </div>

        </div>
      </div>
    </div>

    <div class="col-md-6">
      <div class="card mb-3 shadow-sm">
        <div class="card-header bg-light d-flex justify-content-between align-items-center">
          <span class="fw-bold">TTP Scoring (Impact & Feasibility)</span>
          <i class="fas fa-question-circle text-secondary" title="Scoring Help"></i>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-bordered table-hover mb-0 align-middle">
              <thead class="table-light">
              <tr class="text-center text-uppercase small">
                <th class="text-start">Factor</th>
                <th style="width: 80px;">Weight</th>
                <th>Value</th>
                <th style="width: 40px;">Info</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="risk in riskRows" :key="risk.key">
                <td class="fw-semibold">{{ risk.label }}</td>
                <td>
                  <input type="number" step="0.1" min="0" max="1" class="form-control form-control-sm text-center" v-model.number="risk.weight" />
                </td>
                <td>
                  <select class="form-select form-select-sm" v-model.number="risk.value">
                    <option v-for="opt in ttpScoreOptions" :key="opt.value" :value="opt.value">
                      {{ opt.text }} ({{ opt.value }})
                    </option>
                  </select>
                </td>
                <td class="text-center">
                    <span
                        class="badge bg-light text-dark border cursor-pointer"
                        data-bs-toggle="tooltip"
                        data-bs-placement="right"
                        :title="risk.description"
                    >
                      <i class="fas fa-info"></i>
                    </span>
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="card-footer bg-white">
          <div class="d-flex justify-content-between align-items-center">
            <button class="btn btn-sm btn-outline-secondary" @click="resetDefaultWeights">
              <i class="fas fa-undo me-1"></i> Reset Weights
            </button>

            <div class="d-flex align-items-center">
              <span class="fw-bold me-2 text-muted">Risk Score:</span>
              <span class="badge rounded-pill fs-6" :class="riskBadgeClass">
                {{ riskScore.toFixed(1) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {computed, onMounted, reactive, ref, watch} from 'vue'
import { storeToRefs } from 'pinia';
import { useThreatEditStore } from "@/stores/threatEditStore.js";

const editStore = useThreatEditStore();

const { assetName, threatData } = storeToRefs(editStore);

const keyword = ref('');
const showDropdown = ref(false);
const suggestions = ref([]);

const dummySuggestions = [
  { id: 'T1068', name: 'Exploitation for Privilege Escalation' },
  { id: 'T1189', name: 'Drive-by Compromise' },
  { id: 'T1190', name: 'Exploit Public-Facing Application' },
  { id: 'T1027', name: 'Obfuscated Files or Information' },
  { id: 'T1566', name: 'Phishing' }
];

const defaultRiskRows = [
  { key:'proximity',         label:'Proximity',                  weight:0.1, value:3, description: '' },
  { key:'locality',          label:'Locality',                   weight:0.1, value:3, description: '' },
  { key:'restorationCosts',  label:'Restoration Costs',          weight:0.1, value:3, description: '' },
  { key:'Impact_C',          label:'Impact: Confidentiality',    weight:0.1, value:3, description: '' },
  { key:'Impact_I',          label:'Impact: Integrity',          weight:0.1, value:3, description: '' },
  { key:'Impact_A',          label:'Impact: Availability',       weight:0.1, value:3, description: '' },
  { key:'Prior Use',         label:'Prior Use',                  weight:0.1, value:3, description: '' },
  { key:'Required Skills',   label:'Required Skils',             weight:0.1, value:3, description: '' },
  { key:'Required Resources',label:'Required Resources',         weight:0.1, value:3, description: '' },
  { key:'Stealth',           label:'Stealth',                    weight:0.1, value:3, description: '' },
  { key:'Attribution',       label:'Attribution',                weight:0.1, value:3, description: '' }
];

const riskRows = reactive(JSON.parse(JSON.stringify(defaultRiskRows)));

const ttpScoreOptions = [
  { value:1, text:'Very Low' },
  { value:2, text:'Low' },
  { value:3, text:'Medium' },
  { value:4, text:'High' },
  { value:5, text:'Very High' }
];

const onTechniqueInput = () => {
  showDropdown.value = true;
  if(!keyword.value) {
    suggestions.value = [];
    return;
  }
  // Mock Filtering
  suggestions.value = dummySuggestions.filter(s =>
      s.id.toLowerCase().includes(keyword.value.toLowerCase()) ||
      s.name.toLowerCase().includes(keyword.value.toLowerCase())
  );
};

const onTechniqueFocus = () => { if(keyword.value) showDropdown.value = true; };
const onTechniqueBlur = () => { setTimeout(() => showDropdown.value = false, 200); };
const selectTechnique = (item) => {
  keyword.value = item.name;
  if (threatData.value) {
    threatData.value.mitre_id = item.id;
    threatData.value.technique = item.name;
  }
  showDropdown.value = false;
};
const fetchMitreData = (id) => { alert(`Fetching data for ${id} from MITRE API... (Mock)`); };
const addNewTechniqueFromInput = () => {
  if (threatData.value) {
    threatData.value.technique = keyword.value;
    threatData.value.mitre_id = 'CUSTOM-' + Math.floor(Math.random() * 1000);
  }
  showDropdown.value = false;
};

const addCve = (e) => {
  const val = e.target.value.trim();
  if (threatData.value && val) {
    if (!threatData.value.cve) threatData.value.cve = [];
    if (!threatData.value.cve.includes(val)) {
      threatData.value.cve.push(val);
      e.target.value = '';
    }
  }
};

const resetDefaultWeights = () => {
  defaultRiskRows.forEach((row, index) => {
    if (riskRows[index]) {
      riskRows[index].weight = row.weight;
      riskRows[index].value = row.value;
    }
  });
};

const riskScore = computed(() => {
  const reverseKeys = ['Required Skills', 'Required Resources', 'Stealth', 'Attribution'];

  const sum = riskRows.reduce((sum, row) => {
    const val = reverseKeys.includes(row.key)
        ? (6 - Number(row.value))
        : Number(row.value);

    return sum + (val * (Number(row.weight) || 0));
  }, 0);

  return Math.round(sum * 10) / 10; // 소수점 1자리
});

const riskBadgeClass = computed(() => {
  const s = riskScore.value;
  // 점수에 따른 색상 분기
  if (s < 2) return 'bg-success';
  if (s < 3) return 'bg-info text-dark';
  if (s < 4) return 'bg-warning text-dark';
  return 'bg-danger';
});

const riskLevel = computed(() => {
  const s = riskScore.value;
  // 점수에 따른 색상 분기
  if (s < 2) return 'Info';
  if (s < 3) return 'Caution';
  if (s < 4) return 'Warning';
  return 'Danger';
});

onMounted(() => {
  // 방어 코드: threatData가 없거나 attackVector가 없으면 패스
  if (!threatData.value) return;

  // 기존 저장된 점수 배열 가져오기 (예시 구조)
  const savedScores = threatData.value.ttp_score;

  if (threatData.mitre_id) {
    keyword.value = threatData.technique
  }

  if (Array.isArray(savedScores) && savedScores.length > 0) {
    // 저장된 키-값을 기반으로 riskRows 업데이트
    savedScores.forEach(savedItem => {
      const target = riskRows.find(r => r.key === savedItem.key);
      if (target) {
        target.value = savedItem.value;
        target.weight = savedItem.weight;
      }
    });
  }
});

watch(
    riskRows,
    (newRows) => {
      if (!threatData.value) return;
      threatData.value.ttp_score = newRows.map(r => ({
        key: r.key,
        value: r.value,
        weight: r.weight
      }));
      threatData.value.riskScore = riskScore.value;
    }
);

</script>