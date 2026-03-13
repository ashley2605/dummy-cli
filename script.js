const LOCAL_STORAGE_KEY = 'cyberAttackExplorerUserAdditions';
let cyberAttacks = [];
let virtualTotalAttacks = 0;

const resultDiv = document.getElementById('result');
const input = document.getElementById('promptInput');
const searchBtn = document.getElementById('searchBtn');
const showAllBtn = document.getElementById('showAllBtn');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const manageNotice = document.getElementById('manageNotice');
const addAttackForm = document.getElementById('addAttackForm');
const tabs = document.querySelectorAll('.sidebar-btn');

const profileModal = document.getElementById('profileModal');
const companyInput = document.getElementById('companyInput');
const designationInput = document.getElementById('designationInput');
const profilePhotoInput = document.getElementById('profilePhotoInput');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const profileWarning = document.getElementById('profileWarning');

const discussionStream = document.getElementById('discussionStream');
const discussionInput = document.getElementById('discussionInput');
const discussionSendBtn = document.getElementById('discussionSendBtn');
const clearDiscussionsBtn = document.getElementById('clearDiscussionsBtn');
const vulnerabilityList = document.getElementById('vulnerabilityList');
const adminPasswordInput = document.getElementById('adminPassword');
const adminLoginBtn = document.getElementById('adminLoginBtn');
const adminStatus = document.getElementById('adminStatus');
const adminPanel = document.getElementById('adminPanel');
const blockUserInput = document.getElementById('blockUserInput');
const blockUserBtn = document.getElementById('blockUserBtn');
const blockedUsersList = document.getElementById('blockedUsersList');
const adminUsersList = document.getElementById('adminUsersList');
const adminClearDiscussionsBtn = document.getElementById('adminClearDiscussionsBtn');

const BLOCKED_USERS_KEY = 'cyberAttackBlockedUsers';
const DISCUSSION_STORAGE_KEY = 'cyberAttackDiscussionMessages';
const ADMIN_SECRET = 'AQMAdmin123';
let discussionMessages = [];
let blockedUsers = [];
let isAdmin = false;
let currentUser = null;

function toSafeFilename(value) {
  return value.replace(/[^a-z0-9-_\.]/gi, '_').toLowerCase();
}

function getLocalAttacks() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
  } catch (e) {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    return [];
  }
}

function saveLocalAttacks(attacks) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(attacks));
}

function saveDiscussionMessages(messages) {
  localStorage.setItem(DISCUSSION_STORAGE_KEY, JSON.stringify(messages));
}

function loadDiscussionMessages() {
  try {
    const saved = localStorage.getItem(DISCUSSION_STORAGE_KEY);
    if (!saved) return [];
    return JSON.parse(saved);
  } catch (e) {
    localStorage.removeItem(DISCUSSION_STORAGE_KEY);
    return [];
  }
}

function saveBlockedUsers(users) {
  localStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(users));
}

function loadBlockedUsers() {
  try {
    const saved = localStorage.getItem(BLOCKED_USERS_KEY);
    if (!saved) return [];
    return JSON.parse(saved);
  } catch (e) {
    localStorage.removeItem(BLOCKED_USERS_KEY);
    return [];
  }
}

function renderBlockedUsers() {
  blockedUsersList.innerHTML = '';
  if (!blockedUsers.length) {
    blockedUsersList.innerHTML = '<p>No blocked users.</p>';
    return;
  }
  blockedUsers.forEach((user) => {
    const row = document.createElement('div');
    row.className = 'card';
    row.innerHTML = `<p>${user}</p><button class="secondary">Unblock</button>`;
    const btn = row.querySelector('button');
    btn.addEventListener('click', () => {
      blockedUsers = blockedUsers.filter((x) => x !== user);
      saveBlockedUsers(blockedUsers);
      renderBlockedUsers();
      renderUserDirectory();
    });
    blockedUsersList.appendChild(row);
  });
}

