const mitreService = require('../services/mitreService');

const getMitreTechniques = async (req, res) => {
    try {
        const data = await mitreService.getMitreTechniques();
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
}

const getMitreCountermeasures = async (req, res) => {
    try {
        const data = await mitreService.getMitreCountermeasures();
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
}

const getMitreTechniqueById = async (req, res) => {
    const { id } = req.params;
    try {
        const data = await mitreService.getMitreTechniqueById(id);
        if (data) {
            res.json(data);
        } else {
            res.status(404).json({ message: 'Technique not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
}

const searchMitreThreatsByStencil = async (req, res) => {
    const { id } = req.params;
    try {
        const data = await mitreService.searchMitreThreatsByStencil(id);
        if (data) {
            res.json(data);
        } else {
            res.status(404).json({ message: 'No threats found for the given stencil ID' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
}

const getMitigationsByTechniqueId = async (req, res) => {
    const { id } = req.params;
    try {
        const data = await mitreService.getMitigationsByTechniqueId(id);
        if (data) {
            res.json(data);
        } else {
            res.status(404).json({message: 'No mitigations found for the given technique ID'});
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
}

const getTtpScoringReasonByTechniqueId = async (req, res) => {
    const { id } = req.params;
    try {
        const data = await mitreService.getTtpScoringReasonByTechniqueId(id);
        if (data) {
            res.json(data);
        } else {
            res.status(404).json({ message: 'No TTP score reasons found for the given technique ID' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
}

module.exports = {
    getMitreTechniques,
    getMitreCountermeasures,
    getMitreTechniqueById,
    searchMitreThreatsByStencil,
    getMitigationsByTechniqueId,
    getTtpScoringReasonByTechniqueId
}