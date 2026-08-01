async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = "Anfrage fehlgeschlagen.";
    try {
      const body = await response.json();
      message = body.error ?? message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  getState() {
    return request("/state");
  },
  sync() {
    return request("/sync", { method: "POST" });
  },
  createDailyTask(task) {
    return request("/daily-tasks", {
      method: "POST",
      body: JSON.stringify(task),
    });
  },
  updateDailyTask(id, patch) {
    return request(`/daily-tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },
  deleteDailyTask(id) {
    return request(`/daily-tasks/${id}`, { method: "DELETE" });
  },
  createGoal(goal) {
    return request("/goals", {
      method: "POST",
      body: JSON.stringify(goal),
    });
  },
  updateGoal(id, patch) {
    return request(`/goals/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },
  deleteGoal(id) {
    return request(`/goals/${id}`, { method: "DELETE" });
  },
  createChecklistItem(goalId, text) {
    return request(`/goals/${goalId}/items`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  },
  updateChecklistItem(id, patch) {
    return request(`/checklist-items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },
  deleteChecklistItem(id) {
    return request(`/checklist-items/${id}`, { method: "DELETE" });
  },
  getHabits(month) {
    const query = month ? `?month=${encodeURIComponent(month)}` : "";
    return request(`/habits${query}`);
  },
  createHabit(habit) {
    return request("/habits", {
      method: "POST",
      body: JSON.stringify(habit),
    });
  },
  updateHabit(id, patch) {
    return request(`/habits/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
  },
  deleteHabit(id) {
    return request(`/habits/${id}`, { method: "DELETE" });
  },
  toggleHabitCompletion(id, date) {
    return request(`/habits/${id}/toggle`, {
      method: "POST",
      body: JSON.stringify({ date }),
    });
  },
};
