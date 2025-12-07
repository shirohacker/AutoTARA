/**
 * @name data-changed
 * @description Handles the change:data event to update the UI styles
 */

import { useThreatModelStore } from '@/stores/threatModelStore.js';
import { useCellStore } from "@/stores/cellStore.js";

import threats from '@/service/threat/index.js'
import defaultProperties from '@/service/entity/default-properties.js';

// --- 추가된 마커 업데이트 로직 ---
const updateSimulationMarkers = (cell) => {
    const data = cell.getData();
    if (!data) return;

    // 1. 현재 셀에 적용된 모든 툴 가져오기
    // (getTools()가 없을 경우를 대비해 안전하게 가져옵니다)
    const currentTools = cell.getTools();
    let items = Array.isArray(currentTools) ? currentTools : (currentTools?.items || []);

    // 2. 기존 마커들(Entry, Target)은 무조건 리스트에서 제거 (Clean Slate)
    // ID를 기준으로 필터링하여 기존 마커를 싹 지웁니다.
    items = items.filter(tool => tool.id !== 'entry-marker-tool' && tool.id !== 'target-marker-tool');

    // 3. Entry 상태라면 Entry 툴 설정 생성 및 추가
    if (data.isEntry) {
        items.push({
            id: 'entry-marker-tool',
            name: 'button',
            args: {
                markup: [
                    {
                        tagName: 'circle',
                        selector: 'button',
                        attrs: { r: 12, fill: '#4CAF50', cursor: 'pointer' }
                    },
                    {
                        tagName: 'text',
                        selector: 'icon',
                        textContent: '🚩',
                        attrs: { fill: 'white', 'font-size': 14, 'text-anchor': 'middle', 'pointer-events': 'none', y: '0.3em' }
                    }
                ],
                x: '100%', y: '0%', offset: { x: -35, y: 10 },
            }
        });
    }

    // 4. Target 상태라면 Target 툴 설정 생성 및 추가
    if (data.isTarget) {
        items.push({
            id: 'target-marker-tool',
            name: 'button',
            args: {
                markup: [
                    {
                        tagName: 'circle',
                        selector: 'button',
                        attrs: { r: 12, fill: '#FF5722', cursor: 'pointer' }
                    },
                    {
                        tagName: 'text',
                        selector: 'icon',
                        textContent: '🎯',
                        attrs: { fill: 'white', 'font-size': 14, 'text-anchor': 'middle', 'pointer-events': 'none', y: '0.3em' }
                    }
                ],
                x: '100%', y: '0%', offset: { x: -10, y: 10 },
            }
        });
    }

    // 5. [핵심] 정리된 툴 리스트를 한 번에 덮어쓰기 (setTools)
    // 이렇게 하면 타이밍 이슈 없이 정확하게 원하는 툴만 남습니다.
    cell.setTools({ items: items });
};
// ----------------------------

const styles = {
    default: {
        color: '#333333',
        sourceMarker: 'block',
        strokeDasharray: null,
        strokeWidth: 1.5,
        targetMarker: 'block'
    },
    hasOpenThreats: {
        color: 'red',
        strokeWidth: 2.5
    },
    outOfScope: {
        strokeDasharray: '4 3'
    },
    trustBoundary: {
        strokeDasharray: '7 5',
        strokeWidth: 3.0
    },
    isEntry: {
        // 스타일 객체는 비워두고 로직으로 처리합니다.
    },
    isTarget: {
        // 스타일 객체는 비워두고 로직으로 처리합니다.
    },
    analysisPathNode: {
        fill: '#FF000033', // Semi-transparent red
        stroke: '#FF0000',
        strokeWidth: 2
    },
    analysisPathEdge: {
        color: '#FF0000',
        strokeWidth: 4,
        strokeDasharray: null // Solid line
    }
};

