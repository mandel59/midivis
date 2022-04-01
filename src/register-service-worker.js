if (location.hostname !== "localhost" && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/service-worker.js")
    })
}

module.exports = {}
