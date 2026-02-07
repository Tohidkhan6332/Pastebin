import express from "express";
import fs from "fs-extra";
import pino from "pino";
import { Boom } from "@hapi/boom";

import makeWASocket, {
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  Browsers,
  DisconnectReason
} from "@whiskeysockets/baileys";

import uploadToPastebin from "./Paste.js";

const app = express();

const MESSAGE =
  process.env.MESSAGE ||
  `👋🏻 Hey there!

Your pairing session is generated.

⚠️ Do not share this code.

GitHub Repo:
https://github.com/ALI-INXIDE/ALI-MD`;

if (fs.existsSync("./auth_info_baileys")) {
  fs.emptyDirSync("./auth_info_baileys");
}

app.get("/", async (req, res) => {
  let num = req.query.number;

  async function startPairing() {
    const { state, saveCreds } = await useMultiFileAuthState("./auth_info_baileys");

    try {
      const sock = makeWASocket({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(
            state.keys,
            pino({ level: "fatal" })
          )
        },
        printQRInTerminal: false,
        logger: pino({ level: "fatal" }),
        browser: Browsers.macOS("Safari")
      });

      if (!sock.authState.creds.registered) {
        await delay(1500);
        num = num.replace(/[^0-9]/g, "");

        const code = await sock.requestPairingCode(num);

        if (!res.headersSent) {
          res.send({ code });
        }
      }

      sock.ev.on("creds.update", saveCreds);

      sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "open") {
          try {
            await delay(8000);

            const credsPath = "./auth_info_baileys/creds.json";
            const pasteUrl = await uploadToPastebin(
              credsPath,
              "creds.json",
              "json",
              "1"
            );

            const user = sock.user.id;

            await sock.sendMessage(user, {
              text: pasteUrl
            });

            await sock.sendMessage(user, {
              text: MESSAGE
            });

            await delay(1000);
            fs.emptyDirSync("./auth_info_baileys");

          } catch (e) {
            console.log("Upload/send error:", e);
          }
        }

        if (connection === "close") {
          const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;

          if (reason === DisconnectReason.connectionClosed) {
            console.log("Connection closed");
          } else if (reason === DisconnectReason.connectionLost) {
            console.log("Connection lost");
          } else if (reason === DisconnectReason.timedOut) {
            console.log("Timed out");
          } else {
            console.log("Disconnected:", reason);
          }
        }
      });

    } catch (err) {
      console.log("Pairing error:", err);
      fs.emptyDirSync("./auth_info_baileys");

      if (!res.headersSent) {
        res.send({ code: "Try again later" });
      }
    }
  }

  await startPairing();
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
