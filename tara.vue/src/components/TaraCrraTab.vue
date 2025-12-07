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
              <table class="table table-hover mb-0 align-middle small">
                <thead class="table-light">
                <tr>
                  <th style="width: 30px;"></th>
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
                <template v-for="(item, index) in selectedCMs" :key="item.id">
                  <tr>
                    <td class="text-center">
                      <button 
                        class="btn btn-sm p-0 text-secondary" 
                        @click="toggleRow(item.id)"
                        v-if="item.nist_controls && item.nist_controls.length > 0"
                      >
                        <i class="fas" :class="isRowExpanded(item.id) ? 'fa-chevron-down' : 'fa-chevron-right'"></i>
                      </button>
                    </td>
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
                  <tr v-if="isRowExpanded(item.id)" class="bg-light">
                    <td colspan="7" class="p-3">
                      <div class="card border-0 shadow-sm">
                         <div class="card-header bg-white border-bottom-0 fw-bold text-primary">
                           <i class="fas fa-list-ul me-2"></i> NIST 800-53 Controls Mapping
                         </div>
                         <div class="card-body p-0">
                           <table class="table table-bordered mb-0 table-sm" style="font-size: 0.8rem;">
                             <thead class="bg-light text-secondary">
                               <tr>
                                 <th style="width: 15%;">Control ID</th>
                                 <th style="width: 25%;">Control Name</th>
                                 <th style="width: 60%;">Description</th>
                               </tr>
                             </thead>
                             <tbody>
                               <tr v-for="ctrl in item.nist_controls" :key="ctrl.id">
                                 <td class="fw-bold text-center">{{ ctrl.id }}</td>
                                 <td>{{ ctrl.name }}</td>
                                 <td class="text-muted">{{ ctrl.description }}</td>
                               </tr>
                             </tbody>
                           </table>
                         </div>
                      </div>
                    </td>
                  </tr>
                </template>
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
const expandedRows = ref([]);

const cmSearch = ref('');
const isCMSelected = (id) => selectedCMs.some(c => c.id === id);
const calcUC = (item) => (item.effectiveness * 10) / item.cost;
const sortCMs = () => { selectedCMs.sort((a, b) => calcUC(b) - calcUC(a)); };

const toggleRow = (id) => {
  const idx = expandedRows.value.indexOf(id);
  if (idx === -1) expandedRows.value.push(id);
  else expandedRows.value.splice(idx, 1);
};

const isRowExpanded = (id) => expandedRows.value.includes(id);

const sampleNistData = {
  'M1048': [
    { id: 'SC-39', name: 'Process Isolation', description: 'Separates execution domains per process to limit the spread of vulnerabilities to other processes or system resources.' },
    { id: 'SC-02', name: 'Separation of System and User Functionality', description: 'Separates system administration functions from user functions to reduce risk from exposed administrative interfaces.' },
    { id: 'SC-03', name: 'Security Function Isolation', description: 'Isolates security functions so application flaws do not impact core security mechanisms.' },
    { id: 'SA-08', name: 'Security and Privacy Engineering Principles', description: 'Applies security design principles to establish isolation and layered defenses that reduce propagation of attacks.' },
    { id: 'SI-10', name: 'Information Input Validation', description: 'Validates inputs to fundamentally block vectors such as injection and remote code execution.' }
  ],
  'M1050': [
    { id: 'SC-07', name: 'Boundary Protection', description: 'Configures boundary protections such as WAFs to block malicious traffic before it reaches applications.' },
    { id: 'SC-18', name: 'Mobile Code', description: 'Restricts untrusted code or scripts from executing in the application environment to prevent malicious insertion.' },
    { id: 'SI-03', name: 'Malicious Code Protection', description: 'Applies malware detection and blocking to prevent malicious inputs from reaching vulnerable web components.' },
    { id: 'SC-30', name: 'Concealment and Misdirection', description: 'Uses concealment and misdirection to reduce attacker targeting opportunities and lower exploitation success.' },
    { id: 'SI-10', name: 'Information Input Validation', description: 'Validates inputs to fundamentally block vectors such as injection and remote code execution.' }
  ],
  'M1030': [
    { id: 'AC-04', name: 'Information Flow Enforcement', description: 'Enforces information flow policies to restrict unauthorized paths and unnecessary communications.' },
    { id: 'CM-07', name: 'Least Functionality', description: 'Removes unnecessary functions and ports to reduce the attack surface.' },
    { id: 'SC-07', name: 'Boundary Protection', description: 'Segregates DMZ and internal networks to prevent direct application server access to internal segments.' }
  ]
};

