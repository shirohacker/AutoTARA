require('dotenv').config();

const express = require('express');
const cors = require('cors');
const app = express();

// 통합 라우터 불러오기
const apiRoutes = require('./src/routes/index');

// .env에서 PORT를 가져오고, 없으면 기본값 3000 사용
// 제공해주신 설정에 따르면 4000번 포트로 실행됩니다.
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API 라우트 연결
app.use('/api', apiRoutes);

// 서버 시작
app.listen(PORT, () => {
    console.log(`----------------------------------------`);
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`   http://localhost:${PORT}/api`);
    console.log(`----------------------------------------`);
});