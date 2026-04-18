const API_BASE = "http://localhost:5000";

const DEMO_PLAYBOOKS = [
  { name: "ping.yml",       description: "Test de connectivité de toutes les machines" },
  { name: "update.yml",     description: "Mise à jour des paquets système" },
  { name: "deploy.yml",     description: "Déploiement de Nginx sur les serveurs web" },
  { name: "check_disk.yml", description: "Vérification de l'espace disque" }
];

const DEMO_MACHINES = [
  { name: "web01",     ansible_host: "192.168.1.10", group: "webservers", ansible_user: "ubuntu" },
  { name: "web02",     ansible_host: "192.168.1.11", group: "webservers", ansible_user: "ubuntu" },
  { name: "db01",      ansible_host: "192.168.1.20", group: "databases",  ansible_user: "ubuntu" },
  { name: "monitor01", ansible_host: "192.168.1.30", group: "monitoring", ansible_user: "ubuntu" }
];

let jobsHistory = [];
let currentJobId = null;
let socket = null;
let isDemo = false;

document.addEventListener("DOMContentLoaded", function () {
  updateDate();
  initNavigation();
  connectWebSocket();
  loadPlaybooks();
  loadInventory();
  loadHistory();
});

function updateDate() {
  const el = document.getElementById("currentDate");
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString("fr-FR", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric"
  });
}

function initNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  const tabs = document.querySelectorAll(".tab-content");
  const pageTitle = document.getElementById("pageTitle");
  const titles = { dashboard: "Dashboard", playbooks: "Playbooks", inventory: "Inventaire", history: "Historique" };

  navItems.forEach(function (item) {
    item.addEventListener("click", function (e) {
      e.preventDefault();
      const tab = item.dataset.tab;
      navItems.forEach(function (n) { n.classList.remove("active"); });
      item.classList.add("active");
      tabs.forEach(function (t) { t.classList.remove("active"); });
      const activeTab = document.getElementById("tab-" + tab);
      if (activeTab) activeTab.classList.add("active");
      if (pageTitle) pageTitle.textContent = titles[tab] || tab;
      if (tab === "history") loadHistory();
    });
  });
}

function connectWebSocket() {
  try {
    socket = io(API_BASE);
    socket.on("connect", function () {
      setWsStatus("connected", "Connecté");
      addLog("info", "WebSocket connecté au backend");
    });
    socket.on("disconnect", function () { setWsStatus("disconnected", "Déconnecté"); });
    socket.on("log", function (data) {
      if (data.job_id === currentJobId || !currentJobId) {
        addLog(data.type || "info", data.message);
      }
    });
    socket.on("job_finished", function () {
      const btn = document.getElementById("btnRun");
      const btnText = document.getElementById("btnText");
      if (btn) btn.disabled = false;
      if (btnText) btnText.textContent = "▶ Lancer";
      loadHistory();
      updateStats();
    });
  } catch (e) {
    isDemo = true;
    setWsStatus("disconnected", "Mode démo");
    addLog("warning", "⚠️ Backend non disponible — Mode démonstration activé");
  }
}

function setWsStatus(state, label) {
  const dot = document.querySelector(".ws-dot");
  const text = document.getElementById("wsStatus");
  if (dot) dot.className = "ws-dot " + state;
  if (text) text.textContent = label;
}

function addLog(type, message) {
  const terminal = document.getElementById("terminal");
  if (!terminal) return;
  const line = document.createElement("div");
  line.className = "terminal-line " + (type || "info");
  const prompt = document.createElement("span");
  prompt.className = "terminal-prompt";
  prompt.textContent = "$";
  const text = document.createElement("span");
  text.textContent = " " + message;
  line.appendChild(prompt);
  line.appendChild(text);
  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;
}

function clearLogs() {
  const terminal = document.getElementById("terminal");
  if (terminal) terminal.innerHTML = "";
  addLog("info", "Terminal effacé");
}

function loadPlaybooks() {
  fetch(API_BASE + "/api/playbooks")
    .then(function (res) { return res.json(); })
    .then(function (data) { displayPlaybooks(data.playbooks || []); })
    .catch(function () { displayPlaybooks(DEMO_PLAYBOOKS); });
}

function displayPlaybooks(playbooks) {
  const select = document.getElementById("playbookSelect");
  if (select) {
    select.innerHTML = '<option value="">-- Sélectionne un playbook --</option>';
    playbooks.forEach(function (p) {
      const opt = document.createElement("option");
      opt.value = p.name;
      opt.textContent = p.name;
      opt.dataset.desc = p.description || "";
      select.appendChild(opt);
    });
    select.addEventListener("change", function () {
      const selected = select.options[select.selectedIndex];
      const desc = document.getElementById("playbookDesc");
      if (desc) desc.textContent = selected.dataset.desc || "Aucune description";
    });
  }
  const list = document.getElementById("playbooksList");
  if (list) {
    list.innerHTML = "";
    playbooks.forEach(function (p) {
      const card = document.createElement("div");
      card.className = "playbook-card";
      card.innerHTML = `
        <div>
          <div class="playbook-name">📄 ${p.name}</div>
          <div class="playbook-desc">${p.description || "Playbook Ansible"}</div>
        </div>
        <button class="btn-play" onclick="quickLaunch('${p.name}')">▶ Lancer</button>
      `;
      list.appendChild(card);
    });
  }
  const statEl = document.getElementById("statPlaybooks");
  if (statEl) statEl.textContent = playbooks.length;
}

