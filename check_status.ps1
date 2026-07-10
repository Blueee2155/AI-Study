$resultsFile = "d:\AI Study\ai-tutor-backend\models\runs\face-study4\results.csv"
Write-Host "=== Training Status Check ==="
Write-Host "Time: $(Get-Date -Format 'HH:mm:ss')"

if (Test-Path $resultsFile) {
    $content = Get-Content $resultsFile
    $lines = $content.Count
    Write-Host "Completed epochs: $($lines - 1)"
    Write-Host "Last line: $($content[-1])"
} else {
    Write-Host "Results file not found"
}

$trainingProc = Get-Process python* -ErrorAction SilentlyContinue | ForEach-Object {
    $cmdline = (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine
    if ($cmdline -like '*train_yolov8*') { $_ }
}
if ($trainingProc) {
    Write-Host "Training IN PROGRESS"
    $trainingProc | ForEach-Object {
        $proc = $_
        $mem = (Get-CimInstance Win32_Process -Filter "ProcessId = $($proc.Id)").WorkingSetSize
        Write-Host "  PID: $($proc.Id), Memory: $([math]::Round($mem/1MB))MB"
    }
} else {
    Write-Host "Training COMPLETED or STOPPED"
}

$bestPt = "d:\AI Study\ai-tutor-backend\models\runs\face-study4\weights\best.pt"
if (Test-Path $bestPt) {
    $f = Get-Item $bestPt
    Write-Host "best.pt exists: $($f.Length) bytes, modified: $($f.LastWriteTime)"
} else {
    Write-Host "best.pt not found"
}
