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
          <button class="dropdown-item" @click="startMalsimHandler" :disabled="!canRunMalsim">
            <i class="fa-solid fa-play me-2"></i>Run malsim
            <span v-if="!tmStore.malModel || !tmStore.malLangspec" class="text-muted small ms-2">(Upload MAL first)</span>
            <span v-else-if="!tmStore.entryThreat || !tmStore.targetThreat" class="text-muted small ms-2">(Set Entry and Target)</span>
          </button>
        </li>
        <li><hr class="dropdown-divider"></li>
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
  
  <!-- Threat Select Modal -->
  <ThreatSelectModal
    :show="showThreatModal"
    :mode="threatModalMode"
    :nodeId="threatModalNodeId"
    :nodeName="threatModalNodeName"
    :nodeType="threatModalNodeType"
    :threats="threatModalThreats"
    @confirm="onThreatSelected"
    @cancel="closeThreatModal"
  />
</template>

<script setup>
import { useCellStore } from '@/stores/cellStore.js';
import { useThreatModelStore } from "@/stores/threatModelStore.js";
import { storeToRefs } from "pinia";
import dataChanged from '@/service/x6/graph/data-changed.js';
import { ref, computed, onMounted, onUnmounted, inject, toRaw } from 'vue';
import { Dropdown } from 'bootstrap';
import { useToast } from "vue-toastification";
import ThreatSelectModal from './ThreatSelectModal.vue';
import { runSimulation as runMalsimApi } from '@/service/mal/malApiService.js';

const cellStore = useCellStore();
const tmStore = useThreatModelStore();
const { isSimulating } = storeToRefs(tmStore);
const { ref: cellRef } = storeToRefs(cellStore);
const toast = useToast();
const graph = inject('graph');

// --- Threat Modal State ---
const showThreatModal = ref(false);
const threatModalMode = ref('entry'); // 'entry' or 'target'
const threatModalNodeId = ref('');
const threatModalNodeName = ref('');
const threatModalNodeType = ref('');
const threatModalThreats = ref([]);

// malsim 실행 가능 여부
const canRunMalsim = computed(() => {
  return tmStore.malModel && tmStore.malLangspec && tmStore.entryThreat && tmStore.targetThreat;
});

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
            // malsim 결과 초기화
            tmStore.malsimResult = null;
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
    if (dropdown) dropdown.hide(); // 드롭다운 닫기
    console.log("Starting TTC Analysis...");
    runSimulation('ttc');
};

const startEdgeHandler = () => {
    if (dropdown) dropdown.hide(); // 드롭다운 닫기
    console.log("Starting Edge Path Analysis...");
    runSimulation('edge');
};

// --- malsim 시뮬레이션 핸들러 ---
const startMalsimHandler = async () => {
    if (dropdown) dropdown.hide(); // 드롭다운 닫기
    
    if (!canRunMalsim.value) {
        if (!tmStore.malModel || !tmStore.malLangspec) {
            toast.error('Please upload MAL model first');
        } else if (!tmStore.entryThreat) {
            toast.error('Please select Entry threat');
        } else if (!tmStore.targetThreat) {
            toast.error('Please select Target threat');
        }
        return;
    }
    
    isSimulating.value = true;
    
    // 이전 결과 초기화
    tmStore.simulationResult = null;
    let sessionId = null;
    
    try {
        // Entry/Target 형식: "AssetName:attackStep"
        const entryPoint = `${tmStore.entryThreat.nodeName}:${tmStore.entryThreat.technique}`;
        const goal = `${tmStore.targetThreat.nodeName}:${tmStore.targetThreat.technique}`;
        
        console.log(`[malsim] Running simulation: ${entryPoint} -> ${goal}`);
        
        // 1. 시뮬레이션 시작 (sessionId 받기)
        // 원본 파일(.mar, .json)을 전송해야 함
        if (!tmStore.malMarFile || !tmStore.malModelFile) {
             throw new Error("Missing original MAL files. Please re-upload the MAL model.");
        }

        const startResult = await runMalsimApi(
            entryPoint,
            goal,
            tmStore.malMarFile,
            tmStore.malModelFile,
            {
                seed: 42,
                ttcMode: 0
            }
        );
        
        sessionId = startResult.sessionId;
        console.log(`[malsim] Simulation started. Session ID: ${sessionId}`);
        // toast.info(`Simulation started. Waiting for completion...`);
        
        // 2. 폴링으로 상태 확인
        const maxWaitTime = 60000; // 최대 60초
        const pollInterval = 3000; // 3초마다 확인
        const startTime = Date.now();
        
        let status = 'pending';
        
        while (status === 'pending' || status === 'running') {
            // 타임아웃 확인
            if (Date.now() - startTime > maxWaitTime) {
                throw new Error('Simulation timeout. Please check the Python server logs.');
            }
            
            // 3초 대기
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            
            // 상태 조회
            const statusData = await import('@/service/mal/malApiService.js')
                .then(module => module.getSimulationStatus(sessionId));
            
            status = statusData.status;
            console.log(`[malsim] Status: ${status}`);
            
            if (status === 'failed') {
                throw new Error('Simulation failed on the server');
            }
        }
        
        // 3. 완료 후 결과 조회
        if (status === 'completed') {
            const resultData = await import('@/service/mal/malApiService.js')
                .then(module => module.getSimulationResult(sessionId));
            
            console.log('[malsim] Result:', resultData);
            
            // 결과 객체 구조:
            // {
            //   session_id: string,
            //   status: "completed",
            //   result: {
            //     attack_path_found: boolean,
            //     attack_paths: {
            //       "Attacker": {
            //         "GoalNode:attackStep": [
            //           { id, name, full_name, type },
            //           ...
            //         ]
            //       }
            //     }
            //   }
            // }
            
            const result = resultData.result || {};
            const attackPathFound = result.attack_path_found || false;
            const attackPaths = result.attack_paths || {};
            
            if (!attackPathFound) {
                toast.warning('No attack path found. The goal might not be reachable from the entry point.');
                return;
            }
            
            // 공격 경로를 store에 저장
            tmStore.malsimResult = {
                sessionId,
                attackPathFound,
                attackPaths,
                rawResult: resultData
            };
            
            // 공격 경로 시각화
            visualizeMalsimResult(attackPaths);
            
            // 공격 경로 개수 계산
            let totalPaths = 0;
            let maxSteps = 0;
            
            Object.values(attackPaths).forEach(agentPaths => {
                Object.values(agentPaths).forEach(goalPaths => {
                    const paths = (goalPaths.length > 0 && Array.isArray(goalPaths[0])) ? goalPaths : [goalPaths];
                    paths.forEach(path => {
                        totalPaths++;
                        maxSteps = Math.max(maxSteps, path.length);
                    });
                });
            });
            
            toast.success(`Attack path found! ${totalPaths} path(s), max ${maxSteps} steps.`);
        }
        
    } catch (error) {
        console.error('[malsim] Error:', error);
        toast.error(error.message || 'Failed to run malsim simulation');
    } finally {
        isSimulating.value = false;
    }
};

