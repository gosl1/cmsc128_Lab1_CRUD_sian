const authView = document.getElementById('auth-view');
const dashboardView = document.getElementById('dashboard-view');
const authMessage = document.getElementById('auth-message');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const tabButtons = document.querySelectorAll('.tab-button');
const resetRequestForm = document.getElementById('reset-request-form');
const resetConfirmForm = document.getElementById('reset-confirm-form');

const addTaskToggle = document.getElementById('add-task-toggle');
const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('todo-input');
const dueDateEl = document.getElementById('due-date');
const priorityEl = document.getElementById('priority');
const categoryEl = document.getElementById('category');
const todoCancelButton = document.getElementById('todo-cancel');
const list = document.getElementById('todo-list');

const accountButton = document.getElementById('account-button');
const accountMenu = document.getElementById('account-menu');
const accountInitial = document.getElementById('account-initial');
const accountInitialLarge = document.getElementById('account-initial-large');
const menuDisplayName = document.getElementById('menu-display-name');
const menuUsername = document.getElementById('menu-username');
const profileForm = document.getElementById('profile-form');
const profileUsernameInput = document.getElementById('profile-username');
const profileDisplayNameInput = document.getElementById('profile-display-name');
const profilePasswordInput = document.getElementById('profile-password');
const logoutButton = document.getElementById('logout-button');

const undoNotificationEl = document.getElementById('undo-notification');

let lastDeleted = null;
let undoTimeout = null;
let currentUser = null;
let openTaskMenu = null;

function showMessage(text, type = 'info') {
  authMessage.textContent = text;
  authMessage.className = `message-box ${type}`;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch (error) {
    payload = {};
  }

  if (!response.ok) {
    throw new Error(payload.error || payload.message || 'Request failed');
  }

  return payload;
}

function setActiveTab(tabName) {
  tabButtons.forEach((button) => {
    const active = button.dataset.tab === tabName;
    button.classList.toggle('active', active);
  });

  loginForm.classList.toggle('active', tabName === 'login');
  registerForm.classList.toggle('active', tabName === 'register');
}

function toggleAuthViews(isAuthenticated) {
  authView.classList.toggle('hidden', isAuthenticated);
  dashboardView.classList.toggle('hidden', !isAuthenticated);
}

function initials(text) {
  return (text || 'U').trim().charAt(0).toUpperCase() || 'U';
}

function closeAccountMenu() {
  accountMenu.classList.add('hidden');
  accountButton.setAttribute('aria-expanded', 'false');
}

function closeTaskMenu() {
  if (openTaskMenu) {
    openTaskMenu.menu.classList.add('hidden');
    openTaskMenu.button.classList.remove('open');
    openTaskMenu = null;
  }
}

async function fetchUserProfile() {
  try {
    const data = await api('/api/profile');
    currentUser = data.user;
    const label = currentUser.display_name || currentUser.username;
    accountInitial.textContent = initials(label);
    accountInitialLarge.textContent = initials(label);
    menuDisplayName.textContent = label;
    menuUsername.textContent = currentUser.username;
    profileUsernameInput.value = currentUser.username;
    profileDisplayNameInput.value = currentUser.display_name || '';
    toggleAuthViews(true);
    await loadTasks();
  } catch (error) {
    currentUser = null;
    toggleAuthViews(false);
    setActiveTab('login');
  }
}

async function loadTasks() {
  try {
    const tasks = await api('/api/tasks');
    renderTasks(tasks);
  } catch (error) {
    renderTasks([]);
  }
}

