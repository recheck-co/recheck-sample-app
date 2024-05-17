var sqlite3 = require('sqlite3');
const { open } = require('sqlite');
var mkdirp = require('mkdirp');
var crypto = require('crypto');
var path = require('path');

// Ensure the directory exists
const dbDir = path.join(__dirname, 'var/db');
mkdirp.sync(dbDir);

const dbPath = path.join(dbDir, 'sample.db');

var db = (async () => {
  const conn = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  console.log(`Opened database at ${dbPath}`);

  await conn.exec("CREATE TABLE IF NOT EXISTS users ( \
    id INTEGER PRIMARY KEY, \
    username TEXT UNIQUE, \
    hashed_password BLOB, \
    salt BLOB, \
    name TEXT, \
    email TEXT UNIQUE, \
    recheck_id INTEGER UNIQUE, \
    email_verified INTEGER \
  )");

  await conn.exec("CREATE TABLE IF NOT EXISTS federated_credentials ( \
    id INTEGER PRIMARY KEY, \
    user_id INTEGER NOT NULL, \
    provider TEXT NOT NULL, \
    subject TEXT NOT NULL, \
    UNIQUE (provider, subject) \
  )");

  return conn;
})()

module.exports = db;