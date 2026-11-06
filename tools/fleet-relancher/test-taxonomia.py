#!/usr/bin/env python3
"""Coherencia de la taxonomia programatica con los casos reales del 2026-11-02."""
import sys

sys.path.insert(0, r"C:\yii\ciudadan-agent-monitor\backend")
from app.collector.state import derive_programmatic_state  # noqa: E402

NOW = 1_793_589_910_736  # instante de referencia de la consulta real

CASOS = [
    # (nombre, session, signal, task, esperado)
    (
        "t1a4: agente vivo escribiendo hace 78 s, sin hub",
        {"session_id": "s1", "status": "running", "pid_alive": True,
         "evidence": {"last_msg_ms": NOW - 78_000}},
        {"alive_ts_ms": None, "session_ts_ms": NOW - 1_260_000, "progress_ts_ms": NOW - 78_000,
         "observed": True, "runtime_vivo": True},
        {"estado": "activa"}, "WORKING",
    ),
    (
        "t1a2: heartbeat obsoleto de 12 dias, runtime con log fresco, sin escribir hace 258 s",
        {"session_id": "s2", "status": "running", "pid_alive": True,
         "evidence": {"last_msg_ms": NOW - 258_868}},
        {"alive_ts_ms": NOW - 12 * 86_400_000, "runtime_ts_ms": NOW - 30_000,
         "session_ts_ms": NOW - 2_065_000,
         "progress_ts_ms": NOW - 258_868, "observed": True, "runtime_vivo": True},
        {"estado": "activa"}, "WORKING",
    ),
    (
        "t2a3: runtime con log fresco, sin escribir mensajes hace 375 s",
        {"session_id": "s3", "status": "running", "pid_alive": True,
         "evidence": {"last_msg_ms": NOW - 375_477}},
        {"alive_ts_ms": None, "runtime_ts_ms": NOW - 30_000,
         "session_ts_ms": NOW - 2_225_000, "progress_ts_ms": NOW - 375_477,
         "observed": True, "runtime_vivo": True},
        {"estado": "activa"}, "WORKING",
    ),
    (
        "hub que emitia y se callo hace 5 min, sin actividad",
        {"session_id": "s4", "status": "running", "pid_alive": True,
         "evidence": {"last_msg_ms": NOW - 400_000}},
        {"alive_ts_ms": NOW - 300_000, "runtime_ts_ms": NOW - 300_000,
         "session_ts_ms": NOW - 400_000,
         "progress_ts_ms": NOW - 400_000, "observed": True, "runtime_vivo": True},
        {"estado": "activa"}, "UNOBSERVABLE",
    ),
    (
        "t2a6: heartbeat obsoleto de hace 24 h, runtime escribiendo hace 20 s",
        {"session_id": "s11", "status": "running", "pid_alive": True,
         "evidence": {"last_msg_ms": NOW - 200_000}},
        {"alive_ts_ms": NOW - 24 * 3_600_000, "runtime_ts_ms": NOW - 20_000,
         "session_ts_ms": NOW - 2_200_000, "progress_ts_ms": NOW - 200_000,
         "observed": True, "runtime_vivo": True},
        {"estado": "activa"}, "WORKING",
    ),
    (
        "runtime sin ninguna senal desde 200 s: UNOBSERVABLE estricto",
        {"session_id": "s12", "status": "running", "pid_alive": True,
         "evidence": {"last_msg_ms": NOW - 200_000}},
        {"alive_ts_ms": None, "runtime_ts_ms": NOW - 200_000,
         "session_ts_ms": NOW - 200_000, "progress_ts_ms": NOW - 200_000,
         "observed": True, "runtime_vivo": True},
        {"estado": "activa"}, "UNOBSERVABLE",
    ),
    (
        "runtime sin senal desde 100 s: SUSPECT, no UNOBSERVABLE",
        {"session_id": "s13", "status": "running", "pid_alive": True,
         "evidence": {"last_msg_ms": NOW - 100_000}},
        {"alive_ts_ms": None, "runtime_ts_ms": NOW - 100_000,
         "session_ts_ms": NOW - 100_000, "progress_ts_ms": NOW - 100_000,
         "observed": True, "runtime_vivo": True},
        {"estado": "activa"}, "SUSPECT",
    ),
    (
        "tarea activa sin progreso 1000 s, runtime vivo, confirmado en dos comprobaciones",
        {"session_id": "s5", "status": "running", "pid_alive": True,
         "evidence": {"last_msg_ms": NOW - 1_000_000}},
        {"alive_ts_ms": None, "runtime_ts_ms": NOW - 30_000,
         "session_ts_ms": NOW - 1_000_000, "progress_ts_ms": NOW - 1_000_000,
         "observed": True, "runtime_vivo": True},
        {"estado": "activa"}, "STALLED",
    ),
    (
        "runtime y sin progreso: sin ninguna senal, no se puede saber nada",
        {"session_id": "s14", "status": "running", "pid_alive": True,
         "evidence": {"last_msg_ms": NOW - 1_000_000}},
        {"alive_ts_ms": None, "runtime_ts_ms": NOW - 1_000_000,
         "session_ts_ms": NOW - 1_000_000, "progress_ts_ms": NOW - 1_000_000,
         "observed": True, "runtime_vivo": True},
        {"estado": "activa"}, "UNOBSERVABLE",
    ),
    (
        "runtime muerto con PID falso",
        {"session_id": "s6", "status": "running", "pid_alive": False, "evidence": {}},
        {"alive_ts_ms": None, "observed": True, "runtime_vivo": False},
        {"estado": "activa"}, "DOWN",
    ),
    (
        "zombie: running con pid muerto",
        {"session_id": "s7", "status": "running", "pid_alive": False, "evidence": {}},
        {"alive_ts_ms": None, "observed": True, "runtime_vivo": False},
        {"estado": "activa"}, "DOWN",
    ),
    (
        "ultima sesion failed",
        {"session_id": "s8", "status": "failed", "pid_alive": False, "evidence": {}},
        {"alive_ts_ms": None, "observed": True, "runtime_vivo": False},
        {"estado": "activa"}, "FAILED",
    ),
    (
        "trabajo entregado",
        {"session_id": "s9", "status": "completed", "pid_alive": False, "evidence": {}},
        {"alive_ts_ms": None, "observed": True, "runtime_vivo": False},
        {"estado": "activa"}, "IDLE",
    ),
    (
        "esperando respuesta",
        {"session_id": "s10", "status": "running", "pid_alive": True,
         "evidence": {"pending_question": True, "last_msg_ms": NOW - 500_000}},
        {"alive_ts_ms": None, "runtime_ts_ms": NOW - 60_000,
         "progress_ts_ms": NOW - 500_000, "observed": True, "runtime_vivo": True},
        {"estado": "activa"}, "WAITING",
    ),
    (
        "no se pudo observar el runtime",
        None,
        {"alive_ts_ms": None, "observed": False, "runtime_vivo": True},
        {"estado": "activa"}, "UNOBSERVABLE",
    ),
    (
        "sin ninguna sesion Cline",
        None,
        {"alive_ts_ms": None, "observed": True, "runtime_vivo": True},
        {"estado": "sin_tarea"}, "NO_SESSION",
    ),
]

fallos = 0
for nombre, session, signal, task, esperado in CASOS:
    estado, banderas, ts = derive_programmatic_state(
        session, signal, task, NOW,
        consecutive_stall_checks=1 if "confirmado" in nombre else 0,
    )
    ok = estado == esperado
    if not ok:
        fallos += 1
    print(f"{'OK  ' if ok else 'FALLA'} {nombre}")
    print(f"       esperado={esperado} obtenido={estado} motivo={ts.get('motivo')}")
    if not ok:
        print(f"       flags={banderas} ts={ts}")

print()
print("TOTAL:", len(CASOS), "FALLOS:", fallos)
sys.exit(1 if fallos else 0)
