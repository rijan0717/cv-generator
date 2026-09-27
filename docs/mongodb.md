# MongoDB Setup

How the database for this project was installed and configured, how to verify
it, and how to troubleshoot it.

Supports report sections **4.1.1 Tools used** and **4.1.2 Implementation
details**.

---

## 1. The development environment

The project folder lives on the **WSL2 Ubuntu 26.04 LTS** filesystem at
`~/cvgenerator`, and the entire toolchain — Node.js, npm and MongoDB — runs
natively inside Ubuntu. The host machine is Windows 11 Pro (build 26300), but
Windows only provides the editor and the browser.

| Component                 | Version   | Where it runs |
| ------------------------- | --------- | ------------- |
| Ubuntu                    | 26.04 LTS | WSL2          |
| Node.js                   | 22.22.1   | WSL Ubuntu    |
| npm                       | 11.20.0   | WSL Ubuntu    |
| MongoDB Community Server  | 8.0.32    | WSL Ubuntu    |
| MongoDB Shell (`mongosh`) | 2.12.0    | WSL Ubuntu    |
| MongoDB Compass           | 1.51.0    | Windows       |

Section 8 explains why this arrangement was chosen over running the toolchain
on Windows.

---

## 2. Installation

Everything is installed by one repeatable script, `scripts/setup-wsl.sh`, run
from the WSL Ubuntu terminal:

```bash
bash ~/cvgenerator/scripts/setup-wsl.sh
```

It is written to be safe to re-run, and it asks for the sudo password once.

### 2.1 Node.js and npm

Ubuntu 26.04 ships Node.js 22 LTS in its own repositories, so no third-party
repository is needed:

```bash
sudo apt-get install -y nodejs npm curl gnupg ca-certificates
sudo npm install -g npm@11
```

npm is pinned to version 11 rather than `npm@latest`. At the time of setup
`npm@latest` was 12.1.0, which requires Node `^22.22.2`, and Ubuntu ships
22.22.1 — one patch version short. npm 11 is the newest line that supports
this Node version, and it is a large improvement on the npm 9 that apt
provides.

### 2.2 MongoDB Community Server

MongoDB does not publish an apt repository for Ubuntu 26.04 yet, so the
24.04 ("noble") repository is used — the newest release MongoDB supports. The
noble packages install and run correctly on 26.04.

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc \
  | sudo gpg --dearmor --yes -o /usr/share/keyrings/mongodb-server-8.0.gpg

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] \
https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" \
  | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list

sudo apt-get update
sudo apt-get install -y mongodb-org
```

The repository is added with a **signed-by** keyring rather than the
deprecated `apt-key`, so the packages are cryptographically verified against
MongoDB's own signing key.

### 2.3 Running MongoDB as a service

This WSL distribution has systemd enabled (`/etc/wsl.conf` contains
`[boot]\nsystemd=true`), so MongoDB runs as a normal systemd service:

```bash
sudo systemctl enable --now mongod
```

`enable` makes it start whenever WSL boots; `--now` also starts it
immediately. No command is needed before `npm run dev`.

### 2.4 MongoDB Compass

Compass is a graphical client and was installed on the **Windows** side with
the Windows Package Manager:

```powershell
winget install --id MongoDB.Compass.Full
```

It can still reach the Linux database, because WSL2 forwards ports that WSL
processes listen on to Windows `localhost`. Connect Compass to
`mongodb://127.0.0.1:27017`.

---

## 3. Locations

| Item          | Path                                 |
| ------------- | ------------------------------------ |
| Server binary | `/usr/bin/mongod`                    |
| Configuration | `/etc/mongod.conf`                   |
| Data files    | `/var/lib/mongodb`                   |
| Log file      | `/var/log/mongodb/mongod.log`        |
| systemd unit  | `/lib/systemd/system/mongod.service` |

---

## 4. Configuration

`/etc/mongod.conf` is left at its packaged defaults. The parts that matter:

```yaml
storage:
  dbPath: /var/lib/mongodb

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

net:
  port: 27017
  bindIp: 127.0.0.1
```

Two points worth being able to explain in the viva:

- **`bindIp: 127.0.0.1`** means MongoDB only accepts connections originating
  inside the WSL instance. Nothing on the local network can reach it. This is
  the safe default for development.
- **There is no `security.authorization` section**, so authentication is
  disabled. That is acceptable _because_ the server is not reachable from
  outside the machine. A deployed system must enable authorisation and create
  a dedicated application user with only the permissions this project needs.

---

## 5. How the application connects

The connection string lives in `server/.env`, which is git-ignored, and is
read by `server/src/config/env.js`:

```
MONGODB_URI=mongodb://127.0.0.1:27017/cv_generator
```

| Part           | Meaning                              |
| -------------- | ------------------------------------ |
| `mongodb://`   | The MongoDB connection protocol      |
| `127.0.0.1`    | The local machine, matching `bindIp` |
| `27017`        | The default MongoDB port             |
| `cv_generator` | The database name for this project   |

The database does **not** have to be created by hand. MongoDB creates a
database the first time a document is written to it, so `cv_generator` appears
as soon as the first user registers in Phase 1.

`server/src/config/db.js` opens the connection with Mongoose:

```js
mongoose.set('strictQuery', true);
await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
```

`strictQuery` makes Mongoose reject queries on fields that are not in the
schema instead of silently ignoring them. The 10-second server-selection
timeout means a wrong URI or a stopped service fails quickly with a clear
error rather than hanging.

`GET /api/health` reports the live connection state, so the Phase 0 page shows
at a glance whether the database is reachable.

---

## 6. Verifying the installation

```bash
# Is the service running?
systemctl is-active mongod        # expected: active
systemctl is-enabled mongod       # expected: enabled

# Does the server respond?
mongosh --quiet --eval "db.runCommand({ ping: 1 })"   # expected: { ok: 1 }

# Which version?
mongod --version | head -1
```

