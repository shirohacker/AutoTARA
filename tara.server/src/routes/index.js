const express = require('express');
const router = express.Router();

// 두 컨트롤러를 모두 불러옵니다.
const mitreController = require('../controllers/mitreController');
const taraController = require('../controllers/taraController');

router.get('/v1/mitre/techniques', mitreController.getMitreTechniques);           // 전체 조회
router.get('/v1/mitre/countermeasures', mitreController.getMitreCountermeasures);    // 전체 CM 반환
router.get('/v1/mitre/threat/:id', mitreController.searchMitreThreatsByStencil); // 위협 검색
router.get('/v1/mitre/technique/:id', mitreController.getMitreTechniqueById);// ID 상세 조회
router.get('/v1/mitre/countermeasures/:id', mitreController.getMitigationsByTechniqueId); // 완화책 조회
router.get('/v1/mitre/ttp-score-reason/:id', mitreController.getTtpScoringReasonByTechniqueId); // TTP 점수 사유 조회

router.get('/v1/asset-description/:id', taraController.getAssetDescription); // 자산 설명 조회

module.exports = router;