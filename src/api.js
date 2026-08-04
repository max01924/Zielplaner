async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        "Verbindung zum Server fehlgeschlagen. Prüfe, ob der Zielplaner läuft, und lade die Seite neu."
      );
    }
    throw error;
  }

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
  getWeek(weekKey) {
    return request(`/weeks/${weekKey}`);
  },
  createWeeklyPriority(weekKey, priority) {
    return request(`/weeks/${weekKey}/priorities`, {
      method: "POST",
      body: JSON.stringify(priority),
    });
  },
  updateWeeklyPriority(id, patch) {
    return request(`/weekly-priorities/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },
  deleteWeeklyPriority(id) {
    return request(`/weekly-priorities/${id}`, { method: "DELETE" });
  },
  updateWeeklyReflection(weekKey, reflection) {
    return request(`/weeks/${weekKey}/reflection`, {
      method: "PUT",
      body: JSON.stringify({ reflection }),
    });
  },
  saveWeeklyReview(weekKey, review) {
    return request(`/weeks/${weekKey}/review`, {
      method: "PUT",
      body: JSON.stringify(review),
    });
  },
  sync() {
    return request("/sync", { method: "POST" });
  },
  saveDailyReview(dateKey, review) {
    return request(`/daily-reviews/${dateKey}`, {
      method: "PUT",
      body: JSON.stringify(review),
    });
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
