$ErrorActionPreference='Stop'
if (!(Test-Path .env)) { Copy-Item .env.example .env; Write-Host 'Created .env - edit tokens before production.' }
Get-Content .env | ForEach-Object { if ($_ -match '^([^#=]+)=(.*)$') { [Environment]::SetEnvironmentVariable($matches[1],$matches[2],'Process') } }
Start-Process powershell -ArgumentList '-NoExit','-Command','npm run dev:relay'
Start-Sleep -Seconds 1
Start-Process powershell -ArgumentList '-NoExit','-Command','npm run dev:daemon'
Write-Host 'Relay and daemon started. Load apps/browser-extension as an unpacked extension in Chrome/Edge.'
