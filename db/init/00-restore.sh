#!/usr/bin/env bash
set -euo pipefail

# entrypoint가 이미 $POSTGRES_DB를 생성한 뒤 이 스크립트를 실행합니다.
# 커스텀 포맷(.dump)은 자동 실행 대상이 아니라서 직접 pg_restore 호출이 필요합니다.

echo "Restoring /backups/tara_db_20251104.dump into database: $POSTGRES_DB"

# 권한/소유자 충돌을 피하려면 --no-owner --no-privileges가 안전합니다.
# 병렬 복원을 원하면 -j $(nproc) 추가
pg_restore \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  --no-owner --no-privileges \
  --verbose \
  /backups/tara_db_20251120.dump

echo "Restore finished."