<template>
  <div class="d-flex align-items-center gap-2">
    <div class="btn-group shadow-sm">
      <button class="btn btn-sm btn-white border fw-bold text-dark" @click="setEntryHandler" :disabled="!cellStore.hasSelected">
        <i class="fa-solid fa-arrow-right-to-bracket me-1" :class="{ 'text-muted': !cellStore.hasSelected }"></i> Entry
      </button>

      <button class="btn btn-sm btn-white border fw-bold text-dark" @click="setTargetHandler" :disabled="!cellStore.hasSelected">
        <i class="fa-solid fa-flag me-1" :class="{ 'text-muted': !cellStore.hasSelected }"></i> Target
      </button>
    </div>
    <div class="vr text-muted mx-1"></div>
    <div class="btn-group shadow-sm">
      <button ref="dropdownToggleRef" class="btn btn-sm btn-white border fw-bold text-dark dropdown-toggle" aria-expanded="false" @click="toggleDropdown">
        <i v-if="isSimulating" class="fa-solid fa-spinner fa-spin me-1 text-primary"></i>
        <i v-else class="fa-solid fa-play me-1"></i> 
        {{ isSimulating ? 'Simulating...' : 'Simulate' }}
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
</template>

<script setup>
import { useCellStore } from '@/stores/cellStore.js';
import { useThreatModelStore } from "@/stores/threatModelStore.js";
import { storeToRefs } from "pinia";
import dataChanged from '@/service/x6/graph/data-changed.js';
import { ref, onMounted, onUnmounted, inject, toRaw } from 'vue';
import { Dropdown } from 'bootstrap';
import { useToast } from "vue-toastification";

const cellStore = useCellStore();
const tmStore = useThreatModelStore();
const { ref: cellRef } = storeToRefs(cellStore);
const toast = useToast();
const graph = inject('graph');

const dropdownToggleRef = ref(null);
let dropdown = null;

const toggleDropdown = () => {
  if (dropdown) {
    dropdown.toggle();
  }
};

onMounted(() => {
  if (dropdownToggleRef.value) {
    dropdown = new Dropdown(dropdownToggleRef.value);
  }
});

onUnmounted(() => {
  if (dropdown) {
    dropdown.dispose();
  }
});

/**
 * Helper: Check if a node is compromisable (has at least one 'open' threat)
 */
const isCompromisable = (node) => {
  const data = node.getData() || {};
  if (!data.threats || !Array.isArray(data.threats) || data.threats.length === 0) {
    return false;
  }
  // Check if any threat is status 'open' (not 'mitigated')
  return data.threats.some(t => t.status && t.status.toLowerCase() === 'open');
};

/**
 * Helper: Get Minimum TTC from a node's open threats
 */
const getMinTTC = (node) => {
  const data = node.getData() || {};
  if (!isCompromisable(node)) return Infinity;

  const openThreats = data.threats.filter(t => t.status && t.status.toLowerCase() === 'open');
  if (openThreats.length === 0) return Infinity;

  // Extract TTCs and find min. Parse as float.
  const ttcs = openThreats.map(t => parseFloat(t.ttc) || 0);
  return Math.min(...ttcs);
};

/**
 * Helper: Reset previous simulation path visualization
 */
const clearAttackPath = (model) => {
  const cells = model.getCells();
  cells.forEach(cell => {
    const data = cell.getData() || {};
    if (data.isAttackPath) {
      cell.setData({ isAttackPath: false }, { merge: true, skipSelection: true });
      dataChanged.updateStyleAttrs(cell);
    }
  });
};

/**
 * Core Algorithm: Find ALL Shortest Paths (All Optimal Paths)
 * @param model X6 Graph Model
 * @param startId ID of Entry Node
 * @param targetId ID of Target Node
 * @param weightType 'edge' (hops) or 'ttc' (time)
 */
