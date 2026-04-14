<template>
  <div class="container-fluid py-4">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h2 class="fw-bold mb-0">TARA Assessment Dashboard</h2>
      <div class="d-flex gap-2">
        <router-link to="/" class="btn btn-outline-secondary">
          <i class="fa-solid fa-home"></i> Home
        </router-link>
      </div>
    </div>

    <div v-if="store.error" class="alert alert-danger alert-dismissible fade show" role="alert">
      {{ store.error }}
      <button type="button" class="btn-close" @click="store.error = null"></button>
    </div>

    <div v-if="store.isLoading && sessions.length === 0" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-2 text-muted">Loading sessions...</p>
    </div>

    <div v-else-if="sessions.length > 0" class="row g-4">
      <div class="col-xl-3 col-lg-4">
        <div class="border rounded bg-white">
          <div class="px-3 py-2 border-bottom fw-semibold">
            Simulation Sessions
          </div>
          <div class="list-group list-group-flush">
            <button
              v-for="session in sessions"
              :key="session.sessionId"
              type="button"
              class="list-group-item list-group-item-action text-start"
              :class="{ active: session.sessionId === selectedSessionId }"
              @click="selectedSessionId = session.sessionId"
            >
              <div class="d-flex justify-content-between align-items-start gap-2">
                <div class="fw-semibold small text-break">{{ session.sessionId }}</div>
                <span
                  class="badge flex-shrink-0"
                  :class="session.hasAnalysis ? 'bg-success' : 'bg-warning text-dark'"
                >
                  {{ session.hasAnalysis ? 'Expanded' : 'Shortest Path Ready' }}
                </span>
              </div>
              <div class="small opacity-75 mt-1">
                {{ formatDate(session.createdAt) }}
              </div>
              <div class="small mt-1">
                {{ session.entryAsset || 'Unknown' }} -> {{ session.targetAsset || 'Unknown' }}
              </div>
              <div class="small opacity-75">
                {{ session.assessmentCount }} assessment<span v-if="session.assessmentCount > 1">s</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div class="col-xl-9 col-lg-8">
        <template v-if="selectedSessionSummary">
          <div class="border rounded bg-white mb-4">
            <div class="px-3 py-3 border-bottom">
              <div class="d-flex flex-wrap justify-content-between align-items-start gap-3">
                <div>
                  <div class="small text-muted">Selected Session</div>
                  <div class="fw-semibold text-break">{{ selectedSessionSummary.sessionId }}</div>
                  <div class="small text-muted mt-1">
                    {{ formatDate(selectedSessionSummary.createdAt) }}
                  </div>
                </div>

                <div class="d-flex flex-wrap gap-2">
                  <button
                    v-if="canExpandSelectedSession"
                    class="btn btn-primary"
                    @click="expandSelectedSessionAttackPaths"
                    :disabled="isExpandingSelectedSession"
                  >
                    <span
                      v-if="isExpandingSelectedSession"
                      class="spinner-border spinner-border-sm me-1"
                      role="status"
                    ></span>
                    <i v-else class="fa-solid fa-wand-magic-sparkles me-1"></i>
                    Expand Attack Paths
                  </button>
                  <button
                    v-if="selectedSessionAttackPath"
                    class="btn btn-outline-info"
                    @click="showAttackPath({ attack_path: selectedSessionAttackPath })"
                  >
                    <i class="fa-solid fa-route me-1"></i> View Detail
                  </button>
                </div>
              </div>
            </div>

            <div class="p-3">
              <div class="row g-3 mb-4">
                <div class="col-md-4">
                  <div class="small text-muted">Entry Asset</div>
                  <div class="fw-semibold">{{ selectedSessionSummary.entryAsset || 'Unknown' }}</div>
                </div>
                <div class="col-md-4">
                  <div class="small text-muted">Target Asset</div>
                  <div class="fw-semibold">{{ selectedSessionSummary.targetAsset || 'Unknown' }}</div>
                </div>
                <div class="col-md-4">
                  <div class="small text-muted">Status</div>
                  <span class="badge" :class="selectedSessionSummary.hasAnalysis ? 'bg-success' : 'bg-warning text-dark'">
                    {{ selectedSessionSummary.hasAnalysis ? 'Expanded' : 'Shortest Path Ready' }}
                  </span>
                </div>
              </div>

              <div class="mb-4">
                <h5 class="mb-3">Shortest Path</h5>

                <div v-if="shortestPathSteps.length > 0" class="list-group">
                  <div
                    v-for="(step, idx) in shortestPathSteps"
                    :key="`shortest-${idx}`"
                    class="list-group-item"
                  >
                    <span class="badge bg-primary me-2">{{ step.step || idx + 1 }}</span>
                    <strong>{{ step.assetName }}</strong>
                    <span class="text-muted ms-1">: {{ step.attackStep }}</span>
                  </div>
                </div>
                <div v-else class="text-muted small">
                  No shortest path data available.
                </div>
              </div>

              <div class="mb-3">
                <h5 class="mb-3">Expanded Attack Paths</h5>

                <div v-if="generatedPathEntries.length > 0" class="path-accordion d-grid gap-2">
                  <details
                    v-for="(path, pathIndex) in generatedPathEntries"
                    :key="path.key"
                    class="border rounded bg-light-subtle"
                    :open="pathIndex === 0"
                  >
                    <summary class="d-flex flex-wrap justify-content-between align-items-center gap-2 px-3 py-3">
                      <div class="d-flex flex-wrap gap-2 align-items-center">
                        <span class="fw-semibold">{{ path.label }}</span>
                        <span class="badge bg-secondary">{{ path.value.Realism_Assessment || 'N/A' }}</span>
                        <span class="badge bg-primary">Score {{ path.value.Completeness_Score_1to5 || '-' }}/5</span>
                        <span class="badge text-bg-light border">
                          {{ expandedPathSteps(path).length }} step<span v-if="expandedPathSteps(path).length !== 1">s</span>
                        </span>
                      </div>
                    </summary>

                    <div class="px-3 pb-3">
                      <div class="small text-muted mb-1">Rewritten Attack Path</div>
                      <div v-if="expandedPathSteps(path).length > 0" class="mb-3">
                        <div
                          v-for="step in expandedPathSteps(path)"
                          :key="`${path.key}-rewritten-${step.label}`"
                          class="rewritten-step py-2"
                        >
                          <div class="d-flex align-items-start gap-2">
                            <span class="badge bg-primary flex-shrink-0 mt-1">({{ step.label }})</span>
                            <div class="flex-grow-1">
                              <div>{{ step.text }}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p v-else class="mb-3 path-text">{{ path.value.Rewritten_Attack_Path || 'N/A' }}</p>

                      <!-- <div v-if="path.value.Missing_Steps?.length" class="mb-3">
                        <div class="small text-muted mb-1">Missing Steps</div>
                        <ul class="mb-0 small">
                          <li v-for="(item, idx) in path.value.Missing_Steps" :key="`${path.key}-missing-${idx}`">
                            {{ item }}
                          </li>
                        </ul>
                      </div> -->

                      <div v-if="path.value.Key_Assumptions?.length" class="mb-3">
                        <div class="small text-muted mb-1">Key Assumptions</div>
                        <ul class="mb-0 small">
                          <li v-for="(item, idx) in path.value.Key_Assumptions" :key="`${path.key}-assumption-${idx}`">
                            {{ item }}
                          </li>
                        </ul>
                      </div>

                      <div v-if="path.value.Evidence_Needed?.length">
                        <div class="small text-muted mb-1">Evidence Needed</div>
                        <ul class="mb-0 small">
                          <li v-for="(item, idx) in path.value.Evidence_Needed" :key="`${path.key}-evidence-${idx}`">
                            {{ item }}
                          </li>
                        </ul>
                      </div>
                    </div>
                  </details>
                </div>

                <div v-else class="text-muted small">
                  <span v-if="canExpandSelectedSession">
                    Click `Expand Attack Paths` to send this session's shortest path to Gemini.
                  </span>
                  <span v-else>
                    No expanded attack path data available.
                  </span>
                </div>
              </div>

              <div v-if="scenarioLinkageCheck" class="border-top pt-3">
                <h5 class="mb-2">Scenario Linkage Check</h5>
                <div class="d-flex flex-wrap gap-2 mb-2 small">
                  <span class="badge bg-dark">
                    Damage-Threat: {{ scenarioLinkageCheck.Damage_to_Threat_Consistency || 'N/A' }}
                  </span>
                  <span class="badge bg-dark">
                    Threat-Path: {{ scenarioLinkageCheck.Threat_to_AttackPath_Consistency || 'N/A' }}
                  </span>
                  <span class="badge bg-dark">
                    CIA: {{ scenarioLinkageCheck.CIA_Consistency || 'N/A' }}
                  </span>
                </div>
                <ul v-if="Array.isArray(scenarioLinkageCheck.Notes) && scenarioLinkageCheck.Notes.length > 0" class="mb-0 small">
                  <li v-for="(note, idx) in scenarioLinkageCheck.Notes" :key="`scenario-note-${idx}`">
                    {{ note }}
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div class="border rounded bg-white overflow-hidden">
            <div class="px-3 py-2 border-bottom fw-semibold">
              Session Assessments
            </div>

            <div v-if="selectedSessionAssessments.length > 0" class="table-responsive">
              <table class="table table-bordered table-hover align-middle mb-0">
                <thead class="table-dark">
                  <tr>
                    <th style="width: 40px">#</th>
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
                  <tr v-for="(item, idx) in selectedSessionAssessments" :key="item.id">
                    <td>{{ idx + 1 }}</td>
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
                    <td style="max-width: 220px" :title="item.threat_scenario">
                      {{ item.threat_scenario }}
                    </td>
                    <td class="text-center">
                      <button class="btn btn-sm btn-outline-info" @click="showAttackPath(item)">
                        <i class="fa-solid fa-route"></i> View
                      </button>
                    </td>
                    <td>
                      <EditableDropdown
                        :modelValue="item.attack_feasibility || ''"
                        :options="feasibilityOptions"
                        @update:modelValue="onFieldUpdate(item, 'attack_feasibility', $event)"
                      />
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

            <div v-else class="p-4 text-muted small">
              No assessment rows yet. Expand this session's attack paths to generate Gemini results.
            </div>
          </div>
        </template>
      </div>
    </div>

    <div v-else class="text-center py-5 text-muted">
      <i class="fa-solid fa-clipboard-list fa-3x mb-3"></i>
      <p>No simulation sessions available.</p>
      <p>Run malsim in the Diagram Editor to create a session.</p>
    </div>

    <AttackPathModal ref="attackPathModal" :attackPath="selectedAttackPath" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useTaraAssessmentStore } from '@/stores/taraAssessmentStore.js';