function runPlaybook() {
  const select = document.getElementById("playbookSelect");
  const btn = document.getElementById("btnRun");
  const btnText = document.getElementById("btnText");
  if (!select || !select.value) {
    addLog("warning", "⚠️ Sélectionne un playbook avant de lancer");
    return;
  }
  launchPlaybook(select.value, btn, btnText);
}

function quickLaunch(playbookName) {
  document.querySelector('[data-tab="dashboard"]').click();
  setTimeout(function () { launchPlaybook(playbookName, null, null); }, 300);
}

function launchPlaybook(playbook, btn, btnText) {
  clearLogs();
  addLog("info", `🚀 Lancement de ${playbook}...`);
  if (btn) btn.disabled = true;
  if (btnText) btnText.textContent = "⏳ En cours...";
  if (isDemo) { simulatePlaybook(playbook, btn, btnText); return; }
  fetch(API_BASE + "/api/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playbook: playbook })
  })
  .then(function (res) { return res.json(); })
  .then(function (data) {
    currentJobId = data.job_id;
    addLog("info", `🔖 Job ID : ${data.job_id}`);
  })
  .catch(function (err) {
    addLog("error", "❌ Erreur : " + err.message);
    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = "▶ Lancer";
  });
}

function simulatePlaybook(playbook, btn, btnText) {
  const fakeLogs = [
    ["info",    `PLAY [${playbook}] *************************************`],
    ["info",    "TASK [Gathering Facts] *******************************"],
    ["success", "ok: [web01]"],
    ["success", "ok: [web02]"],
    ["info",    "TASK [Exécution principale] **************************"],
    ["success", "changed: [web01]"],
    ["success", "ok: [web02]"],
    ["info",    "PLAY RECAP *******************************************"],
    ["success", "web01 : ok=2  changed=1  unreachable=0  failed=0"],
    ["success", "web02 : ok=2  changed=0  unreachable=0  failed=0"],
  ];
  let i = 0;
  const jobId = Math.random().toString(36).substr(2, 8);
  currentJobId = jobId;
  const interval = setInterval(function () {
    if (i < fakeLogs.length) {
      addLog(fakeLogs[i][0], fakeLogs[i][1]);
      i++;
    } else {
      clearInterval(interval);
      addLog("success", "✅ Playbook terminé avec succès");
      jobsHistory.unshift({
        job_id: jobId, playbook: playbook, status: "success",
        started_at: new Date().toISOString(), finished_at: new Date().toISOString()
      });
      if (btn) btn.disabled = false;
      if (btnText) btnText.textContent = "▶ Lancer";
      updateStats();
      loadHistory();
    }
  }, 400);
}

function loadInventory() {
  fetch(API_BASE + "/api/inventory")
    .then(function (res) { return res.json(); })
    .then(function (data) { displayInventory(data.machines || []); })
    .catch(function () { displayInventory(DEMO_MACHINES); });
}

function displayInventory(machines) {
  const tbody = document.getElementById("inventoryBody");
  if (!tbody) return;
  if (!machines.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading">Aucune machine</td></tr>';
    return;
  }
  tbody.innerHTML = machines.map(function (m) {
    return `<tr>
      <td class="mono">${m.name}</td>
      <td class="mono">${m.ansible_host || "—"}</td>
      <td><span class="badge badge-unknown">${m.group || "—"}</span></td>
      <td class="mono">${m.ansible_user || "ubuntu"}</td>
      <td><span class="badge badge-success">● En ligne</span></td>
    </tr>`;
  }).join("");
  const statEl = document.getElementById("statMachines");
  if (statEl) statEl.textContent = machines.length;
}

function loadHistory() {
  fetch(API_BASE + "/api/history")
    .then(function (res) { return res.json(); })
    .then(function (data) { displayHistory(data.history || []); })
    .catch(function () { displayHistory(jobsHistory); });
}

function displayHistory(history) {
  const tbody = document.getElementById("historyBody");
  if (!tbody) return;
  if (!history.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading">Aucune exécution</td></tr>';
    return;
  }
  tbody.innerHTML = history.map(function (j) {
    const badgeClass = j.status === "success" ? "badge-success"
                     : j.status === "failed"  ? "badge-error"
                     : j.status === "running" ? "badge-running" : "badge-unknown";
    const statusLabel = j.status === "success" ? "✅ Succès"
                      : j.status === "failed"  ? "❌ Échec"
                      : j.status === "running" ? "⏳ En cours" : "—";
    return `<tr>
      <td class="mono">${j.job_id}</td>
      <td class="mono">${j.playbook}</td>
      <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
      <td class="mono">${formatDate(j.started_at)}</td>
      <td class="mono">${j.finished_at ? formatDate(j.finished_at) : "—"}</td>
    </tr>`;
  }).join("");
}

function formatDate(isoString) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleString("fr-FR", {
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
}

function updateStats() {
  const success = jobsHistory.filter(function (j) { return j.status === "success"; }).length;
  const failed  = jobsHistory.filter(function (j) { return j.status === "failed";  }).length;
  const s = document.getElementById("statSuccess");
  const f = document.getElementById("statFailed");
  if (s) s.textContent = success;
  if (f) f.textContent = failed;
}