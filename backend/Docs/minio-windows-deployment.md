# Windows Server 2016 MinIO 배포 가이드 (winget 없이)

대상 서버: 218.155.74.34

현재 문서 모드: 개발서버(34) 로컬 전용 테스트

전제:

- 백엔드는 Windows Tomcat에 WAR로 배포한다.
- 파일 원본은 MinIO에 저장하고, DB에는 메타데이터만 저장한다.
- 브라우저에서 MinIO로 직접 PUT 업로드하므로 CORS 설정이 필요하다.

---

## 1. 준비물

아래 3가지만 있으면 된다.

- Windows 관리자 권한
- 외부에서 접근 가능한 MinIO 포트 9000
- PowerShell (기본 제공)

선택:

- MinIO 콘솔 포트 9001
- NSSM(Windows 서비스 등록용)

참고:

- Windows Server 2016은 winget 설치가 어려운 경우가 많으므로, 이 문서는 winget 없이 진행한다.

---

## 2. MinIO 서버/클라이언트 설치 (winget 대체)

권장 방식: 공식 바이너리 직접 다운로드

관리자 PowerShell에서 아래를 실행한다.

```powershell
New-Item -ItemType Directory -Force -Path C:\Tools\MinIO | Out-Null

Invoke-WebRequest -Uri "https://dl.min.io/server/minio/release/windows-amd64/minio.exe" -OutFile "C:\Tools\MinIO\minio.exe"
Invoke-WebRequest -Uri "https://dl.min.io/client/mc/release/windows-amd64/mc.exe" -OutFile "C:\Tools\MinIO\mc.exe"
```

검증:

```powershell
& "C:\Tools\MinIO\minio.exe" --version
& "C:\Tools\MinIO\mc.exe" --version
```

선택: PATH 등록

```powershell
$machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
if ($machinePath -notlike "*C:\Tools\MinIO*") {
  [Environment]::SetEnvironmentVariable("Path", "$machinePath;C:\Tools\MinIO", "Machine")
}
```

대안 방식: Chocolatey 사용 가능 시 (패키지 유무 먼저 확인)

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

