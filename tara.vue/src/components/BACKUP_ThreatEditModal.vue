<template>
  <div>
    <div v-if="visible" class="modal-backdrop fade show"></div>

    <div
        class="modal fade"
        :class="{ 'show d-block': visible }"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        @click.self="handleBackdropClick"
    >
      <div class="modal-dialog modal-xl modal-dialog-scrollable" role="document">
        <div class="modal-content">

          <div class="modal-header">
            <h5 class="modal-title">Edit Threat (TARA) - <span class="text-muted fs-6">ID: {{ form.attackVector.id || 'New' }}</span></h5>
            <button type="button" class="btn-close" aria-label="Close" @click="handleCancel"></button>
          </div>

          <div class="modal-body">

            <ul class="nav nav-tabs mb-3">
              <li class="nav-item">
                <a class="nav-link" :class="{ active: activeTab === 'ctsa' }" href="#" @click.prevent="activeTab = 'ctsa'">
                  CTSA — Threat & Risk
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" :class="{ active: activeTab === 'crra' }" href="#" @click.prevent="activeTab = 'crra'">
                  CRRA — Countermeasures
                </a>
              </li>
            </ul>

            <div class="tab-content">

              <div v-show="activeTab === 'ctsa'">
                <div class="row">
                  <div class="col-md-6">
                    <div class="card mb-3 shadow-sm">
                      <div class="card-header bg-light fw-bold">Threat Basics</div>
                      <div class="card-body">

                        <div class="mb-3">
                          <label class="form-label small text-muted fw-bold">ASSET NAME</label>
                          <input type="text" class="form-control" v-model.trim="form.assetName" disabled />
                        </div>

                        <div class="mb-3">
                          <label class="form-label small text-muted fw-bold">MITRE ATT&CK ID</label>
                          <input type="text" class="form-control" v-model="form.attackVector.id" disabled />
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
                              />
                              <button
                                  class="btn btn-outline-primary"
                                  type="button"
                                  @click="fetchMitreData(form.attackVector.id)"
                              >
                                <i class="fas fa-sync-alt me-1"></i> Fetch
                              </button>
                            </div>

                            <div
                                v-if="showDropdown"
                                class="position-absolute w-100 bg-white border rounded shadow-lg mt-1"
                                style="z-index: 1050; max-height: 250px; overflow-y: auto;"
                            >
                              <ul class="list-group list-group-flush" v-if="suggestions.length > 0">
                                <li
                                    v-for="item in suggestions"
                                    :key="item.id"
                                    class="list-group-item list-group-item-action cursor-pointer"
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
                            <input type="number" class="form-control" v-model="form.attackVector.ttc" />
                          </div>
                          <div class="col-md-6 mb-3">
                            <label class="form-label small text-muted fw-bold">CALCULATED LEVEL</label>
                            <input type="text" class="form-control bg-light" value="High" disabled />
                          </div>
                        </div>

                        <div class="mb-3">
                          <label class="form-label small text-muted fw-bold">RELATED CVES</label>
                          <div class="form-control d-flex flex-wrap gap-2 align-items-center" style="min-height: 38px;">
                            <span v-for="(cve, idx) in form.attackVector.cve" :key="idx" class="badge bg-info text-dark">
                                {{ cve }} <i class="fas fa-times ms-1" style="cursor:pointer" @click="form.attackVector.cve.splice(idx, 1)"></i>
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
                          <textarea class="form-control" v-model="form.attackVector.description" rows="5"></textarea>
                        </div>

                      </div>
                    </div>
                  </div>

                  <div class="col-md-6">
                    <div class="card mb-3 shadow-sm h-100">
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
                            <tr v-for="item in riskRows" :key="item.key">
                              <td class="fw-semibold">{{ item.label }}</td>
                              <td>
                                <input type="number" step="0.1" min="0" max="1" class="form-control form-control-sm text-center" v-model.number="item.weight" />
                              </td>
                              <td>
                                <select class="form-select form-select-sm" v-model.number="item.value">
                                  <option v-for="opt in scoreOptions" :key="opt.value" :value="opt.value">
                                    {{ opt.text }} ({{ opt.value }})
                                  </option>
                                </select>
                              </td>
                              <td class="text-center">
                                <span
                                    class="badge bg-light text-dark border cursor-pointer"
                                    data-bs-toggle="tooltip"
                                    data-bs-placement="right"
                                    :title="item.description"
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
                        <div class="d-flex justify-content-between align-items-center mb-2">
                          <span class="text-muted small">Risk Calculation Model: ISO/SAE 21434</span>
                          <button class="btn btn-sm btn-outline-secondary" @click="resetDefaultWeights">Reset</button>
                        </div>
                        <div class="p-3 rounded" :class="riskContainerClass">
                          <div class="d-flex justify-content-between align-items-center">
                            <span class="fw-bold fs-5">Risk Score</span>
                            <span class="fw-bold fs-4">{{ riskScore.toFixed(2) }}</span>
                          </div>
                          <div class="progress mt-2" style="height: 6px;">
                            <div class="progress-bar bg-dark" role="progressbar" :style="{ width: (riskScore * 10) + '%' }"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-show="activeTab === 'crra'">
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

                        <div class="list-group overflow-auto border-top" style="flex: 1; max-height: 500px;">
                          <div
                              v-for="cm in filteredCMs"
                              :key="cm.id"
                              class="list-group-item list-group-item-action d-flex justify-content-between align-items-start py-3"
                          >
                            <div class="me-2">
                              <div class="fw-bold text-dark">
                                <span class="badge bg-light text-dark border me-1">{{ cm.category }}</span>
                                {{ cm.name }}
                              </div>
                              <small class="text-muted d-block mt-1" style="font-size: 0.85rem;">
                                {{ cm.summary }}
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
                              <th style="width: 100px;">Type</th>
                              <th style="width: 100px;">Effect</th>
                              <th style="width: 100px;">Cost</th>
                              <th style="width: 60px;">U/C</th>
                              <th style="width: 40px;"></th>
                            </tr>
                            </thead>
                            <tbody>
                            <tr v-if="form.cms.length === 0">
                              <td colspan="10" class="text-center text-muted py-5">
                                <i class="fas fa-shield-alt fa-3x mb-3 text-secondary opacity-25"></i>
                                <div>No countermeasures selected.</div>
                                <div class="small">Select from the catalog to mitigate this threat.</div>
                              </td>
                            </tr>
                            <tr v-for="(item, index) in form.cms" :key="item.id">
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
                                <button class="btn btn-sm btn-link text-danger p-0" @click="form.cms.splice(index, 1)">
                                  <i class="fas fa-trash-alt"></i>
                                </button>
                              </td>
                            </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div class="card-footer d-flex justify-content-end align-items-center bg-white">
                        <button class="btn btn-sm btn-outline-secondary" @click="sortCMs" :disabled="form.cms.length < 2">
                          <i class="fas fa-sort-amount-down me-1"></i> Sort by Efficiency (U/C)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div> </div>

          <div class="modal-footer bg-light d-flex justify-content-between">
            <button type="button" class="btn btn-outline-danger" @click="handleDelete">
              <i class="fas fa-trash me-1"></i> Remove Threat
            </button>
            <div>
              <button type="button" class="btn btn-light border me-2" @click="handleCancel">Cancel</button>
              <button type="button" class="btn btn-primary px-4" @click="handleApply">
                <i class="fas fa-check me-1"></i> Apply Changes
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>

