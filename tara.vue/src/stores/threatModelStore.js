import { defineStore } from 'pinia';
import saveService from '@/service/save.js';

const VERSION = '1.0.0';

export const useThreatModelStore = defineStore('threatmodel', {
    state: () => ({
        data: {
            version: VERSION,
            modelInfo: {
                title: '',
                owner: '',
                template: '',
                organization: '',
                description: ''
            },
            diagrams: {}, // original Diagram
            threatCounter: 0
        }, // 현재 모델 데이터
        fileName: '', // 파일명
        stash: '', // 되돌리기용 백업
        modified: false, // 변경 여부
        modifiedDiagram: {}, // 수정된 다이어그램 (원본 다이어그램 복사)
        entryNode: '',
        targetNode: '',
        simulationResult: null // 공격 시뮬레이션 결과 저장 { paths, totalCost, weightType }
    }),

    getters: {
        modelChanged: (state) => state.modified
    },

    actions: {
        increaseThreatCounter() {
            this.data.threatCounter++;
        },
        _stashThreatModel(threatModel) {
            this.data = threatModel;
            this.stash = JSON.stringify(threatModel);
        },

        stashState() {
            this.stash = JSON.stringify(this.data);
        },

        clear() {
            console.debug('Threatmodel cleared');
            this.data = {
                version: VERSION,
                modelInfo: {
                    title: '',
                    owner: '',
                    template: '',
                    organization: '',
                    description: ''
                },
                diagrams: {}
            };
            this.fileName = '';
            this.stash = '';
            this.modified = false;
            this.modifiedDiagram = {};
            this.simulationResult = null;
        },

        async save() {  // 전체 모델 저장
            console.log('[ThreatModelStore] Saving threat model locally');
            const targetFileName = this.data.modelInfo?.title || this.fileName;
            this.data.diagrams = this.modifiedDiagram
            const success = await saveService.local(this.data, targetFileName);
            if (success) {
                this.fileName = targetFileName;
                this.stashState();
                this.modified = false;
                return true;
            } else {
                return false;
            }
        },

        setFileName(fileName) {
            this.fileName = fileName;
        },

        // --- 다이어그램 관련 ---
        selectDiagram(diagram) {
            this.modifiedDiagram = diagram;
        },

        modifyDiagram(diagram) {
            this.modifiedDiagram = diagram;
            this.modified = true;
        },

        setModified() {
            this.modified = true;
        },

        updateCellDataInDiagram(cellId, newData) {
            if (!this.modifiedDiagram.cells) return;

            // JSON 구조 내에서 해당 ID를 가진 셀 찾기
            const targetCell = this.modifiedDiagram.cells.find(c => c.id === cellId);

            if (targetCell) {
                // 데이터를 복사하여 업데이트 (Reactivity 보장 및 참조 끊기 방지)
                targetCell.data = JSON.parse(JSON.stringify(newData));
                this.modified = true;
                console.debug(`[ThreatModelStore] Cell(${cellId}) data synced to modifiedDiagram.`);
            }
        },
    },
    persist: {
        storage: localStorage,
        paths: ['data', 'fileName']
    },
});