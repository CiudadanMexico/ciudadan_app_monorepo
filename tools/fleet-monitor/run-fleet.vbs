' Lanzador invisible del monitor de flota: estilo de ventana 0 (sin consola).
' Se usa porque <Hidden>true</Hidden> en el XML de la tarea solo oculta la
' tarea en el Programador de tareas, NO la ventana de consola que aparece.
Set shell = CreateObject("WScript.Shell")
shell.Run "cmd /c ""C:\yii\tools\fleet\run-fleet.cmd""", 0, False