// malsim 결과 시각화
const visualizeMalsimResult = (attackPaths) => {
    let model = null;
    if (graph && graph.value) {
        model = toRaw(graph.value);
    } else if (cellRef.value && cellRef.value.model) {
        model = cellRef.value.model;
    }
    
    if (!model) return;
    
    // 이전 공격 경로 초기화
    clearAttackPath(model);
    
    // 공격 경로에 포함된 자산 이름 추출
    // attackPaths 구조: { "Attacker": { "Goal:step": [{ full_name: "Asset:step", ... }] } }
    const attackedAssets = new Set();
    
    Object.values(attackPaths).forEach(agentPaths => {
        Object.values(agentPaths).forEach(goalPaths => {
            const paths = (goalPaths.length > 0 && Array.isArray(goalPaths[0])) ? goalPaths : [goalPaths];
            paths.forEach(pathNodes => {
                pathNodes.forEach(node => {
                    // full_name: "AssetName:attackStep" 형식
                    // 자산 이름만 추출 (콜론 앞부분)
                    if (node && node.full_name) {
                        const assetName = node.full_name.split(':')[0];
                        attackedAssets.add(assetName);
                    }
                });
            });
        });
    });
    
    console.log('[malsim] Attacked assets:', Array.from(attackedAssets));
    
    // 모든 노드 순회하며 공격 경로에 포함된 노드 하이라이트
    const nodes = model.getNodes();
    nodes.forEach(node => {
        const data = node.getData() || {};
        const nodeName = data.name;
        
        if (attackedAssets.has(nodeName)) {
            node.setData({ isAttackPath: true }, { merge: true, skipSelection: true });
            dataChanged.updateStyleAttrs(node);
        }
    });

    // 엣지 하이라이트: 공격 경로 상의 인접한 자산 사이의 엣지를 찾음
    const edges = model.getEdges();
    
    Object.values(attackPaths).forEach(agentPaths => {
        Object.values(agentPaths).forEach(goalPaths => {
            const paths = (goalPaths.length > 0 && Array.isArray(goalPaths[0])) ? goalPaths : [goalPaths];
            paths.forEach(pathNodes => {
                for (let i = 0; i < pathNodes.length - 1; i++) {
                    if (!pathNodes[i] || !pathNodes[i].full_name || !pathNodes[i+1] || !pathNodes[i+1].full_name) continue;
                    
                    const currentAsset = pathNodes[i].full_name.split(':')[0];
                    const nextAsset = pathNodes[i+1].full_name.split(':')[0];
                    
                    if (currentAsset === nextAsset) continue; // 같은 자산 내 이동은 엣지 하이라이트 스킵
                    
                    // 그래프에서 두 자산 이름에 해당하는 노드 ID 찾기
                    const currentNode = nodes.find(n => n.getData()?.name === currentAsset);
                    const nextNode = nodes.find(n => n.getData()?.name === nextAsset);
                    
                    if (currentNode && nextNode) {
                        const currentId = currentNode.id;
                        const nextId = nextNode.id;
                        
                        // 두 노드 사이의 엣지 찾기 (방향 무관하게 연결된 엣지 하이라이트)
                        const connectedEdges = edges.filter(edge => {
                            const source = edge.getSourceCellId();
                            const target = edge.getTargetCellId();
                            return (source === currentId && target === nextId) || 
                                   (source === nextId && target === currentId);
                        });
                        
                        connectedEdges.forEach(edge => {
                            const data = edge.getData() || {};
                            if (!data.isAttackPath) {
                                edge.setData({ isAttackPath: true }, { merge: true, skipSelection: true });
                                dataChanged.updateStyleAttrs(edge);
                            }
                        });
                    }
                }
            });
        });
    });
};