import { useThreatModelStore } from '@/stores/threatModelStore.js';
import EditableDropdown from '@/components/tara/EditableDropdown.vue';
import AttackPathModal from '@/components/tara/AttackPathModal.vue';

const store = useTaraAssessmentStore();
const tmStore = useThreatModelStore();

const attackPathModal = ref(null);
const selectedAttackPath = ref([]);
const selectedSessionId = ref(null);
const expandingSessionId = ref(null);

const feasibilityOptions = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];
const impactRatingOptions = ['Negligible', 'Moderate', 'Major', 'Severe'];
const riskTreatmentOptions = ['Avoid', 'Reduce', 'Share', 'Retain'];
const calOptions = ['CAL 1', 'CAL 2', 'CAL 3', 'CAL 4'];

const normalizedAssessments = computed(() =>
  store.assessments.map((item) => ({
    ...item,
    parsed_attack_path: parseAttackPath(item.attack_path)
  }))
);

const normalizedMalsimSessions = computed(() =>
  (tmStore.malsimSessions || []).map((session) => {
    const summary = extractSimulationSummary(session.simulationResult);
    return {
      sessionId: session.sessionId,
      createdAt: session.createdAt,
      simulationResult: session.simulationResult,
      entryAsset: summary.entryAsset,
      targetAsset: summary.targetAsset
    };
  })
);