const addCM = (cm) => {
  if (!isCMSelected(cm.id)) {
    // Inject sample NIST data if available
    const nistInfo = sampleNistData[cm.id] || [];
    
    selectedCMs.push({
      ...cm,
      mitigationTypes: 'prevent',
      effectiveness: 2, // Medium default
      cost: 2, // Medium default
      nist_controls: nistInfo
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
  // Sample data to make sure M1048, M1050, M1030 are available for testing even if API fails or doesn't have them
  { id: 'M1048', name: 'Application Isolation and Sandboxing', description: 'Restrict the execution environment of applications to separate them from other applications and system resources.' },
  { id: 'M1050', name: 'Exploit Protection', description: 'Use capabilities generally available in operating systems that make it more difficult for adversaries to exploit vulnerabilities.' },
  { id: 'M1030', name: 'Network Segmentation', description: 'Architect sections of the network to isolate critical systems, functions, or resources.' },
  { id: 'M1036', name: 'Account Use Policies', description: 'Configure features related to account use like login attempt lockouts, specific login times, etc.' }
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
    // When loading from store, we might need to re-attach sample data if it's missing (since we just added it)
    const storedCMs = JSON.parse(JSON.stringify(threatData.value.selectedCMs));
    
    storedCMs.forEach(cm => {
        // If data is missing or user re-enters page, re-attach NIST info if available in our sample map
        if ((!cm.nist_controls || cm.nist_controls.length === 0) && sampleNistData[cm.id]) {
            cm.nist_controls = sampleNistData[cm.id];
        }
    });

    selectedCMs.splice(0, selectedCMs.length, ...storedCMs);
  }

  // We are using local sample data for now to ensure the specific IDs required by the user are present.
  
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
    // Merge API results with our sample/demo items if they aren't there
    const apiData = res.data;
    
    // Ensure our demo items are in the list for the user to see
    const demoItems = [
      { id: 'M1048', name: 'Application Isolation and Sandboxing', description: 'Restrict the execution environment of applications to separate them from other applications and system resources.' },
      { id: 'M1050', name: 'Exploit Protection', description: 'Use capabilities generally available in operating systems that make it more difficult for adversaries to exploit vulnerabilities.' },
      { id: 'M1030', name: 'Network Segmentation', description: 'Architect sections of the network to isolate critical systems, functions, or resources.' }
    ];

    // Simple merge: add demo items if they don't exist in map
    const combined = [...apiData];
    demoItems.forEach(d => {
        if (!combined.some(c => c.id === d.id)) {
            combined.push(d);
        }
    });
    
    allCMs.value = combined;
  } catch (error) {
    console.error('Error get MITRE countermeasures by threat ID:', error);
    // Fallback to local sample data is already in ref init
  }
};

const getAllMitreCMs = async () => {
  try {
    const res = await axios.get('/api/v1/mitre/countermeasures')
     // Merge logic similiar to above
    const apiData = res.data;
    const demoItems = [
      { id: 'M1048', name: 'Application Isolation and Sandboxing', description: 'Restrict the execution environment of applications to separate them from other applications and system resources.' },
      { id: 'M1050', name: 'Exploit Protection', description: 'Use capabilities generally available in operating systems that make it more difficult for adversaries to exploit vulnerabilities.' },
      { id: 'M1030', name: 'Network Segmentation', description: 'Architect sections of the network to isolate critical systems, functions, or resources.' }
    ];
    
    const combined = [...apiData];
    demoItems.forEach(d => {
        if (!combined.some(c => c.id === d.id)) {
            combined.push(d);
        }
    });

    allCMs.value = combined;
  } catch (error) {
    console.error('Error get MITRE countermeasures:', error);
  }
};

onMounted(() => {
  init()
})
</script>