const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const list = document.getElementById('todo-list');

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

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.className = 'delete-btn';
    deleteBtn.addEventListener('click', async () => {
      await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
      const tasks = await getTasks();
      renderTasks(tasks);
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
    item.appendChild(text);
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
    body: JSON.stringify({ title })
  });

  input.value = '';
  input.focus();

  const tasks = await getTasks();
  renderTasks(tasks);
});

(async function init() {
  const tasks = await getTasks();
  renderTasks(tasks);
})();