function renderUserDirectory() {
  if (!adminUsersList) return;

  const profile = loadProfileFromStorage();
  const discussionAuthors = [...new Set(discussionMessages.map((msg) => msg.author).filter(Boolean))];

  let html = '';

  if (profile && profile.company && profile.designation) {
    html += `<p><strong>Current profile:</strong> ${profile.designation}@${profile.company}</p>`;
  } else {
    html += '<p>No profile set yet.</p>';
  }

  if (discussionAuthors.length > 0) {
    html += '<p><strong>Discussion participants:</strong></p><ul>';
    discussionAuthors.forEach((author) => {
      html += `<li>${author}</li>`;
    });
    html += '</ul>';
  } else {
    html += '<p>No discussion participants yet.</p>';
  }

  if (blockedUsers.length > 0) {
    html += '<p><strong>Blocked users:</strong></p><ul>';
    blockedUsers.forEach((user) => {
      html += `<li>${user}</li>`;
    });
    html += '</ul>';
  } else {
    html += '<p>No blocked users.</p>';
  }

  adminUsersList.innerHTML = html;
}

function renderVulnerabilityList() {
  const localAttacks = getLocalAttacks();
  vulnerabilityList.innerHTML = '';

  if (!localAttacks.length) {
    vulnerabilityList.innerHTML = '<p>No vulnerabilities added yet. Add one in the Add tab.</p>';
    return;
  }

  localAttacks.forEach((attack, index) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h4>${attack.name} (${attack.year})</h4>
      <p>${attack.description.substring(0, 120)}${attack.description.length > 120 ? '...' : ''}</p>
      <button class="secondary">Delete</button>
    `;

    const deleteBtn = card.querySelector('button');
    deleteBtn.addEventListener('click', () => {
      if (!isAdmin) {
        alert('Admin login required to delete vulnerabilities.');
        return;
      }
      if (!confirm('Delete this vulnerability entry?')) return;
      localAttacks.splice(index, 1);
      saveLocalAttacks(localAttacks);
      loadDataset().then(() => {
        renderVulnerabilityList();
        renderEntries(cyberAttacks.slice(0, Math.min(10, cyberAttacks.length)));
        manageNotice.textContent = `Deleted vulnerability: ${attack.name}`;
      });
    });

    vulnerabilityList.appendChild(card);
  });
}

function mergeDatasets(base, local) {
  const keys = new Set();
  const combined = [...base];

  base.forEach((entry) => keys.add(`${entry.name.toLowerCase()}-${entry.year}`));
  local.forEach((entry) => {
    const key = `${entry.name.toLowerCase()}-${entry.year}`;
    if (!keys.has(key)) {
      combined.unshift(entry);
      keys.add(key);
    }
  });

  return combined;
}

function switchTab(targetId) {
  const chatHeader = document.querySelector('.chat-header');

  tabs.forEach((tab) => {
    const isActive = tab.dataset.target === targetId;
    tab.classList.toggle('active', isActive);
  });

  document.querySelectorAll('.tab-content').forEach((section) => {
    section.classList.toggle('active', section.id === targetId);
  });

  if (chatHeader) {
    chatHeader.style.display = targetId === 'searchTab' ? 'block' : 'none';
  }

  showAllBtn.style.display = targetId === 'searchTab' ? 'inline-flex' : 'none';
  if (targetId === 'searchTab') {
    resultDiv.style.display = 'flex';
    discussionInput.disabled = true;
    discussionSendBtn.disabled = true;
  } else if (targetId === 'discussionTab') {
    resultDiv.style.display = 'none';
    discussionInput.disabled = false;
    discussionSendBtn.disabled = false;
  } else {
    resultDiv.style.display = 'none';
    discussionInput.disabled = true;
    discussionSendBtn.disabled = true;
  }
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    switchTab(tab.dataset.target);
  });
});

function setChatEnabled(enabled) {
  input.disabled = !enabled;
  searchBtn.disabled = !enabled;
  if (enabled) {
    profileWarning.textContent = '';
  }
}

function setDiscussionEnabled(enabled) {
  discussionInput.disabled = !enabled;
  discussionSendBtn.disabled = !enabled;
}

function saveProfileToStorage(user) {
  localStorage.setItem('cyberAttackUser', JSON.stringify(user));
}

function loadProfileFromStorage() {
  try {
    const saved = localStorage.getItem('cyberAttackUser');
    if (!saved) return null;
    return JSON.parse(saved);
  } catch (e) {
    localStorage.removeItem('cyberAttackUser');
    return null;
  }
}

function completeUserProfile(company, designation, avatarDataUrl = '') {
  currentUser = { company, designation, avatar: avatarDataUrl };
  saveProfileToStorage(currentUser);
  profileModal.classList.add('hidden');
  setChatEnabled(true);

  if (document.querySelector('.sidebar-btn.active').dataset.target === 'discussionTab') {
    discussionInput.focus();
  } else {
    input.focus();
  }

  const welcome = document.createElement('article');
  welcome.className = 'message-card ai';
  welcome.innerHTML = `<p>Welcome ${designation} from ${company}! Feel free to ask or participate in discussions.</p>`;
  discussionStream && discussionStream.appendChild(welcome);
}

saveProfileBtn.addEventListener('click', () => {
  const company = companyInput.value.trim();
  const designation = designationInput.value.trim();
  const photoFile = profilePhotoInput.files && profilePhotoInput.files[0];

  if (!company || !designation) {
    profileWarning.textContent = 'Company name and designation are required.';
    return;
  }

  if (photoFile) {
    const reader = new FileReader();
    reader.onload = function (event) {
      completeUserProfile(company, designation, event.target.result);
    };
    reader.readAsDataURL(photoFile);
  } else {
    completeUserProfile(company, designation, '');
  }
});

discussionSendBtn.addEventListener('click', () => {
  const msg = discussionInput.value.trim();
  if (!msg) return;

  const author = currentUser ? `${currentUser.designation}@${currentUser.company}` : 'Guest@Global';
  if (blockedUsers.includes(author)) {
    alert('Your account is blocked from participating in discussions. Contact admin.');
    discussionInput.value = '';
    return;
  }

  appendDiscussionMessage(msg, author);
  discussionInput.value = '';
});

discussionInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    discussionSendBtn.click();
  }
});

function appendDiscussionMessage(message, author = 'Guest') {
  const timestamp = new Date().toLocaleTimeString();
  const item = document.createElement('article');
  item.className = 'message-card user';
  item.innerHTML = `<p><strong>${author}:</strong> ${message}</p><small>${timestamp}</small>`;
  discussionStream && discussionStream.appendChild(item);
  discussionStream && (discussionStream.scrollTop = discussionStream.scrollHeight);

  discussionMessages.push({ author, message, timestamp });
  saveDiscussionMessages(discussionMessages);
  if (isAdmin) renderUserDirectory();
}

function renderDiscussionHistory() {
  discussionMessages = loadDiscussionMessages();
  discussionStream.innerHTML = '';

  if (discussionMessages.length === 0) {
    discussionStream.innerHTML = '<article class="message-card ai"><p>No discussions available.</p></article>';
    return;
  }

  discussionMessages.forEach((entry, index) => {
    const item = document.createElement('article');
    item.className = 'message-card user';
    item.innerHTML = `
      <p><strong>${entry.author}:</strong> ${entry.message}</p>
      <small>${entry.timestamp}</small>
      <button class="secondary discussion-remove">Delete</button>
    `;

    const removeBtn = item.querySelector('.discussion-remove');
    removeBtn.addEventListener('click', () => {
      discussionMessages.splice(index, 1);
      saveDiscussionMessages(discussionMessages);
      renderDiscussionHistory();
    });

    discussionStream.appendChild(item);
  });
  discussionStream.scrollTop = discussionStream.scrollHeight;
}

function clearDiscussionHistory() {
  if (!confirm('Are you sure you want to delete all discussions?')) return;
  discussionMessages = [];
  saveDiscussionMessages(discussionMessages);
  if (discussionStream) {
    discussionStream.innerHTML = '';
  }
  if (isAdmin) renderUserDirectory();
}

clearDiscussionsBtn.addEventListener('click', () => {
  clearDiscussionHistory();
});

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

function downloadReport(item) {
  const payload = {
    name: item.name,
    year: item.year,
    description: item.description,
    realWorldExample: item.realWorldExample || 'N/A',
    perpetrator: item.perpetrator || 'N/A',
    category: item.category || 'N/A',
    sector: item.sector || 'N/A',
    affected: item.affected || 'N/A',
    remediation: item.remediation || 'N/A'
  };
  downloadJson(payload, `cyberattack-report-${toSafeFilename(item.name)}.json`);
}

function updateStats(entries) {
  // Removed individual statistic cards and ratios by user request.
  // Keep this function for compatibility with render logic, but no UI counts are rendered.
}

function generateSyntheticAttacks(maxRecords = 5000) {
  const names = ['PhishWorm', 'ZeroX', 'NexusRansom', 'DataDrain', 'SupplyShad0w', 'LogicBreach', 'Stormfall'];
  const categories = ['Phishing', 'Zero-day', 'Ransomware', 'Data breach', 'Supply chain', 'Business logic abuse'];
  const sectors = ['Finance', 'Health', 'Government', 'Energy', 'Retail', 'Technology'];

  const synthetic = Array.from({ length: maxRecords }, (_, idx) => {
    const category = categories[idx % categories.length];
    return {
      name: `${names[idx % names.length]}-${idx + 1}`,
      year: 2000 + (idx % 26),
      description: `Synthetic record #${idx + 1} description for ${category}.`,
      perpetrator: `Actor ${String.fromCharCode(65 + (idx % 26))}`,
      remediation: `Standard mitigation: patch, audit, alert.`,
      impact: `Simulated impact for testing purposes.`,
      realWorldExample: `Simulated attack scenario for non-tech viewers.`,
      attackVector: `Synthetic vector ${idx % 5}`,
      cveId: idx % 2 === 0 ? `CVE-2025-${1000 + idx}` : 'N/A',
      losses: `${(idx + 1) * 1e5} USD simulated`,
      rootCause: 'Testing data surge behavior',
      discovery: 'Generated in client for volume tests',
      detectionTimeline: `${Math.max(1, idx % 10)} days`,
      mitigationNotes: 'Generic mitigation in synthesized records',
      category,
      sector: sectors[idx % sectors.length],
      affected: `${50 + (idx % 400)} systems`
    };
  });

  const isHuge = maxRecords > 200000;
  const sampleLimit = isHuge ? 200000 : maxRecords;
  // Keep the full simulated universe count separately
  virtualTotalAttacks = maxRecords;
  const sampleData = synthetic.slice(0, sampleLimit);
  cyberAttacks = [...sampleData, ...getLocalAttacks()];
  manageNotice.textContent = `Created synthetic sample records.`;
  renderEntries(cyberAttacks);
}