function renderTasks(tasks) {
  closeTaskMenu();
  list.innerHTML = '';

  tasks.forEach((task) => {
    const item = document.createElement('li');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', async () => {
      await api(`/api/tasks/${task.id}`, {
        method: 'PUT',
        body: JSON.stringify({ completed: checkbox.checked }),
      });
      await loadTasks();
    });

    const text = document.createElement('span');
    text.className = 'todo-text' + (task.completed ? ' done' : '');
    text.textContent = task.title;

    const meta = document.createElement('div');
    meta.className = 'task-meta';
    const parts = [];
    if (task.priority) parts.push(task.priority);
    if (task.category) parts.push(task.category);
    if (task.due_date) {
      const date = new Date(task.due_date);
      parts.push(Number.isNaN(date.getTime()) ? task.due_date : date.toLocaleString());
    }
    meta.textContent = parts.join(' • ');

    const content = document.createElement('div');
    content.className = 'task-content';
    content.appendChild(text);
    content.appendChild(meta);

    // three-dot menu (hidden until hover, or while it's the open one)
    const menuWrap = document.createElement('div');
    menuWrap.className = 'task-menu-wrap';

    const menuButton = document.createElement('button');
    menuButton.type = 'button';
    menuButton.className = 'task-menu-button';
    menuButton.textContent = '⋮';
    menuButton.setAttribute('aria-label', 'Task options');

    const menu = document.createElement('div');
    menu.className = 'task-menu hidden';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.textContent = 'Edit';

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = 'Delete';

    menu.appendChild(editBtn);
    menu.appendChild(deleteBtn);
    menuWrap.appendChild(menuButton);
    menuWrap.appendChild(menu);

    menuButton.addEventListener('click', (event) => {
      event.stopPropagation();
      const alreadyOpen = openTaskMenu && openTaskMenu.menu === menu;
      closeTaskMenu();
      if (!alreadyOpen) {
        menu.classList.remove('hidden');
        menuButton.classList.add('open');
        openTaskMenu = { menu, button: menuButton };
      }
    });

    deleteBtn.addEventListener('click', async () => {
      closeTaskMenu();
      if (!confirm('Are you sure you want to delete this task?')) return;

      if (undoTimeout) {
        clearTimeout(undoTimeout);
        undoTimeout = null;
        lastDeleted = null;
        undoNotificationEl.classList.remove('show');
      }

      await api(`/api/tasks/${task.id}`, { method: 'DELETE' });
      lastDeleted = task;
      item.remove();

      undoNotificationEl.innerHTML = `
        <span>Task deleted</span>
        <button id="undo-btn" type="button">Undo</button>
      `;
      undoNotificationEl.classList.add('show');

      const undoBtn = document.getElementById('undo-btn');
      undoBtn.addEventListener('click', async () => {
        if (!lastDeleted) return;
        await api('/api/tasks', {
          method: 'POST',
          body: JSON.stringify({
            title: lastDeleted.title,
            completed: lastDeleted.completed,
            due_date: lastDeleted.due_date,
            priority: lastDeleted.priority,
            category: lastDeleted.category,
          }),
        });
        lastDeleted = null;
        if (undoTimeout) {
          clearTimeout(undoTimeout);
          undoTimeout = null;
        }
        undoNotificationEl.classList.remove('show');
        await loadTasks();
      });

      undoTimeout = setTimeout(() => {
        lastDeleted = null;
        undoNotificationEl.classList.remove('show');
        undoTimeout = null;
      }, 5000);
    });

    editBtn.addEventListener('click', () => {
      closeTaskMenu();

      const editInput = document.createElement('input');
      editInput.type = 'text';
      editInput.className = 'todo-title-input';
      editInput.value = task.title;
      text.replaceWith(editInput);
      editInput.focus();
      editInput.select();

      const actions = document.createElement('div');
      actions.className = 'task-edit-actions';

      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'save-btn';
      saveBtn.textContent = 'Save';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'cancel-btn';
      cancelBtn.textContent = 'Cancel';

      actions.appendChild(cancelBtn);
      actions.appendChild(saveBtn);
      menuWrap.replaceWith(actions);

      const commit = async () => {
        const newTitle = editInput.value.trim();
        if (newTitle && newTitle !== task.title) {
          await api(`/api/tasks/${task.id}`, {
            method: 'PUT',
            body: JSON.stringify({ title: newTitle }),
          });
        }
        await loadTasks();
      };

      saveBtn.addEventListener('click', commit);
      cancelBtn.addEventListener('click', () => loadTasks());
      editInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') commit();
        if (event.key === 'Escape') loadTasks();
      });
    });

    item.appendChild(checkbox);
    item.appendChild(content);
    item.appendChild(menuWrap);
    list.appendChild(item);
  });
}