### Results recorded during setup

| Check                         | Result                    |
| ----------------------------- | ------------------------- |
| `systemctl is-active mongod`  | `active`                  |
| `systemctl is-enabled mongod` | `enabled`                 |
| `db.runCommand({ ping: 1 })`  | `{ ok: 1 }`               |
| `db.version()`                | `8.0.32`                  |
| `mongosh --version`           | `2.12.0`                  |
| `GET /api/health`             | `"database": "connected"` |

### Browsing the data in Compass

1. Open **MongoDB Compass** on Windows.
2. Connect to `mongodb://127.0.0.1:27017`.
3. The `cv_generator` database appears once the application has written its
   first document. Its collections will be `users`, `cvs`, `templates`,
   `jobmatches` and `activitylogs`.

Compass is useful for confirming that a document was saved with the expected
shape, and for taking screenshots of the collections for the report.

---

## 7. Managing the service

| Task            | Command                                    |
| --------------- | ------------------------------------------ |
| Status          | `systemctl status mongod`                  |
| Start           | `sudo systemctl start mongod`              |
| Stop            | `sudo systemctl stop mongod`               |
| Restart         | `sudo systemctl restart mongod`            |
| Disable at boot | `sudo systemctl disable mongod`            |
| Follow the log  | `sudo tail -f /var/log/mongodb/mongod.log` |

### Useful `mongosh` commands

```javascript
show dbs                    // list databases
use cv_generator            // switch to this project's database
show collections            // list collections
db.users.countDocuments()   // how many users exist
db.users.find().limit(5)    // look at a few documents
db.cvs.getIndexes()         // confirm the indexes were created
db.dropDatabase()           // wipe this project's data (careful)
```

---

## 8. Why everything runs inside WSL

The project was first set up the other way round: the files lived in WSL but
Node, npm and MongoDB ran on Windows, with the folder reached over the
`\\wsl.localhost\Ubuntu\...` UNC path. That arrangement caused a series of
failures that are worth recording, because they explain the current design.

1. **npm workspaces could not be used.** npm creates workspace links as
   symbolic links, and this failed across the UNC path with
   `EISDIR: illegal operation on a directory, symlink`.
2. **Package install scripts failed.** npm runs them through `cmd.exe`, which
   cannot use a UNC working directory. It silently fell back to `C:\Windows`,
   producing `Cannot find module 'C:\Windows\install.js'` from esbuild's
   postinstall.
3. **The project could not be run from the WSL terminal at all.** Binaries in
   `node_modules/.bin` installed by Windows npm are Windows shims without a
   Linux execute bit, giving `sh: 1: vite: Permission denied`.
4. **Everything was slow.** The 9p filesystem used to reach WSL files from
   Windows is far slower than native ext4: installing the server dependencies
   took 7 minutes, and the server test suite took 37 seconds.

Moving the whole toolchain into WSL removed all four problems at once. The
same test suite now takes **2.1 seconds** instead of 37, and the client
production build takes **3.7 seconds** instead of 27.

Because the Express server now runs as a Linux process, the database it
connects to must be reachable from Linux — and WSL2 cannot reach a Windows
service on `127.0.0.1`, since it sits behind NAT. Installing MongoDB inside
Ubuntu keeps `127.0.0.1:27017` correct for the server, and Compass on Windows
still works through WSL2's automatic port forwarding.

> A MongoDB Community Server 8.3.11 instance was installed on Windows earlier
> in the setup, before this decision. It has been stopped and set to manual
> start so that it cannot compete for port 27017.

---

## 9. Alternative: MongoDB Atlas

The project also works against a free MongoDB Atlas cluster. It is worth
setting one up as a backup before the demo, in case the local machine is
unavailable:

1. Create a free M0 cluster at <https://www.mongodb.com/cloud/atlas>.
2. Add a database user with a password.
3. Under **Network Access**, allow your current IP address.
4. Put the connection string in `server/.env`:

   ```
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/cv_generator?retryWrites=true&w=majority
   ```

No application code changes are needed — only the environment variable. Note
that Atlas connections are slower than a local server, which matters for the
under-5-second PDF generation target.

---

## 10. Troubleshooting

| Symptom                                                              | Cause                                                                 | Fix                                                                        |
| -------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017` | `mongod` is not running                                               | `sudo systemctl start mongod`                                              |
| `Missing required environment variable: MONGODB_URI`                 | `server/.env` does not exist                                          | `cp server/.env.example server/.env`                                       |
| Health page shows `database: disconnected`                           | The server started but lost the connection                            | Check the log, then restart `mongod`                                       |
| `sh: 1: vite: Permission denied`                                     | `node_modules` was installed by Windows npm                           | Delete `node_modules` and re-run `scripts/setup-wsl.sh`                    |
| `mongod` will not start after an unclean WSL shutdown                | Stale lock file                                                       | `sudo rm /var/lib/mongodb/mongod.lock`, then `sudo systemctl start mongod` |
| Compass cannot connect                                               | WSL is not running, or the Windows MongoDB service grabbed port 27017 | Start WSL; confirm the Windows service is stopped                          |

The log is the first place to look:

```bash
sudo tail -50 /var/log/mongodb/mongod.log
```

---

## 11. Data safety during development

- `/var/lib/mongodb` is outside the repository, so cloning the project gives
  you an empty database. This is intended.
- `npm run seed:admin` (Phase 1) and `npm run seed:templates` (Phase 3)
  recreate the minimum data the application needs.
- Integration tests never touch this database. They run against a temporary
  in-memory MongoDB provided by `mongodb-memory-server`, so `npm test` cannot
  destroy development data.
