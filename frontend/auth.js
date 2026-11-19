
document.addEventListener("DOMContentLoaded", () => {
    const logoutButton = document.getElementById("logout-button");

    if (!logoutButton) {
        console.error("TaskFlow logout button was not found.");
        return;
    }

    logoutButton.addEventListener("click", async () => {
        logoutButton.disabled = true;
        logoutButton.textContent = "Logging out...";

        try {
            const response = await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "same-origin"
            });

            if (!response.ok) {
                throw new Error("Logout failed. Please try again.");
            }

            window.location.href = "/login";

        } catch (error) {
            console.error(error);
            logoutButton.disabled = false;
            logoutButton.innerHTML = "<span>↪</span> Logout";
            alert("Unable to log out. Please try again.");
        }
    });
});