const findAllShortestPaths = (model, startId, targetId, weightType) => {
  const nodes = model.getNodes();
  const edges = model.getEdges();

  const adj = new Map();
  nodes.forEach(n => adj.set(n.id, []));

  edges.forEach(edge => {
    const sourceId = edge.getSourceCellId();
    const targetId = edge.getTargetCellId();
    if (sourceId && targetId && adj.has(sourceId)) {
        adj.get(sourceId).push({ neighborId: targetId, edgeId: edge.id });
    }
  });

  const distances = new Map();
  // previous stores list of possible predecessors for traversing optimal path
  // Map<NodeId, Array<{ prevNodeId: string, edgeId: string }>>
  const previous = new Map(); 
  const queue = [];

  nodes.forEach(n => {
    distances.set(n.id, Infinity);
    previous.set(n.id, []);
    queue.push(n.id);
  });

  const startNodeCell = nodes.find(n => n.id === startId);
  if (!startNodeCell) return null;

  if (!isCompromisable(startNodeCell)) {
      toast.error("Entry Node has no open threats and cannot be compromised!");
      return null;
  }

  let startCost = 0;
  if (weightType === 'ttc') {
      startCost = getMinTTC(startNodeCell);
  }
  distances.set(startId, startCost);

  while (queue.length > 0) {
    queue.sort((a, b) => distances.get(a) - distances.get(b));
    const uId = queue.shift();

    if (distances.get(uId) === Infinity) break;
    // Note: In standard Dijkstra for single path we break early. 
    // For ALL paths, we must continue to explore to find other equal cost paths to target?
    // Actually, once we pull target from queue, we found min cost. 
    // But we might have other nodes in queue with SAME min cost that also lead to target?
    // Safe to continue until queue front > target dist, or just process normally.
    // Standard approach: Process normally. We track multiple predecessors during relaxation.
    
    // Slight Optimization: if uId == targetId, we don't strictly need to expand IT, 
    // but we need to ensure we reached it from all possible parents. 
    // By the time uId is popped, its distance is finalized.

    const userNeighbors = adj.get(uId) || [];
    
    for (const { neighborId, edgeId } of userNeighbors) {
        // queue check strictly not needed for correctness if logic is robust, but optimization
        if (!queue.includes(neighborId) && distances.get(neighborId) !== Infinity) {
             // Already processed (closed set). In strict Dijkstra with positive weights, we don't revisit.
             // But if we found an EQUAL path later? Dijkstra guarantees nodes popped in increasing order.
             // So if neighbor is already popped, we found a <= path before.
             // If we found a strictly shorter path now? Impossible in Dijkstra.
             // If we found an EQUAL path? We might accept it.
             // Usually Dijkstra doesn't revisit 'closed' nodes.
             // Let's stick to standard relaxation: check if we can improve OR equal it.
        }

        const neighborNode = nodes.find(n => n.id === neighborId);
        if (!isCompromisable(neighborNode)) continue;

        let weight = 0;
        if (weightType === 'edge') {
            weight = 1; 
        } else {
            weight = getMinTTC(neighborNode);
        }

        const alt = distances.get(uId) + weight;
        const currentDist = distances.get(neighborId);

        // Tolerance for floating point (TTC)
        const EPSILON = 0.0001;

        if (alt < currentDist - EPSILON) {
            // Found strictly shorter path
            distances.set(neighborId, alt);
            previous.set(neighborId, [{ prevNodeId: uId, edgeId }]);
        } else if (Math.abs(alt - currentDist) < EPSILON) {
            // Found equal optimal path
            previous.get(neighborId).push({ prevNodeId: uId, edgeId });
        }
    }
  }

  if (distances.get(targetId) === Infinity) {
      return null; 
  }

  // Backtracking to reconstruct ALL paths
  // Returns Array of { nodes: [], edges: [], totalCost }
  const allPaths = [];
  const minCost = distances.get(targetId);

  const backtrack = (currentId, currentPathNodes, currentPathEdges) => {
      // Prepend current node
      const newPathNodes = [currentId, ...currentPathNodes];
      
      if (currentId === startId) {
          allPaths.push({
              nodes: newPathNodes,
              edges: [...currentPathEdges], // Edges are already in correct reverse order? No, edges added below are predecessors
              // Let's check edge order.
              totalCost: minCost
          });
          return;
      }

      const parents = previous.get(currentId) || [];
      parents.forEach(({ prevNodeId, edgeId }) => {
          // Edge: prev -> current.
          // Since we build path backwards (Target -> Start), we prepend edges?
          // currentPathEdges accumulates edges: E_last, E_last-1...
          backtrack(prevNodeId, newPathNodes, [edgeId, ...currentPathEdges]);
      });
  };

  backtrack(targetId, [], []);

  return {
    paths: allPaths,
    totalCost: minCost
  };
};

const isSimulating = ref(false);

/**
 * Common Logic to run simulation
 */
