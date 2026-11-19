
// TaskFlow - Safe Dashboard Animations

function startTaskFlowAnimations() {

    // Animate task cards only.
    // Dashboard statistics are controlled by script.js.
    function animateTasks() {
        const taskCards = document.querySelectorAll(
            ".task, .task-card, .task-item"
        );

        taskCards.forEach((task, index) => {
            if (task.dataset.animationAdded === "true") {
                return;
            }

            task.dataset.animationAdded = "true";

            task.style.animationDelay =
                `${Math.min(index * 60, 300)}ms`;

            task.classList.add("task-entrance");
        });
    }

    // Animate existing task cards.
    animateTasks();

    // Watch for newly created task cards.
    const observer = new MutationObserver(() => {
        animateTasks();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Start animations after the page loads.
if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        startTaskFlowAnimations
    );
} else {
    startTaskFlowAnimations();
}
