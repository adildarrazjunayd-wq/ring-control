@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js n est pas installe. Va sur https://nodejs.org , installe-le, puis double-clique a nouveau sur ce fichier.
  pause
  exit /b
)
start "" http://localhost:4173
echo Le jeu tourne. Laisse cette fenetre ouverte pendant que tu joues.
node server.mjs
pause
