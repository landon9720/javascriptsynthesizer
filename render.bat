@echo off
set DIR=%~dp0
node --no-warnings %DIR%dist\index.js %*
rem --inspect-brk
