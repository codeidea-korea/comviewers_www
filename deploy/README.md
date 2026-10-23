# 고객 웹 배포와 ComBar 릴리스 보존

`deploy-www.sh`는 API의 환경별 배포 진입점에서 전달한 HTTPS origin과 승인된 고객 웹 SHA를 사용한다. 이 문서는 준비된 소스의 동작이며 실제 운영 배포 완료 기록이 아니다.

## 보존 절차

- 기존 `/run/lock/comviewers-deploy.lock`을 유지한다. ComBar 게시 작업도 같은 잠금을 사용해야 한다. 현재 운영 ComBar 게시 절차는 이 잠금을 사용한다.
- `--prepare`는 Git archive/Vite 빌드 후 현재 `dist/combar/releases` 전체를 후보에 복사하고, 모든 디렉터리와 파일의 상대 경로·크기·SHA-256을 배포 기록 `combar-releases.json`에 남긴다. 앱 HTML/자산은 새 빌드를 사용한다.
- 후보의 기존 ComBar 파일은 운영 파일과 내용이 같을 때만 허용한다. 같은 이름의 다른 파일, 운영에 없는 파일이나 새 버전을 Git/public에서 게시하는 것은 차단한다. 웹 배포로 ComBar 버전을 변경하지 않는다.
- `--activate`는 같은 잠금 아래 준비 시점의 파일이 운영·후보에서 보존됐는지 확인하고, prepare 이후 정상 게시된 새 버전도 후보에 추가한다. 준비 이후 삭제·변조·동명 충돌은 활성화 전에 중단한다.
- ComBar 경로의 symlink·mount·hardlink·비정규 파일·상위 경로 이탈을 거절한다. Linux mountinfo도 대조하여 같은 파일시스템의 bind mount를 차단하고, 교환 전 전체 웹 트리 및 교환 후 이전 트리 삭제 전에도 확인한다. 복사 후 전체 목록/해시를 다시 확인한다. 후보의 `root:www-data`, 디렉터리 `750`, 파일 `640` 적용은 기존 웹 배포 정책을 유지한다.
- 원자적 디렉터리 교환 전후 보존 파일을 대조한다. 기존 메인 점검 `503`/`?preview=main` 검증을 유지하고, 각 ComBar 파일은 로컬 TLS와 공개 TLS 경로 모두 HTTP 200·크기·SHA-256이 같은지 확인한다. 큰 Setup은 임시 파일에 스트리밍 다운로드하여 검증하고 정리한다.

과거 live 웹 트리는 기존과 같이 교환 직후 삭제하며 자동 백업·자동 원복을 추가하지 않는다. 교환 이후 검증이 실패하면 이미 반영된 파일이 있을 수 있으므로 배포를 성공 처리하지 말고 기록을 확인한다. `--discard`는 후보 작업 파일만 정리한다. 이전 버전 스크립트로 준비하여 ComBar 보존 기록이 없는 후보는 새 스크립트로 활성화하지 않는다.

## 배포 전후 확인

실행 승인을 받은 뒤 prepare의 기록에서 현재 공개 ComBar 전체 목록을 확인한다. 현재 알려진 운영 버전만 하드코딩하지 않고, 새로 게시된 버전이 있으면 함께 보존한다. 후보 스크립트/helper가 승인한 Git SHA에 포함되어야 한다.

API·고객 웹 반영 후에는 다운로드 검증 외에 읽기 전용 `/api/combar/update/latest?currentVersion=<이전 버전>` 및 현재 활성 버전의 응답도 확인한다. `version`, `downloadUrl`, `sha256`, `signatureRequired`, `forceUpdate`와 `updateRequired`를 배포 전 활성 릴리스 기준과 비교한다. 이 점검은 릴리스 게시·활성화나 DB 수정이 아니다. 고객 웹 보존 helper는 DB/API 릴리스 정책을 변경하지 않는다.

## 로컬 격리 검증

Linux/Python 3.11 이상에서 다음 집중 검증을 실행한다. 실제 운영 접속이나 ComBar 게시를 하지 않는다. 파일 fixture에서 prepare/refresh와 실제 배포의 원자적 교환 코드를 검증하고, 다운로드 검증은 HTTP stub을 사용한다.

```sh
python3 -m unittest discover -s deploy/tests -v
bash -n deploy/deploy-www.sh
```

보존 처리는 배포 기능(L3)이다. 운영 DB 적용·웹 활성화·API 재기동·USD 활성화는 별도 실행 범위이며 이 변경만으로 수행되지 않는다.