function renderEntries(entries, append = false) {
  updateStats(entries);

  if (!append) {
    resultDiv.innerHTML = '';
  }

  if (!entries.length) {
    resultDiv.innerHTML += '<article class="message-card ai"><p>No matches found. Try keywords like "business logic", "zero-day", "non cve", or a year like "2017".</p></article>';
    return;
  }

  resultDiv.innerHTML += entries.map((item) => `
    <article class="card message-card ai">
      <h3>${item.name} (${item.year})</h3>
      <p><strong>Category:</strong> ${item.category || 'N/A'}</p>
      <p><strong>Sector affected:</strong> ${item.sector || 'N/A'} | <strong>Primary victims:</strong> ${item.affected || 'N/A'}</p>
      <p><strong>Description:</strong> ${item.description}</p>
      <p><strong>Real world example:</strong> ${item.realWorldExample || 'A simple explanation for anyone.'}</p>
      <p><strong>Attack vector:</strong> ${item.attackVector || 'Unknown'}</p>
      <p><strong>CVE / ID:</strong> ${item.cveId || 'Not applicable'}</p>
      <p><strong>Estimated loss:</strong> ${item.losses || 'N/A'}</p>
      <p><strong>Root cause:</strong> ${item.rootCause || 'Not specified'}</p>
      <p><strong>Discovery:</strong> ${item.discovery || 'Not documented'}</p>
      <p><strong>Mitigation notes:</strong> ${item.mitigationNotes || 'Refer remediation steps'}</p>
      <p><strong>Detection timeline:</strong> ${item.detectionTimeline || 'Not available'}</p>
      <p><strong>Impact details:</strong> ${item.impact}</p>
      <p><strong>Perpetrator:</strong> ${item.perpetrator || 'Unknown'}</p>
      <p><strong>Remediation:</strong> ${item.remediation}</p>
      <button class="downloadBtn" data-attack="${item.name}-${item.year}">Download report</button>
    </article>
  `).join('');

  document.querySelectorAll('.downloadBtn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const identifier = btn.dataset.attack;
      const item = cyberAttacks.find((x) => `${x.name}-${x.year}` === identifier);
      if (item) downloadReport(item);
    });
  });
}

