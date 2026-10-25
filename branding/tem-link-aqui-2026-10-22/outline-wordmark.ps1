Add-Type -AssemblyName System.Drawing
$brandDirectory = Join-Path $PSScriptRoot 'nova-identidade'
New-Item -ItemType Directory -Path $brandDirectory -Force | Out-Null
$brandPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
$brandFont = [System.Drawing.FontFamily]::new('Segoe UI')
$brandPath.AddString('tem link aqui', $brandFont, [int][System.Drawing.FontStyle]::Bold, 120, [System.Drawing.PointF]::new(0,0), [System.Drawing.StringFormat]::GenericTypographic)
$brandPoints = $brandPath.PathPoints
$brandTypes = $brandPath.PathTypes
$brandCommands = [System.Collections.Generic.List[string]]::new()
function Format-Point($point) { return $point.X.ToString('0.##',[cultureinfo]::InvariantCulture) + ' ' + $point.Y.ToString('0.##',[cultureinfo]::InvariantCulture) }
for ($brandIndex=0; $brandIndex -lt $brandPoints.Length; $brandIndex++) {
    $brandType = $brandTypes[$brandIndex] -band 7
    if ($brandType -eq 0) { $brandCommands.Add('M' + (Format-Point $brandPoints[$brandIndex])) }
    elseif ($brandType -eq 1) { $brandCommands.Add('L' + (Format-Point $brandPoints[$brandIndex])) }
    elseif ($brandType -eq 3) {
        $brandCommands.Add('C' + (Format-Point $brandPoints[$brandIndex]) + ' ' + (Format-Point $brandPoints[$brandIndex+1]) + ' ' + (Format-Point $brandPoints[$brandIndex+2]))
        $brandIndex += 2
    } else { throw 'Unsupported outline segment' }
    if (($brandTypes[$brandIndex] -band 128) -ne 0) { $brandCommands.Add('Z') }
}
$brandBounds=$brandPath.GetBounds()
$brandViewBox=@($brandBounds.X,$brandBounds.Y,$brandBounds.Width,$brandBounds.Height) | ForEach-Object { $_.ToString('0.##',[cultureinfo]::InvariantCulture) }
$brandSvg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+($brandViewBox -join ' ')+'"><title>Tem Link Aqui — wordmark em contornos</title><path fill="#0a192f" fill-rule="evenodd" d="'+($brandCommands -join ' ')+'"/></svg>'
[xml]$brandCheck=$brandSvg
if ($brandCheck.svg.path.d.Length -lt 100) { throw 'Wordmark outline is empty' }
Set-Content -LiteralPath (Join-Path $brandDirectory 'wordmark-contornos.svg') -Value $brandSvg -Encoding utf8
$brandPath.Dispose()
$brandFont.Dispose()
