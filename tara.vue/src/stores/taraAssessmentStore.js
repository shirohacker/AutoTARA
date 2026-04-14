import { defineStore } from 'pinia';
import {
    analyzeThreat,
    getAllAssessments,
    updateAssessment as apiUpdateAssessment,
    deleteAssessment as apiDeleteAssessment
} from '@/service/tara/taraAssessmentService.js';

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
                this.error = err.message || 'Failed to load assessments';
            } finally {
                this.isLoading = false;
            }
        },

        async analyzeFromSimulation(sessionId, simulationResult) {
            this.isLoading = true;
            this.error = null;
            try {
                const newAssessments = await analyzeThreat(sessionId, simulationResult);
                this.assessments = this.assessments.filter(a => a.session_id !== sessionId);
                this.assessments.unshift(...newAssessments);
                return newAssessments;
            } catch (err) {
                this.error = err.message || 'Failed to analyze threats';
                throw err;
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
                this.error = err.message || 'Failed to update assessment';
                throw err;
            }
        },

        async deleteAssessment(id) {
            this.error = null;
            try {
                await apiDeleteAssessment(id);
            } catch (err) {
                this.error = err.message || 'Failed to delete assessment';
                throw err;
            }
            this.assessments = this.assessments.filter(a => a.id !== id);
        }
    }
});
