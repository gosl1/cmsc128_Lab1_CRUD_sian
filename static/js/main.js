const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const dueDateEl = document.getElementById('due-date');
const priorityEl = document.getElementById('priority');
const categoryEl = document.getElementById('category');
const list = document.getElementById('todo-list');

let lastDeleted = null;
let undoTimeout = null;
const undoNotificationEl = document.getElementById('undo-notification');


async function getTasks() {
  const response = await fetch('/api/tasks');
  return response.json();
}

function renderTasks(tasks) {
  list.innerHTML = '';

  tasks.forEach((task) => {
    const item = document.createElement('li');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', async () => {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: checkbox.checked })
      });
      const tasks = await getTasks();
      renderTasks(tasks);
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
      const d = new Date(task.due_date);
      parts.push(isNaN(d) ? task.due_date : d.toLocaleString());
    }
    meta.textContent = parts.join(' • ');

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.className = 'delete-btn';

    deleteBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to delete this task?')) return;

      // clear previous undo if present
      if (undoTimeout) {
        clearTimeout(undoTimeout);
        undoTimeout = null;
        lastDeleted = null;
        undoNotificationEl.classList.remove('show');
      }

      // delete immediately on server
      try {
        await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
      } catch (e) {
        console.error('Failed to delete task on server', e);
      }

      lastDeleted = task;
      item.remove();

      if (!undoNotificationEl) {
        console.error('undo-notification element missing');
        return;
      }

      undoNotificationEl.innerHTML = `
        <span>Task deleted</span>
        <button id="undo-btn">Undo</button>
      `;
      undoNotificationEl.classList.add('show');

      const undoBtn = document.getElementById('undo-btn');
      undoBtn.addEventListener('click', async () => {
        if (!lastDeleted) return;
        // recreate on server
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: lastDeleted.title,
            completed: lastDeleted.completed,
            due_date: lastDeleted.due_date,
            priority: lastDeleted.priority,
            category: lastDeleted.category
          })
        });

        lastDeleted = null;
        if (undoTimeout) { clearTimeout(undoTimeout); undoTimeout = null; }
        undoNotificationEl.classList.remove('show');

        const tasks = await getTasks();
        renderTasks(tasks);
      });

      // auto-hide undo after 5s
      undoTimeout = setTimeout(() => {
        lastDeleted = null;
        undoNotificationEl.classList.remove('show');
        undoTimeout = null;
      }, 5000);
    });

    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.textContent = 'Edit';

    editBtn.addEventListener('click', () => {

      const editInput = document.createElement('input');
      editInput.type = 'text';
      editInput.value = task.title;
      text.replaceWith(editInput);
      editInput.focus()

      const saveBtn = document.createElement('button');
      saveBtn.className = 'save-btn';
      saveBtn.textContent = 'Save';
      editBtn.replaceWith(saveBtn);

      saveBtn.addEventListener('click', async() => {
        await fetch(`/api/tasks/${task.id}`,{
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({title: editInput.value})
        });
        const tasks = await getTasks();
        renderTasks(tasks);
      })
    })

    item.appendChild(checkbox);
    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.flexDirection = 'column';
    left.style.flex = '1';
    left.appendChild(text);
    left.appendChild(meta);
    item.appendChild(left);
    item.appendChild(deleteBtn);
    item.appendChild(editBtn);
    list.appendChild(item);
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const title = input.value.trim();
  if (!title) {
    return;
  }

  await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      due_date: dueDateEl.value || null,
      priority: priorityEl.value,
      category: categoryEl.value
    })
  });

  input.value = '';
  dueDateEl.value = '';
  priorityEl.selectedIndex = 1; // reset to "Med"
  categoryEl.selectedIndex = 2; // reset to "Others"
  input.focus();

  const tasks = await getTasks();
  renderTasks(tasks);
});

(async function init() {
  const tasks = await getTasks();
  renderTasks(tasks);
})();