</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue';
import { Tooltip } from 'bootstrap';

// === Props & Emits ===
const props = defineProps({
  modelValue: { type: Boolean, default: true }, // 테스트를 위해 기본값 true
  threatData: { type: Object, default: null },
  isNewThreat: { type: Boolean, default: false }
});

const emit = defineEmits(['update:modelValue', 'ok', 'cancel', 'delete']);

// === State ===
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const activeTab = ref('ctsa');
const keyword = ref('');
const showDropdown = ref(false);
const cmSearch = ref('');

// === [DUMMY DATA] Form Initialization ===
const form = reactive({
  assetName: 'IVI Head Unit (Android Automotive)',
  attackVector: {
    id: 'T1189', // Drive-by Compromise
    name: 'Drive-by Compromise',
    ttc: 24, // hours
    cve: ['CVE-2023-45122', 'CVE-2024-0012'],
    description: 'Adversaries may gain access to a system through a user visiting a website over the normal course of browsing. The browser exploits vulnerability to execute arbitrary code.'
  },
  cms: [] // Will be populated below
});

// === [DUMMY DATA] Options & Catalogs ===
const scoreOptions = [
  { value: 0, text: 'Very Low' },
  { value: 2, text: 'Low' },
  { value: 5, text: 'Medium' },
  { value: 8, text: 'High' },
  { value: 10, text: 'Critical' }
];

