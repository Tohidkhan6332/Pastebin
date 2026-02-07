import makeWASocket, {
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  Browsers,
  DisconnectReason
} from "@whiskeysockets/baileys";

import fs from "fs-extra";
import pino from "pino";
import { Boom } from "@hapi/boom";
import uploadToPastebin from "./Paste.js";

export default async function handler(req, res) {

  let num = req.query.number;

  const { state, saveCreds } = await useMultiFileAuthState("./auth_info_baileys");

  try {

    const sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }))
      },
      logger: pino({ level: "fatal" }),
      browser: Browsers.macOS("Safari"),
    });

    if (!sock.authState.creds.registered) {
      await delay(1500);
      num = num.replace(/[^0-9]/g, "");
      const code = await sock.requestPairingCode(num);

      return res.send({ code });
    }

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === "open") {
        await delay(8000);

        const pasteUrl = await uploadToPastebin(
          "./auth_info_baileys/creds.json",
          "creds.json",
          "json",
          "1"
        );

        await sock.sendMessage(sock.user.id, { text: pasteUrl });

        fs.emptyDirSync("./auth_info_baileys");
      }

      if (connection === "close") {
        const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
        console.log("Disconnected:", reason);
      }
    });

  } catch (err) {
    console.log(err);
    res.send({ code: "error" });
  }
}
