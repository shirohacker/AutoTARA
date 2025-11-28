<template>
  <div>
    <div v-if="visible" class="modal-backdrop fade show"></div>

    <div
        class="modal fade"
        :class="{ 'show d-block': visible }"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        @click.self="closeModal"
    >
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content shadow">
          <div class="modal-header">
            <h5 class="modal-title fw-bold fs-4" id="createDiagramModalLabel">
              New Diagram
            </h5>
            <button
                type="button"
                class="btn-close"
                aria-label="Close"
                @click="closeModal"
            ></button>
          </div>

          <div class="modal-body">
            <form @submit.prevent="createDiagram">
              <div class="mb-3">
                <label for="title" class="form-label fw-bold fs-5">Title</label>
                <input
                    type="text"
                    v-model="form.title"
                    class="form-control"
                    id="title"
                    placeholder="New Tara Diagram"
                    required
                />
              </div>

              <div class="mb-3">
                <label for="owner" class="form-label fw-bold fs-5">Owner</label>
                <input
                    type="text"
                    v-model="form.owner"
                    class="form-control"
                    id="owner"
                    placeholder="Your Name"
                />
              </div>

              <div class="mb-3">
                <label for="template" class="form-label fw-bold fs-5">Template</label>
                <!-- todo: DB에서 템플릿 불러오기 -->
                <select v-model="form.template" class="form-select" id="template">
                  <option value="new">New Threat Model</option>
                  <option value="container">Cloud Native - Container</option>
                </select>
              </div>

              <div class="mb-3">
                <label for="organization" class="form-label fw-bold fs-5">Organization</label>
                <input
                    type="text"
                    v-model="form.organization"
                    class="form-control"
                    id="organization"
                    placeholder="Company Name"
                />
              </div>

              <div class="mb-3">
                <label for="description" class="form-label fw-bold fs-5">Description</label>
                <textarea
                    v-model="form.description"
                    class="form-control"
                    id="description"
                    rows="4"
                    placeholder="Describe the threat model..."
                ></textarea>
              </div>

              <div class="text-end">
                <button type="button" class="btn btn-secondary me-2" @click="closeModal">
                  Cancel
                </button>
                <button type="submit" class="btn btn-primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useThreatModelStore } from '@/stores/threatModelStore.js';

const tmStore = useThreatModelStore();
const visible = ref(false);

// 5. 폼 데이터를 위한 로컬 상태 (취소 시 스토어 오염 방지)
const form = reactive({
  title: '',
  owner: '',
  template: 'new',
  organization: '',
  description: ''
});

// 초기화 함수
const resetForm = () => {
  form.title = '';
  form.owner = '';
  form.template = 'new';
  form.organization = '';
  form.description = '';
};

const createDiagram = async () => {
  if (tmStore.data && tmStore.data.modelInfo) {
    Object.assign(tmStore.data.modelInfo, form);
  }

  await tmStore.save();

  // 저장 후 모달 닫기
  closeModal();
}

const openModal = () => {
  resetForm(); // 모달 열 때마다 폼 초기화
  visible.value = true;
}

const closeModal = () => {
  visible.value = false;
}

defineExpose({
  openModal,
})
</script>

<style scoped>
/* 필요 시 모달 z-index 조정 (Bootstrap 기본값은 보통 문제 없음) */
.modal-backdrop {
  z-index: 1040;
}
.modal {
  z-index: 1050;
}
</style>