@echo off
title Neon Invasion - Steam Edition
cd /d "%~dp0"
if exist "node_modules\electron\dist\electron.exe" (
    node_modules\electron\dist\electron.exe .
) else (
    echo Starting with npx electron...
    npx electron .
)