function searchAttacks() {
  const term = input.value.trim();
  const normalizedTerm = term.toLowerCase();

  resultDiv.innerHTML = `<article class="message-card user"><p>${term || 'Show all attacks'}</p></article>`;

  let entries = cyberAttacks;
  if (term && !['business logic', 'non cve', 'zero-day', 'zero day', 'all', 'phishing'].some((check) => normalizedTerm.includes(check))) {
    entries = cyberAttacks.filter((attack) => {
      const fields = [
        attack.name,
        String(attack.year),
        attack.description,
        attack.realWorldExample,
        attack.perpetrator,
        attack.remediation,
        attack.category,
        attack.sector,
        attack.affected
      ].join(' ').toLowerCase();
      return fields.includes(normalizedTerm);
    });
  }

  renderEntries(entries, true);
}

function submitNewAttack(event) {
  event.preventDefault();

  const newAttack = {
    name: document.getElementById('attackName').value.trim(),
    year: Number(document.getElementById('attackYear').value),
    description: document.getElementById('attackDescription').value.trim(),
    realWorldExample: document.getElementById('attackRealExample').value.trim(),
    perpetrator: document.getElementById('attackPerpetrator').value.trim() || 'Unknown',
    remediation: document.getElementById('attackRemediation').value.trim(),
    category: document.getElementById('attackCategory').value.trim() || 'General',
    sector: document.getElementById('attackSector').value.trim() || 'Unknown',
    affected: document.getElementById('attackAffected').value.trim() || 'Unknown'
  };

  if (!newAttack.name || !newAttack.year || !newAttack.description || !newAttack.realWorldExample || !newAttack.remediation) {
    alert('Please complete required fields: name, year, description, real-world example, remediation.');
    return;
  }

  const localAttacks = getLocalAttacks();
  const uniqueKey = `${newAttack.name.toLowerCase()}-${newAttack.year}`;
  const existsIndex = localAttacks.findIndex((attack) => `${attack.name.toLowerCase()}-${attack.year}` === uniqueKey);

  if (existsIndex !== -1) {
    localAttacks[existsIndex] = newAttack;
  } else {
    localAttacks.unshift(newAttack);
  }

  saveLocalAttacks(localAttacks);
  cyberAttacks = mergeDatasets(cyberAttacks, localAttacks);
  renderEntries(cyberAttacks);
  addAttackForm.reset();
  manageNotice.textContent = `Added/updated attack ${newAttack.name}.`; 
  switchTab('searchTab');
}

