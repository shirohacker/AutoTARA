import { defineStore } from 'pinia';
import saveService from '@/service/save.js';

const VERSION = '1.0.0';

export const useThreatModelStore = defineStore('threatmodel', {
    state: () => ({
        data: {
            version : VERSION,
            modelInfo : {
                title: '',
                owner: '',
                template: '',
                organization: '',
                description: ''
            },
            diagrams: { }, // original Diagram
            threatCounter: 0
        }, // 현재 모델 데이터
        fileName: '', // 파일명
        stash: '', // 되돌리기용 백업
        modified: false, // 변경 여부
        modifiedDiagram: { }, // 수정된 다이어그램 (원본 다이어그램 복사)
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
                version : VERSION,
                modelInfo : {
                    title: '',
                    owner: '',
                    template: '',
                    organization: '',
                    description: ''
                },
                diagrams: { }
            };
            this.fileName = '';
            this.stash = '';
            this.modified = false;
            this.modifiedDiagram = {};
        },

        loadFromFile(fileData) {
            this.clear();
            this._stashThreatModel(fileData);
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

        // --- 복구 (Undo) ---
        restore() {
            if (!this.stash) return;
            console.debug('Restoring threat model from stash');
            const originalModel = JSON.parse(this.stash);
            this._stashThreatModel(originalModel);
            this.modified = false;
        },

        // --- 데이터 수정 관련 ---
        update(updatePayload) {
            if (updatePayload.version) this.data.version = updatePayload.version;
            if (updatePayload.fileName) this.fileName = updatePayload.fileName;
        },

        setFileName(fileName) {
            this.fileName = fileName;
        },

        updateContributors(contributors) {
            if (!this.data.detail) this.data.detail = {};
            this.data.detail.contributors = contributors.map(name => ({ name }));
            this.modified = true;
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

        applyDiagram() {
            if (Object.keys(this.modifiedDiagram).length === 0) return;

            const diagrams = this.data.detail?.diagrams || [];
            const idx = diagrams.findIndex(x => x.id === this.modifiedDiagram.id);

            if (idx !== -1) {
                this.data.detail.diagrams[idx] = this.modifiedDiagram;
            }
        },

        saveDiagram(diagram) {
            if (!this.data.detail) this.data.detail = {};
            if (!this.data.detail.diagrams) this.data.detail.diagrams = [];

            const idx = this.data.detail.diagrams.findIndex(x => x.id === diagram.id);
            if (idx !== -1) {
                this.data.detail.diagrams[idx] = diagram;
            } else {
                // 새 다이어그램인 경우 추가
                this.data.detail.diagrams.push(diagram);
            }

            this.data.diagram = diagram;
            this.data.version = diagram.version;

            // 다이어그램 저장은 모델 전체 변경으로 간주
            this.stashState();
            this.modified = true;
        },

        closeDiagram() {
            this.modifiedDiagram = {};
            // 다이어그램 닫을 때 저장하지 않은 변경사항 처리 로직 필요 시 추가
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
        storage : localStorage,
        paths : ['data', 'fileName']
    },
});