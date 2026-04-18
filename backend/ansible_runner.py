import subprocess
import shutil
import os


def run_playbook(playbook_path, inventory_path, job_id, socketio):
    logs = []

    if not shutil.which("ansible-playbook"):
        msg = "❌ ansible-playbook non trouvé. Installe Ansible d'abord."
        socketio.emit("log", {"job_id": job_id, "message": msg, "type": "error"})
        return False, [msg]

    command = ["ansible-playbook", playbook_path, "-i", inventory_path, "-v"]

    socketio.emit("log", {
        "job_id": job_id,
        "message": f"📋 Commande : {' '.join(command)}",
        "type": "info"
    })

    try:
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )

        for line in process.stdout:
            line = line.rstrip()
            if line:
                logs.append(line)
                log_type = classify_log_line(line)
                socketio.emit("log", {
                    "job_id": job_id,
                    "message": line,
                    "type": log_type
                })

        process.wait()
        success = process.returncode == 0
        return success, logs

    except Exception as e:
        error_msg = f"❌ Erreur : {str(e)}"
        logs.append(error_msg)
        socketio.emit("log", {
            "job_id": job_id,
            "message": error_msg,
            "type": "error"
        })
        return False, logs


def classify_log_line(line):
    line_lower = line.lower()
    if any(w in line_lower for w in ["failed", "error", "fatal", "unreachable"]):
        return "error"
    elif any(w in line_lower for w in ["ok:", "changed:", "✅"]):
        return "success"
    elif any(w in line_lower for w in ["warning", "warn", "skipping"]):
        return "warning"
    return "info"


def simulate_playbook(playbook_name, job_id, socketio):
    import time
    fake_logs = [
        ("info",    f"PLAY [{playbook_name}] ***************************"),
        ("info",    "TASK [Gathering Facts] *****************************"),
        ("success", "ok: [web01]"),
        ("success", "ok: [web02]"),
        ("info",    "TASK [Exécution principale] ************************"),
        ("success", "changed: [web01]"),
        ("success", "ok: [web02]"),
        ("info",    "PLAY RECAP *****************************************"),
        ("success", "web01 : ok=2  changed=1  unreachable=0  failed=0"),
        ("success", "web02 : ok=2  changed=0  unreachable=0  failed=0"),
    ]
    for log_type, message in fake_logs:
        socketio.emit("log", {
            "job_id": job_id,
            "message": message,
            "type": log_type
        })
        time.sleep(0.5)
    return True, [msg for _, msg in fake_logs]