choco source list
choco search minio
```

주의:

- 현재 community 소스에서 `minio` 패키지가 조회되지 않을 수 있다. 이 경우 Chocolatey 방식은 건너뛴다.
- Chocolatey 패키지는 공식 최신판보다 늦거나 사라질 수 있으므로, 운영에서는 공식 바이너리 직접 배포를 표준으로 사용한다.

---

## 3. MinIO 데이터 폴더 생성

예시 경로:

```powershell
New-Item -ItemType Directory -Force -Path D:\minio\data | Out-Null
New-Item -ItemType Directory -Force -Path D:\minio\config | Out-Null
```

권장:

- 시스템 드라이브보다 별도 데이터 드라이브를 사용한다.
- 이 폴더는 MinIO 저장소이므로 백업 대상이다.

---

## 4. MinIO 서버 기동

### 4-1. 수동 기동 테스트

관리자 PowerShell에서 실행한다.

```powershell
$env:MINIO_ROOT_USER='dev-access-key'
$env:MINIO_ROOT_PASSWORD='dev-secret-key'
& 'C:\Tools\MinIO\minio.exe' server D:\minio\data --address ':9000' --console-address ':9001'
```

검증:

```powershell
Invoke-WebRequest -Uri 'http://127.0.0.1:9000/minio/health/live' -Method GET
```

정상 응답:

- HTTP 200

### 4-2. 브라우저 접근 주소

로컬 전용 테스트에서는 개발서버 내부에서만 아래 주소를 사용한다.

- API: http://127.0.0.1:9000
- Console: http://127.0.0.1:9001

즉, 이 모드에서는 외부 PC에서 218.155.74.34:9000으로 접근하지 않는다.

---

## 5. 버킷 생성

MinIO Client로 버킷을 만든다.

```powershell
& 'C:\Tools\MinIO\mc.exe' alias set local http://127.0.0.1:9000 dev-access-key dev-secret-key
& 'C:\Tools\MinIO\mc.exe' mb -p local/document-attachments
```

권장 버킷명:

- document-attachments

---

## 6. CORS 설정

브라우저가 MinIO로 직접 PUT 하므로 CORS 허용이 필요하다.

아래 파일을 D:\minio\cors.json 으로 저장한다.

```json
[
  {
    "AllowedOrigins": ["http://localhost:5173", "http://127.0.0.1:5173"],
    "AllowedMethods": ["GET", "PUT", "HEAD", "DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

운영/개발서버에서 바로 쓰는 예시:

- 개발 프론트가 로컬이면 http://localhost:5173 / http://127.0.0.1:5173
- 로컬 전용 테스트에서는 외부 도메인/공인 IP를 AllowedOrigins 에 넣지 않는다
- MinIO 자체 주소는 http://127.0.0.1:9000

적용:

```powershell
& 'C:\Tools\MinIO\mc.exe' cors set local/document-attachments D:\minio\cors.json
```

검증:

```powershell
& curl.exe -i -X OPTIONS "http://127.0.0.1:9000/document-attachments/test.xlsx" -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: PUT" -H "Access-Control-Request-Headers: content-type"
```

정상이라면 응답 헤더에 아래가 보여야 한다.

- Access-Control-Allow-Origin
- Access-Control-Allow-Methods
- Access-Control-Allow-Headers

---

## 7. Tomcat용 setenv.bat

Tomcat 설치 폴더의 bin\setenv.bat 에 아래를 넣는다.

```bat
@echo off
set "CATALINA_OPTS=%CATALINA_OPTS% -Dspring.profiles.active=prod"
set "CATALINA_OPTS=%CATALINA_OPTS% -Dspring.config.additional-location=file:/C:/haccp-cloud/config/"
set "CATALINA_OPTS=%CATALINA_OPTS% -DMINIO_ACCESS_KEY=f1soft"
set "CATALINA_OPTS=%CATALINA_OPTS% -DMINIO_SECRET_KEY=f1soft@96"
set "CATALINA_OPTS=%CATALINA_OPTS% -DSTORAGE_PROVIDER=minio"
set "CATALINA_OPTS=%CATALINA_OPTS% -DSTORAGE_BUCKET=document-attachments"
set "CATALINA_OPTS=%CATALINA_OPTS% -DSTORAGE_AUTO_CREATE_BUCKET=false"
set "CATALINA_OPTS=%CATALINA_OPTS% -DSTORAGE_ENDPOINT=http://218.155.74.34:9000"
```

운영값으로 바꿀 때는 아래만 변경하면 된다.

```bat
set "CATALINA_OPTS=%CATALINA_OPTS% -DMINIO_ACCESS_KEY=<운영_액세스키>"
set "CATALINA_OPTS=%CATALINA_OPTS% -DMINIO_SECRET_KEY=<운영_시크릿키>"
set "CATALINA_OPTS=%CATALINA_OPTS% -DSTORAGE_ENDPOINT=http://218.155.74.34:9000"
```

주의:

- 운영에서는 저장소 기본 fallback보다 Tomcat 환경변수로 자격 증명을 주입하는 방식을 권장한다.
- application-prod.properties 의 기본값은 개발 편의를 위한 안전장치로만 보고, 실제 값은 setenv.bat 또는 환경변수로 덮어쓴다.
- `STORAGE_AUTO_CREATE_BUCKET=false`가 기본값이다. 운영에서는 버킷을 미리 생성하고 애플리케이션 계정에는 객체 업로드 권한을 부여한다.
- 이 값은 로컬 전용 테스트 기준이다. 외부/HTTPS 연동 시에는 별도 HTTPS 엔드포인트로 변경해야 한다.

---

## 8. 백엔드 application-prod.properties 확인

현재 prod 설정에는 MinIO 항목이 들어가 있어야 한다.

핵심 값:

```properties
storage.provider=minio
storage.bucket=document-attachments
storage.autoCreateBucket=false
storage.endpoint=http://218.155.74.34:9000
storage.accessKey=...
storage.secretKey=...
storage.region=us-east-1
storage.presignExpirySeconds=600
```

기본 파일은 repo에 있고, 실제 운영값은 Tomcat 환경변수로 덮어쓰는 방식이 가장 안전하다.

---

## 9. Windows 서비스 등록 방식

### 방법 A. 작업 스케줄러

가장 단순하다.

1. 작업 스케줄러 실행
2. 새 작업 생성
3. 트리거: 시스템 시작 시
4. 동작: minio.exe server D:\minio\data --address :9000 --console-address :9001
5. 최상위 권한으로 실행 체크
6. 사용자 로그온 여부와 관계없이 실행 체크

장점:

- 설치가 쉽다.
- 추가 도구가 필요 없다.

단점:

- 서비스처럼 깔끔하게 관리되지는 않는다.

### 방법 B. NSSM

운영에서는 이 방식이 더 편하다.

예시:

```powershell
nssm install MinIO
```

설정:

- Application: C:\Tools\MinIO\minio.exe
- Arguments: server D:\minio\data --address :9000 --console-address :9001
- Startup directory: MinIO 데이터 폴더 또는 실행 파일 폴더
- Environment:
  - MINIO_ROOT_USER=...
  - MINIO_ROOT_PASSWORD=...

실행 예시(서비스 등록 직후 확인용):

```powershell
nssm set MinIO AppDirectory D:\minio
nssm set MinIO AppParameters "server D:\minio\data --address :9000 --console-address :9001"
nssm set MinIO AppEnvironmentExtra "MINIO_ROOT_USER=dev-access-key\nMINIO_ROOT_PASSWORD=dev-secret-key"
nssm start MinIO
```

---

## 10. 방화벽/네트워크 확인

로컬 전용 테스트만 할 경우 이 단계는 생략 가능하다.

서버 외부에서 접근해야 할 때만 인바운드 규칙을 연다.

- TCP 9000 (필수)
- TCP 9001 (콘솔 필요 시)

예시:

```powershell
New-NetFirewallRule -DisplayName "MinIO-9000" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 9000
New-NetFirewallRule -DisplayName "MinIO-9001" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 9001
```

---

## 11. 로컬 전용 최종 점검 체크리스트

- minio.exe / mc.exe 버전 확인 완료
- MinIO live healthcheck 200 확인
- 버킷 document-attachments 생성 확인
- CORS preflight 헤더 확인
- Tomcat setenv.bat 반영 후 재기동 완료
- 개발서버 내부 브라우저에서만 업로드/다운로드 시나리오 점검 완료
