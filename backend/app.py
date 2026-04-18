import os
import uuid
from datetime import datetime
from flask import Flask, jsonify, request, send_from_directory
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from ansible_runner import run_playbook

app = Flask(__name__, static_folder="../frontend")
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "netops-secret-key")
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

jobs_history = []

PLAYBOOKS_DIR = os.path.join(os.path.dirname(__file__), "../playbooks")
INVENTORY_FILE = os.path.join(os.path.dirname(__file__), "../inventory/hosts.ini")


@app.route("/")
def index():
    return send_from_directory("../frontend", "index.html")


@app.route("/api/playbooks", methods=["GET"])
def get_playbooks():
    playbooks = []
    if os.path.exists(PLAYBOOKS_DIR):
        for f in os.listdir(PLAYBOOKS_DIR):
            if f.endswith(".yml") or f.endswith(".yaml"):
                playbooks.append({
                    "name": f,
                    "path": os.path.join(PLAYBOOKS_DIR, f),
                    "description": get_playbook_description(f)
                })
    return jsonify({"playbooks": playbooks})


def get_playbook_description(filename):
    descriptions = {
        "ping.yml":       "Test de connectivité de toutes les machines",
        "update.yml":     "Mise à jour des paquets système",
        "deploy.yml":     "Déploiement de Nginx sur les serveurs web",
        "check_disk.yml": "Vérification de l'espace disque",
    }
    return descriptions.get(filename, "Playbook Ansible")


@app.route("/api/run", methods=["POST"])
def run():
    data = request.get_json()

    if not data or "playbook" not in data:
        return jsonify({"error": "Champ 'playbook' manquant"}), 400

    playbook_name = data.get("playbook")
    playbook_path = os.path.join(PLAYBOOKS_DIR, playbook_name)

    if not os.path.exists(playbook_path):
        return jsonify({"error": f"Playbook '{playbook_name}' introuvable"}), 404

    job_id = str(uuid.uuid4())[:8]
    started_at = datetime.now().isoformat()

    job = {
        "job_id": job_id,
        "playbook": playbook_name,
        "status": "running",
        "started_at": started_at,
        "finished_at": None,
        "logs": []
    }
    jobs_history.append(job)

    socketio.start_background_task(
        run_playbook_async,
        job_id=job_id,
        playbook_path=playbook_path,
        inventory=INVENTORY_FILE
    )

    return jsonify({
        "job_id": job_id,
        "status": "running",
        "playbook": playbook_name,
        "started_at": started_at
    })


def run_playbook_async(job_id, playbook_path, inventory):
    job = next((j for j in jobs_history if j["job_id"] == job_id), None)
    if not job:
        return

    socketio.emit("log", {
        "job_id": job_id,
        "message": f"🚀 Démarrage : {os.path.basename(playbook_path)}",
        "type": "info"
    })

    success, logs = run_playbook(playbook_path, inventory, job_id, socketio)

    job["status"] = "success" if success else "failed"
    job["finished_at"] = datetime.now().isoformat()
    job["logs"] = logs

    status_msg = "✅ Terminé avec succès" if success else "❌ Terminé avec des erreurs"
    socketio.emit("log", {"job_id": job_id, "message": status_msg,
                          "type": "success" if success else "error"})
    socketio.emit("job_finished", {"job_id": job_id, "status": job["status"]})


@app.route("/api/history", methods=["GET"])
def get_history():
    history = [{
        "job_id": j["job_id"],
        "playbook": j["playbook"],
        "status": j["status"],
        "started_at": j["started_at"],
        "finished_at": j["finished_at"]
    } for j in jobs_history]
    return jsonify({"history": list(reversed(history))})


@app.route("/api/inventory", methods=["GET"])
def get_inventory():
    machines = []
    current_group = "ungrouped"

    if not os.path.exists(INVENTORY_FILE):
        return jsonify({"machines": [], "error": "Fichier inventaire introuvable"})

    with open(INVENTORY_FILE, "r") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("[") and line.endswith("]"):
                current_group = line[1:-1]
                continue
            parts = line.split()
            if parts:
                machine = {"name": parts[0], "group": current_group}
                for part in parts[1:]:
                    if "=" in part:
                        key, val = part.split("=", 1)
                        machine[key] = val
                machines.append(machine)

    return jsonify({"machines": machines})


@app.route("/api/status/<job_id>", methods=["GET"])
def get_status(job_id):
    job = next((j for j in jobs_history if j["job_id"] == job_id), None)
    if not job:
        return jsonify({"error": "Job introuvable"}), 404
    return jsonify(job)


@socketio.on("connect")
def on_connect():
    print(f"✅ Client connecté : {request.sid}")
    emit("connected", {"message": "Connecté au NetOps Dashboard"})


@socketio.on("disconnect")
def on_disconnect():
    print(f"❌ Client déconnecté : {request.sid}")


if __name__ == "__main__":
    print("🚀 NetOps Dashboard sur http://localhost:5000")
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)