const sessions = computed(() => {
  const grouped = new Map();

  normalizedMalsimSessions.value.forEach((session) => {
    grouped.set(session.sessionId, {
      sessionId: session.sessionId,
      createdAt: session.createdAt,
      entryAsset: session.entryAsset,
      targetAsset: session.targetAsset,
      ciaAttribute: null,
      assessmentCount: 0,
      hasAnalysis: false,
      simulationResult: session.simulationResult
    });
  });

  normalizedAssessments.value.forEach((item) => {
    const sessionId = item.session_id || 'unknown-session';
    if (!grouped.has(sessionId)) {
      grouped.set(sessionId, {
        sessionId,
        createdAt: item.created_at,
        entryAsset: item.entry_asset,
        targetAsset: item.target_asset,
        ciaAttribute: item.cia_attribute,
        assessmentCount: 0,
        hasAnalysis: true,
        simulationResult: null
      });
    }

    const session = grouped.get(sessionId);
    session.assessmentCount += 1;
    session.hasAnalysis = true;
    session.entryAsset = session.entryAsset || item.entry_asset;
    session.targetAsset = session.targetAsset || item.target_asset;
    session.ciaAttribute = session.ciaAttribute || item.cia_attribute;

    if (item.created_at && new Date(item.created_at) > new Date(session.createdAt || 0)) {
      session.createdAt = item.created_at;
    }
  });

  return Array.from(grouped.values()).sort((a, b) => {
    const left = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const right = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return right - left;
  });
});

