@echo off
rem Lanzador del monitor de flota. Se invoca desde un .vbs para no abrir
rem ninguna ventana de consola. El log se recorta para que no crezca sin
rem limite.
setlocal
set "LOG=C:\yii\tools\logs\fleet-run.log"
if not exist "C:\yii\tools\logs" mkdir "C:\yii\tools\logs"
node --no-warnings=ExperimentalWarning "C:\yii\tools\fleet\fleet.mjs" run >> "%LOG%" 2>&1
powershell.exe -NoProfile -WindowStyle Hidden -Command "if (Test-Path '%LOG%') { Get-Content '%LOG%' -Encoding UTF8 | Select-Object -Last 200 | Set-Content '%LOG%' -Encoding UTF8 }"
endlocal
