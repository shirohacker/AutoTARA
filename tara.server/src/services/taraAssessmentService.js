/**
 * TARA Assessment Service
 *
 * 시뮬레이션 결과를 LLM으로 분석하여 TARA 평가 항목을 생성하고,
 * 결과를 DB에 저장/조회/수정/삭제하는 서비스
 */

const axios = require('axios');
const taraAssessmentRepository = require('../repositories/taraAssessmentRepository');

/**
 * LLM API를 호출하여 시뮬레이션 결과를 분석합니다.
 * @param {Object} simulationResult - 시뮬레이션 결과 (attackPath, totalSteps 등)
 * @param {string} sessionId - 세션 ID
 * @returns {Promise<Array>} 생성된 assessment 배열
 */
async function analyzeThreatWithLLM(simulationResult, sessionId) {
    const apiUrl = process.env.LLM_API_URL || 'http://localhost:11434/v1/chat/completions';
    const model = process.env.LLM_MODEL || 'llama3';
    const apiKey = process.env.LLM_API_KEY || '';

    const attackPath = simulationResult.attackPath || simulationResult.attack_path || [];
    const entryAsset = attackPath.length > 0 ? attackPath[0].assetName : 'Unknown';
    const targetAsset = attackPath.length > 0 ? attackPath[attackPath.length - 1].assetName : 'Unknown';

    const prompt = buildAnalysisPrompt(simulationResult, entryAsset, targetAsset);

    console.log('[TaraAssessmentService] Calling LLM API...');

    try {
        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const response = await axios.post(apiUrl, {
            model,
            messages: [
                {
                    role: 'system',
                    content: `You are a cybersecurity expert specializing in TARA (Threat Assessment and Remediation Analysis) for automotive and IoT systems. Analyze attack simulation results and produce structured threat assessments. Always respond with valid JSON only.`
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' }
        }, {
            headers,
            timeout: 120000
        });

        const content = response.data.choices[0].message.content;
        const parsed = JSON.parse(content);
        const assessments = Array.isArray(parsed.assessments) ? parsed.assessments : [parsed];

        // DB에 저장
        const savedAssessments = [];
        for (const assessment of assessments) {
            const saved = await taraAssessmentRepository.createAssessment({
                session_id: sessionId,
                entry_asset: assessment.entry_asset || entryAsset,
                target_asset: assessment.target_asset || targetAsset,
                cia_attribute: assessment.cia_attribute || '',
                damage_scenario: assessment.damage_scenario || '',
                impact_category: assessment.impact_category || '',
                threat_scenario: assessment.threat_scenario || '',
                attack_path: assessment.attack_path || attackPath
            });
            savedAssessments.push(saved);
        }

        console.log(`[TaraAssessmentService] ${savedAssessments.length} assessments created`);
        return savedAssessments;

    } catch (error) {
        console.error('[TaraAssessmentService] LLM API error:', error.message);
        if (error.response) {
            console.error('[TaraAssessmentService] Response:', error.response.data);
        }
        throw new Error(`LLM analysis failed: ${error.message}`);
    }
}

/**
 * 분석 프롬프트를 생성합니다.
 */
function buildAnalysisPrompt(simulationResult, entryAsset, targetAsset) {
    const attackPath = simulationResult.attackPath || simulationResult.attack_path || [];

    const pathDescription = attackPath.map((step, idx) =>
        `  ${idx + 1}. ${step.assetName}:${step.attackStep}`
    ).join('\n');

    return `Analyze the following attack simulation result and generate TARA threat assessments.

## Simulation Result
- Entry Asset: ${entryAsset}
- Target Asset: ${targetAsset}
- Total Steps: ${simulationResult.totalSteps || attackPath.length}
- Attack Path:
${pathDescription}

## Required Output Format
Return a JSON object with an "assessments" array. Each assessment must have:
- "entry_asset": The entry point asset name
- "target_asset": The target asset name
- "cia_attribute": Which CIA triad attribute is affected ("Confidentiality", "Integrity", or "Availability")
- "damage_scenario": A description of the potential damage if this attack succeeds
- "impact_category": Category of impact ("Safety", "Financial", "Operational", "Privacy")
- "threat_scenario": A description of the threat scenario
- "attack_path": Array of attack steps (each with "step", "assetName", "attackStep")

Generate multiple assessments covering different CIA attributes and impact categories where applicable.

Respond with valid JSON only.`;
}

// CRUD 위임 함수들
async function getAllAssessments() {
    return taraAssessmentRepository.getAllAssessments();
}

async function getAssessmentsBySessionId(sessionId) {
    return taraAssessmentRepository.getAssessmentsBySessionId(sessionId);
}

async function getAssessmentById(id) {
    return taraAssessmentRepository.getAssessmentById(id);
}

async function updateAssessment(id, data) {
    return taraAssessmentRepository.updateAssessment(id, data);
}

async function deleteAssessment(id) {
    return taraAssessmentRepository.deleteAssessment(id);
}

module.exports = {
    analyzeThreatWithLLM,
    getAllAssessments,
    getAssessmentsBySessionId,
    getAssessmentById,
    updateAssessment,
    deleteAssessment
};
