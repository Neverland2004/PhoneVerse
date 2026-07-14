@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo  PhoneVerse 一键启动
echo  ----------------------

REM 已经在跑就直接打开网页
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:5173/' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL%==0 (
  echo 服务已在运行，正在打开网页...
  start "" "http://127.0.0.1:5173/"
  exit /b 0
)

echo 正在启动后端 + 前端（请保持弹出的黑窗口不要关）...
start "PhoneVerse 服务" cmd /k "cd /d "%~dp0" && npm run dev:all"

echo 等待页面就绪...
powershell -NoProfile -Command "$ok=$false; for ($i=0; $i -lt 90; $i++) { try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:5173/' -UseBasicParsing -TimeoutSec 1; if ($r.StatusCode -eq 200) { $ok=$true; break } } catch {} ; Start-Sleep -Seconds 1 }; if ($ok) { exit 0 } else { exit 1 }"

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo 启动超时了。请看标题为「PhoneVerse 服务」的窗口有没有报错。
  echo 常见原因：没装依赖，请先在项目目录执行 npm install
  pause
  exit /b 1
)

echo 打开网页...
start "" "http://127.0.0.1:5173/"
exit /b 0
