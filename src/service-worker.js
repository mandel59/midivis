import { registerRoute } from "workbox-routing"
import {
    StaleWhileRevalidate,
} from "workbox-strategies"
import { CacheableResponsePlugin } from "workbox-cacheable-response"

registerRoute(
    ({ request }) =>
        request.mode === "navigate" || ["style", "script", "worker", "image", "manifest"].includes(request.destination),
    new StaleWhileRevalidate({
        cacheName: "assets",
        plugins: [
            new CacheableResponsePlugin({
                statuses: [200],
            })
        ]
    }),
)