async function loadDataset() {
  let remoteAttacks = [];
  try {
    const response = await fetch('attacks.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Fetch failed');
    remoteAttacks = await response.json();
  } catch (e) {
    console.warn('Could not load attacks.json; local entries will be used.', e);
  }

  const localAttacks = getLocalAttacks();
  cyberAttacks = mergeDatasets(remoteAttacks, localAttacks);
  renderEntries(cyberAttacks.slice(0, Math.min(10, cyberAttacks.length)));
}

searchBtn.addEventListener('click', searchAttacks);
input.addEventListener('keypress', (e) => { if (e.key === 'Enter') searchAttacks(); });
showAllBtn.addEventListener('click', () => {
  if (cyberAttacks.length <= 15 && virtualTotalAttacks === 0) {
    // Expand to a working large dataset sample on first use
    generateSyntheticAttacks(20000);
    return;
  }

  const safeRenderLimit = 1000;
  if (cyberAttacks.length > safeRenderLimit) {
    renderEntries(cyberAttacks.slice(0, safeRenderLimit));
    manageNotice.textContent = `Displayed first ${safeRenderLimit.toLocaleString()} records to prevent UI hang. Use search/filter to narrow results.`;
  } else {
    renderEntries(cyberAttacks);
    manageNotice.textContent = '';
  }
});

