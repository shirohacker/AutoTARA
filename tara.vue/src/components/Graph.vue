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
              <graph-button-view />
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
import { ref, onMounted, computed, provide } from 'vue'
import diagramService from '@/service/diagram/diagram.js'
import stencilService from '@/service/x6/stencil.js'
import ElementProperties from "@/components/ElementProperties.vue";
import GraphButtonView from "@/views/GraphButtonView.vue";
import ThreatProperties from "@/components/ThreatProperties.vue";
import ThreatEditModal from "@/components/ThreatEditModal.vue";
import { useThreatModelStore } from '@/stores/threatModelStore.js';
import {useCellStore} from "@/stores/cellStore.js";
import axios from "axios";
import {storeToRefs} from "pinia";

const tmStore = useThreatModelStore()
const modelInfo = computed(() => tmStore.data.modelInfo)
const modifiedDiagram = computed(() => tmStore.modifiedDiagram)

const stencil_container = ref(null)
const graph_container = ref(null)
const graphInstance = ref(null) // Renamed from graph to avoid confusion
const cellStore = useCellStore();
const { ref: cellRef } = storeToRefs(cellStore);

// Provide graph instance to child components
// Note: provide expects a Ref or reactive object if we want children to reap updates? 
// Or just the value? If we provide 'graph', children get the ref unless we unwrap.
// Using provide('graph', graphInstance) means children inject('graph') will receive the Ref object.
provide('graph', graphInstance)

const threatEditModalRef = ref(false);

onMounted(() => {
  graphInstance.value = diagramService.loadEditDiagram(graph_container.value, modifiedDiagram.value) // 그래프 초기화
  stencilService.get(graphInstance.value, stencil_container.value)  // Initialize the stencil

  // Listen to history changes
  graphInstance.value.getPlugin('history').on('change', () => {
    if (!modifiedDiagram.value) return;
    const updated = { ...modifiedDiagram.value }
    updated.cells = graphInstance.value.toJSON().cells
    tmStore.modifyDiagram(updated)
  })

  graphInstance.value.on('node:added', async (node) => {
    console.log('node:added')
    console.log('Current Cells:', node.cell)
    let assetName = node.cell.data.name
    let des = ''
    await axios.get(`/api/v1/asset-description/${assetName}`)
        .then(res => {
            if (res.data.description) {
              des = res.data.description
            }
        })
        .catch(err => {
            console.error(err);
        })
    cellStore.updateData({ description: des }, 'Graph.vue');
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
