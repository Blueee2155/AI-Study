$resultsFile = "d:\AI Study\ai-tutor-backend\models\runs\face-study4\results.csv"
$lines = (Get-Content $resultsFile | Measure-Object -Line).Lines
$epochs = $lines - 1
Write-Output "Epochs completed: $epochs / 50"

try {
    $proc = Get-Process -Id 21212
    Write-Output "Process 21212: Running (CPU: $($proc.CPU))"
} catch {
    Write-Output "Process 21212: NOT RUNNING"
}

$lastLine = Get-Content $resultsFile | Select-Object -Last 1
Write-Output "Last epoch data: $lastLine"
