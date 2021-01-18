const licenses = `All of the source code to this application is available under licenses
which are both free and open source. The source code can be found on the
git repository <https://github.com/mandel59/midivis>.

### Midivis License

${require("./LICENSE").default}

---

This application contains code available under the licenses listed here.

### Node.js License

This license applies to the module \`events\`.

${require("events/LICENSE").default}
`

document.getElementById("licenses").innerText = licenses