const selectedSessionSummary = computed(() => {
  if (!selectedSessionId.value) return null;
  return sessions.value.find((session) => session.sessionId === selectedSessionId.value) || null;
});

const selectedSessionAssessments = computed(() => {
  if (!selectedSessionId.value) return [];
  return normalizedAssessments.value.filter((item) => item.session_id === selectedSessionId.value);
});

const selectedPrimaryAssessment = computed(() => selectedSessionAssessments.value[0] || null);

const selectedSessionAttackPath = computed(() => {
  if (selectedPrimaryAssessment.value?.parsed_attack_path) {
    return selectedPrimaryAssessment.value.parsed_attack_path;
  }

  const summary = selectedSessionSummary.value;
  if (!summary?.simulationResult) {
    return null;
  }

  const shortestPath = extractSimulationSummary(summary.simulationResult).steps;
  if (!shortestPath.length) {
    return null;
  }

  return {
    source_shortest_path: shortestPath
  };
});

const shortestPathSteps = computed(() => {
  const path = selectedSessionAttackPath.value;

  if (Array.isArray(path)) {
    return path;
  }

  if (Array.isArray(path?.source_shortest_path)) {
    return path.source_shortest_path;
  }

  return [];
});

const generatedPathEntries = computed(() => {
  const generatedPaths = selectedSessionAttackPath.value?.generated_attack_paths || {};
  return Object.entries(generatedPaths)
    .sort(([leftKey], [rightKey]) => comparePathKeys(leftKey, rightKey))
    .map(([key, value]) => ({
      key,
      label: key.replace('_', ' ').toUpperCase(),
      value
    }));
});

const scenarioLinkageCheck = computed(() =>
  selectedSessionAttackPath.value?.scenario_linkage_check || null
);

const canExpandSelectedSession = computed(() =>
  Boolean(
    selectedSessionSummary.value &&
    !selectedSessionSummary.value.hasAnalysis &&
    selectedSessionSummary.value.simulationResult
  )
);

const isExpandingSelectedSession = computed(() =>
  expandingSessionId.value === selectedSessionId.value
);

function expandedPathSteps(path) {
  const rewrittenPath = path?.value?.Rewritten_Attack_Path || '';
  const structuredSteps = path?.value?.Expanded_Steps;

  if (rewrittenPath.trim()) {
    const matches = [...rewrittenPath.matchAll(/\((\d+(?:-\d+)?)\)\s*([\s\S]*?)(?=\s*\(\d+(?:-\d+)?\)|$)/g)];
    if (matches.length > 0) {
      return matches.map((match, index) => {
        const label = match[1];
        const baseStepNumber = Number(String(label).match(/^(\d+)/)?.[1]) || index + 1;

        return {
          label,
          number: baseStepNumber,
          text: match[2].trim().replace(/\s+/g, ' ')
        };
      });
    }
  }

  if (Array.isArray(structuredSteps) && structuredSteps.length > 0) {
    return structuredSteps.map((item, index) => ({
      label: String(Number(item.Shortest_Path_Step) || index + 1),
      number: Number(item.Shortest_Path_Step) || index + 1,
      text: item.Expanded_Description || ''
    }));
  }

  if (!rewrittenPath.trim()) return [];

  return [{
    label: '1',
    number: 1,
    text: rewrittenPath.trim()
  }];
}