const updateStyleAttrs = (cell) => {
    const tmStore = useThreatModelStore();
    const cellStore = useCellStore();

    const cellData = cell.getData();

    // New UI elements will not have any cell data
    if (!cellData) {
        console.log('No style update for cell');
        return;
    }

    if (cell.data) {
        cell.data.hasOpenThreats = threats.hasOpenThreats(cell.data);
        // [BugFix] 현재 선택된 셀(cellStore.ref)과 업데이트 대상 셀(cell)이 같은 경우에만 Store 업데이트
        // 그렇지 않으면 선택되지 않은 셀(A)의 스타일을 갱신하다가 선택된 셀(C)의 데이터가 A의 데이터로 덮어씌워짐
        if (cellStore.ref && cellStore.ref.id === cell.id) {
            cellStore.updateData(cell.data, 'updateStyleAttrs');
        }
        tmStore.setModified();
    }

    let { color, strokeDasharray, strokeWidth, sourceMarker } = styles.default;

    if (cellData.hasOpenThreats) {
        color = styles.hasOpenThreats.color;
        strokeWidth = styles.hasOpenThreats.strokeWidth;
    }

    if (cellData.outOfScope) {
        strokeDasharray = styles.outOfScope.strokeDasharray;
    }

    if (cellData.isAttackPath) {
        if (cell.isNode && cell.isNode()) {
            // Node Styling: Red Fill (alpha), Red Stroke
            // We need to apply these directly or via updateStyle if supported.
            // Since updateStyle usually handles stroke color/width, we might need a separate way or leverage it.
            // But standard updateStyle in this project (lines 152) applies 'color' to stroke.

            // Override local vars for stroke
            color = styles.analysisPathNode.stroke;
            strokeWidth = styles.analysisPathNode.strokeWidth;

            // Direct attribute update for Fill (since updateStyle might not cover body/fill)
            cell.setAttrByPath('body/fill', styles.analysisPathNode.fill);
        } else {
            // Edge Styling: Thick Red Solid
            color = styles.analysisPathEdge.color;
            strokeWidth = styles.analysisPathEdge.strokeWidth;
            strokeDasharray = styles.analysisPathEdge.strokeDasharray;
        }
    } else {
        // Reset Node Fill if not attack path (Optional/Safety)
        // Ideally we should revert to default fill, e.g. white or transparent.
        // Assuming default is white or defined elsewhere.
        if (cell.isNode && cell.isNode()) {
            // TrustBoundaryBox should remain transparent and preserve its stroke
            // TrustBoundaryBox should remain transparent
            if (cell.shape !== 'trust-boundary-box') {
                cell.setAttrByPath('body/fill', '#FFFFFF'); // Or original default
            }
        }
    }

    if (!cellData.isBidirectional) {
        sourceMarker = '';
    }

    // --- 여기에서 마커 업데이트 로직을 호출합니다 ---
    // cell이 노드(Node)일 경우에만 마커를 추가 (Edge/Flow에는 추가하지 않음)
    if (cell.isNode && cell.isNode()) {
        updateSimulationMarkers(cell);
    }

    if (cell.updateStyle) {
        console.log('Update cell style');
        cell.updateStyle(color, strokeDasharray, strokeWidth, sourceMarker);
    }
};

const updateName = (cell) => {
    if (!cell || !cell.setName || !cell.getData) {
        console.warn('No cell found to update name');
    } else {
        cell.setName(cell.getData().name);
    }
};

const updateProperties = async (cell) => {
    const tmStore = useThreatModelStore();
    const cellStore = useCellStore();

    if (cell) {
        if (cell.data && cell.data.description) {
            console.log('Updated properties for cell: ' + cell.getData().name);
        } else {
            if (cell.isEdge() && cell.shape !== 'trust-boundary-curve' && cell.shape !== 'trust-broundary-curve') {
                cell.type = 'tm.Flow';
                console.log('Edge cell given type: ' + cell.type);
            }
            cell.setData(defaultProperties.defaultData(cell.type)); // 기본 속성 설정
            console.log('Default properties for ' + cell.shape + ' cell: ' + cell.getData().name);
        }
        cellStore.updateData(cell.data, 'updateProperties');
        tmStore.setModified();
    } else {
        console.warn('No cell found to update properties');
    }
};

const setType = (cell) => {
    // fundamentally the shape is the only constant identifier
    switch (cell.shape) {
        case 'actor':
            cell.data.type = 'tm.Actor';
            break;
        case 'store':
            cell.data.type = 'tm.Store';
            break;
        case 'process':
            cell.data.type = 'tm.Process';
            break;
        case 'flow':
            cell.data.type = 'tm.Flow';
            break;
        case 'trust-boundary-box':
            cell.data.type = 'tm.BoundaryBox';
            break;
        case 'trust-boundary-curve':
        case 'trust-broundary-curve':
            cell.data.type = 'tm.Boundary';
            break;
        case 'td-text-block':
            cell.data.type = 'tm.Text';
            break;
        default:
            console.log('Unrecognized shape');
    }
};

export default {
    updateName,
    updateStyleAttrs,
    updateProperties,
    setType,
};