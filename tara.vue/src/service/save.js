const local = async (data, fileName) => {
    // 확장자 보장
    const fullFileName = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
    return await downloadFile(data, fullFileName);
};

async function downloadFile(data, fileName) {
    const contentType = 'application/json';
    // 데이터 직렬화
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: contentType });

    // 1. 최신 브라우저: 저장 위치 선택 대화상자 (File System Access API)
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [{
                    description: 'TARA Threat Model File',
                    accept: { 'application/json': ['.json'] },
                }],
            });

            // 사용자가 선택한 위치에 파일 쓰기
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();

            console.debug('Saved using File System Access API');
            return true;
        } catch (err) {
            // 사용자가 저장을 취소한 경우 (AbortError)
            if (err.name === 'AbortError') {
                console.debug('User cancelled the save dialog');
                return false;
            }
            // 그 외 에러 발생 시 로그 출력 후 레거시 방식으로 넘어갈지 결정
            console.warn('File System Access API failed, falling back to legacy download:', err);
            // 에러가 났지만 다운로드는 시도하고 싶다면 아래 코드를 계속 실행하게 둠
            // 만약 API 실패 시 멈추고 싶다면 return false;
        }
    }

    // 2. 레거시 방식 (기존 코드): 브라우저 기본 다운로드 폴더로 저장
    try {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        console.debug('Save using browser legacy download (anchor tag)');

        a.href = url;
        a.download = fileName;
        a.style.display = 'none'; // 화면에 보이지 않게 처리
        document.body.appendChild(a); // Firefox 등 일부 브라우저 호환성을 위해 DOM에 추가

        a.click();

        // 메모리 해제 및 요소 제거
        setTimeout(() => { // 클릭 이벤트가 완료될 시간을 조금 줌
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }, 100);

        return true;
    } catch (e) {
        console.error('Download failed', e);
        return false;
    }
}

export default {
    local,
};