const runSimulation = (weightType) => {
    // 1. Validation
    if (!tmStore.entryNode) {
        toast.warning("Please set an Entry node first.");
        return;
    }
    if (!tmStore.targetNode) {
        toast.warning("Please set a Target node first.");
        return;
    }

    // Access Model
    // Use injected graph instance directly if available (preferred)
    let model = null;
    if (graph && graph.value) {
        model = graph.value;
    } else if (cellRef.value && cellRef.value.model) {
        model = cellRef.value.model;
    }

    if (!model) {
        toast.error("Graph model not found. Please refresh or check application state.");
        return;
    }
    
    // UI Feedback: Start Loading
    isSimulating.value = true;

    // Use setTimeout to allow UI to render Loading state before heavy calculation
    setTimeout(() => {
        try {
            // Clear previous
            const rawModel = toRaw(model);
            console.log("Graph Model Type:", rawModel);
            
            clearAttackPath(rawModel);

            // Run Algorithm
            const result = findAllShortestPaths(rawModel, tmStore.entryNode, tmStore.targetNode, weightType);

            if (!result || result.paths.length === 0) {
                toast.error(`No valid attack path found for ${weightType.toUpperCase()} analysis. Check connectivity and open threats.`);
                return;
            }

            // Save to Store for Report
            tmStore.simulationResult = {
                paths: result.paths,
                totalCost: result.totalCost,
                weightType: weightType
            };

            // Visualisation
            result.paths.forEach(path => {
                // Highlight Nodes
                path.nodes.forEach(nodeId => {
                    // Safe lookup for cell
                    let cell = null;
                    if (typeof rawModel.getCell === 'function') {
                        cell = rawModel.getCell(nodeId);
                    } else if (typeof rawModel.getCellById === 'function') {
                        cell = rawModel.getCellById(nodeId);
                    }

                    if (cell) {
                        const data = cell.getData() || {};
                        if (!data.isAttackPath) {
                            cell.setData({ isAttackPath: true }, { merge: true, skipSelection: true });
                            dataChanged.updateStyleAttrs(cell);
                        }
                    } else {
                        console.warn(`Could not find cell for Node ID: ${nodeId}`);
                    }
                });

                // Highlight Edges
                path.edges.forEach(edgeId => {
                    let cell = null;
                    if (typeof rawModel.getCell === 'function') {
                        cell = rawModel.getCell(edgeId);
                    } else if (typeof rawModel.getCellById === 'function') {
                        cell = rawModel.getCellById(edgeId);
                    }

                    if (cell) {
                        const data = cell.getData() || {};
                        if (!data.isAttackPath) {
                            cell.setData({ isAttackPath: true }, { merge: true, skipSelection: true });
                            dataChanged.updateStyleAttrs(cell);
                        }
                    } else {
                        console.warn(`Could not find cell for Edge ID: ${edgeId}`);
                    }
                });
            });

            const costLabel = weightType === 'ttc' ? `${result.totalCost.toFixed(1)} hrs` : `${result.totalCost} hops`;
            const pathCountMsg = result.paths.length > 1 ? ` (${result.paths.length} paths found)` : '';
            toast.success(`Attack Path Found! Cost: ${costLabel}${pathCountMsg}`);

        } catch (error) {
            console.error(error);
            toast.error("An error occurred during simulation.");
        } finally {
            isSimulating.value = false;
        }
    }, 100);
};

const startTTCHandler = () => {
    console.log("Starting TTC Analysis...");
    runSimulation('ttc');
};

const startEdgeHandler = () => {
    console.log("Starting Edge Path Analysis...");
    runSimulation('edge');
};

