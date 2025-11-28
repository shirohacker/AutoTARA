<template>
  <div class="row mt-2">
    <div class="col-md-10">
      <div class="stencil-app ">
        <div class="stencil-container" id="stencil_container" ref="stencil_container"></div>

        <div class="app-main">
          <div class="row">
            <div class="col">
              <h3 class="mb-0">{{ modelInfo.title }}</h3>
            </div>
          </div>

          <div class="row mt-2 mb-2">
            <div class="col">
              <graph-buttons />
            </div>
          </div>

          <div class="row">
            <div class="col graph-wrapper">
              <div class="graph-container" id="graph_container" ref="graph_container"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="col-md-2">
      <div class="mb-2">
        <ElementProperties />
      </div>
      <ThreatProperties @open-threat-edit-modal="showThreatEditModal" />
    </div>

    <div>
      <ThreatEditModal ref="threatEditModalRef" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import diagramService from '@/service/diagram/diagram.js'
import stencilService from '@/service/x6/stencil.js'
import ElementProperties from "@/components/ElementProperties.vue";
import GraphButtons from "@/components/GraphButtons.vue";
import ThreatProperties from "@/components/ThreatProperties.vue";
import ThreatEditModal from "@/components/ThreatEditModal.vue";

import { useThreatModelStore } from '@/stores/threatModelStore.js';
const tmStore = useThreatModelStore()
const modelInfo = computed(() => tmStore.data.modelInfo)
const modifiedDiagram = computed(() => tmStore.modifiedDiagram)

const stencil_container = ref(null)
const graph_container = ref(null)
const graph = ref(null)

const threatEditModalRef = ref(false);

onMounted(() => {
  graph.value = diagramService.loadEditDiagram(graph_container.value, modifiedDiagram.value) // 그래프 초기화 (기존에 저장된 다이어그램이 있으면 로드)
  stencilService.get(graph.value, stencil_container.value)  // Initialize the stencil (palette)

  // Listen to history changes
  graph.value.getPlugin('history').on('change', () => {
    const updated = Object.assign({}, modifiedDiagram.value)
    updated.cells = graph.value.toJSON().cells
    tmStore.modifyDiagram(updated)
  })
})

const showThreatEditModal = (threatId, state) => {
  if (threatEditModalRef.value) {
    threatEditModalRef.value.editThreat(threatId, state)
  }
}

</script>

<style scoped>
.stencil-app {
  display: flex;
  padding: 0;
}

.stencil-container {
  position: relative;
  width: 200px;
  border: 1px solid #f0f0f0;
}

.app-main {
  flex: 1;
  margin-left: 8px;
}

.graph-container {
  height: 85vh;
  width: 100%;
  flex: 1;
  cursor: default;
}

.graph-wrapper {
  display: flex;
  width: 60vw;
}
</style>