// ISO/SAE 21434 Style Risk Parameters (Dummy)
const riskRows = reactive([
  { key: 'skill', label: 'Attack Feasibility (Skill)', weight: 1.0, value: 8, description: 'Level of technical skill required', defaultValue: 5 },
  { key: 'mot', label: 'Motivation', weight: 1.0, value: 5, description: 'Attacker benefit / motivation', defaultValue: 5 },
  { key: 'exp', label: 'Exposure', weight: 0.8, value: 10, description: 'Accessibility of the target', defaultValue: 10 },
  { key: 'sev', label: 'Severity (Safety)', weight: 1.5, value: 10, description: 'Impact on safety if compromised', defaultValue: 10 },
  { key: 'fin', label: 'Financial Impact', weight: 0.5, value: 2, description: 'Cost damage to the manufacturer', defaultValue: 2 },
]);

// Countermeasure Catalog (Dummy)
const allCMs = [
  { id: 'CM-SEC-01', category: 'Network', name: 'Firewall (Ingress)', summary: 'Filters incoming traffic based on IP/Port rules.' },
  { id: 'CM-SEC-02', category: 'Crypto', name: 'TLS 1.3 Encryption', summary: 'End-to-end encryption for data in transit.' },
  { id: 'CM-HW-05', category: 'Hardware', name: 'Secure Boot', summary: 'Validates signature of bootloader and kernel.' },
  { id: 'CM-IDS-01', category: 'Detection', name: 'Host-based IDS', summary: 'Monitors system calls for anomalous behavior.' },
  { id: 'CM-IAM-03', category: 'Access', name: 'MFA for Admin', summary: 'Requires multi-factor authentication for root access.' },
  { id: 'CM-SW-09', category: 'Software', name: 'Input Validation', summary: 'Sanitizes all user inputs to prevent injection.' },
];

// Autocomplete Suggestions (Dummy)
const dummySuggestions = [
  { id: 'T1068', name: 'Exploitation for Privilege Escalation' },
  { id: 'T1189', name: 'Drive-by Compromise' },
  { id: 'T1190', name: 'Exploit Public-Facing Application' },
  { id: 'T1027', name: 'Obfuscated Files or Information' },
  { id: 'T1566', name: 'Phishing' }
];
const suggestions = ref([]);

// Populate Initial Selected CMs (Dummy)
form.cms = [
  { ...allCMs[1], mitigationTypes: 'prevent', effectiveness: 3, cost: 2 },
  { ...allCMs[5], mitigationTypes: 'prevent', effectiveness: 2, cost: 1 },
];

// === Computed & Logic ===

const riskScore = computed(() => {
  let total = 0;
  let weightSum = 0;
  riskRows.forEach(r => {
    total += r.value * r.weight;
    weightSum += r.weight;
  });
  return weightSum === 0 ? 0 : total / weightSum;
});

