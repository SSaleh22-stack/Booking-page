$file = $args[0]
$content = Get-Content $file
$newContent = $content -replace '^pick f838a53', 'drop f838a53'
Set-Content $file $newContent

