param([string]$Images, [string]$Store)
Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'
function Col($hex, $a = 255) { $c = [Drawing.ColorTranslator]::FromHtml($hex); [Drawing.Color]::FromArgb($a, $c.R, $c.G, $c.B) }
function New-Canvas($w, $h) { $b = New-Object Drawing.Bitmap($w, $h, [Drawing.Imaging.PixelFormat]::Format32bppArgb); $g = [Drawing.Graphics]::FromImage($b); $g.SmoothingMode = 'AntiAlias'; $g.InterpolationMode = 'HighQualityBicubic'; $g.TextRenderingHint = 'AntiAliasGridFit'; $g.Clear([Drawing.Color]::Transparent); return @($b, $g) }
function Fill-Cream($g, $w, $h) {
  $br = New-Object Drawing.Drawing2D.LinearGradientBrush((New-Object Drawing.Rectangle(0, 0, $w, $h)), (Col '#FFFDF8'), (Col '#F3ECDD'), 90)
  $g.FillRectangle($br, 0, 0, $w, $h); $br.Dispose()
}
# The living orb: soft gold glow, sage sphere lit from the upper left, small highlight.
function Draw-Orb($g, [float]$cx, [float]$cy, [float]$r, [bool]$glow = $true) {
  if ($glow) {
    for ($i = 10; $i -ge 1; $i--) {
      $rr = $r * (1 + 0.045 * $i)
      $br = New-Object Drawing.SolidBrush((Col '#D9A441' ([int](6 + (11 - $i) * 1.2))))
      $g.FillEllipse($br, $cx - $rr, $cy - $rr, 2 * $rr, 2 * $rr); $br.Dispose()
    }
  }
  $path = New-Object Drawing.Drawing2D.GraphicsPath
  $path.AddEllipse($cx - $r, $cy - $r, 2 * $r, 2 * $r)
  $pg = New-Object Drawing.Drawing2D.PathGradientBrush($path)
  $pg.CenterPoint = New-Object Drawing.PointF(($cx - 0.32 * $r), ($cy - 0.38 * $r))
  $pg.CenterColor = Col '#EAF5EC'
  $pg.SurroundColors = @((Col '#3F654F'))
  $blend = New-Object Drawing.Drawing2D.ColorBlend(3)
  $blend.Colors = @((Col '#3F654F'), (Col '#6FA283'), (Col '#EAF5EC'))
  $blend.Positions = @(0.0, 0.55, 1.0)
  $pg.InterpolationColors = $blend
  $g.FillEllipse($pg, $cx - $r, $cy - $r, 2 * $r, 2 * $r)
  $ring = New-Object Drawing.Pen((Col '#F6E3B4' 200), [float]($r * 0.035))
  $g.DrawEllipse($ring, $cx - $r, $cy - $r, 2 * $r, 2 * $r)
  $hl = New-Object Drawing.SolidBrush((Col '#FFFFFF' 120))
  $g.FillEllipse($hl, $cx - 0.55 * $r, $cy - 0.62 * $r, 0.5 * $r, 0.32 * $r)
  $pg.Dispose(); $path.Dispose(); $ring.Dispose(); $hl.Dispose()
}
function Save($bmp, $path) { $bmp.Save($path, [Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose() }

# 1) Launcher icon 1024 (full bleed, cream, orb)
$b, $g = New-Canvas 1024 1024; Fill-Cream $g 1024 1024; Draw-Orb $g 512 512 290; $g.Dispose(); Save $b "$Images\icon.png"
# 2) Adaptive foreground: transparent, orb inside the 66% safe zone
$b, $g = New-Canvas 1024 1024; Draw-Orb $g 512 512 250; $g.Dispose(); Save $b "$Images\android-icon-foreground.png"
# 3) Adaptive background: plain cream
$b, $g = New-Canvas 1024 1024; Fill-Cream $g 1024 1024; $g.Dispose(); Save $b "$Images\android-icon-background.png"
# 4) Monochrome (themed icons): solid white sphere with a highlight cut out
$b, $g = New-Canvas 1024 1024
$w = New-Object Drawing.SolidBrush((Col '#FFFFFF')); $g.FillEllipse($w, 262, 262, 500, 500)
$g.CompositingMode = 'SourceCopy'; $cut = New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb(0, 0, 0, 0)); $g.FillEllipse($cut, 372, 330, 190, 120)
$g.Dispose(); Save $b "$Images\android-icon-monochrome.png"
# 5) Splash icon
$b, $g = New-Canvas 1024 1024; Draw-Orb $g 512 512 300; $g.Dispose(); Save $b "$Images\splash-icon.png"
# 6) Favicon
$b, $g = New-Canvas 96 96; Fill-Cream $g 96 96; Draw-Orb $g 48 48 34 $false; $g.Dispose(); Save $b "$Images\favicon.png"

# Play Store assets
# Store icon 512x512 (32-bit PNG)
$b, $g = New-Canvas 512 512; Fill-Cream $g 512 512; Draw-Orb $g 256 256 145; $g.Dispose(); Save $b "$Store\play-icon-512.png"
# Feature graphic 1024x500
$b, $g = New-Canvas 1024 500; Fill-Cream $g 1024 500
$g.FillEllipse((New-Object Drawing.SolidBrush((Col '#DCEBE0' 150))), 560, -120, 700, 700)
Draw-Orb $g 800 250 150
$f1 = New-Object Drawing.Font('Georgia', 66, [Drawing.FontStyle]::Bold, [Drawing.GraphicsUnit]::Pixel)
$f2 = New-Object Drawing.Font('Segoe UI Semibold', 30, [Drawing.FontStyle]::Regular, [Drawing.GraphicsUnit]::Pixel)
$f3 = New-Object Drawing.Font('Segoe UI', 24, [Drawing.FontStyle]::Regular, [Drawing.GraphicsUnit]::Pixel)
$ink = New-Object Drawing.SolidBrush((Col '#1F2D26')); $sage = New-Object Drawing.SolidBrush((Col '#3F654F')); $mut = New-Object Drawing.SolidBrush((Col '#6B7A72'))
$g.DrawString('My Mentor', $f1, $ink, 60, 120)
$g.DrawString('Plan. Practise. Grow. Together.', $f2, $sage, 64, 220)
$g.DrawString('Habits, goals, communication and couple space', $f3, $mut, 64, 280)
$g.DrawString('in English, Hindi and Hinglish', $f3, $mut, 64, 312)
$g.Dispose(); Save $b "$Store\play-feature-graphic-1024x500.png"
'icons ok'