tabButtons.forEach((button) => {
  button.addEventListener('click', () => setActiveTab(button.dataset.tab));
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(loginForm);
  try {
    await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({
        username: data.get('username'),
        password: data.get('password'),
      }),
    });
    showMessage('Login successful.', 'success');
    await fetchUserProfile();
  } catch (error) {
    showMessage(error.message, 'error');
  }
});

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(registerForm);
  try {
    await api('/api/register', {
      method: 'POST',
      body: JSON.stringify({
        username: data.get('username'),
        display_name: data.get('display_name'),
        password: data.get('password'),
      }),
    });
    showMessage('Account created. You can now log in.', 'success');
    setActiveTab('login');
    loginForm.reset();
    registerForm.reset();
  } catch (error) {
    showMessage(error.message, 'error');
  }
});

resetRequestForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(resetRequestForm);
  try {
    const result = await api('/api/password-reset/request', {
      method: 'POST',
      body: JSON.stringify({ username: data.get('username') }),
    });
    showMessage(result.message + (result.token ? ` Token: ${result.token}` : ''), 'info');
    resetRequestForm.reset();
  } catch (error) {
    showMessage(error.message, 'error');
  }
});

resetConfirmForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(resetConfirmForm);
  try {
    const result = await api('/api/password-reset/confirm', {
      method: 'POST',
      body: JSON.stringify({
        token: data.get('token'),
        password: data.get('password'),
      }),
    });
    showMessage(result.message, 'success');
    resetConfirmForm.reset();
    setActiveTab('login');
  } catch (error) {
    showMessage(error.message, 'error');
  }
});

// ---- Add-task toggle ----

function openTodoForm() {
  todoForm.classList.remove('hidden');
  addTaskToggle.classList.add('hidden');
  todoInput.focus();
}

function closeTodoForm() {
  todoForm.classList.add('hidden');
  addTaskToggle.classList.remove('hidden');
  todoForm.reset();
  priorityEl.selectedIndex = 1;
  categoryEl.selectedIndex = 2;
}

addTaskToggle.addEventListener('click', openTodoForm);
todoCancelButton.addEventListener('click', closeTodoForm);

todoForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const title = todoInput.value.trim();
  if (!title) {
    return;
  }

  await api('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({
      title,
      due_date: dueDateEl.value || null,
      priority: priorityEl.value,
      category: categoryEl.value,
    }),
  });

  closeTodoForm();
  await loadTasks();
});

// ---- Account menu ----

accountButton.addEventListener('click', (event) => {
  event.stopPropagation();
  const isOpen = !accountMenu.classList.contains('hidden');
  if (isOpen) {
    closeAccountMenu();
  } else {
    accountMenu.classList.remove('hidden');
    accountButton.setAttribute('aria-expanded', 'true');
  }
});

document.addEventListener('click', (event) => {
  if (!accountMenu.classList.contains('hidden') && !accountMenu.contains(event.target) && event.target !== accountButton) {
    closeAccountMenu();
  }
  if (openTaskMenu && !openTaskMenu.menu.contains(event.target) && event.target !== openTaskMenu.button) {
    closeTaskMenu();
  }
});

profileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = {
    username: profileUsernameInput.value,
    display_name: profileDisplayNameInput.value,
  };

  if (profilePasswordInput.value.trim()) {
    payload.password = profilePasswordInput.value.trim();
  }

  try {
    const result = await api('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    currentUser = result.user;
    profilePasswordInput.value = '';
    showMessage(result.message, 'success');
    await fetchUserProfile();
    closeAccountMenu();
  } catch (error) {
    showMessage(error.message, 'error');
  }
});

logoutButton.addEventListener('click', async () => {
  try {
    await api('/api/logout', { method: 'POST' });
    currentUser = null;
    closeAccountMenu();
    toggleAuthViews(false);
    setActiveTab('login');
    loginForm.reset();
    registerForm.reset();
    profileForm.reset();
    closeTodoForm();
    renderTasks([]);
  } catch (error) {
    showMessage(error.message, 'error');
  }
});

fetchUserProfile();