@echo off
setlocal
set ORCH_DIR=C:\Users\danie\OneDrive\Escritorio\orchestrator
set PROJECT_DIR=C:\Users\danie\OneDrive\Escritorio\fightsim

echo ============================================
echo  Autonomous Orchestrator - fightsim
echo  Cuentas: acct1 (~/.claude), acct2 (~/.claude-acct2)
echo ============================================
echo.

echo [1/2] Diagnostico (doctor)...
node "%ORCH_DIR%\bin\orchestrator.js" doctor --project="%PROJECT_DIR%"
echo.

echo [2/2] Arrancando el orquestador...
node "%ORCH_DIR%\bin\orchestrator.js" start --project="%PROJECT_DIR%" --iterations=1

echo.
echo Listo. Dashboard (si sigue corriendo): http://localhost:4870
echo Revisa el estado con:
echo   node "%ORCH_DIR%\bin\orchestrator.js" status --project="%PROJECT_DIR%"
echo   node "%ORCH_DIR%\bin\orchestrator.js" tasks  --project="%PROJECT_DIR%"
pause
