import { registerRoute } from "workbox-routing"
import {
    NetworkFirst,
    StaleWhileRevalidate,
} from "workbox-strategies"
import { CacheableResponsePlugin } from "workbox-cacheable-response"

registerRoute(
    ({ request }) => request.mode === "navigate",
    new NetworkFirst({
        cacheName: "pages",
        plugins: [
            new CacheableResponsePlugin({
                statuses: [200],
            })
        ]
    }),
)

registerRoute(
    ({ request }) => ["style", "script", "worker", "image"].includes(request.destination),
    new StaleWhileRevalidate({
        cacheName: "assets",
        plugins: [
            new CacheableResponsePlugin({
                statuses: [200],
            })
        ]
    }),
)
