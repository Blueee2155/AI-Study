$resultsFile = "d:\AI Study\ai-tutor-backend\models\runs\face-study4\results.csv"
if (Test-Path $resultsFile) {
    $lines = (Get-Content $resultsFile).Count
    Write-Host "已完成 epoch: $($lines - 1)"
    Write-Host "--- 最后3行 ---"
    Get-Content $resultsFile | Select-Object -Last 3
} else {
    Write-Host "results.csv 不存在"
}

Write-Host ""
Write-Host "--- 检查训练进程 ---"
$trainingProc = Get-Process python* -ErrorAction SilentlyContinue | ForEach-Object {
    $cmdline = (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine
    if ($cmdline -like '*train_yolov8*') { $_ }
}
if ($trainingProc) {
    Write-Host "训练仍在进行中"
    $trainingProc | ForEach-Object { Write-Host "PID: $($_.Id), CPU: $($_.CPU)s, Mem: $([math]::Round($_.WorkingSet64/1MB))MB" }
} else {
    Write-Host "训练已完成或已停止"
}

Write-Host ""
Write-Host "--- 检查 best.pt ---"
$bestPt = "d:\AI Study\ai-tutor-backend\models\runs\face-study4\weights\best.pt"
if (Test-Path $bestPt) {
    Get-Item $bestPt | Select-Object FullName, LastWriteTime, Length
} else {
    Write-Host "best.pt 不存在"
}
