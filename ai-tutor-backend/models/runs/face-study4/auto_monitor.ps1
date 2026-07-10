$resultsFile = "d:\AI Study\ai-tutor-backend\models\runs\face-study4\results.csv"
$bestPt = "d:\AI Study\ai-tutor-backend\models\runs\face-study4\weights\best.pt"
$targetPt = "d:\AI Study\ai-tutor-backend\models\yolov8n-face.pt"
$doneFile = "d:\AI Study\ai-tutor-backend\models\runs\face-study4\training_done.flag"
$totalEpochs = 50

while ($true) {
    Start-Sleep -Seconds 300
    
    $lines = (Get-Content $resultsFile | Measure-Object -Line).Lines
    $epochs = $lines - 1
    $lastLine = Get-Content $resultsFile | Select-Object -Last 1
    
    $processRunning = $true
    try {
        $proc = Get-Process -Id 21212 -ErrorAction Stop
    } catch {
        $processRunning = $false
    }
    
    Write-Output "$(Get-Date -Format 'HH:mm:ss') - Epochs: $epochs/$totalEpochs, Process: $processRunning"
    
    if ($epochs -ge $totalEpochs -or -not $processRunning) {
        Write-Output "Training completed!"
        Write-Output "Last epoch data: $lastLine"
        
        # Copy best model
        if (Test-Path $bestPt) {
            Copy-Item $bestPt $targetPt -Force
            Write-Output "Copied best.pt to $targetPt"
        } else {
            Write-Output "WARNING: best.pt not found at $bestPt"
        }
        
        # Write done flag
        $lastLine | Out-File -FilePath $doneFile -Encoding UTF8
        Write-Output "Done flag written to $doneFile"
        break
    }
}
