#!/usr/bin/env python3
import json, sys, time
p = sys.argv[1]
d = json.load(open(p))
print('nodo=%s ts=%s antiguedad=%ds' % (d.get('nodo'), d.get('ts'), int(time.time()) - int(d.get('ts', 0))))
for c in d.get('contenedores', []):
    print('  %-18s alive=%-12s session=%-12s progress=%-12s commit=%-12s tmux=%s' % (
        c.get('contenedor'), c.get('alive_ts'), c.get('session_ts'),
        c.get('progress_ts'), c.get('commit_epoch'), c.get('tmux')))
