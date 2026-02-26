import { defineStore } from 'pinia';
import {
    analyzeThreat,
    getAllAssessments,
    updateAssessment as apiUpdateAssessment,
    deleteAssessment as apiDeleteAssessment
} from '@/service/tara/taraAssessmentService.js';

// LLM 응답 더미 데이터
const DUMMY_ASSESSMENTS = [
    {
        id: 1,
        session_id: 'dummy-session-001',
        entry_asset: 'HighSpeedCAN:physicalAccess',
        target_asset_type: 'SensorOrActuator',
        target_asset: 'ThrottleActuator:manipulate',
        cia_attribute: 'Integrity',
        damage_scenario: 'Unintended acceleration or sudden loss of propulsion during driving, leading to a high-speed vehicle collision and potential life-threatening injuries to occupants and road users.',
        impact_category: 'Safety',
        threat_scenario: 'Malicious firmware modification of the Engine ECU allows an attacker to manipulate the throttle actuator control signals, leading to a loss of integrity in engine power management.',
        attack_path: [
            { step: 1, assetName: 'HighSpeedCAN', attackStep: 'physicalAccess', description: 'Attacker gains physical access to the High-Speed CAN bus to interact with the vehicle network.' },
            { step: 2, assetName: 'HighSpeedCAN', attackStep: 'networkAccess', description: 'Attacker achieves network layer access, enabling the transmission of arbitrary messages and eavesdropping on network traffic.' },
            { step: 3, assetName: 'EngineECU', attackStep: 'communicate', description: 'Attacker communicates with the Engine ECU and attempts to change its operation mode to diagnostics or bootmode.' },
            { step: 4, assetName: 'EngineECU', attackStep: 'bypassSecureBoot', description: 'Attacker bypasses or cracks the Secure Boot mechanism to allow unauthorized firmware modifications.' },
            { step: 5, assetName: 'EngineECU', attackStep: 'maliciousFirmware', description: 'Attacker uploads malicious forged firmware to the Engine ECU, gaining persistent and full control over the ECU\'s functions.' },
            { step: 6, assetName: 'ThrottleActuator', attackStep: 'manipulate', description: 'Attacker uses the compromised Engine ECU to manipulate the Throttle Actuator, overriding legitimate driver input.' }
        ],
        attack_feasibility: '',
        impact_rating: '',
        risk_treatment: '',
        cal_rating: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
];

export const useTaraAssessmentStore = defineStore('taraAssessment', {
    state: () => ({
        assessments: [],
        currentAssessment: null,
        isLoading: false,
        error: null
    }),

    actions: {
        async loadAllAssessments(sessionId) {
            this.isLoading = true;
            this.error = null;
            try {
                this.assessments = await getAllAssessments(sessionId);
            } catch (err) {
                // API 연결 실패 시 더미 데이터 사용
                console.warn('[TaraAssessmentStore] API unavailable, loading dummy data:', err.message);
                this.assessments = JSON.parse(JSON.stringify(DUMMY_ASSESSMENTS));
            } finally {
                this.isLoading = false;
            }
        },

        async analyzeFromSimulation(sessionId, simulationResult) {
            this.isLoading = true;
            this.error = null;
            try {
                const newAssessments = await analyzeThreat(sessionId, simulationResult);
                this.assessments.push(...newAssessments);
                return newAssessments;
            } catch (err) {
                // API 실패 시 더미 데이터 추가
                console.warn('[TaraAssessmentStore] LLM API unavailable, using dummy data');
                const dummyCopy = JSON.parse(JSON.stringify(DUMMY_ASSESSMENTS));
                dummyCopy.forEach(d => {
                    d.id = Date.now() + Math.random();
                    d.session_id = sessionId;
                });
                this.assessments.push(...dummyCopy);
                return dummyCopy;
            } finally {
                this.isLoading = false;
            }
        },

        async updateAssessment(id, data) {
            this.error = null;
            try {
                const updated = await apiUpdateAssessment(id, data);
                const idx = this.assessments.findIndex(a => a.id === id);
                if (idx !== -1) {
                    this.assessments[idx] = updated;
                }
                return updated;
            } catch (err) {
                // API 실패 시 로컬에서 업데이트
                console.warn('[TaraAssessmentStore] API unavailable, updating locally');
                const idx = this.assessments.findIndex(a => a.id === id);
                if (idx !== -1) {
                    this.assessments[idx] = { ...this.assessments[idx], ...data, updated_at: new Date().toISOString() };
                    return this.assessments[idx];
                }
            }
        },

        async deleteAssessment(id) {
            this.error = null;
            try {
                await apiDeleteAssessment(id);
            } catch (err) {
                // API 실패 시에도 로컬에서 삭제 진행
                console.warn('[TaraAssessmentStore] API unavailable, deleting locally');
            }
            this.assessments = this.assessments.filter(a => a.id !== id);
        }
    }
});