watch(
  sessions,
  (nextSessions) => {
    if (nextSessions.length === 0) {
      selectedSessionId.value = null;
      return;
    }

    const stillExists = nextSessions.some((session) => session.sessionId === selectedSessionId.value);
    if (!stillExists) {
      selectedSessionId.value = nextSessions[0].sessionId;
    }
  },
  { immediate: true }
);

onMounted(() => {
  store.loadAllAssessments();
});

function extractSimulationSummary(simulationResult) {
  const shortestPaths =
    simulationResult?.rawResult?.result?.shortest_paths ||
    simulationResult?.result?.shortest_paths ||
    simulationResult?.shortest_paths ||
    null;

  if (!shortestPaths?.agents) {
    return {
      entryAsset: null,
      targetAsset: null,
      steps: []
    };
  }

  for (const agentData of Object.values(shortestPaths.agents)) {
    const entryAsset = normalizeStepLabel(agentData?.entry_points?.[0]?.full_name || agentData?.entry_points?.[0]?.name);
    const goals = agentData?.goals || {};

    for (const [goalName, goalData] of Object.entries(goals)) {
      if (!goalData?.path_found) continue;

      const targetAsset = normalizeStepLabel(goalData?.goal?.full_name || goalName);
      const steps = normalizePathSteps(goalData?.full_path || []);

      return {
        entryAsset,
        targetAsset,
        steps
      };
    }
  }

  return {
    entryAsset: null,
    targetAsset: null,
    steps: []
  };
}

function normalizePathSteps(pathNodes) {
  return (Array.isArray(pathNodes) ? pathNodes : [])
    .map((node, index) => {
      const fullStep = normalizeStepLabel(
        node?.full_name ||
        node?.fullStep ||
        (node?.assetName && node?.attackStep ? `${node.assetName}:${node.attackStep}` : node?.name)
      );

      if (!fullStep) return null;

      const separatorIndex = fullStep.indexOf(':');
      const assetName = separatorIndex >= 0 ? fullStep.slice(0, separatorIndex) : fullStep;
      const attackStep = separatorIndex >= 0 ? fullStep.slice(separatorIndex + 1) : '';

      return {
        step: Number(node?.step) || index + 1,
        assetName,
        attackStep,
        fullStep
      };
    })
    .filter(Boolean);
}

function normalizeStepLabel(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function comparePathKeys(leftKey, rightKey) {
  const leftMatch = String(leftKey).match(/(\d+)$/);
  const rightMatch = String(rightKey).match(/(\d+)$/);

  if (leftMatch && rightMatch) {
    return Number(leftMatch[1]) - Number(rightMatch[1]);
  }

  return String(leftKey).localeCompare(String(rightKey));
}

function parseAttackPath(attackPath) {
  if (!attackPath) return null;

  if (typeof attackPath === 'string') {
    try {
      return JSON.parse(attackPath);
    } catch (error) {
      console.warn('[DashboardView] Failed to parse attack_path JSON:', error);
      return null;
    }
  }

  return attackPath;
}

function formatDate(value) {
  if (!value) return 'Unknown';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function ciaBadgeClass(cia) {
  switch (cia) {
    case 'Confidentiality':
      return 'bg-info text-dark';
    case 'Integrity':
      return 'bg-warning text-dark';
    case 'Availability':
      return 'bg-danger';
    default:
      return 'bg-secondary';
  }
}

async function expandSelectedSessionAttackPaths() {
  const session = selectedSessionSummary.value;
  if (!session?.simulationResult) {
    alert('No simulation result found for this session.');
    return;
  }

  expandingSessionId.value = session.sessionId;

  try {
    await store.analyzeFromSimulation(session.sessionId, session.simulationResult);
    await store.loadAllAssessments();
  } catch (err) {
    alert(`Expansion failed: ${err.message}`);
  } finally {
    expandingSessionId.value = null;
  }
}

function showAttackPath(item) {
  const path = parseAttackPath(item.attack_path);
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
.path-text {
  white-space: pre-wrap;
}

.rewritten-step + .rewritten-step {
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.path-accordion summary {
  cursor: pointer;
  list-style: none;
}

.path-accordion summary::-webkit-details-marker {
  display: none;
}
</style>
