& {
    $saves = Join-Path $env:USERPROFILE 'AppData\LocalLow\Endnight\SonsOfTheForest\Saves'
    if (-not (Test-Path -LiteralPath $saves)) {
        Write-Host "Sons of the Forest saves folder not found: $saves" -ForegroundColor Red
        return
    }
    $latest = Get-ChildItem -LiteralPath $saves -Filter 'SaveData.zip' -File -Recurse -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    if (-not $latest) {
        Write-Host "No SaveData.zip found under $saves" -ForegroundColor Red
        return
    }
    Write-Host "Latest save: $($latest.FullName)" -ForegroundColor Green
    Write-Host "Last saved:  $($latest.LastWriteTime)"
    Write-Host "Opening Explorer. Drag SaveData.zip onto the sotf-inventory page."
    Start-Process explorer.exe -ArgumentList "/select,`"$($latest.FullName)`""
}
