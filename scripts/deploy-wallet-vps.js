const fs = require("fs");
const path = require("path");
const { Client } = require("ssh2");

const host = process.env.VPS_HOST || "187.52.116.85";
const username = process.env.VPS_USER || "root";
const password = process.env.VPS_PASS;
const siteArchive = process.env.SITE_ARCHIVE;
const apiArchive = process.env.API_ARCHIVE;
const setupScript = process.env.SETUP_SCRIPT;

if (!password || !siteArchive || !apiArchive || !setupScript) {
  console.error("Need VPS_PASS, SITE_ARCHIVE, API_ARCHIVE, SETUP_SCRIPT");
  process.exit(1);
}

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      stream.on("data", (d) => {
        out += d;
        process.stdout.write(d);
      });
      stream.stderr.on("data", (d) => {
        out += d;
        process.stderr.write(d);
      });
      stream.on("close", (code) =>
        code === 0 ? resolve(out) : reject(new Error(`exit ${code}\n${out}`))
      );
    });
  });
}

function upload(conn, local, remote) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      sftp.fastPut(local, remote, (e) => (e ? reject(e) : resolve()));
    });
  });
}

async function main() {
  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn
      .on("ready", resolve)
      .on("error", reject)
      .connect({ host, username, password, readyTimeout: 45000 });
  });

  console.log("Upload...");
  await upload(conn, siteArchive, "/tmp/vuammo-site.tar.gz");
  await upload(conn, apiArchive, "/tmp/vuammo-api.tar.gz");
  await upload(conn, setupScript, "/tmp/remote-setup-wallet.sh");

  console.log("Extract site + api...");
  await exec(
    conn,
    [
      "mkdir -p /var/www/vuammo /var/www/vuammo-api",
      "tar -xzf /tmp/vuammo-site.tar.gz -C /var/www/vuammo",
      "tar -xzf /tmp/vuammo-api.tar.gz -C /var/www/vuammo-api",
      "chown -R www-data:www-data /var/www/vuammo",
      "chmod +x /tmp/remote-setup-wallet.sh",
      "bash /tmp/remote-setup-wallet.sh"
    ].join(" && ")
  );

  conn.end();
  console.log("Deploy finished.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