// --- Threat Modal 함수들 ---
const openThreatModal = (mode, node) => {
    const data = node.getData() || {};
    
    threatModalMode.value = mode;
    threatModalNodeId.value = node.id;
    threatModalNodeName.value = data.name || node.id;
    threatModalNodeType.value = data.malInfo?.assetType || data.type || 'Unknown';
    threatModalThreats.value = (data.threats || []).filter(t => t.status === 'open');
    
    if (threatModalThreats.value.length === 0) {
        toast.warning("This node has no open threats");
        return;
    }
    
    showThreatModal.value = true;
};

const closeThreatModal = () => {
    showThreatModal.value = false;
};

const onThreatSelected = (selection) => {
    // selection: { nodeId, nodeName, threatId, technique, ttc }
    const mode = threatModalMode.value;
    
    if (mode === 'entry') {
        tmStore.entryThreat = selection;
        tmStore.entryNode = selection.nodeId;
        // Target과 같은 노드면 Target 해제
        if (tmStore.targetNode === selection.nodeId) {
            tmStore.targetNode = null;
            tmStore.targetThreat = null;
        }
    } else {
        tmStore.targetThreat = selection;
        tmStore.targetNode = selection.nodeId;
        // Entry와 같은 노드면 Entry 해제
        if (tmStore.entryNode === selection.nodeId) {
            tmStore.entryNode = null;
            tmStore.entryThreat = null;
        }
    }
    
    // 노드 스타일 업데이트
    updateNodeStyles(selection.nodeId, mode);
    
    closeThreatModal();
    toast.success(`${mode === 'entry' ? 'Entry' : 'Target'} set: ${selection.nodeName}:${selection.technique}`);
    tmStore.setModified();
};

// 노드 스타일 업데이트 (Entry/Target 표시)
const updateNodeStyles = (nodeId, mode) => {
    let model = null;
    if (graph && graph.value) {
        model = toRaw(graph.value);
    } else if (cellRef.value && cellRef.value.model) {
        model = cellRef.value.model;
    }
    
    if (!model) return;
    
    const nodes = model.getNodes();
    nodes.forEach(node => {
        const data = node.getData() || {};
        const isSelectedNode = node.id === nodeId;
        
        let nextIsEntry = data.isEntry || false;
        let nextIsTarget = data.isTarget || false;
        
        if (isSelectedNode) {
            if (mode === 'entry') {
                nextIsEntry = true;
                nextIsTarget = false;
            } else {
                nextIsTarget = true;
                nextIsEntry = false;
            }
        } else {
            // 다른 노드에서 같은 역할 해제
            if (mode === 'entry' && data.isEntry) {
                nextIsEntry = false;
            }
            if (mode === 'target' && data.isTarget) {
                nextIsTarget = false;
            }
        }
        
        if (nextIsEntry !== data.isEntry || nextIsTarget !== data.isTarget) {
            node.setData({ isEntry: nextIsEntry, isTarget: nextIsTarget }, { merge: true, skipSelection: true });
            dataChanged.updateStyleAttrs(node);
        }
    });
};

// --- 1. Entry 설정 핸들러 ---
const setEntryHandler = () => {
  if (!cellRef.value) return;

  const selectedNode = cellRef.value;
  const currentData = selectedNode.getData() || {};
  
  // malsim용: 위협이 있으면 모달 열기
  const threats = (currentData.threats || []).filter(t => t.status === 'open');
  if (threats.length > 0 && tmStore.malModel) {
    openThreatModal('entry', selectedNode);
    return;
  }
  
  // 기존 Entry 설정 로직 (malsim 없을 때)
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
  
  // malsim용: 위협이 있으면 모달 열기
  const threats = (currentData.threats || []).filter(t => t.status === 'open');
  if (threats.length > 0 && tmStore.malModel) {
    openThreatModal('target', selectedNode);
    return;
  }
  
  // 기존 Target 설정 로직 (malsim 없을 때)
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