// @ts-nocheck
import appLicense from "../LICENSE"
import eventsLicense from "events/LICENSE"
const licenses = `All of the source code to this application is available under licenses
which are both free and open source. The source code can be found on the
git repository <https://github.com/mandel59/midivis>.

### Midivis License

${appLicense}

---

This application contains code available under the licenses listed here.

### Node.js License

This license applies to the module \`events\`.

${eventsLicense}
`

document.getElementById("licenses").innerText = licenses
