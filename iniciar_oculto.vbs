Set FSO = CreateObject("Scripting.FileSystemObject")
CurrentDir = FSO.GetParentFolderName(WScript.ScriptFullName)
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = CurrentDir
WshShell.Run Chr(34) & CurrentDir & "\iniciar_mgv.bat" & Chr(34), 0, False
Set WshShell = Nothing
Set FSO = Nothing
