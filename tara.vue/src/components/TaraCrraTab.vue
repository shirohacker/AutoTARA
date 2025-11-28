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
</template>

<script setup>
import {computed, reactive, ref} from "vue";

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

const cmSearch = ref('');
const isCMSelected = (id) => form.cms.some(c => c.id === id);
const calcUC = (item) => (item.effectiveness * 10) / item.cost;
const sortCMs = () => { form.cms.sort((a, b) => calcUC(b) - calcUC(a)); };

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

const allCMs = [
  { id: 'CM-SEC-01', category: 'Network', name: 'Firewall (Ingress)', summary: 'Filters incoming traffic based on IP/Port rules.' },
  { id: 'CM-SEC-02', category: 'Crypto', name: 'TLS 1.3 Encryption', summary: 'End-to-end encryption for data in transit.' },
  { id: 'CM-HW-05', category: 'Hardware', name: 'Secure Boot', summary: 'Validates signature of bootloader and kernel.' },
  { id: 'CM-IDS-01', category: 'Detection', name: 'Host-based IDS', summary: 'Monitors system calls for anomalous behavior.' },
  { id: 'CM-IAM-03', category: 'Access', name: 'MFA for Admin', summary: 'Requires multi-factor authentication for root access.' },
  { id: 'CM-SW-09', category: 'Software', name: 'Input Validation', summary: 'Sanitizes all user inputs to prevent injection.' },
];

const filteredCMs = computed(() => {
  if (!cmSearch.value) return allCMs;
  const k = cmSearch.value.toLowerCase();
  return allCMs.filter(cm =>
      cm.name.toLowerCase().includes(k) ||
      cm.id.toLowerCase().includes(k) ||
      cm.category.toLowerCase().includes(k)
  );
});
</script>