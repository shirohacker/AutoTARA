const db = require('../config/db');

const getMitreTechniques = async () => {
    const query = `select id, name from mitre.techniques`
    const { rows } = await db.query(query);
    return rows;
}

const getMitreCountermeasures = async () => {
    const query = `select id, name, description_en from mitre.mitigations`
    const { rows } = await db.query(query);
    return rows;
}

const getMitreTechniqueById = async (id) => {
    const query = `
        SELECT
        -- [Technique 테이블]
        t.id,
        t.name,
        t.description_en AS description,
        
        -- [TTP Scoring 테이블] (created, modified 제외)
        json_build_array(
                json_build_object('key', 'proximity',          'value', COALESCE(ts."Proximity", 0),          'weight', 0.1),
                json_build_object('key', 'locality',           'value', COALESCE(ts."Locality", 0),           'weight', 0.1),
                json_build_object('key', 'restorationCosts',   'value', COALESCE(ts."Restoration Costs", 0),  'weight', 0.1),
                json_build_object('key', 'Impact_C',           'value', COALESCE(ts."Impact_C", 0),           'weight', 0.1),
                json_build_object('key', 'Impact_I',           'value', COALESCE(ts."Impact_I", 0),           'weight', 0.1),
                json_build_object('key', 'Impact_A',           'value', COALESCE(ts."Impact_A", 0),           'weight', 0.1),
                json_build_object('key', 'Prior Use',          'value', COALESCE(ts."Prior Use", 0),          'weight', 0.1),
                json_build_object('key', 'Required Skills',    'value', COALESCE(ts."Required Skills", 0),    'weight', 0.1),
                json_build_object('key', 'Required Resources', 'value', COALESCE(ts."Required Resources", 0), 'weight', 0.1),
                json_build_object('key', 'Stealth',            'value', COALESCE(ts."Stealth", 0),            'weight', 0.1),
                json_build_object('key', 'Attribution',        'value', COALESCE(ts."Attribution", 0),        'weight', 0.1)
        ) AS ttp_scoring
    
    FROM
        mitre.techniques t
    LEFT JOIN
        mitre.ttp_scoring ts ON t.id = ts.technique_id
    WHERE
        t.id ILIKE $1;
    `
    const { rows } = await db.query(query, [id]);
    return rows[0];
}

const searchMitreThreatsByStencil = async (stencilId) => {
    const query = `
        SELECT
            t.id,
            t.name,
            t.description_en AS description,
            json_build_array(
                    json_build_object('key', 'proximity',          'value', COALESCE(ts."Proximity", 0),          'weight', 0.1),
                    json_build_object('key', 'locality',           'value', COALESCE(ts."Locality", 0),           'weight', 0.1),
                    json_build_object('key', 'restorationCosts',   'value', COALESCE(ts."Restoration Costs", 0),  'weight', 0.1),
                    json_build_object('key', 'Impact_C',           'value', COALESCE(ts."Impact_C", 0),           'weight', 0.1),
                    json_build_object('key', 'Impact_I',           'value', COALESCE(ts."Impact_I", 0),           'weight', 0.1),
                    json_build_object('key', 'Impact_A',           'value', COALESCE(ts."Impact_A", 0),           'weight', 0.1),
                    json_build_object('key', 'Prior Use',          'value', COALESCE(ts."Prior Use", 0),          'weight', 0.1),
                    json_build_object('key', 'Required Skills',    'value', COALESCE(ts."Required Skills", 0),    'weight', 0.1),
                    json_build_object('key', 'Required Resources', 'value', COALESCE(ts."Required Resources", 0), 'weight', 0.1),
                    json_build_object('key', 'Stealth',            'value', COALESCE(ts."Stealth", 0),            'weight', 0.1),
                    json_build_object('key', 'Attribution',        'value', COALESCE(ts."Attribution", 0),        'weight', 0.1)
            ) AS ttp_scoring
        FROM
            mitre.dfds d
                JOIN
            mitre.dfd_technique dt ON d.id = dt.dfd_id
                JOIN
            mitre.techniques t ON dt.technique_id = t.id
                LEFT JOIN
            mitre.ttp_scoring ts ON t.id = ts.technique_id
        WHERE
            d.name ILIKE $1;
    `;
    const { rows } = await db.query(query, [stencilId]);
    return rows;
}

const getMitigationsByTechniqueId = async (techniqueId) => {
    const query = `
        SELECT
            mt.mitigation_id AS id,
            m.name,
            mt.m_description_en AS description
        FROM
            mitre.mitigation_technique mt
                JOIN
            mitre.mitigations m ON mt.mitigation_id = m.id
        WHERE
            mt.technique_id = $1
    `;

    const { rows } = await db.query(query, [techniqueId]);
    return rows;
};

const getTtpScoringReasonByTechniqueId = async (techniqueId) => {
    const query = `
        SELECT 
            reason_proximity AS "proximity",
            reason_locality AS "locality",
            reason_restoration_costs AS "restorationCosts",
            reason_impact_c AS "Impact_C",
            reason_impact_i AS "impact_I",
            reason_impact_a AS "impact_A",
            reason_prior_use AS "Prior Use",
            reason_required_skills AS "Required Skills",
            reason_required_resources AS "Required Resources",
            reason_stealth AS "Stealth",
            reason_attribution AS "Attribution"
        FROM 
            mitre.ttp_scoring_reason
        WHERE 
            technique_id = $1
    `;

    const { rows } = await db.query(query, [techniqueId]);

    // 결과가 있으면 첫 번째 객체 반환, 없으면 null
    return rows.length > 0 ? rows[0] : null;
};

module.exports = {
    getMitreTechniques,
    getMitreCountermeasures,
    getMitreTechniqueById,
    searchMitreThreatsByStencil,
    getMitigationsByTechniqueId,
    getTtpScoringReasonByTechniqueId
};