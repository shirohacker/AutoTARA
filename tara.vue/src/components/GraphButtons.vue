<template>
  <div class="toolbar-container bg-light border-bottom p-2 d-flex justify-content-between align-items-center rounded-top">

    <div class="d-flex align-items-center gap-2">

      <div class="btn-group shadow-sm" role="group">
        <button type="button" class="btn btn-sm btn-white border" title="Open">
          <i class="fa-solid fa-folder-open text-secondary"></i>
        </button>
        <button type="button" class="btn btn-sm btn-white border" title="Save">
          <i class="fa-solid fa-floppy-disk text-primary"></i>
        </button>
      </div>

      <div class="btn-group shadow-sm" role="group">
        <button type="button" class="btn btn-sm btn-white border" title="Undo">
          <i class="fa-solid fa-arrow-rotate-left"></i>
        </button>
        <button type="button" class="btn btn-sm btn-white border" title="Redo">
          <i class="fa-solid fa-arrow-rotate-right"></i>
        </button>
      </div>

      <div class="btn-group shadow-sm" role="group">
        <button type="button" class="btn btn-sm btn-white border" title="Zoom In">
          <i class="fa-solid fa-magnifying-glass-plus"></i>
        </button>
        <button type="button" class="btn btn-sm btn-white border" title="Zoom Out">
          <i class="fa-solid fa-magnifying-glass-minus"></i>
        </button>
      </div>

      <button type="button" class="btn btn-sm btn-white border shadow-sm text-danger" title="Delete Selected">
        <i class="fa-solid fa-trash"></i>
      </button>

      <div class="vr text-muted mx-1"></div>

      <div class="btn-group shadow-sm">
        <button type="button" class="btn btn-sm btn-white border" title="Screenshot">
          <i class="fa-solid fa-camera"></i>
        </button>
        <button type="button" class="btn btn-sm btn-white border fw-bold text-dark" title="Create Report">
          <i class="fa-solid fa-file-lines me-1"></i> Report
        </button>
      </div>
    </div>

    <div class="d-flex align-items-center gap-2">
      <div class="btn-group shadow-sm">
        <button class="btn btn-sm btn-white border fw-bold text-dark">
          <i class="fa-solid fa-arrow-right-to-bracket me-1"></i> Entry
        </button>

        <button class="btn btn-sm btn-white border fw-bold text-dark">
          <i class="fa-solid fa-flag me-1"></i> Target
        </button>
      </div>
      <div class="vr text-muted mx-1"></div>
      <div class="btn-group shadow-sm">
        <button ref="dropdownToggleRef" class="btn btn-sm btn-white border fw-bold text-dark dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
          <i class="fa-solid fa-play me-1"></i> Simulate
        </button>
        <ul class="dropdown-menu">
          <li>
            <button class="dropdown-item" @click="startTTCHandler">
              <i class="fa-solid fa-clock me-2 text-muted"></i>Time To Compromise (TTC)
            </button>
          </li>
          <li>
            <button class="dropdown-item" @click="startEdgeHandler">
              <i class="fa-solid fa-share-nodes me-2 text-muted"></i>Edge Path Analysis
            </button>
          </li>
        </ul>
        <button type="button" class="btn btn-sm btn-white border" @click="resetHandler" title="Reset Simulation">
          <i class="fa-solid fa-rotate-right"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
// import { ref, onMounted } from 'vue';

const startTTCHandler = () => console.log("TTC");
const startEdgeHandler = () => console.log("Edge");
const resetHandler = () => console.log("Reset");

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