# 🖥️ NetOps Dashboard

> Tableau de bord web pour automatiser et superviser une infrastructure réseau via Ansible.

![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)
![Flask](https://img.shields.io/badge/Flask-3.0-black?logo=flask)
![Ansible](https://img.shields.io/badge/Ansible-2.15-red?logo=ansible)
![Docker](https://img.shields.io/badge/Docker-Compose-blue?logo=docker)

---

## 📌 C'est quoi ce projet ?

Imagine que tu es responsable de **10 ordinateurs** dans une entreprise.
Chaque jour tu dois :
- Vérifier que toutes les machines **répondent**
- **Mettre à jour** les logiciels sur toutes les machines
- **Déployer** une nouvelle application
- Vérifier que le **disque dur** n'est pas plein

Sans outil, tu dois te connecter **manuellement** sur chaque machine
une par une. C'est long et répétitif.

**NetOps Dashboard** résout ce problème — tu ouvres ton navigateur,
tu cliques sur un bouton, et l'action s'exécute sur
**toutes tes machines en même temps**.

---

## 🧱 Stack Technique

| Couche | Technologie | Rôle |
|--------|-------------|------|
| Backend | **Python 3.11 + Flask** | API REST, exécution des playbooks |
| Automatisation | **Ansible 2.15** | Lancement des tâches sur les machines |
| Frontend | **HTML / CSS / JavaScript** | Interface utilisateur |
| Communication | **WebSocket (Flask-SocketIO)** | Logs en temps réel |
| Conteneurisation | **Docker + Docker Compose** | Déploiement simplifié |
| CI/CD | **GitHub Actions** | Tests et lint automatiques |

---

## 🧩 Les 3 parties du projet

### 1️⃣ Les Playbooks Ansible — "Les recettes de cuisine"

Un playbook c'est comme une **recette** que tu donnes à Ansible.

Par exemple `ping.yml` dit :
> "Va sur toutes mes machines et vérifie qu'elles répondent"

Et `update.yml` dit :
> "Va sur toutes mes machines et mets à jour tous les logiciels"

Tu écris la recette **une seule fois**,
Ansible l'exécute sur **toutes les machines**.

### 2️⃣ Le Backend Flask — "Le chef cuisinier"

C'est le **serveur Python** qui tourne en arrière-plan.
Quand tu cliques sur "Lancer" dans ton navigateur, c'est lui qui :

1. Reçoit ta demande
2. Lance la commande Ansible
3. Capture les résultats ligne par ligne
4. T'envoie les logs en temps réel

Sans le backend, ton navigateur ne peut pas parler à Ansible.

### 3️⃣ Le Frontend — "La cuisine que tu vois"

C'est l'interface web dans ton navigateur. Elle a **4 onglets** :

| Onglet | Ce que tu vois |
|--------|----------------|
| **Dashboard** | Bouton pour lancer un playbook + terminal de logs |
| **Playbooks** | Liste de toutes tes recettes disponibles |
| **Inventaire** | Liste de toutes tes machines |
| **Historique** | Toutes les actions passées avec leur résultat |

---

## 🔄 Comment tout ça fonctionne ensemble ?
Tu cliques "Lancer ping.yml"
↓
Le Frontend envoie une requête au Backend
↓
Le Backend lance "ansible-playbook ping.yml"
↓
Ansible se connecte à toutes les machines
↓
Les résultats remontent ligne par ligne
↓
Tu vois les logs apparaître en temps réel
dans le terminal du dashboard
---

## 🗂️ Structure du projet

netops-dashboard/
├── backend/
│   ├── app.py                 # API Flask + WebSocket
│   ├── ansible_runner.py      # Exécution des playbooks
│   └── requirements.txt       # Dépendances Python
├── frontend/
│   ├── index.html             # Dashboard
│   ├── style.css              # Thème sombre
│   └── script.js              # Logique JS + WebSocket
├── playbooks/
│   ├── ping.yml               # Test connectivité
│   ├── update.yml             # Mise à jour paquets
│   ├── deploy.yml             # Déploiement Nginx
│   └── check_disk.yml         # Vérification disque
├── inventory/
│   └── hosts.ini              # Liste des machines
├── .github/workflows/
│   └── ci.yml                 # Pipeline GitHub Actions
├── docker-compose.yml
├── Dockerfile
└── README.md

---

## 🚀 Installation & Lancement

### Prérequis
- Docker & Docker Compose
- Python 3.11+
- Ansible 2.15+

### 1. Cloner le dépôt

```bash
git clone https://github.com/karmokolassina22/netops-dashboard.git
cd netops-dashboard
```

### 2. Lancer avec Docker

```bash
docker-compose up --build
```

Accessible sur : **http://localhost:5000**

### 3. Lancer en mode développement

```bash
cd backend
pip install -r requirements.txt
python app.py
```

---

## 📡 API REST

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/playbooks` | Liste les playbooks |
| `POST` | `/api/run` | Lance un playbook |
| `GET` | `/api/history` | Historique des jobs |
| `GET` | `/api/inventory` | Liste des machines |
| `GET` | `/api/status/<job_id>` | Statut d'un job |

### Exemple de requête

```bash
curl -X POST http://localhost:5000/api/run \
  -H "Content-Type: application/json" \
  -d '{"playbook": "ping.yml"}'
```

### Exemple de réponse

```json
{
  "job_id": "abc123",
  "status": "running",
  "playbook": "ping.yml",
  "started_at": "2026-04-15T10:30:00"
}
```

---

## 🐳 Docker — "La boîte magique"

Docker c'est comme une **valise** qui contient tout ce dont
le projet a besoin — Python, Flask, Ansible, toutes les dépendances.

Au lieu de tout installer manuellement, tape juste :

```bash
docker-compose up
```

Et tout fonctionne. Sur n'importe quel ordinateur.

---

## ⚡ GitHub Actions — "Le robot vérificateur"

À chaque push sur GitHub, un robot vérifie automatiquement :
- ✅ Le code Python est-il bien écrit ?
- ✅ Les playbooks Ansible sont-ils valides ?
- ✅ Les tests passent-ils ?

Si quelque chose est cassé, tu reçois une alerte.

---

## 🗂️ Pourquoi des branches Git ?

On a travaillé avec des branches pour simuler le **travail en équipe** :

main                  ← version stable
├── feature/playbooks     ← playbooks Ansible
├── feature/backend       ← serveur Flask
├── feature/frontend      ← interface web
├── feature/docker-cicd   ← Docker + CI/CD
└── docs/readme           ← documentation

Chaque fonctionnalité est développée **isolément** puis
fusionnée dans `main` quand elle est prête.

---

## ⚙️ Fonctionnalités

### ✅ Implémentées
- [x] Lancement de playbooks via interface web
- [x] Logs en temps réel (WebSocket)
- [x] Gestion de l'inventaire des machines
- [x] Historique des exécutions
- [x] API REST documentée
- [x] Déploiement Docker
- [x] Pipeline CI/CD GitHub Actions

### 🔜 À venir
- [ ] Authentification utilisateur
- [ ] Planification des tâches (cron)
- [ ] Notifications email/Slack
- [ ] Métriques CPU/RAM/disque

---

## 📚 Ce que j'ai appris

- **Ansible** : création de playbooks, gestion d'inventaires
- **Flask** : API REST, WebSocket, gestion de processus
- **Docker** : conteneurisation d'une app multi-service
- **GitHub Actions** : pipeline CI/CD automatique
- **JavaScript** : fetch API, WebSocket, manipulation du DOM
- **Git** : branches, commits, merge, pull requests

---

## 👤 Auteur

**Ladji KARAMOKO**
- 🌐 Portfolio : [franckaxxl59-tech.github.io](https://franckaxxl59-tech.github.io)
- 🎓 MSc – DevOps & Développement Web

---

> ⭐ Si ce projet t'est utile, mets une étoile sur GitHub !