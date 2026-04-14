const mitreRepository = require('../repositories/mitreRepository');

const getMitreTechniques = async () => {
    return await mitreRepository.getMitreTechniques();
};

const getMitreCountermeasures = async () => {
    const rows =  await mitreRepository.getMitreCountermeasures();
    return rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description
    }));
}

const getTechniqueMappingByAttackStep = async (assetType, stepName) => {
    return await mitreRepository.getTechniqueMappingByAttackStep({ assetType, stepName });
}

const getMitreTechniqueById = async (id) => {
    return await mitreRepository.getMitreTechniqueById(id);
}

const searchMitreThreatsByStencil = async (stencilId) => {
    return await mitreRepository.searchMitreThreatsByStencil(stencilId);
}

const getMitigationsByTechniqueId = async (techniqueId) => {
    return await mitreRepository.getMitigationsByTechniqueId(techniqueId);
}

const getTtpScoringReasonByTechniqueId = async (techniqueId) => {
    return await mitreRepository.getTtpScoringReasonByTechniqueId(techniqueId);
}

module.exports = {
    getMitreTechniques,
    getMitreCountermeasures,
    getTechniqueMappingByAttackStep,
    getMitreTechniqueById,
    searchMitreThreatsByStencil,
    getMitigationsByTechniqueId,
    getTtpScoringReasonByTechniqueId
}
