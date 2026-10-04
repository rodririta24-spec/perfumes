# Genera los íconos PNG de la PWA: frasco blanco sobre fondo violeta (dentro de la zona segura maskable).
Add-Type -AssemblyName System.Drawing
$out = Join-Path $PSScriptRoot '..\icons'
New-Item -ItemType Directory -Force $out | Out-Null

function Make-Icon([int]$size, [string]$name) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::FromArgb(91, 63, 160))
  $s = $size / 512.0
  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 255))
  $soft = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(190, 255, 255, 255))
  $liquid = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(200, 169, 139, 240))
  $g.FillRectangle($white, [single](216 * $s), [single](110 * $s), [single](80 * $s), [single](60 * $s))
  $g.FillRectangle($soft, [single](236 * $s), [single](170 * $s), [single](40 * $s), [single](30 * $s))
  $x = [single](136 * $s); $y = [single](200 * $s); $w = [single](240 * $s); $h = [single](210 * $s); $r = [single](56 * $s)
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc($x, $y, $r, $r, 180, 90)
  $path.AddArc($x + $w - $r, $y, $r, $r, 270, 90)
  $path.AddArc($x + $w - $r, $y + $h - $r, $r, $r, 0, 90)
  $path.AddArc($x, $y + $h - $r, $r, $r, 90, 90)
  $path.CloseFigure()
  $g.FillPath($white, $path)
  $g.FillRectangle($liquid, [single](168 * $s), [single](300 * $s), [single](176 * $s), [single](80 * $s))
  $g.Dispose()
  $bmp.Save((Join-Path $out $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

Make-Icon 192 'icon-192.png'
Make-Icon 512 'icon-512.png'
Make-Icon 180 'apple-touch-icon.png'
