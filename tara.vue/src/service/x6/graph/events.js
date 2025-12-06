/**
 * @name events
 * @description Event listeners for the graph
 */
import dataChanged from './data-changed.js';
import shapes from '@/service/x6/shapes/generics/index.js';

import { useThreatModelStore } from '@/stores/threatModelStore.js';
import { useCellStore } from "@/stores/cellStore.js";

const showPorts = (show) => {
    const container = document.getElementById('graph_container');
    const ports = container.querySelectorAll('.x6-port-body');
    for (let i = 0, len = ports.length; i < len; i += 1) {
        ports[i].style.visibility = show ? 'visible' : 'hidden';
    }
};

const canvasResized = ({ width, height }) => {
    console.debug('canvas resized to width ', width, ' height ', height);
    showPorts(false);
};

const edgeChangeVertices = () => ({ edge }) => {
    if (edge.constructor.name === 'Edge') {
        console.debug('vertex for unformatted edge/flow');
    }
};

const edgeConnected = (graph) => ({ edge }) => {
    if (edge.constructor.name === 'Edge') {
        console.debug('connected unformatted edge/flow');
        const flow = shapes.Flow.fromEdge(edge);
        graph.addEdge(flow);
        edge.remove();
        edge = flow;
        edge.setName(edge.data.name);
    }
};

const mouseLeave = ({ cell }) => {
    // 지워야 할 툴 목록
    const toolsToRemove = ['boundary', 'button-remove', 'vertices', 'source-arrowhead', 'target-arrowhead'];

    toolsToRemove.forEach(tool => {
        if (cell.hasTool(tool)) {
            cell.removeTool(tool);
        }
    });

    // [중요] 여기서는 entry-marker-tool과 target-marker-tool을 지우지 않습니다.
    // 따라서 마우스가 떠나도 마커는 계속 남아있게 됩니다.

    showPorts(false);
};

const mouseEnter = ({ cell }) => {
    const tools = ['boundary', 'button-remove'];
    // both 'node-editor' and 'edge-editor' tools seem to drop the text very easily, so do not use (yet)
    if (!cell.isNode()) {
        tools.push('vertices');
        tools.push('source-arrowhead');
        tools.push('target-arrowhead');
    }
    cell.addTools(tools);

    showPorts(true);
};

const cellAdded = (graph) => ({ cell }) => {
    const cellStore = useCellStore();
    console.log('cell added with shape: ', cell.shape);
    // ensure selection of other components is removed
    graph.resetSelection();

    // Flow and trust boundary stencils need to be converted
    if (cell.convertToEdge) {
        let edge = cell;
        const position = cell.position();
        const config = {
            source: position,
            target: {
                x: position.x + 100,
                y: position.y + 100
            },
            data: cell.getData()
        };

        if (cell.type === shapes.FlowStencil.prototype.type) {
            edge = graph.addEdge(new shapes.Flow(config));
        } else if (cell.type === shapes.TrustBoundaryCurveStencil.prototype.type) {
            edge = graph.addEdge(new shapes.TrustBoundaryCurve(config));
        } else {
            console.warn('Unknown edge stencil');
        }
        cell.remove();
        cell = edge;
        cell.setName(cell.data.name);
    }

    mouseLeave({ cell });

    // boundary boxes must not overlap other diagram components
    if (cell.shape === 'trust-boundary-box') {
        cell.zIndex = -1;
    }

    cellStore.select(cell);

    dataChanged.updateProperties(cell);
    dataChanged.updateStyleAttrs(cell);
    // dataChanged.updateAssetDescription(cell)

    if (cell.shape === 'edge') {
        console.debug('added new edge (flow parent)');
    }

    // do not select new data flows or trust boundaries: it surprises the user
    if (cell.shape !== 'path'
        && cell.shape !== 'edge'
        && cell.shape !== 'flow'
        && cell.shape !== 'trust-boundary-curve') {
        graph.select(cell);
    }
};

const cellDeleted = () => {
    const tmStore = useThreatModelStore();

    console.debug('cell deleted');
    tmStore.setModified();
};

const cellSelected = (graph) => ({ cell }) => {
    console.log(cell)
    const cellStore = useCellStore();
    // try and get the cell name
    if (cell.data) {
        if (cell.data.name) {
            console.debug('Cell selected: ' + JSON.stringify(cell.data));
        } else if (cell.getLabels) {
            const labels = cell.getLabels();
            if (labels.length && labels[0].attrs.label) {
                cell.data.name = labels[0].attrs.label.text;
                console.debug('Cell selected with label: ' + cell.data.name);
            }
        } else {
            console.warn('Cell selected with no name');
        }
    } else {
        console.warn('cell selected with no data');
    }

    if (cell.shape === 'edge') {
        console.debug('selected unformatted edge/flow');
        const flow = shapes.Flow.fromEdge(cell);
        graph.addEdge(flow);
        cell.remove();
        cell = flow;
        cell.setName(cell.data.name);
    }

    cellStore.select(cell);
    dataChanged.updateProperties(cell);
    dataChanged.updateStyleAttrs(cell);
    dataChanged.setType(cell);
};

const cellUnselected = ({ cell }) => {
    const cellStore = useCellStore();
    console.debug('cell unselected');
    mouseLeave({ cell });
    cellStore.unselect();
};

const cellDataChanged = ({ cell, options }) => {
    const cellStore = useCellStore();
    const tmStore = useThreatModelStore();

    // 2. [핵심] 'skipSelection' 옵션이 있을 때는 선택을 변경하지 않습니다!
    // 이 줄이 있어야 백그라운드 업데이트 시 선택이 튀는 것을 막습니다.
    if (!options || !options.skipSelection) {
        cellStore.select(cell);
    }

    // 스타일 업데이트는 항상 수행
    dataChanged.updateStyleAttrs(cell);
    tmStore.setModified();
};

const listen = (graph) => {
    graph.on('resize', canvasResized);
    graph.on('edge:change:vertices', edgeChangeVertices(graph));
    graph.on('edge:connected', edgeConnected(graph));
    graph.on('edge:dblclick', cellSelected);
    graph.on('edge:move', cellSelected);
    graph.on('cell:mouseleave', mouseLeave);
    graph.on('cell:mouseenter', mouseEnter);
    graph.on('cell:added', cellAdded(graph));
    graph.on('cell:removed', cellDeleted);
    graph.on('cell:change:data', cellDataChanged);
    graph.on('cell:selected', cellSelected(graph));
    graph.on('cell:unselected', cellUnselected);
    graph.on('node:move', cellSelected);
};

const removeListeners = (graph) => {
    graph.off('resize', canvasResized);
    graph.off('edge:change:vertices', edgeChangeVertices(graph));
    graph.off('edge:connected', edgeConnected(graph));
    graph.off('edge:dblclick', cellSelected);
    graph.off('edge:move', cellSelected);
    graph.off('cell:mouseleave', mouseLeave);
    graph.off('cell:mouseenter', mouseEnter);
    graph.off('cell:added', cellAdded(graph));
    graph.off('cell:removed', cellDeleted);
    graph.off('cell:change:data', cellDataChanged);
    graph.off('cell:selected', cellSelected(graph));
    graph.off('cell:unselected', cellUnselected);
    graph.off('node:move', cellSelected);
};

export default {
    listen,
    removeListeners
};
