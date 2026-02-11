@echo off
REM ============================================
REM Mission: Hollywood - Launch All Dev Servers
REM ============================================
REM
REM Starts all puzzles and screens in mock mode.
REM Each server runs in its own terminal window.
REM

echo ==========================================
echo  Mission: Hollywood - Dev Launcher
echo ==========================================
echo.

set ROOT=%~dp0

echo Starting Puzzle 1 - Simon (port 3004)...
start "P1-Simon" cmd /k "cd /d %ROOT%puzzle-1-simon && npm run dev"

echo Starting Puzzle 2 - World Map (port 3000)...
start "P2-WorldMap" cmd /k "cd /d %ROOT%puzzle-2-world-map && npm run dev"

echo Starting Puzzle 3 - Gadget Code (port 3001)...
start "P3-GadgetCode" cmd /k "cd /d %ROOT%puzzle-3-gadget-code && npm run dev"

echo Starting Puzzle 4 - Vehicle (port 3002)...
start "P4-Vehicle" cmd /k "cd /d %ROOT%puzzle-4-vehicle && npm run dev"

echo Starting Puzzle 5 - Missile (port 3003)...
start "P5-Missile" cmd /k "cd /d %ROOT%puzzle-5-missile && npm run dev"

echo Starting Screen - Villain (port 3010)...
start "Screen-Villain" cmd /k "cd /d %ROOT%screen-villain && npm run dev"

echo Starting Screen - Immersion (port 3011)...
start "Screen-Immersion" cmd /k "cd /d %ROOT%screen-immersion && npm run dev"

echo Starting Screen - Right (port 3012)...
start "Screen-Right" cmd /k "cd /d %ROOT%screen-right && npm run dev"

echo.
echo All servers starting! Waiting 3 seconds...
timeout /t 3 /nobreak >nul

echo Opening browser tabs...
start "" http://localhost:3004
start "" http://localhost:3000
start "" http://localhost:3001
start "" http://localhost:3002
start "" http://localhost:3003
start "" http://localhost:3010
start "" http://localhost:3011
start "" http://localhost:3012

echo.
echo ==========================================
echo  All 8 servers launched!
echo ==========================================
echo.
echo  Puzzles:
echo    P1 Simon       http://localhost:3004
echo    P2 World Map   http://localhost:3000
echo    P3 Gadget Code http://localhost:3001
echo    P4 Vehicle     http://localhost:3002
echo    P5 Missile     http://localhost:3003
echo.
echo  Screens:
echo    Villain        http://localhost:3010
echo    Immersion      http://localhost:3011
echo    Right          http://localhost:3012
echo.
echo  Test glitch: open any browser console (F12)
echo    HackGlitch.activate()
echo    HackGlitch.deactivate()
echo.
echo  Close all: close this window or Ctrl+C each terminal
echo.
pause
