const db = require('../config/db');

const getMitreTechniques = async () => {
    const query = `select id, name from mitre.techniques`
    const { rows } = await db.query(query);
    return rows;
}

const getMitreCountermeasures = async () => {
    const query = `select id, name, description from mitre.mitigations`
    const { rows } = await db.query(query);
    return rows;
}

const getTechniqueMappingByAttackStep = async ({ assetType, stepName }) => {
    const query = `
        WITH RECURSIVE asset_lineage AS (
            SELECT
                $1::TEXT AS asset,
                0 AS depth

            UNION

            SELECT DISTINCT
                dt.parent AS asset,
                al.depth + 1 AS depth
            FROM
                asset_lineage al
                JOIN mitre.dfd_techniques dt
                    ON dt.asset = al.asset
            WHERE
                NULLIF(dt.parent, '') IS NOT NULL
                AND dt.parent <> al.asset
                AND al.depth < 10
        )
        SELECT
            dt.id,
            dt.category,
            dt.asset,
            dt.parent,
            dt.step_name,
            dt.inferred_tactic_id,
            dt.inferred_tactic,
            dt.technique_id,
            dt.technique_name,
            dt.technique_tactics,
            al.depth AS inheritance_depth
        FROM
            asset_lineage al
            JOIN mitre.dfd_techniques dt
                ON dt.asset = al.asset
        WHERE
            dt.step_name = $2
        ORDER BY
            al.depth ASC,
            dt.id ASC,
            dt.technique_id ASC
    `;
    const { rows } = await db.query(query, [assetType, stepName]);
    return rows;
}

const getMitreTechniqueById = async (id) => {
    const query = `
        SELECT
        -- [Technique 테이블]
        t.id,
        t.name,
        t.description,
        
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
            t.description,
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
            mt.m_description AS description
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
    getTechniqueMappingByAttackStep,
    getMitreTechniqueById,
    searchMitreThreatsByStencil,
    getMitigationsByTechniqueId,
    getTtpScoringReasonByTechniqueId
};