downloadAllBtn.addEventListener('click', () => {
  if (!cyberAttacks.length) return alert('No data to download');
  downloadJson(cyberAttacks, 'cyberattack-full-report.json');
});
addAttackForm.addEventListener('submit', (event) => {
  submitNewAttack(event);
  renderVulnerabilityList();
});

adminLoginBtn.addEventListener('click', () => {
  const password = adminPasswordInput.value.trim();
  if (password === ADMIN_SECRET) {
    isAdmin = true;
    adminPanel.classList.remove('hidden');
    adminStatus.textContent = 'Admin authenticated. You can now manage manually.';
    adminStatus.style.color = '#22c55e';
    renderVulnerabilityList();
    renderBlockedUsers();
    renderUserDirectory();
    return;
  }
  adminStatus.textContent = 'Invalid password. Access denied.';
  adminStatus.style.color = '#f87171';
});

blockUserBtn.addEventListener('click', () => {
  if (!isAdmin) {
    alert('Only admins can block users.');
    return;
  }
  const userToBlock = blockUserInput.value.trim();
  if (!userToBlock) {
    alert('Enter a user tag to block (e.g. Analyst@ACME).');
    return;
  }
  if (blockedUsers.includes(userToBlock)) {
    alert('This user is already blocked.');
    return;
  }
  blockedUsers.push(userToBlock);
  saveBlockedUsers(blockedUsers);
  blockUserInput.value = '';
  renderBlockedUsers();
});

adminClearDiscussionsBtn.addEventListener('click', () => {
  if (!isAdmin) {
    alert('Only admins can clear discussions.');
    return;
  }
  clearDiscussionHistory();
  renderDiscussionHistory();
  manageNotice.textContent = 'All discussions have been cleared by admin.';
});

// Theme switch and fullscreen are removed to keep a consistent ChatGPT-style UI.
const savedProfile = loadProfileFromStorage();
if (savedProfile && savedProfile.company && savedProfile.designation) {
  currentUser = savedProfile;
  profileModal.classList.add('hidden');
  setChatEnabled(true);
  const welcomeRes = document.createElement('article');
  welcomeRes.className = 'message-card ai';
  welcomeRes.innerHTML = `<p>Welcome back ${currentUser.designation} from ${currentUser.company}! Ready to continue.</p>`;
  discussionStream.appendChild(welcomeRes);
} else {
  setChatEnabled(false);
}

blockedUsers = loadBlockedUsers();
renderBlockedUsers();
renderUserDirectory();
renderVulnerabilityList();
renderDiscussionHistory();
loadDataset().then(() => {
  renderVulnerabilityList();
});