// --- 1. Entry 설정 핸들러 ---
const setEntryHandler = () => {
  if (!cellRef.value) return;

  const selectedNode = cellRef.value;
  const currentData = selectedNode.getData() || {};
  const newIsEntry = !currentData.isEntry;

  const model = selectedNode.model;
  if (!model) return;

  // 그래프의 모든 노드를 순회하며 상태 동기화
  const allNodes = model.getNodes();

  allNodes.forEach(node => {
    const data = node.getData() || {};
    const isSelected = node.id === selectedNode.id;

    let nextIsEntry = data.isEntry;
    let nextIsTarget = data.isTarget;
    let isModified = false;

    if (isSelected) {
      // 1. 선택된 노드 처리
      nextIsEntry = newIsEntry;
      if (newIsEntry) {
        nextIsTarget = false; // Entry가 되면 Target은 해제
      }
      isModified = true; // 선택된 노드는 무조건 업데이트 (스타일 갱신 등을 위해)
    } else {
      // 2. 다른 노드 처리
      // Entry를 새로 설정하는 경우, 다른 노드의 Entry 속성을 해제
      if (newIsEntry && nextIsEntry) {
        nextIsEntry = false;
        isModified = true;
      }
    }

    // 데이터가 변경되었거나, 선택된 노드인 경우 업데이트 수행
    if (isModified || nextIsEntry !== data.isEntry || nextIsTarget !== data.isTarget) {
      node.setData({ isEntry: nextIsEntry, isTarget: nextIsTarget }, { merge: true, skipSelection: true });
      dataChanged.updateStyleAttrs(node);
    }
  });

  // [3] Store 업데이트
  if (newIsEntry) {
    tmStore.entryNode = selectedNode.id;
    // Target이었다가 Entry가 된 경우 Store의 targetNode 해제
    if (tmStore.targetNode === selectedNode.id) tmStore.targetNode = null;
  } else {
    if (tmStore.entryNode === selectedNode.id) tmStore.entryNode = null;
  }
  tmStore.setModified();
};

// --- 2. Target 설정 핸들러 ---
const setTargetHandler = () => {
  if (!cellRef.value) return;

  const selectedNode = cellRef.value;
  const currentData = selectedNode.getData() || {};
  const newIsTarget = !currentData.isTarget;

  const model = selectedNode.model;
  if (!model) return;

  // 그래프의 모든 노드를 순회하며 상태 동기화
  const allNodes = model.getNodes();

  allNodes.forEach(node => {
    const data = node.getData() || {};
    const isSelected = node.id === selectedNode.id;

    let nextIsEntry = data.isEntry;
    let nextIsTarget = data.isTarget;
    let isModified = false;

    if (isSelected) {
      // 1. 선택된 노드 처리
      nextIsTarget = newIsTarget;
      if (newIsTarget) {
        nextIsEntry = false; // Target이 되면 Entry는 해제
      }
      isModified = true; // 선택된 노드는 무조건 업데이트
    } else {
      // 2. 다른 노드 처리
      // Target을 새로 설정하는 경우, 다른 노드의 Target 속성을 해제
      if (newIsTarget && nextIsTarget) {
        nextIsTarget = false;
        isModified = true;
      }
    }

    // 데이터가 변경되었거나, 선택된 노드인 경우 업데이트 수행
    if (isModified || nextIsEntry !== data.isEntry || nextIsTarget !== data.isTarget) {
      node.setData({ isEntry: nextIsEntry, isTarget: nextIsTarget }, { merge: true, skipSelection: true });
      dataChanged.updateStyleAttrs(node);
    }
  });

  // [3] Store 업데이트
  if (newIsTarget) {
    tmStore.targetNode = selectedNode.id;
    if (tmStore.entryNode === selectedNode.id) tmStore.entryNode = null;
  } else {
    if (tmStore.targetNode === selectedNode.id) tmStore.targetNode = null;
  }
  tmStore.setModified();
};

const resetHandler = () => {
  // [1] Graph 접근: 주입된 graph 객체 우선 사용
  let model = null;
  if (graph && graph.value) {
      model = graph.value;
  } else if (cellRef.value && cellRef.value.model) {
      model = cellRef.value.model;
  }

  if (!model) {
      // 모델 접근 불가 시 스토어 데이터만이라도 안전하게 초기화
      if (tmStore.entryNode || tmStore.targetNode) {
          tmStore.entryNode = null;
          tmStore.targetNode = null;
          tmStore.setModified();
      }
      return;
  }

  // [2] 전체 노드 순회하며 Entry/Target/AttackPath 속성 제거
  // Clear Attack Path manually here as well
  clearAttackPath(model);

  const allNodes = model.getNodes();
  
  allNodes.forEach(node => {
    const data = node.getData() || {};
    if (data.isEntry || data.isTarget) {
      // skipSelection: true로 선택 이벤트 발생 방지 및 데이터 보호
      node.setData({ isEntry: false, isTarget: false }, { merge: true, skipSelection: true });
      dataChanged.updateStyleAttrs(node);
    }
  });

  // [3] Store 초기화
  tmStore.entryNode = null;
  tmStore.targetNode = null;
  tmStore.setModified();
};
</script>

<style scoped>
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