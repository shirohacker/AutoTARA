<template>
  <!-- Hidden File Input -->
  <input
    type="file"
    ref="fileInput"
    class="d-none"
    accept=".json"
    @change="handleFileSelected"
  >

  <!-- Report Modal -->
  <simulation-report-modal
    :visible="showReport"
    :graph="graph"
    @close="showReport = false"
  />

  <div class="d-flex align-items-center gap-2">
    <div class="btn-group shadow-sm" role="group">
      <button type="button" class="btn btn-sm btn-white border" title="Open" @click="openFileHandler">
        <i class="fa-solid fa-folder-open text-secondary"></i>
      </button>
      <button type="button" class="btn btn-sm btn-white border" title="Save" @click="saveFileHandler">
        <i class="fa-solid fa-floppy-disk text-primary"></i>
      </button>
    </div>

    <div class="btn-group shadow-sm" role="group">
      <button type="button" class="btn btn-sm btn-white border" title="Undo" @click="undoHandler" :disabled="!canUndo">
        <i class="fa-solid fa-arrow-rotate-left" :class="{ 'text-muted': !canUndo }"></i>
      </button>
      <button type="button" class="btn btn-sm btn-white border" title="Redo" @click="redoHandler" :disabled="!canRedo">
        <i class="fa-solid fa-arrow-rotate-right" :class="{ 'text-muted': !canRedo }"></i>
      </button>
    </div>

    <div class="btn-group shadow-sm" role="group">
      <button type="button" class="btn btn-sm btn-white border" title="Zoom In" @click="zoomInHandler">
        <i class="fa-solid fa-magnifying-glass-plus"></i>
      </button>
      <button type="button" class="btn btn-sm btn-white border" title="Zoom Out" @click="zoomOutHandler">
        <i class="fa-solid fa-magnifying-glass-minus"></i>
      </button>
    </div>

    <button type="button" class="btn btn-sm btn-white border shadow-sm text-danger" title="Delete Selected" @click="deleteHandler" :disabled="!cellStore.hasSelected">
      <i class="fa-solid fa-trash"></i>
    </button>

    <div class="vr text-muted mx-1"></div>

    <div class="btn-group shadow-sm">
      <button type="button" class="btn btn-sm btn-white border" title="Screenshot" @click="screenshotHandler">
        <i class="fa-solid fa-camera"></i>
      </button>
      <button 
        type="button" 
        class="btn btn-sm btn-white border fw-bold text-dark" 
        title="Create Report" 
        @click="openReportHandler" 
        :disabled="!simulationResult"
      >
        <i class="fa-solid fa-file-lines me-1" :class="{'text-muted': !simulationResult, 'text-primary': simulationResult}"></i> Report
      </button>
    </div>
  </div>
</template>

<script setup>
import { inject, ref, onMounted, watch } from 'vue';
import { useThreatModelStore } from '@/stores/threatModelStore.js';
import { useCellStore } from '@/stores/cellStore.js';
import SimulationReportModal from './SimulationReportModal.vue';
import { storeToRefs } from 'pinia';

const graph = inject('graph');
const tmStore = useThreatModelStore();
const cellStore = useCellStore();

// Reactive references for Store
const { simulationResult } = storeToRefs(tmStore);

// Modal State
const showReport = ref(false);

const openReportHandler = () => {
    if (simulationResult.value) {
        showReport.value = true;
    }
};

// File input ref
const fileInput = ref(null);

// Undo/Redo state
const canUndo = ref(false);
const canRedo = ref(false);

// --- Lifecycle Hooks ---
onMounted(() => {
  if (graph.value) {
    setupGraphListeners(graph.value);
    updateHistoryState();
  }
});

// Watch for graph instance changes
watch(graph, (newGraph) => {
  if (newGraph) {
    setupGraphListeners(newGraph);
    updateHistoryState();
  }
});

const setupGraphListeners = (g) => {
  // History events
  g.on('history:change', updateHistoryState);
  g.on('history:undo', updateHistoryState);
  g.on('history:redo', updateHistoryState);
};

const updateHistoryState = () => {
  if (graph.value) {
    const history = graph.value.getPlugin('history');
    if (history) {
      canUndo.value = history.canUndo();
      canRedo.value = history.canRedo();
    }
  }
};

// --- File Operations ---
const openFileHandler = () => {
  if (tmStore.modified) {
    const confirmOpen = confirm('Current changes have not been saved. Do you want to continue?');
    if (!confirmOpen) return;
  }
  
  // Reset input value to allow selecting the same file again
  if (fileInput.value) {
    fileInput.value.value = '';
    fileInput.value.click();
  }
};

const handleFileSelected = async (evt) => {
  const file = evt.target.files[0];
  if (!file) return;

  if (file.type === "application/json") {
    try {
      const tmData = await file.text();
      const tmJson = JSON.parse(tmData);
      
      tmStore._stashThreatModel(tmJson);
      tmStore.setFileName(file.name);
      tmStore.selectDiagram(tmStore.data.diagrams);
      
      if (graph.value && tmStore.data.diagrams) {
        graph.value.fromJSON(tmStore.data.diagrams);
      }
      
      console.log('File loaded successfully:', file.name);
    } catch (error) {
      console.error("Error parsing JSON:", error);
      alert("Failed to parse JSON file.");
    }
  } else {
    alert("Please select a valid JSON file.");
  }
};

const saveFileHandler = async () => {
  try {
    const success = await tmStore.save();
    if (success) console.log('File saved successfully');
  } catch (error) {
    alert('Failed to save file: ' + error.message);
  }
};

// --- History Operations ---
const undoHandler = () => {
  graph.value?.getPlugin('history')?.undo();
};

const redoHandler = () => {
  graph.value?.getPlugin('history')?.redo();
};

// --- View Operations ---
const zoomInHandler = () => {
  graph.value?.zoom(0.1);
};

const zoomOutHandler = () => {
  graph.value?.zoom(-0.1);
};

const deleteHandler = () => {
  const cells = graph.value?.getSelectedCells();
  if (cells?.length) {
    graph.value.removeCells(cells);
  }
};

const screenshotHandler = () => {
  graph.value?.toPNG((dataUri) => {
    const link = document.createElement('a');
    link.download = `${tmStore.data.modelInfo?.title || 'diagram'}.png`;
    link.href = dataUri;
    link.click();
  }, { backgroundColor: '#ffffff', padding: 10 });
};
</script>

<style scoped>
/* Bootstrap 기본 btn-light보다 깔끔한 흰색 버튼 스타일 */
.btn-white {
  background-color: #ffffff;
  color: #495057;
  border-color: #dee2e6;
}
.btn-white:hover {
  background-color: #f8f9fa;
  border-color: #c6c7ca;
}
/* 툴바 컨테이너 배경 */
.toolbar-container {
  background-color: #f8f9fa; /* Bootstrap bg-light color */
}
/* 구분선 */
.vr {
  align-self: center;
  height: 24px;
  width: 1px;
  background-color: #ccc;
  opacity: 1;
}
</style>