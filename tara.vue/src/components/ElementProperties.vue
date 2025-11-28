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
              v-model="cellRef.label"
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
              v-model="cellRef.data.description"
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

// 1. UI 반응성을 위한 로컬 상태 변수 선언
const assetName = ref('');
const description = ref('');
const outOfScope = ref(false);       // v-if를 제어할 핵심 변수
const reasonOutOfScope = ref('');

// 2. [X6 -> Vue] 그래프에서 노드를 선택했을 때, 데이터를 로컬 변수로 가져오기
watch(cellRef, (newCell) => {
  if (newCell && newCell.data) {
    // X6 데이터를 가져와서 UI 변수에 할당
    assetName.value = newCell.data.name || '';
    description.value = newCell.data.description || '';
    outOfScope.value = newCell.data.outOfScope || false; // 여기서 값이 들어옴
    reasonOutOfScope.value = newCell.data.reasonOutOfScope || '';
  } else {
    // 선택 해제 시 초기화
    assetName.value = '';
    description.value = '';
    outOfScope.value = false;
    reasonOutOfScope.value = '';
  }
}, { immediate: true }); // 컴포넌트 로드 시 즉시 실행

// 3. [Vue -> X6] UI에서 값을 변경했을 때, 그래프에 반영하기
// 각각의 ref가 변경될 때마다 updateData 호출

// 3-1. Asset Name 변경 감지
watch(assetName, (val) => {
  if (!cellRef.value) return;
  cellStore.updateData({ name: val });
  cellRef.value.attr('label/text', val); // 라벨 시각적 변경
  // dataChanged.updateProperties(cellRef.value); // 필요 시 호출
});

// 3-2. Description 변경 감지
watch(description, (val) => {
  if (!cellRef.value) return;
  cellStore.updateData({ description: val });
});

// 3-3. Out of Scope 스위치 변경 감지 (★ 여기가 중요)
watch(outOfScope, (val) => {
  if (!cellRef.value) return;

  // 1. 데이터 업데이트
  cellStore.updateData({ outOfScope: val });

  // 2. 스타일 업데이트 (회색 처리 등)
  dataChanged.updateStyleAttrs(cellRef.value);

  // 이제 'val'이 true로 바뀌면, outOfScope.value가 true이므로 v-if가 즉시 반응합니다.
});

// 3-4. Reason 변경 감지
watch(reasonOutOfScope, (val) => {
  if (!cellRef.value) return;
  cellStore.updateData({ reasonOutOfScope: val });
});

</script>

<style scoped>

</style>