// Risk에 따라 배경색 동적 변경
const riskContainerClass = computed(() => {
  const s = riskScore.value;
  if (s < 3) return 'bg-success text-white';
  if (s < 6) return 'bg-warning text-dark';
  if (s < 8) return 'bg-orange text-white'; // custom css needed or use bootstrap bg-danger with opacity
  return 'bg-danger text-white';
});

const filteredCMs = computed(() => {
  if (!cmSearch.value) return allCMs;
  const k = cmSearch.value.toLowerCase();
  return allCMs.filter(cm =>
      cm.name.toLowerCase().includes(k) ||
      cm.id.toLowerCase().includes(k) ||
      cm.category.toLowerCase().includes(k)
  );
});

// === Methods ===

const handleApply = () => {
  console.log('Applied Data:', JSON.parse(JSON.stringify(form)));
  console.log('Calculated Risk:', riskScore.value);
  emit('ok', { ...form, riskScore: riskScore.value });
  visible.value = false;
};

const handleCancel = () => {
  emit('cancel');
  visible.value = false;
};

const handleDelete = () => {
  if(confirm('Are you sure you want to delete this threat?')) {
    emit('delete', form.attackVector.id);
    visible.value = false;
  }
};

const handleBackdropClick = () => { /* Prevent Close */ };

// Technique Logic
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
  form.attackVector.id = item.id;
  form.attackVector.name = item.name;
  showDropdown.value = false;
};
const fetchMitreData = (id) => { alert(`Fetching data for ${id} from MITRE API... (Mock)`); };
const addNewTechniqueFromInput = () => {
  form.attackVector.name = keyword.value;
  form.attackVector.id = 'CUSTOM-' + Math.floor(Math.random()*1000);
  showDropdown.value = false;
};

// CVE Logic
const addCve = (e) => {
  const val = e.target.value.trim();
  if(val && !form.attackVector.cve.includes(val)) {
    form.attackVector.cve.push(val);
    e.target.value = '';
  }
};

// CM Logic
const isCMSelected = (id) => form.cms.some(c => c.id === id);

const addCM = (cm) => {
  if (!isCMSelected(cm.id)) {
    form.cms.push({
      ...cm,
      mitigationTypes: 'prevent',
      effectiveness: 2, // Medium default
      cost: 2 // Medium default
    });
  }
};
const calcUC = (item) => (item.effectiveness * 10) / item.cost;
const sortCMs = () => { form.cms.sort((a, b) => calcUC(b) - calcUC(a)); };

// UI Helpers
const getScoreColorClass = (val) => {
  if(val >= 8) return 'text-danger fw-bold';
  if(val >= 5) return 'text-warning fw-bold';
  return 'text-success fw-bold';
};

// Watcher: 실제 데이터가 들어오면 Dummy 덮어쓰기 (Production 대비)
watch(() => props.threatData, (newVal) => {
  if (newVal && Object.keys(newVal).length > 0) {
    Object.assign(form, newVal);
    keyword.value = newVal.attackVector?.name || '';
  }
}, { deep: true });

onMounted(() => {
  // Initialize Tooltips
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new Tooltip(tooltipTriggerEl);
  });
});
</script>

<style scoped>
/* Custom Styles for Better UX */
.modal-dialog.modal-xl { max-width: 1200px; }
.cursor-pointer { cursor: pointer; }

/* Tab Styling similar to IDEs/modern apps */
.nav-tabs .nav-link {
  color: #6c757d;
  font-weight: 500;
  border: none;
  border-bottom: 3px solid transparent;
}
.nav-tabs .nav-link.active {
  color: #0d6efd;
  border-bottom: 3px solid #0d6efd;
  background: transparent;
}
.nav-tabs .nav-link:hover { border-color: transparent; color: #0a58ca; }

/* Scrollbar styling for lists */
.list-group::-webkit-scrollbar { width: 6px; }
.list-group::-webkit-scrollbar-thumb { background-color: #ccc; border-radius: 4px; }

/* Risk Badge custom color if needed */
.bg-orange { background-color: #fd7e14; }
</style>