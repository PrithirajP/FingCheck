$ErrorActionPreference = "Stop"
$ProgressPreference = 'SilentlyContinue'

if (-not (Test-Path "$PWD\go\bin\go.exe")) {
    if (-not (Test-Path "go.zip")) {
        Write-Host "Downloading Portable Go (fast mode)..."
        Invoke-WebRequest -Uri "https://go.dev/dl/go1.22.2.windows-amd64.zip" -OutFile "go.zip"
    }
    Write-Host "Extracting Go using tar (very fast)..."
    tar.exe -xf go.zip
}
$env:Path = "$PWD\go\bin;" + $env:Path
Write-Host "Go Version:"
go version
cd backend
go mod tidy
Write-Host "Starting Backend Server on port 8080..."
go run cmd/api/main.go
