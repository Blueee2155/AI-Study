$paths = @(
    'D:\datasets',
    'D:\data', 
    'D:\Downloads',
    'D:\AI Study',
    'D:\models',
    'D:\lfw',
    'C:\datasets',
    'C:\data',
    'C:\Downloads'
)

foreach ($p in $paths) {
    if (Test-Path $p) {
        Write-Host "Searching: $p"
        Get-ChildItem -Path $p -Directory -Recurse -Depth 3 -ErrorAction SilentlyContinue | 
            Where-Object { $_.Name -match 'lfw|deepfunneled' } | 
            ForEach-Object { Write-Host $_.FullName }
    }
}
Write-Host "Search complete."
