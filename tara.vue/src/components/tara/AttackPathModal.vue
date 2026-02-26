<template>
  <div
    class="modal fade"
    ref="modalRef"
    tabindex="-1"
    aria-labelledby="attackPathModalLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="attackPathModalLabel">Attack Path Details</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div v-if="attackPath && attackPath.length > 0">
            <div class="list-group">
              <div
                v-for="(step, idx) in attackPath"
                :key="idx"
                class="list-group-item"
              >
                <div class="d-flex align-items-start">
                  <span class="badge bg-primary rounded-pill me-3 mt-1">{{ step.step || idx + 1 }}</span>
                  <div>
                    <strong>{{ step.assetName }}</strong>
                    <span class="text-muted ms-1">: {{ step.attackStep }}</span>
                    <p v-if="step.description" class="mb-0 mt-1 small text-secondary">
                      {{ step.description }}
                    </p>
                  </div>
                </div>
                <div v-if="idx < attackPath.length - 1" class="text-center text-muted my-1">
                  <i class="fa-solid fa-arrow-down"></i>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-muted text-center py-3">
            No attack path data available.
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { Modal } from 'bootstrap';

const props = defineProps({
  attackPath: {
    type: Array,
    default: () => []
  }
});

const modalRef = ref(null);
let modalInstance = null;

onMounted(() => {
  modalInstance = new Modal(modalRef.value);
});

onBeforeUnmount(() => {
  modalInstance?.dispose();
});

function show() {
  modalInstance?.show();
}

function hide() {
  modalInstance?.hide();
}

defineExpose({ show, hide });
</script>
