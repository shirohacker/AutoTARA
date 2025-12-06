<template>
  <div class="card shadow-sm">
    <div class="card-header bg-white border-bottom-0 pt-3 pb-2 d-flex align-items-center">
      <i class="fas fa-sliders-h text-primary me-2"></i>
      <span class="fw-bold">Properties</span>
    </div>

    <div class="card-body">
      <div v-if="!cellRef" class="h-100 d-flex flex-column align-items-center justify-content-center text-muted opacity-75">
        <p class="small text-center mb-0">
          Select an element on the diagram<br>to edit its properties.
        </p>
      </div>

      <div v-else>
        <div class="mb-3">
          <label for="name" class="form-label small fw-bold text-uppercase text-muted">
            Asset Name
          </label>
          <input
              v-model="assetName"
              type="text"
              class="form-control form-control-sm fw-bold"
              id="name"
              placeholder="Enter asset name..."
          >
        </div>

        <div class="mb-3">
          <label for="description" class="form-label small fw-bold text-uppercase text-muted">
            Description
          </label>
          <textarea
              v-model="description"
              class="form-control form-control-sm"
              id="description"
              placeholder="Describe the function or role of this asset..."
              rows="4"
              style="resize: none;"
          ></textarea>
        </div>

        <hr class="text-muted my-4 opacity-25">

        <div class="mb-3">
          <div class="form-check form-switch d-flex justify-content-between align-items-center ps-0">
            <label class="form-check-label small fw-bold text-dark" for="outOfScopeSwitch">
              Out of Scope
            </label>
            <input
                class="form-check-input ms-2"
                type="checkbox"
                role="switch"
                id="outOfScopeSwitch"
                v-model="outOfScope"
                style="cursor: pointer;"
            >
          </div>
          <div class="form-text small" v-if="!outOfScope">
            Enable this if the asset is excluded from analysis.
          </div>
        </div>

        <div v-if="outOfScope" class="bg-light p-3 rounded border">
          <label for="outOfScopeReason" class="form-label small fw-bold text-danger">
            <i class="fas fa-exclamation-circle me-1"></i>Reason for Exclusion
          </label>
          <textarea
              v-model="reasonOutOfScope"
              class="form-control form-control-sm"
              id="outOfScopeReason"
              placeholder="Why is this asset out of scope?"
              rows="3"
          ></textarea>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue' // computed 대신 ref, watch 사용
import { useCellStore } from "@/stores/cellStore.js";
import { storeToRefs } from 'pinia';
import dataChanged from '@/service/x6/graph/data-changed.js';

const cellStore = useCellStore();
const { ref: cellRef } = storeToRefs(cellStore);

const assetName = ref('');
const description = ref('');
const outOfScope = ref(false);
const reasonOutOfScope = ref('');

watch(cellRef, (newCell) => {
  if (newCell && cellRef.value.data) {
    assetName.value = cellRef.value.data.name || '';
    description.value = cellRef.value.data.description || '';
    outOfScope.value = cellRef.value.data.outOfScope || false;
    reasonOutOfScope.value = cellRef.value.data.reasonOutOfScope || '';
  } else {
    assetName.value = '';
    description.value = '';
    outOfScope.value = false;
    reasonOutOfScope.value = '';
  }
}, { immediate: true });

watch(assetName, (val) => {
  if (!cellRef.value) return;
  cellStore.updateData({ name: val }, 'ElementProperties.vue');
  cellRef.value.attr('label/text', val); // 라벨 시각적 변경
});

const syncFromCell = () => {
  if (cellRef.value && cellRef.value.getData) {
    const data = cellRef.value.getData(); // 최신 데이터 가져오기

    // 로컬 변수 업데이트 -> 화면이 즉시 바뀜
    assetName.value = data.name || '';
    description.value = data.description || '';
    outOfScope.value = data.outOfScope || false;
    reasonOutOfScope.value = data.reasonOutOfScope || '';

    // console.log('🔄 화면 갱신됨:', data.description); // 확인용 로그
  }
};

watch(cellRef, (newCell, oldCell) => {

  // (중요) 이전에 선택했던 셀의 리스너 제거 (안 하면 메모리 새고 버그 생김)
  if (oldCell) {
    oldCell.off('change:data', syncFromCell);
  }

  if (newCell) {
    // ① 선택하자마자 현재 데이터로 한 번 채우기
    syncFromCell();

    // ② [핵심] "앞으로 이 셀의 데이터가 변하면(API 응답 등) syncFromCell을 실행해라!" 라고 등록
    newCell.on('change:data', syncFromCell);

  } else {
    // 선택 해제 시 초기화
    assetName.value = '';
    description.value = '';
    outOfScope.value = false;
    reasonOutOfScope.value = '';
  }
}, { immediate: true });



watch(description, (val) => {
  if (!cellRef.value) return;
  cellStore.updateData({ description: val }, 'ElementProperties.vue');
});

watch(outOfScope, (val) => {
  if (!cellRef.value) return;
  cellStore.updateData({ outOfScope: val }, 'ElementProperties.vue');
  dataChanged.updateStyleAttrs(cellRef.value);
});

// 3-4. Reason 변경 감지
watch(reasonOutOfScope, (val) => {
  if (!cellRef.value) return;
  cellStore.updateData({ reasonOutOfScope: val }, 'ElementProperties.vue');
});

</script>

<style scoped>

</style>