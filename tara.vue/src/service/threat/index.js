import { v4 } from 'uuid';

export const createNewThreat = (number) => {
    return {
        id: v4(),
        mitre_id: '',
        technique: 'New Threat',
        status: 'open', // open, mitigated
        description: '',
        riskScore: '3.3',  // TTP Risk Score
        new: true,
        number: number, // Sequential Threat Number
        ttc: 1, // Time-to-Compromise
        ttp_score: { },
        cve: [],
        countermeasures: []
    };
};

export const hasOpenThreats = (data) => !!data && !!data.threats &&
    data.threats.filter(x => x.status.toLowerCase() === 'open').length > 0;

export default {
    createNewThreat,
    hasOpenThreats
}